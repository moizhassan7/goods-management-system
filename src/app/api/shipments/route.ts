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

    total_delivery_charges: number;
    total_amount: number; // This value is mapped to the 'total_charges' DB column

    remarks?: string;
    goods_details: GoodsDetailPayload[];
    
    // NEW: Field to store the payment status
    payment_status?: 'PENDING' | 'ALREADY_PAID' | 'FREE';

    // *** ADDED EXPENSE FIELDS FOR STORAGE IN SHIPMENT MODEL ***
    station_expense?: number;
    bility_expense?: number;
    station_labour?: number;
    cart_labour?: number;
    total_expenses?: number;
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

        // --- Auto-generate register_number with Max-Sequence & Retry Logic ---
        const bilityDate = new Date(payload.bility_date);
        const year = bilityDate.getFullYear();
        const month = (bilityDate.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `${year}${month}-`;
        
        // Find highest existing register_number starting with this month prefix
        const latestShipment = await prisma.shipment.findFirst({
            where: {
                register_number: {
                    startsWith: prefix,
                },
            },
            orderBy: {
                register_number: 'desc',
            },
            select: {
                register_number: true,
            },
        });

        let baseNum = 1;
        if (latestShipment?.register_number) {
            const parts = latestShipment.register_number.split('-');
            if (parts.length === 2) {
                const parsed = parseInt(parts[1], 10);
                if (!isNaN(parsed)) {
                    baseNum = parsed + 1;
                }
            }
        }

        let newShipment;
        let register_number = '';
        const MAX_RETRIES = 10;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const nextSeq = baseNum + attempt;
                register_number = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
        
                const finalBillAmount = new Prisma.Decimal(payload.total_amount || 0);
                const totalDeliveryCharges = new Prisma.Decimal(payload.total_delivery_charges || 0);
        
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
                    // A) Create the main Shipment record
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
        
                            total_charges: finalBillAmount,
                            total_delivery_charges: totalDeliveryCharges,

                            station_expense: new Prisma.Decimal(payload.station_expense || 0),
                            bility_expense: new Prisma.Decimal(payload.bility_expense || 0),
                            station_labour: new Prisma.Decimal(payload.station_labour || 0),
                            cart_labour: new Prisma.Decimal(payload.cart_labour || 0),
                            total_expenses: new Prisma.Decimal(payload.total_expenses || 0),
        
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
                                description: `Shipment Bill for Bility #${payload.bility_number}. Sender: Party ID: ${payload.sender_id}.`,
                            },
                        }),
                    ] : []),
                ]);

                // If transaction succeeds, break the retry loop
                break; 

            } catch (error) {
                // Only catch P2002 (Unique constraint violation on register_number) for retry attempts
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                    if (attempt < MAX_RETRIES - 1) {
                        console.warn(`Registration ID collision for ${register_number}. Auto-incrementing to next sequence...`);
                        continue;
                    }
                    throw new Error('Failed to allocate a unique registration number after multiple attempts.');
                }
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

// -----------------------------------------------------------------------------

/**
 * Handles GET requests to fetch all existing shipments.
 * Endpoint: /api/shipments
 * Supports query, delivered=false, and date=YYYY-MM-DD filter.
 * FIX: Now supports bility_number query for exact lookup (used by deliveries/add).
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');
        const delivered = searchParams.get('delivered');
        const dateParam = searchParams.get('date');
        const bilityNumberParam = searchParams.get('bility_number'); 

        let baseWhere: Prisma.ShipmentWhereInput = {};

        // 1. Apply 'delivered' filter first 
        if (delivered === 'false') {
            baseWhere.delivery_date = null; // Only undelivered shipments
        }
        
        // 2. Apply 'date' filter based on creation/entry date
        if (dateParam) {
            const startOfIso = new Date(dateParam + 'T00:00:00.000Z');
            const endOfIso = new Date(dateParam + 'T23:59:59.999Z');
            const startOfLocal = new Date(`${dateParam}T00:00:00`);
            const endOfLocal = new Date(`${dateParam}T23:59:59.999`);

            baseWhere.OR = [
                { created_day: { gte: startOfIso, lte: endOfIso } },
                { createdAt: { gte: startOfIso, lte: endOfIso } },
                { created_day: { gte: startOfLocal, lte: endOfLocal } },
                { createdAt: { gte: startOfLocal, lte: endOfLocal } },
            ];
        }

        // *** START FIX FOR RangeError: Maximum call stack size exceeded ***
        let finalWhere = baseWhere; // Start with the base filters

        // 3. Apply 'bility_number' exact match filter 
        if (bilityNumberParam) {
            // Combine existing filters (baseWhere) with the new exact match filter using AND.
            // Do NOT reference 'baseWhere' directly within an 'AND' array of 'baseWhere' itself.
            finalWhere = {
                AND: [
                    baseWhere, 
                    {bility_number: { 
                    equals: bilityNumberParam, 
                    // mode: 'insensitive' // <--- 🌟 Case-Insensitive Fix Applied Here
                    // mode: 'insensitive'
                }},
                ],
            };
        } else if (query) {
            // 4. Apply generic 'query' filter
            // Combine existing filters (baseWhere) with the new OR condition using AND.
            finalWhere = {
                AND: [
                    baseWhere, 
                    {
                        OR: [
                            { register_number: { contains: query } },
                           { bility_number: { contains: query, mode: 'insensitive' } },
                            // Note: Prisma needs the full path for nested filtering
                            { sender: { name: { contains: query, mode: 'insensitive' } } },
                            { receiver: { name: { contains: query, mode: 'insensitive' } } },
                        ],
                    }
                ],
            };
        }
        // *** END FIX ***


        const shipments = await prisma.shipment.findMany({
            where: finalWhere, // Use the correctly constructed 'finalWhere'
            // *** FINAL RECURSION FIX: Explicitly select minimal fields for all deep relations ***
            select: {
                // Base Shipment fields (include all scalar fields explicitly for safety)
                register_number: true,
                bility_number: true,
                bility_date: true,
                departure_city_id: true,
                to_city_id: true,
                forwarding_agency_id: true,
                vehicle_number_id: true,
                sender_id: true,
                receiver_id: true,
                total_charges: true,
                delivery_date: true,
                remarks: true,
                total_delivery_charges: true,
                station_expense: true,
                bility_expense: true,
                station_labour: true,
                cart_labour: true,
                total_expenses: true,
                created_day: true,
                createdAt: true,
                updatedAt: true,
                
                // Related models (Minimal selection)
                goodsDetails: { 
                    select: { 
                        quantity: true, 
                        item_name_id: true,
                        itemCatalog: { 
                            select: { 
                                id: true,
                                item_description: true 
                            } 
                        } 
                    } 
                },
                departureCity: { select: { name: true } },
                toCity: { select: { name: true } },
                sender: { select: { id: true, name: true, contactInfo: true } },
                receiver: { select: { id: true, name: true, contactInfo: true } }, 
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
            // Convert Decimals to Numbers for client consumption
            total_charges: Number(s.total_charges),
            total_delivery_charges: Number(s.total_delivery_charges),
            station_expense: Number(s.station_expense),
            bility_expense: Number(s.bility_expense),
            station_labour: Number(s.station_labour),
            cart_labour: Number(s.cart_labour),
            total_expenses: Number(s.total_expenses),
            // Rename createdAt to created_at to match interface
            created_at: s.createdAt,
        })), { status: 200 });
    } catch (error) {
        console.error('Error fetching shipments:', error);
        return NextResponse.json(
            { message: 'Internal Server Error while fetching shipments. Check logs for database connection/serialization issues.' },
            { status: 500 }
        );
    }
}