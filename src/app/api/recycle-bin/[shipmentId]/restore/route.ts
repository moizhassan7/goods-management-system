import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, UserRole } from '@/lib/auth';
import { prismaErrorMessage } from '@/lib/api-client';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ shipmentId: string }> }
) {
    // Only Super Admin can restore deleted items from Recycle Bin
    const auth = await requireAuth(request, [UserRole.SUPERADMIN]);
    if (isAuthError(auth)) return auth;

    const { shipmentId } = await params;

    try {
        const cleanId = decodeURIComponent(shipmentId).trim();

        const shipment = await prisma.shipment.findUnique({
            where: { register_number: cleanId },
            select: { register_number: true, bility_number: true, is_deleted: true },
        });

        if (!shipment) {
            return NextResponse.json({ message: 'Shipment not found.' }, { status: 404 });
        }

        if (!shipment.is_deleted) {
            return NextResponse.json({ message: 'Shipment is already active.' }, { status: 400 });
        }

        const restored = await prisma.shipment.update({
            where: { register_number: cleanId },
            data: {
                is_deleted: false,
                deleted_at: null,
                deleted_by_id: null,
                deleted_by_name: null,
            },
        });

        return NextResponse.json({
            message: `Bilty ${restored.bility_number} (Reg #${restored.register_number}) recovered successfully.`,
            shipment: {
                register_number: restored.register_number,
                bility_number: restored.bility_number,
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error restoring shipment:', error);
        return NextResponse.json({ message: prismaErrorMessage(error, 'Failed to restore shipment.') }, { status: 500 });
    }
}
