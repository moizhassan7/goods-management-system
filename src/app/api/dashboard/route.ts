import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LabourAssignmentStatus } from '@prisma/client';

/**
 * GET /api/dashboard
 * Fetches all necessary metrics for the dashboard overview.
 */
export async function GET() {
    try {
        const todayDate = new Date();
        const startOfToday = new Date(todayDate);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(todayDate);
        endOfToday.setHours(23, 59, 59, 999);

        const isoTodayStr = new Date().toISOString().split('T')[0];
        const startOfIsoToday = new Date(isoTodayStr + 'T00:00:00.000Z');
        const endOfIsoToday = new Date(isoTodayStr + 'T23:59:59.999Z');

        const lastWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

        // --- 1. Key Metrics (Count & Financial Totals) ---
        const [
            totalShipments,
            todayShipments,
            pendingDeliveries,
            totalParties,
            totalVehicles,
            totalReturns,
            pendingLabourSettlements,
            shipmentTotals
        ] = await prisma.$transaction([
            // Total Shipments
            prisma.shipment.count(),
            // Today's Shipments
            prisma.shipment.count({
                where: {
                    OR: [
                        { bility_date: { gte: startOfIsoToday, lte: endOfIsoToday } },
                        { bility_date: { gte: startOfToday, lte: endOfToday } },
                        { created_day: { gte: startOfIsoToday, lte: endOfIsoToday } },
                        { createdAt: { gte: startOfToday, lte: endOfToday } }
                    ]
                }
            }),
            // Pending Deliveries for Approval
            prisma.delivery.count({ where: { approval_status: 'PENDING' } }),
            // Total Parties
            prisma.party.count(),
            // Total Vehicles
            prisma.vehicle.count(),
            // Total Returns
            prisma.returnShipment.count(),
            // Pending Labour Settlements (Collected but not Settled)
            prisma.labourAssignment.count({ where: { status: LabourAssignmentStatus.COLLECTED } }),
            // Total Charges & Delivery Charges Aggregate
            prisma.shipment.aggregate({
                _sum: {
                    total_charges: true,
                    total_delivery_charges: true,
                }
            }),
        ]);

        const totalBaraKaraya = Number(shipmentTotals._sum.total_charges || 0);
        const totalChotaKaraya = Number(shipmentTotals._sum.total_delivery_charges || 0);

        // --- 2. Top Performing Agencies (Shipment Count) ---
        const topAgencies = await prisma.agency.findMany({
            select: { name: true, _count: { select: { shipments: true } } },
            // FIXED: Correct syntax for ordering by relation count
            orderBy: { shipments: { _count: 'desc' } },
            take: 5,
        });

        // --- 3. Recent Shipments (for quick view) ---
        const recentShipments = await prisma.shipment.findMany({
            select: {
                register_number: true,
                bility_number: true,
                total_charges: true,
                departureCity: { select: { name: true } },
                toCity: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        
        // Ensure decimal to number conversion for recent shipments
        const formattedRecentShipments = recentShipments.map(s => ({
            ...s,
            total_charges: Number(s.total_charges),
        }));


        // --- 4. Shipment Volume by Date (Aggregated data) ---
        // This calculates daily shipment counts for the last 7 days
        const rawVolumeData = await prisma.shipment.groupBy({
            by: ['bility_date'],
            where: {
                bility_date: {
                    gte: lastWeek,
                },
            },
            _count: {
                register_number: true,
            },
            orderBy: { bility_date: 'asc' },
        });

        const volumeData = rawVolumeData.map(d => ({
            // Format date as 'Oct 1'
            date: d.bility_date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            volume: d._count.register_number,
        }));


        return NextResponse.json({
            keyMetrics: {
                totalShipments: totalShipments,
                todayShipments: todayShipments,
                pendingApprovals: pendingDeliveries,
                totalParties: totalParties,
                totalVehicles: totalVehicles,
                totalReturns: totalReturns,
                pendingLabourSettlements: pendingLabourSettlements,
                totalRevenue: totalBaraKaraya,
                totalBaraKaraya: totalBaraKaraya,
                totalChotaKaraya: totalChotaKaraya,
            },
            topAgencies: topAgencies.map(a => ({
                name: a.name,
                count: a._count.shipments,
            })),
            recentShipments: formattedRecentShipments, // Using the formatted list
            volumeData, // Using the aggregated data
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to fetch dashboard data.' },
            { status: 500 }
        );
    }
}
