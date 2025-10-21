// src/app/api/vehicles/[id]/financials/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// The shape of the URL parameters object expected by Next.js
interface RouteProps {
    params: {
        id: string; // The vehicle ID
    };
}

/**
 * Handles GET requests to retrieve a vehicle's financial ledger, plus summary status.
 * Endpoint: /api/vehicles/[id]/financials
 */
// FIX: Change function signature to match Next.js expectation when accessing params
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    
    // FIX: Access the id property safely. In some versions, params may be a promise.
    // We rely on the TypeScript definition above, but acknowledging the warning by stating the source of the ID.
   const { id } = await context.params; // ✅ await params
    const vehicleId = parseInt(id, 10);
    if (isNaN(vehicleId)) {
        return NextResponse.json(
            { message: 'Vehicle ID must be a valid number.' },
            { status: 400 }
        );
    }

    try {
        // Fetch the vehicle, its transactions, and the latest trip log
        const vehicleWithData = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
            include: {
                vehicleTransactions: {
                    orderBy: {
                        transaction_date: 'asc',
                    },
                },
                tripLogs: {
                    select: {
                        id: true,
                        fare_is_paid: true,
                        received_amount: true,
                    },
                    orderBy: { date: 'desc' },
                    take: 1, 
                },
            },
        });

        if (!vehicleWithData) {
            return NextResponse.json(
                { message: `Vehicle with ID ${vehicleId} not found.` },
                { status: 404 }
            );
        }

        // Calculate running balance and convert Decimal fields to Number for the client
        let runningBalance = 0;
        const ledger = vehicleWithData.vehicleTransactions.map((transaction) => {
            const creditAmount = Number(transaction.credit_amount);
            const debitAmount = Number(transaction.debit_amount);
            
            runningBalance += creditAmount - debitAmount;
            
            return {
                ...transaction,
                credit_amount: creditAmount, 
                debit_amount: debitAmount,   
                balance: runningBalance,
            };
        });

        // Determine the overall financial status based on the ledger balance
        const currentBalance = Number(runningBalance.toFixed(2));
        
        // Determine trip fare status based on the latest trip
        const lastTrip = vehicleWithData.tripLogs[0];
        const farePaymentStatus = lastTrip 
            ? (lastTrip.fare_is_paid ? 'PAID' : 'UNPAID')
            : 'N/A';
            
        // Get the ID of the trip that needs settling, if any
        const tripToSettleId = (farePaymentStatus === 'UNPAID' && lastTrip) ? lastTrip.id : null;


        return NextResponse.json({
            vehicle: {
                id: vehicleWithData.id,
                vehicleNumber: vehicleWithData.vehicleNumber,
            },
            ledger,
            summary: {
                currentBalance,
                farePaymentStatus,
                tripToSettleId,
            }
        }, { status: 200 });

    } catch (error) {
        console.error(`Error fetching financial ledger for vehicle ${vehicleId}:`, error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to fetch vehicle financial ledger.' },
            { status: 500 }
        );
    }
}