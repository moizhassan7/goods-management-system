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
        const tripWhere = range ? { date: range } : undefined;
        const txnWhere = range ? { transaction_date: range } : undefined;

        const [vehicles, shipments, trips, txns] = await Promise.all([
            prisma.vehicle.findMany({
                select: { id: true, vehicleNumber: true },
                orderBy: { vehicleNumber: 'asc' },
                take: REPORT_ROW_CAP,
            }),
            prisma.shipment.groupBy({
                by: ['vehicle_number_id'],
                where: shipmentWhere,
                _count: { _all: true },
                _sum: { total_charges: true },
            }),
            prisma.tripLog.groupBy({
                by: ['vehicle_id'],
                where: tripWhere,
                _count: { _all: true },
                _sum: { total_fare_collected: true },
            }),
            prisma.vehicleTransaction.groupBy({
                by: ['vehicle_id'],
                where: txnWhere,
                _sum: { credit_amount: true, debit_amount: true },
            }),
        ]);

        const shipmentMap = new Map(shipments.map((row) => [row.vehicle_number_id, row]));
        const tripMap = new Map(trips.map((row) => [row.vehicle_id, row]));
        const txnMap = new Map(txns.map((row) => [row.vehicle_id, row]));

        return NextResponse.json(vehicles.map((vehicle) => {
            const shipment = shipmentMap.get(vehicle.id);
            const trip = tripMap.get(vehicle.id);
            const txn = txnMap.get(vehicle.id);
            return {
                id: vehicle.id,
                vehicleNumber: vehicle.vehicleNumber,
                shipments: [],
                tripLogs: [],
                vehicleTransactions: [],
                shipmentCount: shipment?._count._all ?? 0,
                totalCharges: Number(shipment?._sum.total_charges ?? 0),
                tripCount: trip?._count._all ?? 0,
                totalFares: Number(trip?._sum.total_fare_collected ?? 0),
                totalCredits: Number(txn?._sum.credit_amount ?? 0),
                totalDebits: Number(txn?._sum.debit_amount ?? 0),
            };
        }));
    } catch (error) {
        console.error('Vehicle report failed:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json({ message: 'Failed to load vehicle report.' }, { status: 500 });
    }
}
