import { requireAuth, isAuthError, Permissions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CACHE_KEYS, getOrSetCache, MASTER_CACHE_HEADERS } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Handles GET requests to fetch dropdown data for shipment/trip forms.
 * Endpoint: /api/lists
 * Master data is cached (in-memory, Redis if REDIS_URL is set).
 */
export async function GET(request: Request) {
    const auth = await requireAuth(request, Permissions.REPORTS_VIEW);
    if (isAuthError(auth)) return auth;

  try {
    const payload = await getOrSetCache(CACHE_KEYS.MASTER_LISTS, async () => {
      const [cities, agencies, vehicles, parties, items] = await prisma.$transaction([
        prisma.city.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        prisma.agency.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        prisma.vehicle.findMany({ select: { id: true, vehicleNumber: true }, orderBy: { vehicleNumber: 'asc' } }),
        prisma.party.findMany({ select: { id: true, name: true, contactInfo: true }, orderBy: { name: 'asc' } }),
        prisma.itemCatalog.findMany({ select: { id: true, item_description: true }, orderBy: { item_description: 'asc' } }),
      ]);

      return { cities, agencies, vehicles, parties, items };
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: MASTER_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error fetching list data:', error);
    return NextResponse.json(
      { message: 'Internal Server Error: Failed to fetch dropdown lists.' },
      { status: 500 }
    );
  }
}
