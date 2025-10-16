// app/api/shipments/by-vehicle-date/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const vehicleIdParam = url.searchParams.get('vehicle_id');
    const dateParam = url.searchParams.get('date');

    if (!vehicleIdParam || !dateParam) {
      return NextResponse.json(
        { message: 'vehicle_id and date are required' },
        { status: 400 }
      );
    }

    const vehicleId = parseInt(vehicleIdParam, 10);
    const date = new Date(dateParam);

    const shipments = await prisma.shipment.findMany({
      where: {
        vehicle_number_id: vehicleId,
        bility_date: date,
      },
      include: {
        receiver: {
          select: { id: true, name: true },
        },
        goodsDetails: {
          include: {
            itemCatalog: {
              select: { id: true, item_description: true },
            },
          },
        },
      },
    });

    // Map to the format expected by the frontend, with fallbacks for missing/null values
    const mappedShipments = shipments.flatMap((shipment) =>
      shipment.goodsDetails.map((goods) => ({
        register_number: shipment.register_number,
        bility_number: shipment.bility_number,
        receiver_id: shipment.receiver_id,
        receiver_name:
          shipment.receiver_id === 1
            ? shipment.walk_in_receiver_name || 'Walk-in Customer'
            : shipment.receiver?.name || 'Unknown',
        item_id: goods.item_name_id,
        item_description: goods.itemCatalog?.item_description || 'Unknown Item',
        quantity: goods.quantity,
        delivery_charges:
          goods.delivery_charges !== null && goods.delivery_charges !== undefined
            ? Number(goods.delivery_charges)
            : 0,
        total_charges: Number(shipment.total_charges),
      }))
    );

    return NextResponse.json(mappedShipments, { status: 200 });
  } catch (error) {
    console.error('Error fetching shipments by vehicle and date:', error);
    return NextResponse.json(
      { message: 'Internal Server Error: Failed to fetch shipments.' },
      { status: 500 }
    );
  }
}