import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LabourAssignmentStatus, Prisma, ApprovalStatus } from '@prisma/client';

// -------------------------------------------------------------
// GET Handler: Fetch all labour assignments
// -------------------------------------------------------------
/**
 * Handles GET requests to fetch all labour assignments.
 * Fetches associated delivery expenses and EXCLUDES SETTLED assignments.
 * Endpoint: /api/labour-assignments
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const labour_person_id = searchParams.get('labour_person_id');
        const status = searchParams.get('status');

        const where: any = {
            // EXCLUDE SETTLED assignments as requested
            status: { not: LabourAssignmentStatus.SETTLED }
        };
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
                        toCity: { select: { name: true } },
                        // Include deliveries to get expense details
                        deliveries: true, 
                    }
                }
            },
            orderBy: { assigned_date: 'desc' }
        });

        // Map and format the assignments, extracting expense details from the first delivery record
        const formattedAssignments = assignments.map(a => {
            // Assuming one delivery record per shipment for expenses
            const delivery = a.shipment.deliveries?.[0];
            
            const stationExpense = Number(delivery?.station_expense || 0);
            const bilityExpense = Number(delivery?.bility_expense || 0);
            const stationLabour = Number(delivery?.station_labour || 0);
            const cartLabour = Number(delivery?.cart_labour || 0);
            const totalExpenses = Number(delivery?.total_expenses || 0);
            const shipmentCharges = Number(a.shipment.total_charges);
            
            const totalAmount = shipmentCharges + totalExpenses;

            return {
                ...a,
                collected_amount: Number(a.collected_amount || 0),
                station_expense: stationExpense,
                bility_expense: bilityExpense,
                station_labour: stationLabour,
                cart_labour: cartLabour,
                total_expenses: totalExpenses,
                total_amount: totalAmount, // Calculated total amount due (Charges + Expenses)
                
                shipment: {
                    ...a.shipment,
                    total_charges: shipmentCharges,
                }
            };
        });

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
// POST Handler: Assign shipments to labour person (Unchanged)
// -------------------------------------------------------------
export async function POST(request: Request) {
    try {
        const { labour_person_id, shipment_ids, due_date, notes } = await request.json();

        if (!labour_person_id || !shipment_ids || !Array.isArray(shipment_ids)) {
            return NextResponse.json({
                message: 'Labour person ID and shipment IDs array are required.'
            }, { status: 400 });
        }

        const labourPerson = await prisma.labourPerson.findUnique({
            where: { id: labour_person_id }
        });

        if (!labourPerson) {
            return NextResponse.json({
                message: 'Labour person not found.'
            }, { status: 404 });
        }

        const shipments = await prisma.shipment.findMany({
            where: {
                register_number: { in: shipment_ids },
                delivery_date: null // Only allow assignment if delivery has NOT been recorded
            },
        });
        
        if (shipments.length !== shipment_ids.length) {
            return NextResponse.json({
                message: 'Some shipments not found or already delivered (Shipments must not have a recorded delivery date to be assigned).',
            }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {

            const deleteResult = await tx.labourAssignment.deleteMany({
                where: {
                    shipment_id: { in: shipment_ids },
                    status: {
                        not: LabourAssignmentStatus.SETTLED 
                    }
                }
            });
            
            const newAssignments = await tx.labourAssignment.createMany({
                data: shipment_ids.map((shipment_id: string) => ({
                    labour_person_id,
                    shipment_id,
                    due_date: due_date ? new Date(due_date) : null,
                    notes
                }))
            });
            
            return {
                newAssignments,
                deletedCount: deleteResult.count
            };
        });

        return NextResponse.json({
            message: `${result.newAssignments.count} assignments created successfully. ${result.deletedCount} previous active assignments were deleted (reassigned).`
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
// PATCH Handler: Update assignment (DELIVER, COLLECT, SETTLE) (Unchanged but included for completeness)
// -------------------------------------------------------------
export async function PATCH(request: Request) {
    try {
        const { 
            assignment_id, 
            action, 
            collected_amount, 
            notes,
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
            include: { 
                shipment: {
                    include: {
                        receiver: true,
                        deliveries: true 
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

        const deliveryDate = new Date(); 
        const updateData: any = { notes };
        const collectedDecimal = collected_amount ? new Prisma.Decimal(collected_amount) : new Prisma.Decimal(0);

        const result = await prisma.$transaction(async (tx) => {
            
            switch (action) {
                case 'DELIVER':
                    if (assignment.shipment.deliveries.length > 0) {
                        throw new Error('A delivery record already exists for this shipment.');
                    }
                    
                    updateData.status = LabourAssignmentStatus.DELIVERED;
                    updateData.delivered_date = deliveryDate;

                    const receiverName = assignment.shipment.walk_in_receiver_name || assignment.shipment.receiver.name;
                    const receiverContact = assignment.shipment.receiver.contactInfo;

                    await tx.delivery.create({
                        data: {
                            shipment_id: assignment.shipment_id,
                            delivery_date: deliveryDate,
                            delivery_time: deliveryDate,
                            
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
                            approval_status: ApprovalStatus.PENDING,
                        }
                    });

                    await tx.shipment.update({
                        where: { register_number: assignment.shipment_id },
                        data: { delivery_date: deliveryDate }
                    });
                    break;
                case 'COLLECT':
                    if (assignment.status !== LabourAssignmentStatus.DELIVERED && assignment.status !== LabourAssignmentStatus.COLLECTED) {
                        throw new Error('Assignment must be marked delivered or already collected for fund collection/correction.');
                    }
                    if (collectedDecimal.lte(0)) {
                        throw new Error('Collected amount must be greater than zero for collection.');
                    }

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
                        throw new Error('Cannot collect: Delivery record is missing. Please mark the shipment as DELIVERED first.');
                    }

                    // Only update Delivery expense fields if collecting for the first time OR if explicit expenses are sent
                    if (assignment.status === LabourAssignmentStatus.DELIVERED || totalExpensesDecimal.gt(0)) {
                         await tx.delivery.update({
                            where: { delivery_id: deliveryRecord.delivery_id },
                            data: {
                                station_expense: expenseDecimals.station_expense,
                                bility_expense: expenseDecimals.bility_expense,
                                station_labour: expenseDecimals.station_labour,
                                cart_labour: expenseDecimals.cart_labour,
                                total_expenses: totalExpensesDecimal,
                            }
                        });
                    }
                    
                    if (assignment.status === LabourAssignmentStatus.DELIVERED) {
                        updateData.status = LabourAssignmentStatus.COLLECTED;
                    }
                    
                    updateData.collected_amount = collectedDecimal;

                    break;
                case 'SETTLE':
                    if (assignment.status !== LabourAssignmentStatus.COLLECTED) {
                        throw new Error('Assignment must be collected before settlement.');
                    }
                    updateData.status = LabourAssignmentStatus.SETTLED;
                    updateData.settled_date = new Date();

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