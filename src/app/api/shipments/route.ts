import { NextResponse } from 'next/server';

// FIX: Use the correctly imported Prisma client 'prisma'
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Define the shape of the data expected from the client
interface GoodsDetailPayload {
    item_name_id: number;
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
    total_amount: number; // This value is mapped to the 'total_charges' DB column
    
    remarks?: string;
    goods_details: GoodsDetailPayload[];
}

/**
 * Handles POST requests to register a new Shipment, its Goods_Details, and associated Transactions.
 * Endpoint: /api/shipments
 */
export async function POST(request: Request) {
    try {
        const payload: ShipmentRequestPayload = await request.json();

        // 1. Basic Validation 
        if (!payload.register_number || !payload.bility_number || !payload.bility_date || payload.goods_details.length === 0) {
            return NextResponse.json({ message: 'Missing critical shipment data.' }, { status: 400 });
        }

        const finalBillAmount = new Prisma.Decimal(payload.total_amount); 
        const totalDeliveryCharges = new Prisma.Decimal(payload.total_delivery_charges);
        
        // Convert goods details charges
        const goodsDetailsForCreate = payload.goods_details.map(detail => ({
            item_name_id: detail.item_id, // Map item_id from form to item_name_id in database
            quantity: detail.quantity,
            // The 'charges' field still exists in your schema.prisma
            charges: new Prisma.Decimal(0), 
            
            // Set delivery_charges to 0 since we're using total_delivery_charges now
            delivery_charges: new Prisma.Decimal(0),
            
            // DO NOT include deliverability_charges or extra_charges here.
        }));

        // 2. Begin Atomic Transaction
        const [newShipment] = await prisma.$transaction([
            // A) Create the main Shipment record
            prisma.shipment.create({
                data: {
                    register_number: payload.register_number,
                    bility_number: payload.bility_number,
                    bility_date: new Date(payload.bility_date), 
                    departure_city_id: payload.departure_city_id,
                    to_city_id: payload.to_city_id || undefined, 
                    forwarding_agency_id: payload.forwarding_agency_id,
                    vehicle_number_id: payload.vehicle_number_id,
                    sender_id: payload.sender_id,
                    receiver_id: payload.receiver_id,
                    walk_in_sender_name: payload.walk_in_sender_name,
                    walk_in_receiver_name: payload.walk_in_receiver_name,

                    total_charges: finalBillAmount, 
                    // This field MUST be in your schema.prisma
                    total_delivery_charges: totalDeliveryCharges, 
                    
                    remarks: payload.remarks,
                    
                    goodsDetails: { 
                        createMany: {
                            data: goodsDetailsForCreate,
                        }
                    }
                },
            }),

            // B) Create the Transaction record (Credit: Sender pays the company)
            prisma.transaction.create({ 
                data: {
                    transaction_date: new Date(),
                    party_type: 'SENDER',
                    party_ref_id: payload.sender_id,
                    shipment_id: payload.register_number,
                    credit_amount: finalBillAmount, 
                    debit_amount: new Prisma.Decimal(0),
                    description: `Shipment Bill for Bility #${payload.bility_number}. Sender: ${payload.walk_in_sender_name || `Party ID: ${payload.sender_id}`}.`,
                },
            }),
        ]);

        // 3. Return success
        return NextResponse.json({
            message: 'Shipment registered successfully.',
            shipment: newShipment,
        }, { status: 201 });

    } catch (error) {
        // 4. Handle Errors
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            console.warn('Attempted to register a duplicate bility number or register number.');
            return NextResponse.json(
                { message: 'Bility number or Registration ID already exists. Please use unique identifiers.' },
                { status: 409 }
            );
        }

        console.error('Shipment Registration Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to register shipment.' },
            { status: 500 }
        );
    }
}

// ----------------------------------------------------------------------

/**
 * Handles GET requests to fetch all existing shipments.
 * Endpoint: /api/shipments
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const bility_number = searchParams.get('bility_number');

        let shipments;

        if (bility_number) {
            // Search for specific shipment by bility number
            const shipment = await prisma.shipment.findUnique({
                where: { bility_number },
                include: {
                    goodsDetails: {
                        include: {
                            itemCatalog: true,
                        },
                    },
                    departureCity: true,
                    toCity: true,
                    sender: true,
                    receiver: true,
                },
            });
            shipments = shipment ? [shipment] : [];
        } else {
            // Get all shipments
            shipments = await prisma.shipment.findMany({
                orderBy: {
                    createdAt: 'desc', // Sort by newest first
                },
                include: {
                    goodsDetails: {
                        include: {
                            itemCatalog: true, // Include item details to get item description
                        },
                    },
                    departureCity: true,
                    toCity: true,
                    sender: true,
                    receiver: true,
                },
            });
        }

        // Return a 200 OK response with the list of shipments
        return NextResponse.json(bility_number ? shipments[0] || null : shipments, { status: 200 });
    } catch (error) {
        console.error('Error fetching shipments:', error);
        return NextResponse.json(
            { message: 'Internal Server Error while fetching shipments.' },
            { status: 500 }
        );
    }
}