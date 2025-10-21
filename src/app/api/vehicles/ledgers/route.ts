// src/app/api/vehicles/ledgers/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Define a simpler, focused summary interface for the frontend
interface VehiclePaymentSummary {
  vehicle: {
    id: number;
    vehicleNumber: string;
  };
  fareStatus: 'PAID' | 'UNPAID' | 'N/A'; // New status field
  amountDue: number; // The amount due (if unpaid) or the last paid amount
  lastTripDate: string | null;
}

/**
 * Handles GET requests to retrieve a simplified payment summary for all vehicles.
 * Endpoint: /api/vehicles/ledgers
 */
export async function GET() {
    try {
        // Fetch all vehicles with their transactions and the latest trip log.
        // We fetch the latest trip log to determine the current payment status and due amount.
        const vehiclesWithData = await prisma.vehicle.findMany({
            include: {
                tripLogs: {
                    select: {
                        fare_is_paid: true,
                        received_amount: true,
                        date: true,
                    },
                    orderBy: { date: 'desc' },
                    take: 1, // Only consider the latest trip for the current payment status
                },
            },
        });

        // Calculate summary for each vehicle
        const ledgers: VehiclePaymentSummary[] = vehiclesWithData.map((vehicle) => {
            const lastTrip = vehicle.tripLogs[0];
            
            let fareStatus: 'PAID' | 'UNPAID' | 'N/A' = 'N/A';
            let amountDue = 0;
            let lastTripDate: string | null = null;
            
            if (lastTrip) {
                lastTripDate = lastTrip.date.toISOString().split('T')[0];
                const receivedAmount = Number(lastTrip.received_amount || 0);

                if (lastTrip.fare_is_paid) {
                    fareStatus = 'PAID';
                    amountDue = receivedAmount; // Show the amount of the last settled trip
                } else {
                    fareStatus = 'UNPAID';
                    amountDue = receivedAmount; // Show the amount that is currently due/unpaid
                }
            }

            return {
                vehicle: {
                    id: vehicle.id,
                    vehicleNumber: vehicle.vehicleNumber,
                },
                fareStatus,
                amountDue: Number(amountDue.toFixed(2)),
                lastTripDate,
            };
        });

        return NextResponse.json(ledgers, { status: 200 });

    } catch (error) {
        console.error('Error fetching vehicle payment summary:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to fetch vehicle payment summary.' },
            { status: 500 }
        );
    }
}