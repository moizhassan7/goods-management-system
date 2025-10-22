// src/app/api/shipments/route.ts

import { NextResponse } from 'next/server';

// FIX: Use the correctly imported Prisma client 'prisma'
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Define the shape of the data expected from the client
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
    total_amount: number; // This value is mapped to the 'total_charges' DB column

    remarks?: string;
    goods_details: GoodsDetailPayload[];
    
    // NEW: Field to store the payment status
    payment_status?: 'PENDING' | 'ALREADY_PAID' | 'FREE';
}

// Prefix to embed payment status in the remarks field (simulating a DB field)
const PAYMENT_STATUS_PREFIX = "PAYMENT_STATUS:"; 

/**
 * Handles POST requests to register a new Shipment.
 * Endpoint: /api/shipments
 */
export async function POST(request: Request) {
    try {
        const payload: ShipmentRequestPayload = await request.json();

        // 1. Basic Validation
        if (!payload.bility_number || !payload.bility_date || payload.goods_details.length === 0) {
            return NextResponse.json({ message: 'Missing critical shipment data.' }, { status: 400 });
        }

        // --- Auto-generate register_number with Retry Logic ---
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
                // IMPORTANT: Recalculate count inside the loop for retries
                const countForMonth = await prisma.shipment.count({
                    where: {
                        bility_date: {
                            gte: monthStart,
                            lte: monthEnd,
                        },
                    },
                });
                const nextCount = countForMonth + 1;
                register_number = `${year}${month}-${nextCount.toString().padStart(3, '0')}`;
        
                const finalBillAmount = new Prisma.Decimal(payload.total_amount);
                const totalDeliveryCharges = new Prisma.Decimal(payload.total_delivery_charges);
        
                // Prepare remarks field to include payment status for persistence
                let finalRemarks = payload.remarks || '';
                if (payload.payment_status) {
                    finalRemarks = `${PAYMENT_STATUS_PREFIX}${payload.payment_status} ${finalRemarks}`;
                }
        
                // Convert goods details charges
                const goodsDetailsForCreate = payload.goods_details.map(detail => ({
                    item_name_id: detail.item_id, // Map item_id from form to item_name_id in database
                    quantity: detail.quantity,
                    charges: new Prisma.Decimal(0),
                    delivery_charges: new Prisma.Decimal(0),
                }));
        
                // 2. Begin Atomic Transaction
                [newShipment] = await prisma.$transaction([
                    // A) Create the main Shipment record (will throw P2002 if ID conflicts)
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
                                createMany: {
                                    data: goodsDetailsForCreate,
                                }
                            }
                        },
                    }),
        
                    // B) Create the Transaction record (Credit: Sender pays the company)
                    ...(payload.payment_status !== 'ALREADY_PAID' && payload.payment_status !== 'FREE' ? [
                        prisma.transaction.create({
                            data: {
                                transaction_date: new Date(),
                                party_type: 'SENDER',
                                party_ref_id: payload.sender_id,
                                shipment_id: register_number,
                                credit_amount: finalBillAmount,
                                debit_amount: new Prisma.Decimal(0),
                                description: `Shipment Bill for Bility #${payload.bility_number}. Sender: ${payload.walk_in_sender_name || `Party ID: ${payload.sender_id}`}.`,
                            },
                        }),
                    ] : []),
                ]);

                // If transaction succeeds, break the retry loop
                break; 

            } catch (error) {
                // Only catch P2002 (Unique constraint violation) for retry attempts
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                    // Check if the conflict is on the bility_number, which should stop immediate retries
                    const isBilityConflict = error.meta?.target === 'Shipment_bility_number_key';
                    
                    if (isBilityConflict) {
                        // Conflict on the bility number means the data is duplicated, not just a race condition
                        throw new Error('Bility number already exists. Please use a unique identifier.');
                    }
                    
                    if (attempt < MAX_RETRIES - 1) {
                         console.warn(`Race condition detected for registration number ${register_number}. Retrying...`);
                        continue; // Retry with a new, incremented count
                    }
                    // If max retries reached, throw generic registration ID conflict
                    throw new Error('Failed to generate a unique registration ID after multiple attempts.');
                }
                // If it's another error, re-throw
                throw error;
            }
        }
        
        if (!newShipment) {
             throw new Error('Failed to register shipment due to an unknown error.');
        }

        // 3. Return success
        return NextResponse.json({
            message: 'Shipment registered successfully.',
            shipment: newShipment,
            register_number,
        }, { status: 201 });

    } catch (error) {
        // 4. Handle Errors
        console.error('Shipment Registration Error:', error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Internal Server Error: Failed to register shipment.' },
            { status: 500 }
        );
    }
}

/**
 * Handles GET requests to fetch all existing shipments.
 * Endpoint: /api/shipments
 * Supports query, delivered=false, and NEW: date=YYYY-MM-DD filter.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');
        const delivered = searchParams.get('delivered');
        // NEW: Read date parameter
        const dateParam = searchParams.get('date');

        const where: Prisma.ShipmentWhereInput = {};

        // 1. Apply 'delivered' filter first (used by labour assignments)
        if (delivered === 'false') {
            where.delivery_date = null; // Only undelivered shipments
        }
        
        // 2. Apply 'date' filter (used by shipments/add page for today's list)
        if (dateParam) {
            // Filter shipments whose bility_date falls within the start and end of the given day
            const startOfDay = new Date(dateParam + 'T00:00:00.000Z');
            const endOfDay = new Date(dateParam + 'T23:59:59.999Z');
            
            where.bility_date = {
                gte: startOfDay,
                lte: endOfDay,
            };
        }

        // 3. Apply 'query' filter (takes precedence over general list fetches)
        if (query) {
            // Include existing date/delivered filters via AND, and then apply OR for search terms
            where.AND = [
                // Include existing filters if they were set (e.g., date, delivered=false)
                where, 
                {
                    OR: [
                        { register_number: { contains: query } },
                        { bility_number: { contains: query } },
                        { sender: { name: { contains: query, mode: 'insensitive' } } },
                        { receiver: { name: { contains: query, mode: 'insensitive' } } },
                    ],
                }
            ];
        }


        const shipments = await prisma.shipment.findMany({
            where,
            include: {
                goodsDetails: { include: { itemCatalog: true } },
                departureCity: true,
                toCity: true,
                sender: true,
                receiver: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Helper function to extract payment status from remarks
        const extractPaymentStatus = (remarks: string | null): string | null => {
            if (remarks && remarks.startsWith(PAYMENT_STATUS_PREFIX)) {
                return remarks.split(' ')[0].replace(PAYMENT_STATUS_PREFIX, '');
            }
            return 'PENDING';
        };


        return NextResponse.json(shipments.map(s => ({
            ...s,
            // Attach the extracted payment status
            payment_status: extractPaymentStatus(s.remarks),
        })), { status: 200 });
    } catch (error) {
        console.error('Error fetching shipments:', error);
        return NextResponse.json(
            { message: 'Internal Server Error while fetching shipments.' },
            { status: 500 }
        );
    }
}