import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handles POST requests to record a payment against a LabourAssignment.
 * This implements the ledger/incremental payment requirement.
 * Endpoint: POST /api/labour-settlements
 */
export async function POST(request: NextRequest) {
    try {
        const { assignment_id, amount_paid, notes } = await request.json();

        if (!assignment_id || !amount_paid) {
            return NextResponse.json(
                { message: 'Assignment ID and amount_paid are required.' },
                { status: 400 }
            );
        }

        const amountDecimal = new Prisma.Decimal(amount_paid);
        if (amountDecimal.lte(0)) {
             return NextResponse.json(
                { message: 'Payment amount must be greater than zero.' },
                { status: 400 }
            );
        }

        // FIX: Added timeout option to prevent P2028 transaction timeout errors.
        const updatedAssignment = await prisma.$transaction(async (tx) => {
            
            // 1. Fetch current assignment to get current total and IDs
            const assignment = await tx.labourAssignment.findUnique({
                where: { id: assignment_id },
                select: { 
                    collected_amount: true, 
                    shipment_id: true,
                    labour_person_id: true,
                }
            });

            if (!assignment) {
                throw new Error('Labour Assignment not found.');
            }

            // 2. Calculate the new total collected amount
            const newCollectedAmount = assignment.collected_amount.plus(amountDecimal);

            // 3. Log the payment to LabourPaymentHistory (for the ledger)
            await tx.labourPaymentHistory.create({
                data: {
                    labour_person_id: assignment.labour_person_id,
                    shipment_id: assignment.shipment_id,
                    amount_paid: amountDecimal,
                    payment_date: new Date(),
                    payment_method: 'CASH', // Assuming cash for simplicity
                    notes,
                }
            });

            // 4. Update the collected_amount on the LabourAssignment (the running total)
            const updated = await tx.labourAssignment.update({
                where: { id: assignment_id },
                data: {
                    collected_amount: newCollectedAmount,
                },
                select: { id: true, collected_amount: true }
            });
            
            return updated;
        }, {
            // Increase timeout from default 5000ms to 30000ms (30 seconds)
            timeout: 30000, 
        });

        return NextResponse.json({
            message: `Payment of $${amountDecimal.toFixed(2)} recorded successfully. Total paid is now $${updatedAssignment.collected_amount.toFixed(2)}.`,
            assignment: updatedAssignment,
        }, { status: 200 });

    } catch (error: any) {
        console.error('Error recording labour payment:', error);
        return NextResponse.json(
            { message: `Internal Server Error: Failed to record payment. Details: ${error.message}` },
            { status: 500 }
        );
    }
}