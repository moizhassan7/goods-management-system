import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LabourAssignmentStatus } from '@prisma/client';

// GET: Fetch unsettled assignments (reminders)
export async function GET() {
    try {
        const unsettledAssignments = await prisma.labourAssignment.findMany({
            where: {
                status: {
                    not: LabourAssignmentStatus.SETTLED
                }
            },
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
            orderBy: [
                { due_date: 'asc' },
                { assigned_date: 'desc' }
            ]
        });

        // Add overdue status
        const assignmentsWithStatus = unsettledAssignments.map(assignment => ({
            ...assignment,
            is_overdue: assignment.due_date && new Date() > assignment.due_date
        }));

        return NextResponse.json(assignmentsWithStatus, { status: 200 });
    } catch (error) {
        console.error('Error fetching labour reminders:', error);
        return NextResponse.json(
            { message: 'Internal Server Error while fetching reminders.' },
            { status: 500 }
        );
    }
}
