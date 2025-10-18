import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handles GET requests to retrieve a report summary for Labour Persons, 
 * optionally filtered by assignment date range.
 * Endpoint: /api/labour-persons/report?startDate=...&endDate=...
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        const assignmentWhere: Prisma.LabourAssignmentWhereInput = {};

        // 1. Apply Date Filtering to the Assignments relation
        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (startDateParam) {
            // Start of the day for startDate
            dateFilter.gte = new Date(startDateParam + 'T00:00:00.000Z');
        }
        if (endDateParam) {
            // End of the day for endDate
            dateFilter.lte = new Date(endDateParam + 'T23:59:59.999Z');
        }

        if (startDateParam || endDateParam) {
            assignmentWhere.assigned_date = dateFilter;
        }

        // 2. Fetch all Labour Persons and filter their related assignments
        const labourPersons = await prisma.labourPerson.findMany({
            include: {
                assignments: {
                    where: assignmentWhere, // Apply the date filter here
                    select: {
                        collected_amount: true,
                        // Include assigned_date to ensure filtering works correctly, even if not used in calculation
                        assigned_date: true, 
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        // 3. Format output, ensuring Decimal fields are converted to Number safely
        const formattedReport = labourPersons.map(person => ({
            id: person.id,
            name: person.name,
            contact_info: person.contact_info,
            assignments: person.assignments.map(a => ({
                collected_amount: Number(a.collected_amount || 0),
            })),
        }));

        return NextResponse.json(formattedReport, { status: 200 });

    } catch (error) {
        console.error('Error fetching Labour Persons Report:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to generate labour persons report.' },
            { status: 500 }
        );
    }
}
