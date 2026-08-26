import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shipments/next-register-number?bility_date=YYYY-MM-DD
 * Returns the next sequential registration number for the given bility_date (month/year)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bility_date = searchParams.get('bility_date');
    if (!bility_date) {
      return NextResponse.json({ message: 'Missing bility_date parameter.' }, { status: 400 });
    }
    const bilityDate = new Date(bility_date);
    const year = bilityDate.getFullYear();
    const month = (bilityDate.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `${year}${month}-`;

    // Find the latest register_number starting with this month prefix
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

    let nextNum = 1;
    if (latestShipment?.register_number) {
      const parts = latestShipment.register_number.split('-');
      if (parts.length === 2) {
        const parsed = parseInt(parts[1], 10);
        if (!isNaN(parsed)) {
          nextNum = parsed + 1;
        }
      }
    }

    const register_number = `${prefix}${nextNum.toString().padStart(4, '0')}`;
    return NextResponse.json({ register_number }, { status: 200 });
  } catch (error) {
    console.error('Error generating next register number:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
