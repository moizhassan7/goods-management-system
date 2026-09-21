import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthError, Permissions, requireAuth } from '@/lib/auth';
import { REPORT_ROW_CAP } from '@/lib/report-range';

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request, Permissions.REPORTS_VIEW);
    if (isAuthError(auth)) return auth;

    try {
        const cities = await prisma.city.findMany({
            select: {
                id: true,
                name: true,
                _count: { select: { departingShipments: true, arrivingShipments: true } },
            },
            orderBy: { name: 'asc' },
            take: REPORT_ROW_CAP,
        });

        return NextResponse.json(cities.map((city) => ({
            id: city.id,
            name: city.name,
            departingShipments: [],
            arrivingShipments: [],
            departingCount: city._count.departingShipments,
            arrivingCount: city._count.arrivingShipments,
        })));
    } catch (error) {
        console.error('Cities report failed:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json({ message: 'Failed to load cities report.' }, { status: 500 });
    }
}
