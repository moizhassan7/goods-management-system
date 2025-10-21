// app/api/vehicles/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assumes shared Prisma client utility
import { Prisma } from '@prisma/client'; 

// Type definition for the expected request body
interface VehicleRequest {
  vehicleNumber: string;
}

/**
 * Handles POST requests to create a new Vehicle record.
 * Endpoint: /api/vehicles
 */
export async function POST(request: Request) {
  try {
    // Note: The key is expected to be 'vehicleNumber' as per the client form
    const { vehicleNumber }: VehicleRequest = await request.json(); 
    
    // Clean and validate input
    const cleanVehicleNumber = vehicleNumber?.trim().toUpperCase(); // Common practice to store vehicle numbers in uppercase

    if (!cleanVehicleNumber || typeof cleanVehicleNumber !== 'string' || cleanVehicleNumber.length < 2) {
      return NextResponse.json(
        { message: 'Vehicle number must be a valid string of at least 2 characters.' },
        { status: 400 }
      );
    }
    
    // Create the new vehicle in the database
    const newVehicle = await prisma.vehicle.create({
      data: { vehicleNumber: cleanVehicleNumber },
    });
    
    // Return success response
    return NextResponse.json(newVehicle, { status: 201 });

  } catch (error) {
    // Check for Prisma unique constraint error (P2002) - Vehicle number must be unique
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      console.warn('Attempted to add a duplicate vehicle number.');
      return NextResponse.json(
        { message: 'The provided vehicle number already exists. Vehicle numbers must be unique.' },
        { status: 409 } // 409 Conflict
      );
    }

    // Handle other server errors
    console.error('Error adding vehicle:', error);
    return NextResponse.json(
      { message: 'Internal Server Error: Failed to process request.' }, 
      { status: 500 }
    );
  }
}
// Note: GET method
export async function GET() {
    try {
        const vehicles = await prisma.vehicle.findMany();
        return NextResponse.json(vehicles, { status: 200 });
    }
    catch (error) {
        console.error('Error fetching vehicles:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to fetch vehicles.' },
            { status: 500 }
        );
    }
}


