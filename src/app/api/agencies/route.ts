import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { Prisma } from '@prisma/client'; 
import { authenticate, UserRole, Permissions } from '@/lib/auth';

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
    // --- RBAC CHECK: Requires ADMIN or SUPERADMIN ---
    const authResult = await authenticate(request, Permissions.MASTER_DATA_WRITE);
    
    // Check if unauthorized and ensure a response exists before returning
    if (!authResult.authorized) {
      console.log('Unauthorized attempt to add agency.');
      // Ensure we have a valid response object to return
      if (authResult.response) {
        return authResult.response;
      }
      // Fallback for an unexpected null response from authenticate (prevents type error)
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 }); 
    }
    // --- END RBAC CHECK ---

    const { name }: AgencyRequest = await request.json(); 
    
    // Clean and validate input
    const agencyName = name?.trim();

    if (!agencyName || typeof agencyName !== 'string' || agencyName.length < 2) {
      return NextResponse.json(
        { message: 'Agency name must be a valid string of at least 2 characters.' },
        { status: 400 }
      );
    }
    
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

/** * Handles GET requests to fetch all Agency records.
 * Endpoint: /api/agencies
 * * NOTE: The 'request: Request' parameter is required for middleware like 'authenticate' 
 * to function correctly, even if the request isn't directly used for data.
 */
export async function GET(request: Request) { // <-- FIX: Added 'request: Request' argument
  try {
    // --- RBAC CHECK: Requires OPERATOR, ADMIN or SUPERADMIN for viewing ---
    const authResult = await authenticate(request, Permissions.REPORTS_VIEW);
    
    // Check if unauthorized and ensure a response exists before returning
    if (!authResult.authorized) {
        // Return 403. Ensure we have a valid response object to return
        if (authResult.response) {
            return authResult.response; 
        }
        // Fallback for an unexpected null response from authenticate (prevents type error)
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 }); 
    }
    // --- END RBAC CHECK ---
    
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
