// src/app/api/shipments/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Define expected client payloads
interface GoodsDetailPayload {
    item_id: number;
    quantity: number;
    delivery_charges: number;
}

interface ShipmentRequestPayload {
    register_number: string;
    bility_number: string;
    bility_date: string;
    departure_city_id: number;
    to_city_id?: number;
    forwarding_agency_id: number;
    vehicle_number_id: number;
    sender_id: number;
    receiver_id: number;
    walk_in_sender_name?: string;
    walk_in_receiver_name?: string;

    total_delivery_charges: number;
    total_amount: number;

    remarks?: string;
    goods_details: GoodsDetailPayload[];

    payment_status?: 'PENDING' | 'ALREADY_PAID' | 'FREE';
}

// Prefix to embed payment status in remarks
const PAYMENT_STATUS_PREFIX = 'PAYMENT_STATUS:';

/**
 * POST /api/shipments
 * Registers a new shipment with payment and goods details.
 */
export async function POST(request: Request) {
    try {
        const payload: ShipmentRequestPayload = await request.json();

        if (!payload.bility_number || !payload.bility_date || payload.goods_details.length === 0) {
            return NextResponse.json({ message: 'Missing critical shipment data.' }, { status: 400 });
        }

        const bilityDate = new Date(payload.bility_date);
        const year = bilityDate.getFullYear();
        const month = (bilityDate.getMonth() + 1).toString().padStart(2, '0');
        const monthStart = new Date(year, bilityDate.getMonth(), 1);
        const monthEnd = new Date(year, bilityDate.getMonth() + 1, 0, 23, 59, 59, 999);

        let newShipment;
        let register_number = '';
        const MAX_RETRIES = 5;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const countForMonth = await prisma.shipment.count({
                    where: {
                        bility_date: {
                            gte: monthStart,
                            lte: monthEnd,
                        },
                    },
                });

                const nextCount = countForMonth + 1;
                register_number = `${year}${month}-${nextCount.toString().padStart(4, '0')}`;

                const finalBillAmount = new Prisma.Decimal(payload.total_amount);
                const totalDeliveryCharges = new Prisma.Decimal(payload.total_delivery_charges);

                let finalRemarks = payload.remarks || '';
                if (payload.payment_status) {
                    finalRemarks = `${PAYMENT_STATUS_PREFIX}${payload.payment_status} ${finalRemarks}`;
                }

                const goodsDetailsForCreate = payload.goods_details.map(detail => ({
                    item_name_id: detail.item_id,
                    quantity: detail.quantity,
                    charges: new Prisma.Decimal(0),
                    delivery_charges: new Prisma.Decimal(0),
                }));

                [newShipment] = await prisma.$transaction([
                    prisma.shipment.create({
                        data: {
                            register_number,
                            bility_number: payload.bility_number,
                            bility_date: bilityDate,
                            departure_city_id: payload.departure_city_id,
                            to_city_id: payload.to_city_id || undefined,
                            forwarding_agency_id: payload.forwarding_agency_id,
                            vehicle_number_id: payload.vehicle_number_id,
                            sender_id: payload.sender_id,
                            receiver_id: payload.receiver_id,
                            walk_in_sender_name: payload.walk_in_sender_name,
                            walk_in_receiver_name: payload.walk_in_receiver_name,
                            total_charges: finalBillAmount,
                            total_delivery_charges: totalDeliveryCharges,
                            remarks: finalRemarks,
                            goodsDetails: {
                                createMany: { data: goodsDetailsForCreate },
                            },
                        },
                    }),

                    ...(payload.payment_status !== 'ALREADY_PAID' &&
                    payload.payment_status !== 'FREE'
                        ? [
                              prisma.transaction.create({
                                  data: {
                                      transaction_date: new Date(),
                                      party_type: 'SENDER',
                                      party_ref_id: payload.sender_id,
                                      shipment_id: register_number,
                                      credit_amount: finalBillAmount,
                                      debit_amount: new Prisma.Decimal(0),
                                      description: `Shipment Bill for Bility #${payload.bility_number}. Sender: ${
                                          payload.walk_in_sender_name || `Party ID: ${payload.sender_id}`
                                      }.`,
                                  },
                              }),
                          ]
                        : []),
                ]);

                break;
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                    const isBilityConflict = error.meta?.target === 'Shipment_bility_number_key';
                    if (isBilityConflict) {
                        throw new Error('Bility number already exists. Please use a unique identifier.');
                    }

                    if (attempt < MAX_RETRIES - 1) {
                        console.warn(`Race condition detected for registration number ${register_number}. Retrying...`);
                        continue;
                    }
                    throw new Error('Failed to generate a unique registration ID after multiple attempts.');
                }
                throw error;
            }
        }

        if (!newShipment) {
            throw new Error('Failed to register shipment due to an unknown error.');
        }

        return NextResponse.json(
            {
                message: 'Shipment registered successfully.',
                shipment: newShipment,
                register_number,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Shipment Registration Error:', error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Internal Server Error: Failed to register shipment.' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/shipments
 * Fetches shipments with filters: delivered, date, bility_number, or query.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');
        const delivered = searchParams.get('delivered');
        const dateParam = searchParams.get('date');
        const bilityNumberParam = searchParams.get('bility_number');

        const where: Prisma.ShipmentWhereInput = {};

        if (delivered === 'false') where.delivery_date = null;

        if (dateParam) {
            const startOfDay = new Date(dateParam + 'T00:00:00.000Z');
            const endOfDay = new Date(dateParam + 'T23:59:59.999Z');
            where.bility_date = { gte: startOfDay, lte: endOfDay };
        }

        if (bilityNumberParam) where.bility_number = bilityNumberParam;

        if (query) {
            where.OR = [
                { register_number: { contains: query } },
                { bility_number: { contains: query } },
                { sender: { name: { contains: query, mode: 'insensitive' } } },
                { receiver: { name: { contains: query, mode: 'insensitive' } } },
            ];
        }

        const shipments = await prisma.shipment.findMany({
            where,
            include: {
                goodsDetails: {
                    select: {
                        quantity: true,
                        itemCatalog: { select: { item_description: true } },
                    },
                },
                departureCity: { select: { name: true } },
                toCity: { select: { name: true } },
                sender: { select: { name: true } },
                receiver: { select: { id: true, name: true, contactInfo: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const extractPaymentStatus = (remarks: string | null): string | null => {
            if (remarks && remarks.startsWith(PAYMENT_STATUS_PREFIX)) {
                return remarks.split(' ')[0].replace(PAYMENT_STATUS_PREFIX, '');
            }
            return 'PENDING';
        };

        return NextResponse.json(
            shipments.map(s => ({
                ...s,
                payment_status: extractPaymentStatus(s.remarks),
            })),
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching shipments:', error);
        return NextResponse.json(
            { message: 'Internal Server Error while fetching shipments.' },
            { status: 500 }
        );
    }
}
