import { requireAuth, isAuthError, Permissions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handles POST requests to record a payment against a LabourAssignment.
 * This implements the ledger/incremental payment requirement.
 * Endpoint: POST /api/labour-settlements
 */
export async function POST(request: NextRequest) {
    const auth = await requireAuth(request, Permissions.LABOUR_MANAGEMENT);
    if (isAuthError(auth)) return auth;

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
            const assignment = await tx.labourAssignment.findUnique({
                where: { id: assignment_id },
                select: { 
                    shipment_id: true,
                    labour_person_id: true,
                }
            });

            if (!assignment) {
                throw new Error('NOT_FOUND');
            }

            await tx.labourPaymentHistory.create({
                data: {
                    labour_person_id: assignment.labour_person_id,
                    shipment_id: assignment.shipment_id,
                    amount_paid: amountDecimal,
                    payment_date: new Date(),
                    payment_method: 'CASH',
                    notes,
                }
            });

            return tx.labourAssignment.update({
                where: { id: assignment_id },
                data: {
                    collected_amount: { increment: amountDecimal },
                },
                select: { id: true, collected_amount: true }
            });
        }, {
            // Increase timeout from default 5000ms to 30000ms (30 seconds)
            timeout: 30000, 
        });

        const totalPaid = updatedAssignment.collected_amount ? updatedAssignment.collected_amount.toFixed(2) : '0.00';
        return NextResponse.json({
            message: `Payment of Rs. ${amountDecimal.toFixed(2)} recorded successfully. Total paid is now Rs. ${totalPaid}.`,
            assignment: updatedAssignment,
        }, { status: 200 });

    } catch (error) {
        if (error instanceof Error && error.message === 'NOT_FOUND') {
            return NextResponse.json({ message: 'Labour assignment not found.' }, { status: 404 });
        }
        console.error('Error recording labour payment:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to record payment.' },
            { status: 500 }
        );
    }
}