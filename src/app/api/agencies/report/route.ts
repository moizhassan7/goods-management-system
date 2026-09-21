import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthError, Permissions, requireAuth } from '@/lib/auth';
import { REPORT_ROW_CAP, reportDateRange } from '@/lib/report-range';

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request, Permissions.REPORTS_VIEW);
    if (isAuthError(auth)) return auth;

    try {
        const range = reportDateRange(request.nextUrl.searchParams);
        const [agencies, grouped] = await Promise.all([
            prisma.agency.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
                take: REPORT_ROW_CAP,
            }),
            prisma.shipment.groupBy({
                by: ['forwarding_agency_id'],
                where: range ? { bility_date: range } : undefined,
                _count: { _all: true },
                _sum: { total_charges: true },
            }),
        ]);

        const byAgency = new Map(grouped.map((row) => [row.forwarding_agency_id, row]));

        return NextResponse.json(agencies.map((agency) => {
            const row = byAgency.get(agency.id);
            return {
                id: agency.id,
                name: agency.name,
                shipments: [],
                shipmentCount: row?._count._all ?? 0,
                totalCharges: Number(row?._sum.total_charges ?? 0),
            };
        }));
    } catch (error) {
        console.error('Agency report failed:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json({ message: 'Failed to load agency report.' }, { status: 500 });
    }
}
