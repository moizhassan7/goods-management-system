import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assumes shared Prisma client utility
import { Prisma } from '@prisma/client'; 

// Type definition for the expected request body
interface PartyRequest {
  name: string;
  contactInfo: string;
  openingBalance: string; // Received as a string from the client form
}

// -------------------------------------------------------------
// GET Handler: Retrieve all parties
// -------------------------------------------------------------
/**
 * Handles GET requests to retrieve all Party records.
 * Endpoint: /api/parties
 */
export async function GET() {
  try {
    const parties = await prisma.party.findMany({
      // Fetch all parties, ordered by ID descending (newest first)
      orderBy: {
        id: 'desc', 
      }
    });

    // Return the list of parties
    return NextResponse.json(parties, { status: 200 });

  } catch (error) {
    console.error('Error fetching Parties:', error);
    return NextResponse.json(
      { message: 'Internal Server Error: Failed to fetch parties.' }, 
      { status: 500 }
    );
  }
}

// -------------------------------------------------------------
// POST Handler: Create a new party
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
    const cleanContactInfo = contactInfo?.trim();

    // 1. Basic Validation
    if (!cleanName || cleanName.length < 2 || !cleanContactInfo || cleanContactInfo.length < 5) {
      return NextResponse.json(
        { message: 'Name and Contact Info must be valid strings.' },
        { status: 400 }
      );
    }
    
    // 2. Decimal Conversion and Validation
    let balanceDecimal: Prisma.Decimal;
    try {
        // Prisma expects a Decimal object for @db.Decimal fields
        balanceDecimal = new Prisma.Decimal(openingBalance || '0.00');
    } catch (e) {
        return NextResponse.json(
            { message: 'Opening balance must be a valid number.' },
            { status: 400 }
        );
    }

    // 3. Create the new Party in the database
    const newParty = await prisma.party.create({
      data: { 
        name: cleanName,
        contactInfo: cleanContactInfo,
        opening_balance: balanceDecimal,
      },
    });
    
    // Return success response
    return NextResponse.json(newParty, { status: 201 });

  } catch (error) {
    console.error('Error adding Party:', error);
    return NextResponse.json(
      { message: 'Internal Server Error: Failed to register party.' }, 
      { status: 500 }
    );
  }
}