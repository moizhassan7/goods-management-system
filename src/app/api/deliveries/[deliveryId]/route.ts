// src/app/api/deliveries/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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

        // Validate action
        if (!action || !['APPROVED', 'REJECTED'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Must be APPROVED or REJECTED' },
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

        // Check if already processed
        if (delivery.approval_status !== 'PENDING') {
            return NextResponse.json(
                { error: `Delivery already ${delivery.approval_status.toLowerCase()}` },
                { status: 400 }
            );
        }

        // Update the delivery approval status
        const updatedDelivery = await prisma.delivery.update({
            where: { delivery_id: deliveryId },
            data: {
                approval_status: action,
                approved_by: approvedBy || 'SuperAdmin', // Default to SuperAdmin if not provided
                approved_at: new Date(),
            },
        });

        return NextResponse.json({
            message: `Delivery ${action.toLowerCase()} successfully`,
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