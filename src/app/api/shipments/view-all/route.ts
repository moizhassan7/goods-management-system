// src/app/api/shipments/view-all/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// NOTE: This prefix MUST match the one used in src/app/api/shipments/route.ts
const PAYMENT_STATUS_PREFIX = "PAYMENT_STATUS:"; 

/**
 * GET /api/shipments/view-all
 * Retrieves all shipments with necessary relations for the main view table.
 * Supports filtering/searching by query, date range, and vehicle ID.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const vehicleIdParam = searchParams.get('vehicleId');

        const where: Prisma.ShipmentWhereInput = {};

        // 1. Search Query Filtering (Bility #, Sender, Receiver, Vehicle Number, Register #)
        if (query && query.trim()) {
            const cleanQuery = query.trim();
            where.OR = [
                // 1. Bilty Number
                { bility_number: { contains: cleanQuery, mode: 'insensitive' } },
                // 2. Sender Party Name
                { sender: { name: { contains: cleanQuery, mode: 'insensitive' } } },
                // 3. Receiver Party Name
                { receiver: { name: { contains: cleanQuery, mode: 'insensitive' } } },
                // 4. Vehicle / Truck Number
                { vehicle: { vehicleNumber: { contains: cleanQuery, mode: 'insensitive' } } },
                // 5. Register Number
                { register_number: { contains: cleanQuery, mode: 'insensitive' } },
                // 6. Forwarding Agency Name
                { forwardingAgency: { name: { contains: cleanQuery, mode: 'insensitive' } } },
                // 7. Departure City
                { departureCity: { name: { contains: cleanQuery, mode: 'insensitive' } } },
                // 8. Destination City
                { toCity: { name: { contains: cleanQuery, mode: 'insensitive' } } },
            ];
        }

        // 2. Date Range Filtering (Day created / Entry date based)
        if (startDateParam || endDateParam) {
            const startOfIso = startDateParam ? new Date(startDateParam + 'T00:00:00.000Z') : undefined;
            const endOfIso = endDateParam ? new Date(endDateParam + 'T23:59:59.999Z') : undefined;

            const startOfLocal = startDateParam ? new Date(`${startDateParam}T00:00:00`) : undefined;
            const endOfLocal = endDateParam ? new Date(`${endDateParam}T23:59:59.999`) : undefined;

            const conditions: Prisma.ShipmentWhereInput[] = [];

            if (startOfIso || endOfIso) {
                const f: { gte?: Date; lte?: Date } = {};
                if (startOfIso) f.gte = startOfIso;
                if (endOfIso) f.lte = endOfIso;
                conditions.push({ created_day: f });
                conditions.push({ createdAt: f });
            }
            if (startOfLocal || endOfLocal) {
                const f: { gte?: Date; lte?: Date } = {};
                if (startOfLocal) f.gte = startOfLocal;
                if (endOfLocal) f.lte = endOfLocal;
                conditions.push({ created_day: f });
                conditions.push({ createdAt: f });
            }

            const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
            where.AND = [
                ...existingAnd,
                { OR: conditions }
            ];
        }

        // 3. Vehicle Filtering
        const parsedVehicleId = parseInt(vehicleIdParam || '0');
        if (parsedVehicleId > 0) {
            where.vehicle_number_id = parsedVehicleId;
        }


        const shipments = await prisma.shipment.findMany({
            where,
            include: {
                departureCity: { select: { name: true } },
                toCity: { select: { name: true } },
                sender: { select: { name: true } },
                receiver: { select: { name: true } },
                vehicle: { select: { vehicleNumber: true } },
                forwardingAgency: { select: { name: true } },
                goodsDetails: {
                    select: {
                        quantity: true,
                        itemCatalog: {
                            select: {
                                item_description: true,
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        // Helper function to extract payment status from remarks
        const extractPaymentStatus = (remarks: string | null): string | null => {
            if (remarks && remarks.startsWith(PAYMENT_STATUS_PREFIX)) {
                // Extracts ALREADY_PAID or FREE from "PAYMENT_STATUS:STATUS_HERE other notes..."
                return remarks.split(' ')[0].replace(PAYMENT_STATUS_PREFIX, '');
            }
            return 'PENDING'; // Default status if no special tag found
        };


        // Convert Decimal types to Number and extract payment status
        const formattedShipments = shipments.map(s => ({
            ...s,
            total_charges: Number(s.total_charges),
            total_delivery_charges: Number(s.total_delivery_charges),
            // Convert date to ISO string
            bility_date: s.bility_date.toISOString().split('T')[0],
            delivery_date: s.delivery_date?.toISOString().split('T')[0] || null,
            // NEW: Add the extracted payment status
            payment_status: extractPaymentStatus(s.remarks),
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