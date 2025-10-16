import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LabourAssignmentStatus } from '@prisma/client';

// GET: Fetch all labour assignments with optional filters
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

        return NextResponse.json(assignments, { status: 200 });
    } catch (error) {
        console.error('Error fetching labour assignments:', error);
        return NextResponse.json(
            { message: 'Internal Server Error while fetching assignments.' },
            { status: 500 }
        );
    }
}

// POST: Assign shipments to labour person
export async function POST(request: Request) {
    try {
        const { labour_person_id, shipment_ids, due_date, notes } = await request.json();

        if (!labour_person_id || !shipment_ids || !Array.isArray(shipment_ids)) {
            return NextResponse.json({
                message: 'Labour person ID and shipment IDs array are required.'
            }, { status: 400 });
        }

        // Check if labour person exists
        const labourPerson = await prisma.labourPerson.findUnique({
            where: { id: labour_person_id }
        });

        if (!labourPerson) {
            return NextResponse.json({
                message: 'Labour person not found.'
            }, { status: 404 });
        }

        // Check shipments exist and are not already assigned
        const shipments = await prisma.shipment.findMany({
            where: {
                register_number: { in: shipment_ids },
                delivery_date: null // Only undelivered shipments
            }
        });

        if (shipments.length !== shipment_ids.length) {
            return NextResponse.json({
                message: 'Some shipments not found or already delivered.'
            }, { status: 400 });
        }

        // Check for existing assignments
        const existingAssignments = await prisma.labourAssignment.findMany({
            where: {
                shipment_id: { in: shipment_ids }
            }
        });

        if (existingAssignments.length > 0) {
            return NextResponse.json({
                message: 'Some shipments are already assigned to labour persons.'
            }, { status: 409 });
        }

        // Create assignments
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

// PATCH: Update assignment (collection, delivery, settlement)
export async function PATCH(request: Request) {
    try {
        const { assignment_id, action, collected_amount, notes } = await request.json();

        if (!assignment_id || !action) {
            return NextResponse.json({
                message: 'Assignment ID and action are required.'
            }, { status: 400 });
        }

        const assignment = await prisma.labourAssignment.findUnique({
            where: { id: assignment_id },
            include: { shipment: true, labourPerson: true }
        });

        if (!assignment) {
            return NextResponse.json({
                message: 'Assignment not found.'
            }, { status: 404 });
        }

        const updateData: any = { notes };

        switch (action) {
            case 'DELIVER':
                updateData.status = LabourAssignmentStatus.DELIVERED;
                updateData.delivered_date = new Date();
                break;
            case 'COLLECT':
                if (!collected_amount || collected_amount <= 0) {
                    return NextResponse.json({
                        message: 'Collected amount is required for collection.'
                    }, { status: 400 });
                }
                updateData.status = LabourAssignmentStatus.COLLECTED;
                updateData.collected_amount = collected_amount;
                break;
            case 'SETTLE':
                if (assignment.status !== LabourAssignmentStatus.COLLECTED) {
                    return NextResponse.json({
                        message: 'Assignment must be collected before settlement.'
                    }, { status: 400 });
                }
                updateData.status = LabourAssignmentStatus.SETTLED;
                updateData.settled_date = new Date();

                // Create transaction: credit to party, debit to labour account
                await prisma.transaction.create({
                    data: {
                        party_type: 'RECEIVER',
                        party_ref_id: assignment.shipment.receiver_id,
                        shipment_id: assignment.shipment_id,
                        credit_amount: assignment.collected_amount,
                        debit_amount: 0,
                        description: `Payment collected by labour person ${assignment.labourPerson.name}`
                    }
                });
                break;
            default:
                return NextResponse.json({
                    message: 'Invalid action. Use DELIVER, COLLECT, or SETTLE.'
                }, { status: 400 });
        }

        const updatedAssignment = await prisma.labourAssignment.update({
            where: { id: assignment_id },
            data: updateData,
            include: { labourPerson: true, shipment: true }
        });

        return NextResponse.json({
            message: `Assignment ${action.toLowerCase()}d successfully.`,
            assignment: updatedAssignment
        }, { status: 200 });

    } catch (error) {
        console.error('Error updating labour assignment:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to update assignment.' },
            { status: 500 }
        );
    }
}
