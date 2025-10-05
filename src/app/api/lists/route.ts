import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Handles GET requests to fetch all necessary dropdown data for the Shipment form.
 * Endpoint: /api/lists
 */
export async function GET() {
  try {
    // Fetch all necessary data lists in parallel for efficiency
    const [cities, agencies, vehicles, parties, items, shipments] = await prisma.$transaction([
      prisma.city.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.agency.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.vehicle.findMany({ select: { id: true, vehicleNumber: true }, orderBy: { vehicleNumber: 'asc' } }),
      // Fetching Party data for Senders/Receivers
      prisma.party.findMany({ select: { id: true, name: true, contactInfo: true }, orderBy: { name: 'asc' } }),
      // Fetching Item Catalog data for Goods Details
      prisma.itemCatalog.findMany({ select: { id: true, item_description: true }, orderBy: { item_description: 'asc' } }),
      // Fetching Shipments for Bility Number selection
      prisma.shipment.findMany({
        select: {
          register_number: true,
          bility_number: true,
          receiver: { select: { name: true } },
          goodsDetails: {
            select: {
              itemCatalog: { select: { item_description: true } },
              quantity: true,
              delivery_charges: true
            }
          }
        },
        orderBy: { bility_number: 'asc' }
      }),
    ]);

    // Return the combined result
    return NextResponse.json({
      cities,
      agencies,
      vehicles,
      parties,
      items,
      shipments,
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching list data:', error);
    return NextResponse.json(
      { message: 'Internal Server Error: Failed to fetch dropdown lists.' }, 
      { status: 500 }
    );
  }
}
