import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Zod schema for TripShipmentLog
const TripShipmentLogSchema = z.object({
  serial_number: z.number().int().min(1),
  shipment_id: z.string().min(1, 'Shipment ID is required'),
  receiver_name: z.string().min(1, 'Receiver name is required'),
  item_details: z.string().min(1, 'Item details are required'),
  quantity: z.number().int().min(1),
  delivery_charges: z.number().min(0),
});

// Zod schema for TripLog
const TripLogSchema = z.object({
  vehicle_id: z.number().int().min(1, 'Vehicle is required'),
  driver_name: z.string().min(1, 'Driver name is required'),
  driver_mobile: z.string().min(1, 'Driver mobile is required'),
  station_name: z.string().min(1, 'Station name is required'),
  city: z.string().min(1, 'City is required'),
  date: z.string().min(1, 'Date is required'),
  arrival_time: z.string().min(1, 'Arrival time is required'),
  departure_time: z.string().min(1, 'Departure time is required'),
  total_fare_collected: z.number().min(0),
  delivery_cut: z.number().min(0),
  commission: z.number().min(0),
  received_amount: z.number().min(0),
  accountant_reward: z.number().min(0).optional().default(0),
  remaining_fare: z.number().min(0),
  note: z.string().optional(),
  shipmentLogs: z.array(TripShipmentLogSchema).min(1, 'At least one shipment log is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = TripLogSchema.parse(body);

    // Calculate total_fare_collected if not provided or sum from shipmentLogs
    const calculatedTotalFare = validatedData.shipmentLogs.reduce((sum, log) => sum + log.delivery_charges, 0);
    const totalFare = validatedData.total_fare_collected || calculatedTotalFare;

    // Calculate remaining_fare if not provided
    const remainingFare = validatedData.remaining_fare || (totalFare - validatedData.delivery_cut - validatedData.commission);

    const result = await prisma.$transaction(async (tx) => {
      // Create TripLog
      const tripLog = await tx.tripLog.create({
        data: {
          vehicle_id: validatedData.vehicle_id,
          driver_name: validatedData.driver_name,
          driver_mobile: validatedData.driver_mobile,
          station_name: validatedData.station_name,
          city: validatedData.city,
          date: new Date(validatedData.date),
          arrival_time: validatedData.arrival_time,
          departure_time: validatedData.departure_time,
          total_fare_collected: totalFare,
          delivery_cut: validatedData.delivery_cut,
          commission: validatedData.commission,
          received_amount: validatedData.received_amount,
          accountant_reward: validatedData.accountant_reward,
          remaining_fare: remainingFare,
          note: validatedData.note,
        },
      });

      // Create TripShipmentLogs
      const shipmentLogsData = validatedData.shipmentLogs.map((log, index) => ({
        trip_log_id: tripLog.id,
        shipment_id: log.shipment_id,
        serial_number: log.serial_number,
        receiver_name: log.receiver_name,
        item_details: log.item_details,
        quantity: log.quantity,
        delivery_charges: log.delivery_charges,
      }));

      await tx.tripShipmentLog.createMany({
        data: shipmentLogsData,
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

export async function GET() {
  try {
    const tripLogs = await prisma.tripLog.findMany({
      include: {
        vehicle: { select: { vehicleNumber: true } },
        shipmentLogs: {
          include: {
            shipment: { select: { bility_number: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tripLogs, { status: 200 });
  } catch (error) {
    console.error('Error fetching trip logs:', error);
    return NextResponse.json(
      { message: 'Internal Server Error: Failed to fetch trip logs.' },
      { status: 500 }
    );
  }
}
