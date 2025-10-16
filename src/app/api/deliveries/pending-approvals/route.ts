// src/app/api/deliveries/pending-approvals/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient, ApprovalStatus } from '@prisma/client'; 

const prisma = new PrismaClient();

export async function GET() {
    try {
        const pendingDeliveries = await prisma.delivery.findMany({
            where: {
                // Fetch deliveries that are physically DELIVERED
                delivery_status: 'DELIVERED', 
                approval_status: 'PENDING' as ApprovalStatus, 
            },
            include: {
                shipment: { 
                    select: {
                        register_number: true,
                        total_charges: true, // <-- Ensure this field is selected
                        receiver: { 
                            select: { name: true },
                        },
                    },
                },
            },
            orderBy: {
                delivery_date: 'desc',
            },
        });

        // Transform the data to match the expected frontend format
        const transformedDeliveries = pendingDeliveries.map(delivery => ({
            delivery_id: delivery.delivery_id,
            shipment_id: delivery.shipment_id,
            // Ensure delivery_date is always a valid ISO string for the frontend
            delivery_date: delivery.delivery_date.toISOString(), 
            // Use shipment receiver name, fallback to delivery name, fallback to N/A
            receiver_name: delivery.shipment?.receiver?.name || delivery.receiver_name || 'N/A', 
            delivery_status: delivery.delivery_status,
            approval_status: delivery.approval_status, 
            approved_by: delivery.approved_by,
            approved_at: delivery.approved_at?.toISOString(),
            total_expenses: delivery.total_expenses || 0,
            // Map shipment.total_charges to total_delivery_charges
            total_delivery_charges: delivery.shipment?.total_charges || 0, 
        }));

        return NextResponse.json(transformedDeliveries);
        
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        // Returning a 500 status code here is often better if the error is due to server logic/Prisma connection,
        // unless you are certain the 400 status is correct based on schema validation.
        return NextResponse.json(
            { error: 'Internal server error or Prisma error while fetching pending deliveries.' },
            { status: 500 } // Changed to 500 to better reflect a server-side data issue.
        );
    } finally {
        await prisma.$disconnect();
    }
}