import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ReturnStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isAuthError, Permissions, requireAuth } from '@/lib/auth';
import { REPORT_ROW_CAP, reportDateRange } from '@/lib/report-range';

const STATUSES = new Set<string>(Object.values(ReturnStatus));

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request, Permissions.REPORTS_VIEW);
    if (isAuthError(auth)) return auth;

    try {
        const { searchParams } = request.nextUrl;
        const range = reportDateRange(searchParams);
        const status = searchParams.get('status');
        const where: Prisma.ReturnShipmentWhereInput = {};
        if (range) where.return_date = range;
        if (status && STATUSES.has(status)) where.status = status as ReturnStatus;

        const returns = await prisma.returnShipment.findMany({
            where,
            take: REPORT_ROW_CAP,
            orderBy: { return_date: 'desc' },
            select: {
                id: true,
                original_shipment_id: true,
                return_date: true,
                reason: true,
                status: true,
                action_taken: true,
                resolution_date: true,
                originalShipment: {
                    select: {
                        bility_number: true,
                        sender: { select: { name: true } },
                        receiver: { select: { name: true } },
                    },
                },
            },
        });

        return NextResponse.json(returns);
    } catch (error) {
        console.error('Returns report failed:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json({ message: 'Failed to load returns report.' }, { status: 500 });
    }
}
