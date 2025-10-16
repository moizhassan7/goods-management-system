import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Define the shape of the URL parameters
interface Params {
    params: {
        id: string; // The vehicle ID
    };
}

/**
 * Handles GET requests to retrieve a vehicle's financial ledger.
 * Endpoint: /api/vehicles/[id]/financials
 */
export async function GET(request: Request, { params }: Params) {
    const vehicleId = parseInt(params.id, 10);

    if (isNaN(vehicleId)) {
        return NextResponse.json(
            { message: 'Vehicle ID must be a valid number.' },
            { status: 400 }
        );
    }

    try {
        // Fetch the vehicle and its vehicle transactions for the ledger
        const vehicleWithLedger = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
            include: {
                vehicleTransactions: {
                    orderBy: {
                        transaction_date: 'asc',
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

        // Calculate running balance
        let runningBalance = 0;
        const ledger = vehicleWithLedger.vehicleTransactions.map((transaction) => {
            runningBalance += Number(transaction.credit_amount) - Number(transaction.debit_amount);
            return {
                ...transaction,
                balance: runningBalance,
            };
        });

        return NextResponse.json({
            vehicle: {
                id: vehicleWithLedger.id,
                vehicleNumber: vehicleWithLedger.vehicleNumber,
            },
            ledger,
        }, { status: 200 });

    } catch (error) {
        console.error(`Error fetching financial ledger for vehicle ${vehicleId}:`, error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to fetch vehicle financial ledger.' },
            { status: 500 }
        );
    }
}
