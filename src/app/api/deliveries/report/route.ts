import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handles GET requests to retrieve a filtered list of Delivery records for reporting.
 * Endpoint: /api/deliveries/report?startDate=...&endDate=...&shipment_id=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const shipmentIdParam = searchParams.get('shipment_id');

    const where: Prisma.DeliveryWhereInput = {};

    // 1. Apply Date Filtering (delivery_date)
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDateParam) {
        // Start of the day for startDate (using Z for UTC offset)
        dateFilter.gte = new Date(startDateParam + 'T00:00:00.000Z');
    }
    if (endDateParam) {
        // End of the day for endDate (using Z for UTC offset)
        dateFilter.lte = new Date(endDateParam + 'T23:59:59.999Z');
    }
    if (startDateParam || endDateParam) {
        where.delivery_date = dateFilter;
    }

    // 2. Apply Shipment ID Filtering
    if (shipmentIdParam) {
        where.shipment_id = shipmentIdParam;
    }

    // Fetch Deliveries with necessary relations
    const deliveries = await prisma.delivery.findMany({
        where,
        include: {
            shipment: { 
                select: {
                    bility_number: true,
                    sender: { select: { name: true } }, 
                    receiver: { select: { name: true } }, 
                }
            }
        },
        orderBy: { delivery_date: 'desc' },
    });
    
    // Convert Decimal types to number and Date objects to ISO strings for the JSON response
    const formattedDeliveries = deliveries.map(d => ({
        ...d,
        // Convert Decimal fields to Number for frontend consumption
        station_expense: Number(d.station_expense),
        bility_expense: Number(d.bility_expense),
        station_labour: Number(d.station_labour),
        cart_labour: Number(d.cart_labour),
        total_expenses: Number(d.total_expenses),
        
        // Convert Date object to ISO string
        delivery_date: d.delivery_date.toISOString(), 
    }));

    return NextResponse.json(formattedDeliveries, { status: 200 });
  } catch (error) {
    console.error('Error fetching deliveries report:', error);
    return NextResponse.json(
        { error: 'Internal Server Error: Failed to generate deliveries report.' },
        { status: 500 }
    );
  }
}