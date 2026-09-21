import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthError, Permissions, requireAuth } from '@/lib/auth';
import { REPORT_ROW_CAP, reportDateRange } from '@/lib/report-range';

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request, Permissions.REPORTS_VIEW);
    if (isAuthError(auth)) return auth;

    try {
        const range = reportDateRange(request.nextUrl.searchParams);
        const shipmentWhere = range ? { bility_date: range } : undefined;

        const [parties, sent, received] = await Promise.all([
            prisma.party.findMany({
                select: { id: true, name: true, contactInfo: true, opening_balance: true },
                orderBy: { name: 'asc' },
                take: REPORT_ROW_CAP,
            }),
            prisma.shipment.groupBy({
                by: ['sender_id'],
                where: shipmentWhere,
                _count: { _all: true },
                _sum: { total_charges: true },
            }),
            prisma.shipment.groupBy({
                by: ['receiver_id'],
                where: shipmentWhere,
                _count: { _all: true },
                _sum: { total_charges: true },
            }),
        ]);

        const sentMap = new Map(sent.map((row) => [row.sender_id, row]));
        const receivedMap = new Map(received.map((row) => [row.receiver_id, row]));

        return NextResponse.json(parties.map((party) => {
            const sentRow = sentMap.get(party.id);
            const receivedRow = receivedMap.get(party.id);
            const sentCharges = Number(sentRow?._sum.total_charges ?? 0);
            const receivedCharges = Number(receivedRow?._sum.total_charges ?? 0);
            return {
                id: party.id,
                name: party.name,
                contactInfo: party.contactInfo,
                opening_balance: Number(party.opening_balance),
                sentShipments: [],
                receivedShipments: [],
                transactions: [],
                sentCount: sentRow?._count._all ?? 0,
                receivedCount: receivedRow?._count._all ?? 0,
                totalCharges: sentCharges + receivedCharges,
            };
        }));
    } catch (error) {
        console.error('Parties report failed:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json({ message: 'Failed to load parties report.' }, { status: 500 });
    }
}
