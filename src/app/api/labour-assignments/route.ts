import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LabourAssignmentStatus, Prisma, ApprovalStatus } from '@prisma/client';

// -------------------------------------------------------------
// GET Handler: Fetch all labour assignments
// -------------------------------------------------------------
/**
 * Handles GET requests to fetch all labour assignments.
 * Supports filtering by labour_person_id and status via query params.
 * Endpoint: /api/labour-assignments
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const labour_person_id = searchParams.get('labour_person_id');
        const status = searchParams.get('status');

        const where: any = {};
        if (labour_person_id) where.labour_person_id = parseInt(labour_person_id);
        if (status) where.status = status as LabourAssignmentStatus;

        const assignments = await prisma.labourAssignment.findMany({
            where,
            include: {
                labourPerson: true,
                shipment: {
                    include: {
                        receiver: { select: { name: true } },
                        departureCity: { select: { name: true } },
                        toCity: { select: { name: true } }
                    }
                }
            },
            orderBy: { assigned_date: 'desc' }
        });

        // Ensure collected_amount and total_charges are converted safely
        const formattedAssignments = assignments.map(a => ({
            ...a,
            collected_amount: Number(a.collected_amount || 0),
            shipment: {
                ...a.shipment,
                // Safely convert total_charges from Decimal if needed
                total_charges: Number(a.shipment.total_charges),
            }
        }));

        return NextResponse.json(formattedAssignments, { status: 200 });
    } catch (error) {
        console.error('Error fetching labour assignments:', error);
        return NextResponse.json(
            { message: 'Internal Server Error while fetching assignments.' },
            { status: 500 }
        );
    }
}

// -------------------------------------------------------------
// POST Handler: Assign shipments to labour person
// -------------------------------------------------------------
/**
 * Handles POST requests to create new Labour_Assignment records.
 * Ensures shipments are undelivered and not currently tied to an active assignment.
 * Endpoint: /api/labour-assignments
 */
export async function POST(request: Request) {
    try {
        const { labour_person_id, shipment_ids, due_date, notes } = await request.json();

        if (!labour_person_id || !shipment_ids || !Array.isArray(shipment_ids)) {
            return NextResponse.json({
                message: 'Labour person ID and shipment IDs array are required.'
            }, { status: 400 });
        }

        // 1. Check if labour person exists
        const labourPerson = await prisma.labourPerson.findUnique({
            where: { id: labour_person_id }
        });

        if (!labourPerson) {
            return NextResponse.json({
                message: 'Labour person not found.'
            }, { status: 404 });
        }

        // 2. Check if shipments exist and are not already delivered
        const shipments = await prisma.shipment.findMany({
            where: {
                register_number: { in: shipment_ids },
                delivery_date: null // Only allow assignment if delivery has NOT been recorded
            },
            include: {
                deliveries: true // Also check for existing Delivery records just in case
            }
        });
        
        if (shipments.length !== shipment_ids.length) {
            return NextResponse.json({
                message: 'Some shipments not found or already delivered (Shipments must not have a recorded delivery date to be assigned).',
            }, { status: 400 });
        }

        // 3. Check for actively pending assignments on these shipments
        const existingAssignments = await prisma.labourAssignment.findMany({
            where: {
                shipment_id: { in: shipment_ids },
                // Only consider assignments that are NOT yet settled (ASSIGNED, DELIVERED, COLLECTED)
                status: {
                    not: LabourAssignmentStatus.SETTLED 
                }
            }
        });

        if (existingAssignments.length > 0) {
            // Return 409 Conflict if any shipment is already in an active workflow
            const pendingShipmentIds = existingAssignments.map(a => a.shipment_id);
            return NextResponse.json({
                message: `Some shipments are already assigned and not yet settled: ${pendingShipmentIds.join(', ')}. Please settle them first.`,
            }, { status: 409 });
        }

        // 4. Create assignments
        const assignments = await prisma.labourAssignment.createMany({
            data: shipment_ids.map(shipment_id => ({
                labour_person_id,
                shipment_id,
                due_date: due_date ? new Date(due_date) : null,
                notes
            }))
        });

        return NextResponse.json({
            message: `${assignments.count} assignments created successfully.`
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating labour assignments:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to create assignments.' },
            { status: 500 }
        );
    }
}

// -------------------------------------------------------------
// PATCH Handler: Update assignment (DELIVER, COLLECT, SETTLE)
// -------------------------------------------------------------
/**
 * Handles PATCH requests to update a Labour_Assignment status and record financial details.
 * When action is 'DELIVER', it creates the Delivery record and updates the main Shipment.
 * Endpoint: /api/labour-assignments
 */
export async function PATCH(request: Request) {
    try {
        const { 
            assignment_id, 
            action, 
            collected_amount, 
            notes,
            // ADDED: New expense fields from the frontend collection form
            station_expense,
            bility_expense,
            station_labour,
            cart_labour,
        } = await request.json();

        if (!assignment_id || !action) {
            return NextResponse.json({
                message: 'Assignment ID and action are required.'
            }, { status: 400 });
        }

        const assignment = await prisma.labourAssignment.findUnique({
            where: { id: assignment_id },
            // Need the shipment details AND receiver party details for the new Delivery record
            include: { 
                shipment: {
                    include: {
                        receiver: true,
                        deliveries: true // Check if a Delivery record already exists
                    }
                }, 
                labourPerson: true 
            }
        });

        if (!assignment) {
            return NextResponse.json({
                message: 'Assignment not found.'
            }, { status: 404 });
        }

        const deliveryDate = new Date(); // Use current date for delivery record consistency
        const updateData: any = { notes };
        const collectedDecimal = collected_amount ? new Prisma.Decimal(collected_amount) : new Prisma.Decimal(0);

        // Use Prisma transaction for atomicity, especially when creating/updating multiple records
        const result = await prisma.$transaction(async (tx) => {
            
            switch (action) {
                case 'DELIVER':
                    // Prevent marking delivered if a delivery record already exists (e.g., from manual entry)
                    if (assignment.shipment.deliveries.length > 0) {
                        throw new Error('A delivery record already exists for this shipment.');
                    }
                    
                    // 1. Update Labour Assignment Status
                    updateData.status = LabourAssignmentStatus.DELIVERED;
                    updateData.delivered_date = deliveryDate;

                    // 2. Create Delivery Record for Approval Pipeline
                    const receiverName = assignment.shipment.walk_in_receiver_name || assignment.shipment.receiver.name;
                    const receiverContact = assignment.shipment.receiver.contactInfo;

                    await tx.delivery.create({
                        data: {
                            shipment_id: assignment.shipment_id,
                            delivery_date: deliveryDate,
                            delivery_time: deliveryDate,
                            
                            // Minimal data, expenses set to 0.00 as they are collected/recorded later
                            station_expense: new Prisma.Decimal(0),
                            bility_expense: new Prisma.Decimal(0),
                            station_labour: new Prisma.Decimal(0),
                            cart_labour: new Prisma.Decimal(0),
                            total_expenses: new Prisma.Decimal(0),
                            
                            receiver_name: receiverName,
                            receiver_phone: receiverContact,
                            receiver_cnic: 'N/A from Labour', 
                            receiver_address: receiverContact, 
                            
                            delivery_notes: `Delivered by Labour Person: ${assignment.labourPerson.name}. ${notes || ''}`,
                            delivery_status: 'DELIVERED',
                            approval_status: ApprovalStatus.PENDING, // This sends it to /deliveries/approval
                        }
                    });

                    // 3. Update Main Shipment delivery_date
                    await tx.shipment.update({
                        where: { register_number: assignment.shipment_id },
                        data: { delivery_date: deliveryDate }
                    });
                    break;
                case 'COLLECT':
                    // --- COLLECTION LOGIC ---
                    
                    // 1. Validation
                    if (assignment.status !== LabourAssignmentStatus.DELIVERED) {
                        throw new Error('Assignment must be marked delivered before collection.');
                    }
                    if (collectedDecimal.lte(0)) {
                        throw new Error('Collected amount must be greater than zero for collection.');
                    }

                    // 2. Calculate Total Expenses and update Delivery Record
                    const expenseDecimals = {
                        station_expense: new Prisma.Decimal(station_expense || 0),
                        bility_expense: new Prisma.Decimal(bility_expense || 0),
                        station_labour: new Prisma.Decimal(station_labour || 0),
                        cart_labour: new Prisma.Decimal(cart_labour || 0),
                    };

                    const totalExpensesDecimal = expenseDecimals.station_expense
                        .plus(expenseDecimals.bility_expense)
                        .plus(expenseDecimals.station_labour)
                        .plus(expenseDecimals.cart_labour);

                    const deliveryRecord = assignment.shipment.deliveries[0];
                    if (!deliveryRecord) {
                        // This shouldn't happen if DELIVER was called correctly, but good to check
                        throw new Error('Cannot collect: Delivery record is missing. Please mark the shipment as DELIVERED first.');
                    }

                    await tx.delivery.update({
                        where: { delivery_id: deliveryRecord.delivery_id },
                        data: {
                            station_expense: expenseDecimals.station_expense,
                            bility_expense: expenseDecimals.bility_expense,
                            station_labour: expenseDecimals.station_labour,
                            cart_labour: expenseDecimals.cart_labour,
                            total_expenses: totalExpensesDecimal,
                            // Ensure the existing approval status (PENDING) is not accidentally overwritten here
                        }
                    });

                    // 3. Update Labour Assignment Status/Amount
                    updateData.status = LabourAssignmentStatus.COLLECTED;
                    updateData.collected_amount = collectedDecimal;
                    break;
                case 'SETTLE':
                    // --- SETTLEMENT LOGIC ---
                    if (assignment.status !== LabourAssignmentStatus.COLLECTED) {
                        throw new Error('Assignment must be collected before settlement.');
                    }
                    updateData.status = LabourAssignmentStatus.SETTLED;
                    updateData.settled_date = new Date();

                    // Create Transaction: Clears the collected funds against the receiver party account
                    await tx.transaction.create({
                        data: {
                            transaction_date: new Date(),
                            party_type: 'RECEIVER', 
                            party_ref_id: assignment.shipment.receiver_id,
                            shipment_id: assignment.shipment_id,
                            credit_amount: assignment.collected_amount,
                            debit_amount: new Prisma.Decimal(0),
                            description: `Payment collected by labour person ${assignment.labourPerson.name} (Settled)`
                        }
                    });
                    break;
                default:
                    throw new Error('Invalid action. Use DELIVER, COLLECT, or SETTLE.');
            }

            // Update the Labour Assignment record
            return tx.labourAssignment.update({
                where: { id: assignment_id },
                data: updateData,
                include: { labourPerson: true, shipment: true }
            });
        });

        return NextResponse.json({
            message: `Assignment ${action.toLowerCase()}d successfully.`,
            assignment: result
        }, { status: 200 });

    } catch (error: any) {
        console.error('Error updating labour assignment:', error);
        return NextResponse.json(
            { message: `Internal Server Error: Failed to update assignment. Details: ${error.message}` },
            { status: 500 }
        );
    }
}
