import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handles GET requests to retrieve a single Vehicle and its Transaction ledger.
 * Endpoint: /api/vehicles/[id]
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const vehicleId = parseInt(id, 10);

    if (isNaN(vehicleId)) {
        return NextResponse.json(
            { message: 'Vehicle ID must be a valid number.' },
            { status: 400 }
        );
    }

    try {
        // Fetch the vehicle and INCLUDE all related vehicle transactions.
        const vehicleWithLedger = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
            include: {
                // Order vehicle transactions chronologically for the ledger view
                vehicleTransactions: {
                    orderBy: {
                        transaction_date: 'asc', // Show oldest transactions first
                    },
                },
            },
        });

        if (!vehicleWithLedger) {
            return NextResponse.json(
                { message: `Vehicle with ID ${vehicleId} not found.` },
                { status: 404 }
            );
        }

        // Return the full object: vehicle details + transactions array
        return NextResponse.json(vehicleWithLedger, { status: 200 });

    } catch (error) {
        console.error(`Error fetching ledger for vehicle ${vehicleId}:`, error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to fetch vehicle ledger.' },
            { status: 500 }
        );
    }
}