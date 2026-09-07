import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const PAYMENT_STATUS_PREFIX = "PAYMENT_STATUS:";

export async function GET(request: NextRequest, { params }: { params: Promise<{ shipmentId: string }> }) {
  const { shipmentId } = await params;
  
  try {
    const cleanId = decodeURIComponent(shipmentId).trim();
    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [
          { register_number: cleanId },
          { bility_number: cleanId },
        ],
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
        deliveries: {
          orderBy: { delivery_date: 'desc' },
          take: 1,
        },
      },
    });

    if (!shipment) {
      return NextResponse.json({ message: 'Shipment not found with this ID.' }, { status: 404 });
    }

    const extractPaymentStatus = (remarks: string | null): string => {
      if (remarks && remarks.startsWith(PAYMENT_STATUS_PREFIX)) {
        return remarks.split(' ')[0].replace(PAYMENT_STATUS_PREFIX, '');
      }
      return 'PENDING';
    };

    // Convert Decimal types to string / numbers for safe JSON serialization
    const serializeShipment = {
      ...shipment,
      total_charges: shipment.total_charges.toString(),
      total_delivery_charges: shipment.total_delivery_charges.toString(),
      station_expense: shipment.station_expense?.toString() || '0',
      bility_expense: shipment.bility_expense?.toString() || '0',
      station_labour: shipment.station_labour?.toString() || '0',
      cart_labour: shipment.cart_labour?.toString() || '0',
      total_expenses: shipment.total_expenses?.toString() || '0',
      payment_status: extractPaymentStatus(shipment.remarks),
      bility_date: shipment.bility_date.toISOString().split('T')[0],
      delivery_date: shipment.delivery_date?.toISOString().split('T')[0] || null,
      goodsDetails: shipment.goodsDetails.map(detail => ({
        ...detail,
        charges: detail.charges.toString(),
        delivery_charges: detail.delivery_charges.toString(),
      })),
      latestDelivery: shipment.deliveries && shipment.deliveries.length > 0 ? shipment.deliveries[0] : null,
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ shipmentId: string }> }) {
  const { shipmentId } = await params;
  try {
    const cleanId = decodeURIComponent(shipmentId).trim();

    await prisma.$transaction(async (tx) => {
      // Delete associated records to satisfy foreign key constraints
      await tx.transaction.deleteMany({ where: { shipment_id: cleanId } });
      await tx.delivery.deleteMany({ where: { shipment_id: cleanId } });
      await tx.vehicleTransaction.deleteMany({ where: { shipment_id: cleanId } });
      await tx.labourAssignment.deleteMany({ where: { shipment_id: cleanId } });
      await tx.labourPaymentHistory.deleteMany({ where: { shipment_id: cleanId } });
      
      // Cascade delete is usually handled by Prisma for these, but we explicitly delete to be safe
      await tx.goodsDetails.deleteMany({ where: { shipment_id: cleanId } });
      await tx.returnShipment.deleteMany({ where: { original_shipment_id: cleanId } });

      // Delete the main shipment record
      await tx.shipment.delete({ where: { register_number: cleanId } });
    });

    return NextResponse.json({ message: 'Shipment deleted successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting shipment:', error);
    return NextResponse.json({ message: error.message || 'Failed to delete shipment' }, { status: 500 });
  }
}
