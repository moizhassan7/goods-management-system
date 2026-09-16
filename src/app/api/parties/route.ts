import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assumes shared Prisma client utility
import { Prisma } from '@prisma/client';
import { CACHE_KEYS, getOrSetCache, invalidateMasterCache, MASTER_CACHE_HEADERS } from '@/lib/cache'; 

// Type definition for the expected request body
interface PartyRequest {
    name: string;
    contactInfo?: string;
    openingBalance: string; // Received as a string from the client form
}

// -------------------------------------------------------------
// GET Handler: Retrieve all parties (Unchanged)
// -------------------------------------------------------------
/**
 * Handles GET requests to retrieve all Party records.
 * Endpoint: /api/parties
 */
export async function GET() {
    try {
        const parties = await getOrSetCache(CACHE_KEYS.MASTER_PARTIES, () =>
            prisma.party.findMany({
                orderBy: {
                    id: 'desc',
                }
            })
        );

        return NextResponse.json(parties, { status: 200, headers: MASTER_CACHE_HEADERS });

    } catch (error) {
        console.error('Error fetching Parties:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to fetch parties.' }, 
            { status: 500 }
        );
    }
}

// -------------------------------------------------------------
// POST Handler: Create a new party (Updated with Defaults)
// -------------------------------------------------------------
/**
 * Handles POST requests to create a new Party record (Sender/Receiver).
 * Endpoint: /api/parties
 */
export async function POST(request: Request) {
    try {
        const { name, contactInfo, openingBalance }: PartyRequest = await request.json(); 
        
        // Clean inputs
        const cleanName = name?.trim();
        
        // 1. Set Default for contactInfo
        const finalContactInfo = contactInfo?.trim() || "00000000000";

        // 2. Basic Validation (Name is mandatory)
        if (!cleanName || cleanName.length < 2 ) {
            return NextResponse.json(
                { message: 'Party name must be provided and have at least 2 characters.' },
                { status: 400 }
            );
        }
        
        // 3. Decimal Conversion (Handle conversion gracefully with '0.00' default)
        let balanceDecimal: Prisma.Decimal;
        try {
            // Use provided balance if it's a number, otherwise default to '0.00'
            const balanceInput = openingBalance && !isNaN(parseFloat(openingBalance)) ? openingBalance : '0.00';
            balanceDecimal = new Prisma.Decimal(balanceInput);
        } catch (e) {
            // Fallback for extreme cases: ensures balance is always a Decimal('0.00')
            balanceDecimal = new Prisma.Decimal('0.00'); 
        }

        // 4. Create the new Party in the database
        const newParty = await prisma.party.create({
            data: { 
                name: cleanName,
                contactInfo: finalContactInfo, // Using the defaulted value
                opening_balance: balanceDecimal, // Using the defaulted/converted value
            },
        });
        
        await invalidateMasterCache();
        return NextResponse.json(newParty, { status: 201 });

    } catch (error) {
        // Handle database or unexpected errors
        console.error('Error adding Party:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to register party.' }, 
            { status: 500 }
        );
    }
}