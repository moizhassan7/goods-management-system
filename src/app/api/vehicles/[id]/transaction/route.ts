// src/app/api/vehicles/[id]/transaction/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface RouteProps {
    params: {
        id: string; // The vehicle ID
    };
}

/**
 * Handles POST requests to record a generic manual transaction (Credit or Debit)
 * for a specific vehicle.
 * Endpoint: /api/vehicles/[id]/transaction
 */
export async function POST(request: NextRequest, { params }: RouteProps) {
    const vehicleId = parseInt(params.id, 10);

    if (isNaN(vehicleId)) {
        return NextResponse.json(
            { message: 'Vehicle ID must be a valid number.' },
            { status: 400 }
        );
    }

    try {
        const { amount, description, type } = await request.json();
        
        const amountDecimal = new Prisma.Decimal(amount);

        if (amountDecimal.lte(0) || !description || !['DEBIT', 'CREDIT'].includes(type)) {
            return NextResponse.json(
                { message: 'Invalid amount, description, or transaction type.' },
                { status: 400 }
            );
        }

        // Create the transaction
        const newTransaction = await prisma.vehicleTransaction.create({
            data: {
                vehicle_id: vehicleId,
                transaction_date: new Date(),
                credit_amount: type === 'CREDIT' ? amountDecimal : new Prisma.Decimal(0),
                debit_amount: type === 'DEBIT' ? amountDecimal : new Prisma.Decimal(0),
                description: description,
            },
        });

        return NextResponse.json({
            message: `Manual ${type} transaction recorded for Vehicle ID ${vehicleId}.`,
            transaction: newTransaction
        }, { status: 201 });

    } catch (error: any) {
        console.error(`Error recording manual transaction for vehicle ${vehicleId}:`, error);
        return NextResponse.json(
            { message: `Internal Server Error: Failed to record transaction. Details: ${error.message}` },
            { status: 500 }
        );
    }
}