import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ shipmentId: string }> }) {
  const { shipmentId } = await params;
  try {
    const payload = await request.json();
    const bilityDate = new Date(payload.bility_date);
    const finalBillAmount = new Prisma.Decimal(payload.total_amount || 0);
    const totalDeliveryCharges = new Prisma.Decimal(payload.total_delivery_charges || 0);

    let finalRemarks = payload.remarks || '';
    if (payload.payment_status) {
      finalRemarks = `PAYMENT_STATUS:${payload.payment_status} ${finalRemarks}`;
    }

    const goodsDetailsForCreate = (payload.goods_details || []).map((detail: any) => ({
      item_name_id: detail.item_id,
      quantity: detail.quantity || 1,
      charges: new Prisma.Decimal(0),
      delivery_charges: new Prisma.Decimal(0),
    }));

    const updatedShipment = await prisma.$transaction(async (tx) => {
      // 1. Delete existing goods details for this shipment
      await tx.goodsDetails.deleteMany({
        where: { shipment_id: shipmentId }
      });

      // 2. Update main shipment
      const shipment = await tx.shipment.update({
        where: { register_number: shipmentId },
        data: {
          bility_number: payload.bility_number,
          bility_date: bilityDate,
          departure_city_id: payload.departure_city_id,
          to_city_id: payload.to_city_id || undefined,
          forwarding_agency_id: payload.forwarding_agency_id,
          vehicle_number_id: payload.vehicle_number_id,
          sender_id: payload.sender_id,
          receiver_id: payload.receiver_id,
          total_charges: finalBillAmount,
          total_delivery_charges: totalDeliveryCharges,
          station_expense: new Prisma.Decimal(payload.station_expense || 0),
          bility_expense: new Prisma.Decimal(payload.bility_expense || 0),
          station_labour: new Prisma.Decimal(payload.station_labour || 0),
          cart_labour: new Prisma.Decimal(payload.cart_labour || 0),
          total_expenses: new Prisma.Decimal(payload.total_expenses || 0),
          remarks: finalRemarks,
          goodsDetails: {
            createMany: {
              data: goodsDetailsForCreate,
            }
          }
        },
      });

      // 3. Update transactions
      await tx.transaction.deleteMany({
        where: { shipment_id: shipmentId }
      });

      if (payload.payment_status !== 'ALREADY_PAID' && payload.payment_status !== 'FREE') {
        await tx.transaction.create({
          data: {
            transaction_date: new Date(),
            party_type: 'SENDER',
            party_ref_id: payload.sender_id,
            shipment_id: shipmentId,
            credit_amount: finalBillAmount,
            debit_amount: new Prisma.Decimal(0),
            description: `Shipment Bill for Bility #${payload.bility_number}. Sender: Party ID: ${payload.sender_id}.`,
          }
        });
      }

      return shipment;
    });

    return NextResponse.json({
      message: 'Shipment updated successfully.',
      shipment: updatedShipment,
      register_number: shipmentId,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating shipment:', error);
    return NextResponse.json({ message: error.message || 'Failed to update shipment' }, { status: 500 });
  }
}

