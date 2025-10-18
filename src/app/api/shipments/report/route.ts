import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handles GET requests to retrieve a filtered list of Shipment records for reporting.
 * Endpoint: /api/shipments/report?startDate=...&endDate=...&departureCityId=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const departureCityIdParam = searchParams.get('departureCityId');
    const toCityIdParam = searchParams.get('toCityId');
    const vehicleIdParam = searchParams.get('vehicleId');

    const where: Prisma.ShipmentWhereInput = {};

    // 1. Date Filtering (bility_date)
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
        where.bility_date = dateFilter;
    }

    // 2. City Filtering
    const parsedDepartureCityId = parseInt(departureCityIdParam || '0');
    if (parsedDepartureCityId > 0) {
        where.departure_city_id = parsedDepartureCityId;
    }
    
    const parsedToCityId = parseInt(toCityIdParam || '0');
    if (parsedToCityId > 0) {
        where.to_city_id = parsedToCityId;
    }

    // 3. Vehicle Filtering
    const parsedVehicleId = parseInt(vehicleIdParam || '0');
    if (parsedVehicleId > 0) {
        where.vehicle_number_id = parsedVehicleId;
    }

    // Fetch Shipments with necessary relations as expected by the client page
    const shipments = await prisma.shipment.findMany({
        where,
        include: {
            departureCity: true,
            toCity: true,
            sender: true,
            receiver: true,
            vehicle: true,
            goodsDetails: true, // Needed for total quantity calculation in the report page
        },
        orderBy: { bility_date: 'desc' },
    });
    
    // Convert Decimal types to number and Date objects to ISO strings for the JSON response
    const formattedShipments = shipments.map(s => ({
        ...s,
        // Convert Decimal to Number for frontend consumption
        total_charges: Number(s.total_charges),
        total_delivery_charges: Number(s.total_delivery_charges),
        
        // Convert Date objects to ISO string
        bility_date: s.bility_date.toISOString(),
        
        // Ensure goodsDetails are also formatted correctly (if they contain Decimals)
        goodsDetails: s.goodsDetails.map(gd => ({
            ...gd,
            charges: Number(gd.charges),
            delivery_charges: Number(gd.delivery_charges),
        })),
    }));

    return NextResponse.json(formattedShipments, { status: 200 });
  } catch (error) {
    console.error('Error fetching shipments report:', error);
    return NextResponse.json(
        { error: 'Internal Server Error: Failed to generate shipment report.' },
        { status: 500 }
    );
  }
}