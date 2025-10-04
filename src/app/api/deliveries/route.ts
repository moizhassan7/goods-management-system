import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    receiver_phone: string;
    receiver_cnic: string;
    receiver_address: string;
    
    delivery_notes?: string;
}

/**
 * Handles POST requests to record a new delivery.
 * Endpoint: /api/deliveries
 */
export async function POST(request: Request) {
    try {
        const payload: DeliveryRequestPayload = await request.json();

        // 1. Basic Validation 
        if (!payload.shipment_id || !payload.delivery_date || !payload.receiver_name) {
            return NextResponse.json({ 
                message: 'Missing critical delivery data.' 
            }, { status: 400 });
        }

        // 2. Check if shipment exists
        const shipment = await prisma.shipment.findUnique({
            where: { register_number: payload.shipment_id }
        });

        if (!shipment) {
            return NextResponse.json({ 
                message: 'Shipment not found.' 
            }, { status: 404 });
        }

        // 3. Check if delivery already exists for this shipment
        const existingDelivery = await prisma.delivery.findFirst({
            where: { shipment_id: payload.shipment_id }
        });

        if (existingDelivery) {
            return NextResponse.json({ 
                message: 'Delivery already recorded for this shipment.' 
            }, { status: 409 });
        }

        // 4. Create delivery record
        const newDelivery = await prisma.delivery.create({
            data: {
                shipment_id: payload.shipment_id,
                delivery_date: new Date(payload.delivery_date),
                delivery_time: new Date(),
                
                station_expense: new Prisma.Decimal(payload.station_expense),
                bility_expense: new Prisma.Decimal(payload.bility_expense),
                station_labour: new Prisma.Decimal(payload.station_labour),
                cart_labour: new Prisma.Decimal(payload.cart_labour),
                total_expenses: new Prisma.Decimal(payload.total_expenses),
                
                receiver_name: payload.receiver_name,
                receiver_phone: payload.receiver_phone,
                receiver_cnic: payload.receiver_cnic,
                receiver_address: payload.receiver_address,
                
                delivery_notes: payload.delivery_notes,
                delivery_status: 'DELIVERED'
            },
        });

        // 5. Update shipment delivery date
        await prisma.shipment.update({
            where: { register_number: payload.shipment_id },
            data: { delivery_date: new Date(payload.delivery_date) }
        });

        // 6. Return success
        return NextResponse.json({
            message: 'Delivery recorded successfully.',
            delivery: newDelivery,
        }, { status: 201 });

    } catch (error) {
        console.error('Delivery Recording Error:', error);
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
                orderBy: { createdAt: 'desc' }
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
                orderBy: { createdAt: 'desc' }
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
