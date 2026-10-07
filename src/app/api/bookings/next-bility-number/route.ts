import { requireAuth, isAuthError, Permissions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextBilityNumber } from '@/lib/booking';
import { prismaErrorMessage } from '@/lib/api-client';

export async function GET(request: Request) {
    const auth = await requireAuth(request, Permissions.CORE_OPERATIONS);
    if (isAuthError(auth)) return auth;

    try {
        const rows = await prisma.booking.findMany({
            select: { bility_number: true },
        });
        return NextResponse.json({
            bility_number: nextBilityNumber(rows.map((row) => row.bility_number)),
        });
    } catch (error) {
        console.error('Next bilty number error:', error);
        return NextResponse.json(
            { message: prismaErrorMessage(error, 'Failed to generate bilty number.') },
            { status: 500 },
        );
    }
}
