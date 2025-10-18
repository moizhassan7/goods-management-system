import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, LabourAssignmentStatus } from '@prisma/client';

/**
 * Handles GET requests to retrieve a report summary for Labour Assignments, 
 * filtered by date range and status.
 *
 * NOTE: This query joins the Delivery table to fetch expense data captured
 * during the COLLECT phase.
 * Endpoint: /api/labour-assignments/report?startDate=...&endDate=...&status=...
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const statusParam = searchParams.get('status');

        const where: Prisma.LabourAssignmentWhereInput = {};

        // 1. Apply Date Filtering
        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (startDateParam) {
            dateFilter.gte = new Date(startDateParam + 'T00:00:00.000Z');
        }
        if (endDateParam) {
            dateFilter.lte = new Date(endDateParam + 'T23:59:59.999Z');
        }
        if (startDateParam || endDateParam) {
            where.assigned_date = dateFilter;
        }

        // 2. Apply Status Filtering
        if (statusParam && Object.values(LabourAssignmentStatus).includes(statusParam as LabourAssignmentStatus)) {
            where.status = statusParam as LabourAssignmentStatus;
        }

        // 3. Fetch Assignments, including Shipment charges, LabourPerson name, and Delivery details
        const assignments = await prisma.labourAssignment.findMany({
            where,
            include: {
                labourPerson: {
                    select: { name: true }
                },
                shipment: {
                    select: { 
                        register_number: true, 
                        bility_number: true,
                        total_charges: true, // Shipment gross charge
                        deliveries: {
                            // Only include the latest delivery record
                            orderBy: { delivery_id: 'desc' },
                            take: 1,
                            select: {
                                total_expenses: true,
                                // Assuming discount_amount is part of the delivery or calculated here
                                // For mock purposes, we assume a discount field existed in Delivery or calculate a placeholder:
                                station_expense: true,
                                bility_expense: true,
                                station_labour: true,
                                cart_labour: true,
                            }
                        }
                    }
                },
            },
            orderBy: { assigned_date: 'desc' },
        });

        // 4. Format output and calculate financial metrics
        const formattedReport = assignments.map(a => {
            const delivery = a.shipment.deliveries[0] || null;
            const grossShipmentCharge = Number(a.shipment.total_charges);
            const totalExpenses = Number(delivery?.total_expenses || 0);
            const collectedNet = Number(a.collected_amount || 0);
            
            // NOTE: Since the discount isn't stored explicitly in assignment data, 
            // we calculate the implied discount if collection has occurred:
            // Discount = (Shipment Charge + Expenses) - Net Collected
            let impliedDiscount = 0;
            if (a.status !== LabourAssignmentStatus.ASSIGNED && collectedNet > 0) {
                 impliedDiscount = (grossShipmentCharge + totalExpenses) - collectedNet;
            }

            return {
                id: a.id,
                assigned_date: a.assigned_date.toISOString(),
                status: a.status,
                labourPerson: a.labourPerson,
                shipment: a.shipment,
                
                // NEW CALCULATED FIELDS for the report table
                shipment_charges: grossShipmentCharge,
                total_expenses: totalExpenses,
                discount_given: Math.max(0, impliedDiscount), // Ensure discount is not negative
                total_receivable_pre_discount: grossShipmentCharge + totalExpenses,
                net_collected: collectedNet,
            };
        });

        return NextResponse.json(formattedReport, { status: 200 });

    } catch (error) {
        console.error('Error fetching Labour Assignments Report:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to generate labour assignments report.' },
            { status: 500 }
        );
    }
}
