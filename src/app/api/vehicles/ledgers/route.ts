import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface VehicleLedgerSummary {
  vehicle: {
    id: number;
    vehicleNumber: string;
  };
  totalCredits: number;
  totalDebits: number;
  balance: number;
  transactionCount: number;
}

/**
 * Handles GET requests to retrieve a summary of all vehicle ledgers.
 * Endpoint: /api/vehicles/ledgers
 */
export async function GET() {
    try {
        // Fetch all vehicles with their transaction summaries
        const vehiclesWithTransactions = await prisma.vehicle.findMany({
            include: {
                vehicleTransactions: true,
            },
        });

        // Calculate summary for each vehicle
        const ledgers: VehicleLedgerSummary[] = vehiclesWithTransactions.map((vehicle) => {
            const transactions = vehicle.vehicleTransactions;
            const totalCredits = transactions.reduce((sum, t) => sum + Number(t.credit_amount), 0);
            const totalDebits = transactions.reduce((sum, t) => sum + Number(t.debit_amount), 0);
            const balance = totalCredits - totalDebits;

            return {
                vehicle: {
                    id: vehicle.id,
                    vehicleNumber: vehicle.vehicleNumber,
                },
                totalCredits,
                totalDebits,
                balance,
                transactionCount: transactions.length,
            };
        });

        return NextResponse.json(ledgers, { status: 200 });

    } catch (error) {
        console.error('Error fetching vehicle ledgers:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to fetch vehicle ledgers.' },
            { status: 500 }
        );
    }
}
