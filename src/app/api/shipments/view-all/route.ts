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

        // 1. Search Query Filtering
        if (query) {
            where.OR = [
                // 1. Search by Bility Number
                { bility_number: { contains: query } },
                // 2. Search by Receiver Party Name (Prisma will automatically filter on related model field)
                { receiver: { name: { contains: query } } },
                // 3. Search by Walk-in Receiver Name
                { walk_in_receiver_name: { contains: query } },
                // Optional: Search by Register Number (if needed, typically an exact match)
                { register_number: { contains: query } },
            ];
        }

        // 2. Date Range Filtering (bility_date)
        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (startDateParam) {
            dateFilter.gte = new Date(startDateParam + 'T00:00:00.000Z');
        }
        if (endDateParam) {
            dateFilter.lte = new Date(endDateParam + 'T23:59:59.999Z');
        }
        if (startDateParam || endDateParam) {
            where.bility_date = dateFilter;
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