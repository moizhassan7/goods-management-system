import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shipments/view-all
 * Retrieves all shipments with necessary relations for the main view table.
 * Supports filtering/searching by bility number or receiver name.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');

        const where: any = {};

        if (query) {
            where.OR = [
                { bility_number: { contains: query, mode: 'insensitive' } },
                // Allow searching by receiver party name
                { receiver: { name: { contains: query, mode: 'insensitive' } } },
                // Allow searching by walk-in receiver name
                { walk_in_receiver_name: { contains: query, mode: 'insensitive' } },
            ];
        }

        const shipments = await prisma.shipment.findMany({
            where,
            include: {
                departureCity: { select: { name: true } },
                toCity: { select: { name: true } },
                sender: { select: { name: true } },
                receiver: { select: { name: true } },
                vehicle: { select: { vehicleNumber: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Convert Decimal types to Number for safe JSON serialization
        const formattedShipments = shipments.map(s => ({
            ...s,
            total_charges: Number(s.total_charges),
            total_delivery_charges: Number(s.total_delivery_charges),
            // Convert date to ISO string
            bility_date: s.bility_date.toISOString().split('T')[0],
            delivery_date: s.delivery_date?.toISOString().split('T')[0] || null,
        }));

        return NextResponse.json(formattedShipments, { status: 200 });
    } catch (error) {
        console.error('Error fetching all shipments:', error);
        return NextResponse.json(
            { message: 'Internal Server Error while fetching shipments.' },
            { status: 500 }
        );
    }
}
