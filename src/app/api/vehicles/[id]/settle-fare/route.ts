import { requireAuth, isAuthError, Permissions } from '@/lib/auth';
// src/app/api/vehicles/[id]/settle-fare/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handles PATCH requests to settle an outstanding trip fare for a vehicle.
 * This creates a CREDIT transaction and updates the corresponding TripLog status.
 * Endpoint: /api/vehicles/[id]/settle-fare
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(request, Permissions.MASTER_DATA_WRITE);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const vehicleId = parseInt(id, 10);

    if (isNaN(vehicleId)) {
        return NextResponse.json(
            { message: 'Vehicle ID must be a valid number.' },
            { status: 400 }
        );
    }

    try {
        // MODIFIED: Accept new fields for custom description and owed amount
        const { paymentAmount, tripId, paymentDescription } = await request.json();
        const parsedTripId = Number(tripId);

        if (!Number.isInteger(parsedTripId) || parsedTripId <= 0) {
            return NextResponse.json(
                { message: 'A valid Trip ID is required.' },
                { status: 400 }
            );
        }

        let amountDecimal: Prisma.Decimal;
        try {
            amountDecimal = new Prisma.Decimal(paymentAmount);
        } catch {
            return NextResponse.json({ message: 'Payment amount is invalid.' }, { status: 400 });
        }

        if (amountDecimal.lte(0)) {
            return NextResponse.json(
                { message: 'Payment amount must be greater than zero.' },
                { status: 400 }
            );
        }

        const finalDescription = paymentDescription
            ? String(paymentDescription).slice(0, 255)
            : `Fare settlement payment for Trip ID #${parsedTripId}`;

        const result = await prisma.$transaction(async (tx) => {
            const trip = await tx.tripLog.findUnique({
                where: { id: parsedTripId },
                select: { id: true, vehicle_id: true, fare_is_paid: true, received_amount: true },
            });

            if (!trip || trip.vehicle_id !== vehicleId) {
                throw new Error('TRIP_NOT_FOUND');
            }
            if (trip.fare_is_paid) {
                throw new Error('ALREADY_PAID');
            }

            const owed = new Prisma.Decimal(trip.received_amount);
            if (amountDecimal.lt(owed)) {
                throw new Error('PARTIAL');
            }

            const marked = await tx.tripLog.updateMany({
                where: { id: parsedTripId, vehicle_id: vehicleId, fare_is_paid: false },
                data: { fare_is_paid: true },
            });
            if (marked.count !== 1) {
                throw new Error('ALREADY_PAID');
            }

            return tx.vehicleTransaction.create({
                data: {
                    vehicle_id: vehicleId,
                    trip_id: parsedTripId,
                    transaction_date: new Date(),
                    credit_amount: owed,
                    debit_amount: new Prisma.Decimal(0),
                    description: finalDescription,
                },
            });
        });

        return NextResponse.json({
            message: `Fare settled and payment transaction recorded for Vehicle ID ${vehicleId}.`,
            transaction: result
        }, { status: 200 });

    } catch (error) {
        if (error instanceof Error && error.message === 'TRIP_NOT_FOUND') {
            return NextResponse.json({ message: 'Trip was not found for this vehicle.' }, { status: 404 });
        }
        if (error instanceof Error && error.message === 'ALREADY_PAID') {
            return NextResponse.json({ message: 'This trip fare is already settled.' }, { status: 409 });
        }
        if (error instanceof Error && error.message === 'PARTIAL') {
            return NextResponse.json(
                { message: 'Payment must cover the full outstanding fare amount to settle the trip.' },
                { status: 400 }
            );
        }
        console.error(`Error settling fare for vehicle ${vehicleId}:`, error instanceof Error ? error.message : 'unknown');
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to settle fare.' },
            { status: 500 }
        );
    }
}