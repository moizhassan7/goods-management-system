import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, ApprovalStatus } from '@prisma/client'; 

const prisma = new PrismaClient();

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ deliveryId: string }> }
) {
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
        const { action, approvedBy } = body;

        // MODIFIED: Update validation to include the intermediate status APPROVED_BY_ADMIN
        const validActions = [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.APPROVED_BY_ADMIN];
        
        if (!action || !validActions.includes(action as ApprovalStatus)) {
            return NextResponse.json(
                { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
                { status: 400 }
            );
        }

        // Check if delivery exists
        const delivery = await prisma.delivery.findUnique({
            where: { delivery_id: deliveryId },
        });

        if (!delivery) {
            return NextResponse.json(
                { error: 'Delivery not found' },
                { status: 404 }
            );
        }

        // Check if already processed and the target action is the same (prevent redundant update, except for PENDING)
        if (delivery.approval_status !== 'PENDING' && delivery.approval_status === action) {
             return NextResponse.json(
                { error: `Delivery is already in the target status: ${delivery.approval_status.toLowerCase()}` },
                { status: 400 }
            );
        }

        // Update the delivery approval status
        const updatedDelivery = await prisma.delivery.update({
            where: { delivery_id: deliveryId },
            data: {
                approval_status: action as ApprovalStatus, // Use the incoming action as the new status
                approved_by: approvedBy || 'System', 
                approved_at: new Date(),
            },
        });

        return NextResponse.json({
            message: `Delivery status updated to ${action.toLowerCase()} successfully`,
            delivery: {
                delivery_id: updatedDelivery.delivery_id,
                shipment_id: updatedDelivery.shipment_id,
                approval_status: updatedDelivery.approval_status,
                approved_by: updatedDelivery.approved_by,
                approved_at: updatedDelivery.approved_at,
            },
        });

    } catch (error) {
        console.error('Error updating delivery approval:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}