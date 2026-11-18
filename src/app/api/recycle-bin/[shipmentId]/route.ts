import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, UserRole } from '@/lib/auth';
import { prismaErrorMessage } from '@/lib/api-client';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ shipmentId: string }> }
) {
    // Only Super Admin can permanently delete items from Recycle Bin
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

        // Execute transactional cascade permanent delete
        await prisma.$transaction(async (tx) => {
            await tx.transaction.deleteMany({ where: { shipment_id: cleanId } });
            await tx.delivery.deleteMany({ where: { shipment_id: cleanId } });
            await tx.vehicleTransaction.deleteMany({ where: { shipment_id: cleanId } });
            await tx.labourAssignment.deleteMany({ where: { shipment_id: cleanId } });
            await tx.labourPaymentHistory.deleteMany({ where: { shipment_id: cleanId } });
            await tx.goodsDetails.deleteMany({ where: { shipment_id: cleanId } });
            await tx.returnShipment.deleteMany({ where: { original_shipment_id: cleanId } });
            await tx.shipment.delete({ where: { register_number: cleanId } });
        });

        return NextResponse.json({
            message: `Bilty ${shipment.bility_number} (Reg #${shipment.register_number}) permanently deleted.`,
            bility_number: shipment.bility_number,
            register_number: shipment.register_number,
        }, { status: 200 });
    } catch (error) {
        console.error('Error permanently deleting shipment:', error);
        return NextResponse.json({ message: prismaErrorMessage(error, 'Failed to permanently delete shipment.') }, { status: 500 });
    }
}
