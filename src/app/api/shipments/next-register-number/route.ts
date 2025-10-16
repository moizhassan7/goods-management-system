import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shipments/next-register-number?bility_date=YYYY-MM-DD
 * Returns the next registration number for the given bility_date (month/year)
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
    const monthStart = new Date(year, bilityDate.getMonth(), 1);
    const monthEnd = new Date(year, bilityDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const countForMonth = await prisma.shipment.count({
      where: {
        bility_date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });
    const nextCount = countForMonth + 1;
    const register_number = `${year}${month}-${nextCount.toString().padStart(3, '0')}`;
    return NextResponse.json({ register_number }, { status: 200 });
  } catch (error) {
    console.error('Error generating next register number:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
