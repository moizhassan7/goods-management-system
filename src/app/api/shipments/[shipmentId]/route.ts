import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: Promise<{ shipmentId: string }> }) {
  const { shipmentId } = await params;
  
  try {
    const shipment = await prisma.shipment.findUnique({
      where: {
        register_number: shipmentId, // Assumes shipmentId from params matches the register_number field
      },
      include: {
        // Eagerly load the GoodsDetails and their corresponding ItemCatalog for the ReturnForm
        goodsDetails: {
          include: {
            itemCatalog: true,
          },
        },
        departureCity: true,
        toCity: true,
        sender: true,
        receiver: true,
        forwardingAgency: true,
        vehicle: true,
      },
    });

    if (!shipment) {
      // This is what likely causes the "Shipment not found" error if the ID is incorrect
      return NextResponse.json({ message: 'Shipment not found with this ID.' }, { status: 404 });
    }

    // Convert Decimal types to string for safe JSON serialization
    const serializeShipment = {
      ...shipment,
      total_charges: shipment.total_charges.toString(),
      total_delivery_charges: shipment.total_delivery_charges.toString(),
      goodsDetails: shipment.goodsDetails.map(detail => ({
        ...detail,
        charges: detail.charges.toString(),
        delivery_charges: detail.delivery_charges.toString(),
      }))
    };

    return NextResponse.json(serializeShipment, { status: 200 });
  } catch (error) {
    console.error('Error fetching shipment:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
