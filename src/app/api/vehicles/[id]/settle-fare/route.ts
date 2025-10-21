// src/app/api/vehicles/[id]/settle-fare/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface RouteProps {
    params: {
        id: string; // The vehicle ID
    };
}

/**
 * Handles PATCH requests to settle an outstanding trip fare for a vehicle.
 * This creates a CREDIT transaction and updates the corresponding TripLog status.
 * Endpoint: /api/vehicles/[id]/settle-fare
 */
export async function PATCH(request: NextRequest, { params }: RouteProps) {
    const vehicleId = parseInt(params.id, 10);

    if (isNaN(vehicleId)) {
        return NextResponse.json(
            { message: 'Vehicle ID must be a valid number.' },
            { status: 400 }
        );
    }

    try {
        // MODIFIED: Accept new fields for custom description and owed amount
        const { paymentAmount, tripId, owedAmount, paymentDescription } = await request.json(); 
        
        const amountDecimal = new Prisma.Decimal(paymentAmount);
        const owedDecimal = new Prisma.Decimal(owedAmount); 

        if (!tripId || amountDecimal.lte(0)) {
            return NextResponse.json(
                { message: 'Payment amount must be greater than zero and a valid Trip ID is required.' },
                { status: 400 }
            );
        }

        // FIX (Issue 2): Enforce full payment to set the fare as paid.
        // We check if the payment covers the full owed amount for the current outstanding trip.
        const isFullPayment = amountDecimal.gte(owedDecimal);
        
        if (!isFullPayment) {
            // Rejects partial payment to prevent premature PAID status update, as requested.
            return NextResponse.json(
                { message: 'Payment must cover the full outstanding fare amount to settle the trip.' },
                { status: 400 }
            );
        }
        
        // FIX (Issue 1): Use the custom description if provided.
        const finalDescription = paymentDescription 
            ? paymentDescription 
            : `Fare settlement payment for Trip ID #${tripId}`;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create a CREDIT transaction for the vehicle (Company pays the vehicle)
            const newTransaction = await tx.vehicleTransaction.create({
                data: {
                    vehicle_id: vehicleId,
                    trip_id: tripId,
                    transaction_date: new Date(),
                    credit_amount: amountDecimal,
                    debit_amount: new Prisma.Decimal(0),
                    description: finalDescription, // Use custom description
                },
            });

            // 2. Update the corresponding TripLog to mark the fare as paid
            // This is safe because we already verified `isFullPayment` above.
            await tx.tripLog.update({
                where: { id: tripId },
                data: {
                    fare_is_paid: true,
                },
            });

            return newTransaction;
        });

        return NextResponse.json({
            message: `Fare settled and payment transaction recorded for Vehicle ID ${vehicleId}.`,
            transaction: result
        }, { status: 200 });

    } catch (error: any) {
        console.error(`Error settling fare for vehicle ${vehicleId}:`, error);
        return NextResponse.json(
            { message: `Internal Server Error: Failed to settle fare. Details: ${error.message}` },
            { status: 500 }
        );
    }
}