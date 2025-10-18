import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LabourAssignmentStatus } from '@prisma/client';

/**
 * GET /api/dashboard
 * Fetches all necessary metrics for the dashboard overview.
 */
export async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        // --- 1. Key Metrics (Count & Financial Totals) ---
        const [
            totalShipments,
            pendingDeliveries,
            totalParties,
            totalVehicles,
            totalReturns,
            pendingLabourSettlements,
            totalShipmentCharges
        ] = await prisma.$transaction([
            // Total Shipments
            prisma.shipment.count(),
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
            // Total Charges (Sum of all shipment charges)
            prisma.shipment.aggregate({ _sum: { total_charges: true } }),
        ]);

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
                pendingApprovals: pendingDeliveries,
                totalParties: totalParties,
                totalVehicles: totalVehicles,
                totalReturns: totalReturns,
                pendingLabourSettlements: pendingLabourSettlements,
                totalRevenue: Number(totalShipmentCharges._sum.total_charges || 0),
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
