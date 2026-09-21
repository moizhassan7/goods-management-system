import { requireAuth, isAuthError, Permissions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LIST_ROW_CAP } from '@/lib/report-range';
import { Prisma } from '@prisma/client';

// Define the shape of the data expected from the client
interface DeliveryRequestPayload {
    bility_number: string;
    delivery_date: string;
    shipment_id: string;
    
    // Expense tracking
    station_expense: number;
    bility_expense: number;
    station_labour: number;
    cart_labour: number;
    total_expenses: number;
    
    // Receiver details
    receiver_name: string;
    receiver_phone?: string;
    receiver_cnic?: string;
    receiver_address?: string;
    
    delivery_notes?: string;
}

/**
 * Handles POST requests to record a new delivery.
 * Endpoint: /api/deliveries
 */
export async function POST(request: Request) {
    const auth = await requireAuth(request, Permissions.CORE_OPERATIONS);
    if (isAuthError(auth)) return auth;

    try {
        const payload: DeliveryRequestPayload = await request.json();

        if (!payload.shipment_id || !payload.delivery_date || !payload.receiver_name) {
            return NextResponse.json({ 
                message: 'Missing critical delivery data.' 
            }, { status: 400 });
        }

        const deliveryDate = new Date(payload.delivery_date);
        if (Number.isNaN(deliveryDate.getTime())) {
            return NextResponse.json({ message: 'Delivery date is invalid.' }, { status: 400 });
        }

        const newDelivery = await prisma.$transaction(async (tx) => {
            const shipment = await tx.shipment.findUnique({
                where: { register_number: payload.shipment_id },
                select: { register_number: true },
            });

            if (!shipment) {
                throw new Error('SHIPMENT_NOT_FOUND');
            }

            const created = await tx.delivery.create({
                data: {
                    shipment_id: payload.shipment_id,
                    delivery_date: deliveryDate,
                    delivery_time: new Date(),
                    station_expense: new Prisma.Decimal(payload.station_expense || 0),
                    bility_expense: new Prisma.Decimal(payload.bility_expense || 0),
                    station_labour: new Prisma.Decimal(payload.station_labour || 0),
                    cart_labour: new Prisma.Decimal(payload.cart_labour || 0),
                    total_expenses: new Prisma.Decimal(payload.total_expenses || 0),
                    receiver_name: payload.receiver_name,
                    receiver_phone: payload.receiver_phone || "",
                    receiver_cnic: payload.receiver_cnic || "",
                    receiver_address: payload.receiver_address || "",
                    delivery_notes: payload.delivery_notes,
                    delivery_status: 'DELIVERED'
                },
            });

            await tx.shipment.update({
                where: { register_number: payload.shipment_id },
                data: { delivery_date: deliveryDate }
            });

            return created;
        });

        return NextResponse.json({
            message: 'Delivery recorded successfully.',
            delivery: newDelivery,
        }, { status: 200 });

    } catch (error) {
        if (error instanceof Error && error.message === 'SHIPMENT_NOT_FOUND') {
            return NextResponse.json({ message: 'Shipment not found.' }, { status: 404 });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({
                message: 'Delivery already recorded for this shipment.',
            }, { status: 409 });
        }
        console.error('Delivery Recording Error:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to record delivery.' },
            { status: 500 }
        );
    }
}

/**
 * Handles GET requests to fetch all deliveries.
 * Endpoint: /api/deliveries
 */
export async function GET(request: Request) {
    const auth = await requireAuth(request, Permissions.REPORTS_VIEW);
    if (isAuthError(auth)) return auth;

    try {
        const { searchParams } = new URL(request.url);
        const shipment_id = searchParams.get('shipment_id');

        let deliveries;

        if (shipment_id) {
            // Get deliveries for a specific shipment
            deliveries = await prisma.delivery.findMany({
                where: { shipment_id },
                include: {
                    shipment: {
                        include: {
                            departureCity: true,
                            toCity: true,
                            sender: true,
                            receiver: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
            });
        } else {
            // Get all deliveries
            deliveries = await prisma.delivery.findMany({
                include: {
                    shipment: {
                        include: {
                            departureCity: true,
                            toCity: true,
                            sender: true,
                            receiver: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: LIST_ROW_CAP,
            });
        }

        return NextResponse.json(deliveries, { status: 200 });
    } catch (error) {
        console.error('Error fetching deliveries:', error);
        return NextResponse.json(
            { message: 'Internal Server Error while fetching deliveries.' },
            { status: 500 }
        );
    }
}
