// app/api/trips/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const TripShipmentLogSchema = z.object({
  serial_number: z.number().int().min(1),
  bilty_number: z.string().optional().default(''),
  receiver_id: z.number().int().min(1, 'Receiver is required'),
  item_id: z.number().int().min(1, 'Item is required'),
  quantity: z.number().int().min(1),
  delivery_charges: z.number().min(0),
  walk_in_receiver_name: z.string().optional(),
});

const TripLogSchema = z.object({
  vehicle_id: z.number().int().min(1, 'Vehicle is required'),
  driver_name: z.string().min(1, 'Driver name is required'),
  driver_mobile: z.string().min(1, 'Driver mobile is required'),
  station_name: z.string().min(1, 'Station name is required'),
  city_id: z.number().int().min(1, 'City is required'),
  date: z.string().min(1, 'Date is required'),
  arrival_time: z.string().min(1, 'Arrival time is required'),
  departure_time: z.string().min(1, 'Departure time is required'),
  total_fare_collected: z.number().min(0),
  delivery_cut_percentage: z.number().min(0).max(100),
  delivery_cut: z.number().min(0),
  cuts: z.number().optional().default(0),
  accountant_charges: z.number().min(0).optional().default(0),
  received_amount: z.number().min(0),
  fare_is_paid: z.boolean().default(false),
  note: z.string().optional(),
  shipmentLogs: z.array(TripShipmentLogSchema).min(1, 'At least one shipment log is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = TripLogSchema.parse(body);

    // Server-side calculation for data integrity
    const totalFare = validatedData.shipmentLogs.reduce((sum, log) => sum + log.delivery_charges, 0);
    const deliveryCut = (totalFare * validatedData.delivery_cut_percentage) / 100;

    const calculatedReceivedAmount = totalFare
      - deliveryCut
      - (validatedData.cuts || 0)
      - (validatedData.accountant_charges || 0);

    const result = await prisma.$transaction(async (tx) => {
      const tripLog = await tx.tripLog.create({
        data: {
          vehicle_id: validatedData.vehicle_id,
          driver_name: validatedData.driver_name,
          driver_mobile: validatedData.driver_mobile,
          station_name: validatedData.station_name,
          city: (await tx.city.findUnique({ where: { id: validatedData.city_id }, select: { name: true } }))?.name || 'Unknown',
          date: new Date(validatedData.date),
          arrival_time: validatedData.arrival_time,
          departure_time: validatedData.departure_time,
          total_fare_collected: totalFare,
          delivery_cut_percentage: validatedData.delivery_cut_percentage,
          delivery_cut: deliveryCut,
          commission: 0, // No longer used
          arrears: 0, // No longer used
          cuts: validatedData.cuts,
          munsihna_reward: 0, // No longer used
          distant_charges: 0, // No longer used
          accountant_charges: validatedData.accountant_charges,
          received_amount: validatedData.received_amount,
          note: validatedData.note,
        },
      });

      const [parties, items] = await Promise.all([
        tx.party.findMany({ select: { id: true, name: true } }),
        tx.itemCatalog.findMany({ select: { id: true, item_description: true } }),
      ]);

      const partyIdToName = new Map(parties.map((p) => [p.id, p.name] as const));
      const itemIdToDesc = new Map(items.map((i) => [i.id, i.item_description] as const));

      const shipmentLogsData = validatedData.shipmentLogs.map((log) => ({
        trip_log_id: tripLog.id,
        bilty_number: log.bilty_number || '',
        serial_number: log.serial_number,
        receiver_name: log.receiver_id === 1 ? (log.walk_in_receiver_name || 'Walk-in Customer') : (partyIdToName.get(log.receiver_id) || 'Unknown'),
        item_details: itemIdToDesc.get(log.item_id) || 'Unknown',
        quantity: log.quantity,
        delivery_charges: log.delivery_charges,
      }));

      await tx.tripShipmentLog.createMany({
        data: shipmentLogsData,
      });

      // Create vehicle transaction with the received amount as debit
      await tx.vehicleTransaction.create({
        data: {
          vehicle_id: validatedData.vehicle_id,
          trip_id: tripLog.id,
          transaction_date: new Date(validatedData.date),
          credit_amount: 0,
          debit_amount: validatedData.received_amount, // Always save received_amount as debit
          description: `Received amount for trip on ${validatedData.date}`,
        },
      });

      return tripLog;
    });

    return NextResponse.json(
      { message: 'Trip log created successfully', tripLog: result },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating trip log:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Internal Server Error: Failed to create trip log.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const vehicleIdParam = url.searchParams.get('vehicle_id');
    const dateParam = url.searchParams.get('date');

    const where: any = {};
    if (vehicleIdParam) where.vehicle_id = parseInt(vehicleIdParam, 10);
    if (dateParam) where.date = new Date(dateParam);

    const tripLogs = await prisma.tripLog.findMany({
      where,
      select: {
        id: true,
        vehicle_id: true,
        vehicle: { select: { vehicleNumber: true } },
        driver_name: true,
        driver_mobile: true,
        station_name: true,
        city: true,
        date: true,
        arrival_time: true,
        departure_time: true,
        total_fare_collected: true,
        delivery_cut: true,
        commission: true,
        arrears: true,
        cuts: true,
        munsihna_reward: true,
        distant_charges: true,
        accountant_charges: true,
        received_amount: true,
        note: true,
        shipmentLogs: {
          select: {
            id: true,
            bilty_number: true,
            serial_number: true,
            receiver_name: true,
            item_details: true,
            quantity: true,
            delivery_charges: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch total_charges from Shipment table for each shipment log
    const biltyNumbers = tripLogs.flatMap((log: any) => log.shipmentLogs.map((s: any) => s.bilty_number)).filter(Boolean);
    const shipments = await prisma.shipment.findMany({
      where: {
        bility_number: { in: biltyNumbers },
      },
      select: {
        bility_number: true,
        total_charges: true,
      },
    });
    const shipmentChargesMap = new Map(shipments.map(s => [s.bility_number, s.total_charges]));

    // Add total_charges to shipmentLogs
    const enrichedTripLogs = tripLogs.map((log: any) => ({
      ...log,
      shipmentLogs: log.shipmentLogs.map((s: any) => ({
        ...s,
        total_charges: shipmentChargesMap.get(s.bilty_number) || 0,
      })),
    }));

    return NextResponse.json(enrichedTripLogs, { status: 200 });
  } catch (error) {
    console.error('Error fetching trip logs:', error);
    return NextResponse.json(
      { message: 'Internal Server Error: Failed to fetch trip logs.' },
      { status: 500 }
    );
  }
}