import { requireAuth, isAuthError, Permissions } from '@/lib/auth';
import { canTransitionDeliveryApproval } from '@/lib/approval';
import { NextRequest, NextResponse } from 'next/server';
import { ApprovalStatus } from '@prisma/client'; 
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest,
    { params }: { params: Promise<{ deliveryId: string }> }) {
    const auth = await requireAuth(request, Permissions.DELIVERY_APPROVAL_ADMIN);
    if (isAuthError(auth)) return auth;

    try {
        const { deliveryId: deliveryIdParam } = await params;
        const deliveryId = parseInt(deliveryIdParam);
        
        if (isNaN(deliveryId)) {
            return NextResponse.json(
                { error: 'Invalid delivery ID' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const action = body?.action as ApprovalStatus | undefined;

        const validActions: ApprovalStatus[] = [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.APPROVED_BY_ADMIN];
        
        if (!action || !validActions.includes(action)) {
            return NextResponse.json(
                { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
                { status: 400 }
            );
        }

        const delivery = await prisma.delivery.findUnique({
            where: { delivery_id: deliveryId },
        });

        if (!delivery) {
            return NextResponse.json(
                { error: 'Delivery not found' },
                { status: 404 }
            );
        }

        const from = delivery.approval_status;
        if (!canTransitionDeliveryApproval(auth.role, from, action)) {
            return NextResponse.json(
                { error: 'This approval change is not allowed for the current status or role.' },
                { status: 403 }
            );
        }

        const updatedDelivery = await prisma.delivery.updateMany({
            where: { delivery_id: deliveryId, approval_status: from },
            data: {
                approval_status: action,
                approved_by: auth.username,
                approved_at: new Date(),
            },
        });

        if (updatedDelivery.count !== 1) {
            return NextResponse.json(
                { error: 'Delivery status changed before this update could be saved. Refresh and try again.' },
                { status: 409 }
            );
        }

        const saved = await prisma.delivery.findUnique({
            where: { delivery_id: deliveryId },
        });
        if (!saved) {
            return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: `Delivery status updated to ${action.toLowerCase()} successfully`,
            delivery: {
                delivery_id: saved.delivery_id,
                shipment_id: saved.shipment_id,
                approval_status: saved.approval_status,
                approved_by: saved.approved_by,
                approved_at: saved.approved_at,
            },
        });

    } catch (error) {
        console.error('Error updating delivery approval:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}