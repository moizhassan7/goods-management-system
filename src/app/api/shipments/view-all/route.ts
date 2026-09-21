import { requireAuth, isAuthError, Permissions } from '@/lib/auth';
// src/app/api/shipments/view-all/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { parsePagination, paginationMeta } from '@/lib/pagination';

const PAYMENT_STATUS_PREFIX = "PAYMENT_STATUS:";

function extractPaymentStatus(remarks: string | null): string | null {
    if (remarks && remarks.startsWith(PAYMENT_STATUS_PREFIX)) {
        return remarks.split(' ')[0].replace(PAYMENT_STATUS_PREFIX, '');
    }
    return 'PENDING';
}

function buildWhere(searchParams: URLSearchParams): Prisma.ShipmentWhereInput {
    const query = searchParams.get('query');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const vehicleIdParam = searchParams.get('vehicleId');

    const where: Prisma.ShipmentWhereInput = {};

    if (query && query.trim()) {
        const cleanQuery = query.trim();
        where.OR = [
            { bility_number: { contains: cleanQuery, mode: 'insensitive' } },
            { sender: { name: { contains: cleanQuery, mode: 'insensitive' } } },
            { receiver: { name: { contains: cleanQuery, mode: 'insensitive' } } },
            { vehicle: { vehicleNumber: { contains: cleanQuery, mode: 'insensitive' } } },
            { register_number: { contains: cleanQuery, mode: 'insensitive' } },
            { forwardingAgency: { name: { contains: cleanQuery, mode: 'insensitive' } } },
            { departureCity: { name: { contains: cleanQuery, mode: 'insensitive' } } },
            { toCity: { name: { contains: cleanQuery, mode: 'insensitive' } } },
            {
                goodsDetails: {
                    some: {
                        itemCatalog: {
                            item_description: { contains: cleanQuery, mode: 'insensitive' }
                        }
                    }
                }
            },
        ];
    }

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

    const parsedVehicleId = parseInt(vehicleIdParam || '0');
    if (parsedVehicleId > 0) {
        where.vehicle_number_id = parsedVehicleId;
    }

    return where;
}

/**
 * GET /api/shipments/view-all
 * Paginated shipment list for the view page, with filter totals.
 */
export async function GET(request: Request) {
    const auth = await requireAuth(request, Permissions.REPORTS_VIEW);
    if (isAuthError(auth)) return auth;

    try {
        const { searchParams } = new URL(request.url);
        const where = buildWhere(searchParams);
        const { page, pageSize, skip } = parsePagination(searchParams);

        const [shipments, total, aggregates, deliveredCount] = await prisma.$transaction([
            prisma.shipment.findMany({
                where,
                include: {
                    departureCity: { select: { name: true } },
                    toCity: { select: { name: true } },
                    sender: { select: { name: true, contactInfo: true } },
                    receiver: { select: { name: true, contactInfo: true } },
                    vehicle: { select: { vehicleNumber: true } },
                    forwardingAgency: { select: { name: true } },
                    goodsDetails: {
                        select: {
                            good_detail_id: true,
                            quantity: true,
                            charges: true,
                            delivery_charges: true,
                            itemCatalog: {
                                select: {
                                    item_description: true,
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            prisma.shipment.count({ where }),
            prisma.shipment.aggregate({
                where,
                _sum: {
                    total_charges: true,
                    total_delivery_charges: true,
                },
            }),
            prisma.shipment.count({
                where: {
                    AND: [where, { delivery_date: { not: null } }],
                },
            }),
        ]);

        const formattedShipments = shipments.map(s => ({
            ...s,
            total_charges: Number(s.total_charges),
            total_delivery_charges: Number(s.total_delivery_charges),
            station_expense: Number(s.station_expense || 0),
            bility_expense: Number(s.bility_expense || 0),
            station_labour: Number(s.station_labour || 0),
            cart_labour: Number(s.cart_labour || 0),
            total_expenses: Number(s.total_expenses || 0),
            goodsDetails: s.goodsDetails.map(g => ({
                ...g,
                charges: Number(g.charges || 0),
                delivery_charges: Number(g.delivery_charges || 0),
            })),
            bility_date: s.bility_date.toISOString().split('T')[0],
            delivery_date: s.delivery_date?.toISOString().split('T')[0] || null,
            payment_status: extractPaymentStatus(s.remarks),
        }));

        return NextResponse.json({
            data: formattedShipments,
            ...paginationMeta(total, page, pageSize),
            stats: {
                totalBiltyCount: total,
                totalBaraKaraya: Number(aggregates._sum.total_charges || 0),
                totalChotaKaraya: Number(aggregates._sum.total_delivery_charges || 0),
                deliveredCount,
            },
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching all shipments:', error);
        return NextResponse.json(
            { message: 'Internal Server Error while fetching shipments.' },
            { status: 500 }
        );
    }
}
