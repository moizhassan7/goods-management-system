// app/api/trips/next-serial/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const lastTrip = await prisma.tripLog.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const nextSerial = lastTrip ? lastTrip.id + 1 : 1;

    return NextResponse.json({ nextSerial }, { status: 200 });
  } catch (error) {
    console.error('Error fetching next serial:', error);
    return NextResponse.json({ nextSerial: 1 }, { status: 200 });
  }
}