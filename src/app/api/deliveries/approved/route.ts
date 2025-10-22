import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient, ApprovalStatus } from '@prisma/client'; 

const prisma = new PrismaClient();

// --- REQUIRED GET HANDLER ---
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return NextResponse.json(
            { error: 'Invalid or missing date parameter (format YYYY-MM-DD).' },
            { status: 400 }
        );
    }
    
    // Set date range for filtering
    const startOfDay = new Date(dateParam + 'T00:00:00.000Z');
    const endOfDay = new Date(dateParam + 'T23:59:59.999Z');

    try {
        const approvedDeliveries = await prisma.delivery.findMany({
            where: {
                // FIX: Filter by approved_at (the final approval date) instead of delivery_date
                approved_at: { 
                    gte: startOfDay,
                    lte: endOfDay,
                },
                approval_status: 'APPROVED' as ApprovalStatus,
            },
            include: {
                shipment: { 
                    select: {
                        total_charges: true,
                        receiver: { 
                            select: { name: true },
                        },
                    },
                },
            },
            orderBy: {
                approved_at: 'desc',
            },
        });

        const transformedDeliveries = approvedDeliveries.map(delivery => {
            
            // Explicit conversion to Number() handles Prisma Decimal/Float objects cleanly
            const deliveryCharges = delivery.shipment?.total_charges 
                ? Number(delivery.shipment.total_charges) 
                : 0;

            const expenses = delivery.total_expenses
                ? Number(delivery.total_expenses)
                : 0;

            return {
                delivery_id: delivery.delivery_id,
                shipment_id: delivery.shipment_id, 
                delivery_date: delivery.delivery_date.toISOString(), 
                receiver_name: delivery.shipment?.receiver?.name || delivery.receiver_name || 'N/A', 
                delivery_status: delivery.delivery_status,
                approval_status: delivery.approval_status, 
                approved_by: delivery.approved_by,
                approved_at: delivery.approved_at?.toISOString(),
                total_expenses: expenses,
                total_delivery_charges: deliveryCharges,
            };
        });

        return NextResponse.json(transformedDeliveries);
        
    } catch (error) {
        console.error('Error fetching approved deliveries by date:', error);
        return NextResponse.json(
            { error: 'Internal server error: Failed to process data.' },
            { status: 500 }
        );
    } finally {
        // Ensure connection is closed
        await prisma.$disconnect(); 
    }
}