// app/api/agencies/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { Prisma } from '@prisma/client'; 

// Type definition for the expected request body
interface AgencyRequest {
  name: string;
}

/**
 * Handles POST requests to create a new Agency record.
 * Endpoint: /api/agencies
 */
export async function POST(request: Request) {
  try {
    const { name }: AgencyRequest = await request.json(); 
    
    // Clean and validate input
    const agencyName = name?.trim();

    if (!agencyName || typeof agencyName !== 'string' || agencyName.length < 2) {
      return NextResponse.json(
        { message: 'Agency name must be a valid string of at least 2 characters.' },
        { status: 400 }
      );
    }
    
    // The error is fixed here by re-generating the Prisma client
    const newAgency = await prisma.agency.create({ 
      data: { name: agencyName },
    });
    
    // Return success response
    return NextResponse.json(newAgency, { status: 201 });

  } catch (error) {
    // Check for Prisma unique constraint error (P2002) - Agency name must be unique
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      console.warn('Attempted to add a duplicate agency.');
      return NextResponse.json(
        { message: 'An agency with this name already exists. Agency names must be unique.' },
        { status: 409 } // 409 Conflict
      );
    }

    // Handle other server errors
    console.error('Error adding agency:', error);
    return NextResponse.json(
      { message: 'Internal Server Error: Failed to process request.' }, 
      { status: 500 }
    );
  }
}

/** Handles GET requests to fetch all Agency records.
 * Endpoint: /api/agencies
 */
export async function GET() {
  try {
    const agencies = await prisma.agency.findMany();
    return NextResponse.json(agencies, { status: 200 });
  } catch (error) {
    console.error('Error fetching agencies:', error);
    return NextResponse.json(
      { message: 'Internal Server Error: Unable to fetch agencies.' },
      { status: 500 }
    );
  }
}
