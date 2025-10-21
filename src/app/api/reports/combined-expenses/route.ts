// src/app/api/reports/combined-expenses/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handles GET requests to retrieve a consolidated report of delivery and trip expenses.
 * Endpoint: /api/reports/combined-expenses?startDate=...&endDate=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // 1. Prepare Date Filtering
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDateParam) {
        dateFilter.gte = new Date(startDateParam + 'T00:00:00.000Z');
    }
    if (endDateParam) {
        dateFilter.lte = new Date(endDateParam + 'T23:59:59.999Z');
    }

    // 2. Fetch Deliveries and TripLogs in parallel
    const [deliveryData, tripLogData] = await prisma.$transaction([
        // Fetch all delivery records within the date range
        prisma.delivery.findMany({
            where: {
                delivery_date: dateFilter,
            },
            select: {
                delivery_id: true,
                delivery_date: true,
                shipment_id: true,
                station_expense: true,
                bility_expense: true,
                station_labour: true,
                cart_labour: true,
                total_expenses: true,
                shipment: {
                    select: {
                        bility_number: true,
                        total_charges: true, // Delivery Charges on Shipment (if needed)
                    }
                }
            },
        }),
        // Fetch trip logs within the date range (Trip Log is linked by Trip.date)
        prisma.tripLog.findMany({
            where: {
                date: dateFilter,
            },
            select: {
                id: true,
                date: true,
                vehicle: { select: { vehicleNumber: true } },
                driver_name: true,
                delivery_cut: true, // The expense we want to track
                cuts: true,
                accountant_charges: true,
            }
        })
    ]);
    
    // 3. Format and Consolidate Delivery Expenses (Convert Decimals to Number)
    const consolidatedDeliveries = deliveryData.map(d => ({
        id: d.delivery_id,
        type: 'DELIVERY_EXPENSE',
        date: d.delivery_date.toISOString().split('T')[0],
        bility_number: d.shipment?.bility_number || 'N/A',
        total_delivery_charge: Number(d.shipment?.total_charges || 0),
        station_expense: Number(d.station_expense),
        bility_expense: Number(d.bility_expense),
        station_labour: Number(d.station_labour),
        cart_labour: Number(d.cart_labour),
        total_expense: Number(d.total_expenses),
    }));

    // 4. Format and Consolidate Trip Expenses (Convert Decimals to Number)
    const consolidatedTrips = tripLogData.map(t => ({
        id: t.id,
        type: 'TRIP_EXPENSE',
        date: t.date.toISOString().split('T')[0],
        vehicle_number: t.vehicle?.vehicleNumber || 'N/A',
        driver_name: t.driver_name,
        delivery_cut: Number(t.delivery_cut), 
        cuts: Number(t.cuts),
        accountant_charges: Number(t.accountant_charges),
    }));

    // 5. Calculate Grand Totals
    const totalDeliveryExpenses = consolidatedDeliveries.reduce((sum, d) => sum + d.total_expense, 0);
    const totalBilityExpenses = consolidatedDeliveries.reduce((sum, d) => sum + d.bility_expense, 0);
    const totalStationExpenses = consolidatedDeliveries.reduce((sum, d) => sum + d.station_expense, 0);
    const totalStationLabour = consolidatedDeliveries.reduce((sum, d) => sum + d.station_labour, 0);
    const totalCartLabour = consolidatedDeliveries.reduce((sum, d) => sum + d.cart_labour, 0);

    const totalDeliveryCut = consolidatedTrips.reduce((sum, t) => sum + t.delivery_cut, 0);
    
    // Combine all individual items for the detailed list view
    const allExpenses = [...consolidatedDeliveries, ...consolidatedTrips.map(t => ({
        ...t,
        // Transform Trip Expense to fit a common structure for listing
        bility_number: 'N/A (Trip)',
        station_expense: 0,
        bility_expense: 0,
        station_labour: 0,
        cart_labour: 0,
        total_expense: t.delivery_cut + t.cuts + t.accountant_charges, // Sum of Trip-related expenses
    }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


    return NextResponse.json({
      details: allExpenses,
      summary: {
        totalDeliveryExpenses,
        totalBilityExpenses,
        totalStationExpenses,
        totalStationLabour,
        totalCartLabour,
        totalDeliveryCut,
        grandTotalExpenses: totalDeliveryExpenses + totalDeliveryCut, // Total of all calculated expenses
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching combined expenses report:', error);
    return NextResponse.json(
        { error: 'Internal Server Error: Failed to generate combined expenses report.' },
        { status: 500 }
    );
  }
}