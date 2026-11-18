import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, UserRole } from '@/lib/auth';
import { parsePagination, paginationMeta } from '@/lib/pagination';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
    // Only Super Admin can view the Recycle Bin
    const auth = await requireAuth(request, [UserRole.SUPERADMIN]);
    if (isAuthError(auth)) return auth;

    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query')?.trim() || '';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const { page, pageSize, skip } = parsePagination(searchParams);

        const where: Prisma.ShipmentWhereInput = {
            is_deleted: true,
        };

        if (query) {
            where.OR = [
                { bility_number: { contains: query, mode: 'insensitive' } },
                { register_number: { contains: query, mode: 'insensitive' } },
                { deleted_by_name: { contains: query, mode: 'insensitive' } },
                { sender: { name: { contains: query, mode: 'insensitive' } } },
                { receiver: { name: { contains: query, mode: 'insensitive' } } },
                { vehicle: { vehicleNumber: { contains: query, mode: 'insensitive' } } },
                { departureCity: { name: { contains: query, mode: 'insensitive' } } },
                { toCity: { name: { contains: query, mode: 'insensitive' } } },
            ];
        }

        if (startDate || endDate) {
            const dateFilter: { gte?: Date; lte?: Date } = {};
            if (startDate) {
                dateFilter.gte = new Date(startDate + 'T00:00:00.000Z');
            }
            if (endDate) {
                dateFilter.lte = new Date(endDate + 'T23:59:59.999Z');
            }
            where.deleted_at = dateFilter;
        }

        const [shipments, total, aggregate] = await prisma.$transaction([
            prisma.shipment.findMany({
                where,
                include: {
                    departureCity: { select: { id: true, name: true } },
                    toCity: { select: { id: true, name: true } },
                    sender: { select: { id: true, name: true, contactInfo: true } },
                    receiver: { select: { id: true, name: true, contactInfo: true } },
                    vehicle: { select: { id: true, vehicleNumber: true } },
                    forwardingAgency: { select: { id: true, name: true } },
                    deletedBy: { select: { id: true, username: true, role: true } },
                    goodsDetails: {
                        select: {
                            good_detail_id: true,
                            quantity: true,
                            charges: true,
                            itemCatalog: {
                                select: { item_description: true }
                            }
                        }
                    },
                },
                orderBy: { deleted_at: 'desc' },
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
        ]);

        const formattedShipments = shipments.map((s) => ({
            register_number: s.register_number,
            bility_number: s.bility_number,
            bility_date: s.bility_date.toISOString().split('T')[0],
            total_charges: s.total_charges.toString(),
            total_delivery_charges: s.total_delivery_charges.toString(),
            remarks: s.remarks,
            deleted_at: s.deleted_at ? s.deleted_at.toISOString() : null,
            deleted_by_name: s.deleted_by_name || s.deletedBy?.username || 'Unknown',
            deleted_by_id: s.deleted_by_id,
            departureCity: s.departureCity?.name || 'N/A',
            toCity: s.toCity?.name || 'N/A',
            sender: s.sender?.name || 'N/A',
            receiver: s.receiver?.name || 'N/A',
            vehicleNumber: s.vehicle?.vehicleNumber || 'N/A',
            agency: s.forwardingAgency?.name || 'N/A',
            itemsCount: s.goodsDetails.reduce((acc, curr) => acc + (curr.quantity || 0), 0),
            itemsSummary: s.goodsDetails.map(g => `${g.itemCatalog?.item_description || 'Item'} (${g.quantity})`).join(', '),
        }));

        return NextResponse.json({
            shipments: formattedShipments,
            pagination: paginationMeta(total, page, pageSize),
            summary: {
                totalCount: total,
                totalAmount: (aggregate._sum.total_charges || 0).toString(),
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching recycle bin:', error);
        return NextResponse.json({ message: 'Failed to fetch recycle bin items.' }, { status: 500 });
    }
}
