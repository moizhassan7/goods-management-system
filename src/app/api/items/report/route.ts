import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthError, Permissions, requireAuth } from '@/lib/auth';
import { REPORT_ROW_CAP, reportDateRange } from '@/lib/report-range';

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request, Permissions.REPORTS_VIEW);
    if (isAuthError(auth)) return auth;

    try {
        const range = reportDateRange(request.nextUrl.searchParams);
        const [items, grouped] = await Promise.all([
            prisma.itemCatalog.findMany({
                select: { id: true, item_description: true },
                orderBy: { item_description: 'asc' },
                take: REPORT_ROW_CAP,
            }),
            prisma.goodsDetails.groupBy({
                by: ['item_name_id'],
                where: range ? { shipment: { bility_date: range } } : undefined,
                _sum: { quantity: true, charges: true },
            }),
        ]);

        const byItem = new Map(grouped.map((row) => [row.item_name_id, row]));

        return NextResponse.json(items.map((item) => {
            const row = byItem.get(item.id);
            return {
                id: item.id,
                item_description: item.item_description,
                goodsDetails: [],
                totalQuantity: Number(row?._sum.quantity ?? 0),
                totalCharges: Number(row?._sum.charges ?? 0),
            };
        }));
    } catch (error) {
        console.error('Items report failed:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json({ message: 'Failed to load items report.' }, { status: 500 });
    }
}
