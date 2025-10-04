// app/api/items/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Shared Prisma client utility
import { Prisma } from '@prisma/client'; 

// Type definition for the expected request body
interface ItemRequest {
  description: string;
}

/**
 * Handles POST requests to create a new ItemCatalog record.
 * Endpoint: /api/items
 */
export async function POST(request: Request) {
  try {
    const { description }: ItemRequest = await request.json(); 
    
    // Clean and validate input
    const itemDescription = description?.trim();

    if (!itemDescription || typeof itemDescription !== 'string' || itemDescription.length < 2) {
      return NextResponse.json(
        { message: 'Item description must be a valid string of at least 2 characters.' },
        { status: 400 }
      );
    }
    
    // Create the new item in the database
    // Note: We are using item_description as the field name as per your schema
    const newItem = await prisma.itemCatalog.create({
      data: { item_description: itemDescription },
    });
    
    // Return success response
    return NextResponse.json(newItem, { status: 201 });

  } catch (error) {
    // Check for Prisma unique constraint error (P2002) if you decide to make item_description unique
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      console.warn('Attempted to add a duplicate item description.');
      return NextResponse.json(
        { message: 'This item description already exists in the catalog.' },
        { status: 409 } // 409 Conflict
      );
    }

    // Handle other server errors
    console.error('Error adding item:', error);
    return NextResponse.json(
      { message: 'Internal Server Error: Failed to process request.' }, 
      { status: 500 }
    );
  }
}
