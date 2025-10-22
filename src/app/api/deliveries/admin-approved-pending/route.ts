import { NextResponse } from 'next/server';
import { PrismaClient, ApprovalStatus } from '@prisma/client'; 
import { authenticate, Permissions } from '@/lib/auth';

const prisma = new PrismaClient();

// Only SuperAdmin can access this endpoint (as defined in Permissions)
export async function GET(request: Request) {
    
    const authResult = await authenticate(request, Permissions.DELIVERY_APPROVAL_SUPERADMIN);
    if (!authResult.authorized) {
        return authResult.response;
    }
    
    try {
        const pendingDeliveries = await prisma.delivery.findMany({
            where: {
                // Fetch deliveries that are physically DELIVERED
                delivery_status: 'DELIVERED', 
                // Filter by the new intermediate status
                approval_status: 'APPROVED_BY_ADMIN' as ApprovalStatus, 
            },
            include: {
                shipment: { 
                    select: {
                        register_number: true,
                        total_charges: true,
                        receiver: { 
                            select: { name: true },
                        },
                    },
                },
            },
            orderBy: {
                approved_at: 'asc', // Show oldest Admin approvals first
            },
        });

        // Transform the data to match the expected frontend format
        const transformedDeliveries = pendingDeliveries.map(delivery => ({
            delivery_id: delivery.delivery_id,
            shipment_id: delivery.shipment_id,
            delivery_date: delivery.delivery_date.toISOString(), 
            receiver_name: delivery.shipment?.receiver?.name || delivery.receiver_name || 'N/A', 
            delivery_status: delivery.delivery_status,
            approval_status: delivery.approval_status, 
            approved_by: delivery.approved_by,
            approved_at: delivery.approved_at?.toISOString(),
            total_expenses: Number(delivery.total_expenses || 0),
            total_delivery_charges: Number(delivery.shipment?.total_charges || 0), 
        }));

        return NextResponse.json(transformedDeliveries);
        
    } catch (error) {
        console.error('Error fetching admin-approved deliveries:', error);
        return NextResponse.json(
            { error: 'Internal server error while fetching Admin-approved deliveries.' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}