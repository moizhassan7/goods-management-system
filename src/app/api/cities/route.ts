// app/api/cities/route.ts
import { prisma } from "../../../lib/prisma";
import { NextRequest, NextResponse } from "next/server";


// API route to handle adding a new city
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json(); 
    // Validate input
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Invalid city name' }, { status: 400 });
    }
    // Check for duplicate
    const existing = await prisma.city.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: 'City name already exists' }, { status: 409 });
    }
    // Save to database using Prisma
    const createCity = await prisma.city.create({
        data: { name: name.trim() },
    })
    return NextResponse.json(createCity, { status: 201 });
  } catch (error) {
    console.error('Error adding city:', error);
    // Use a more specific error for database issues if possible
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// API route to fetch all cities
export async function GET() {
    try {
        const cities = await prisma.city.findMany();
        return NextResponse.json(cities, { status: 200 });
    }
    catch (error) {
        console.error('Error fetching cities:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}