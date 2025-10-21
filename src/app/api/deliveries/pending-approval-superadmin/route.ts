
// src/app/api/deliveries/pending-approvals-superadmin/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApprovalStatus } from '@prisma/client';

// -------------------------------------------------------------
// GET Handler: Fetch deliveries awaiting Admin or Super Admin approval
// -------------------------------------------------------------
/**
 * Fetches deliveries that are in PENDING (for Admin) or APPROVED_BY_ADMIN 
 * (for Super Admin) status. Excludes REJECTED and APPROVED deliveries.
 * Endpoint: /api/deliveries/pending-approvals
 */
export async function GET(request: Request) {
    try {
        const deliveries = await prisma.delivery.findMany({
            where: {
                approval_status: {
                    in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED_BY_ADMIN]
                }
            },
            include: {
                shipment: {
                    include: {
                        sender: true,
                        receiver: true,
                    }
                }
            },
            orderBy: { delivery_date: 'asc' }
        });

        return NextResponse.json(deliveries, { status: 200 });
    } catch (error) {
        console.error('Error fetching pending delivery approvals:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// -------------------------------------------------------------
// PATCH Handler: Approves/Rejects delivery based on current status
// -------------------------------------------------------------
/**
 * Handles the sequential approval process:
 * - PENDING -> APPROVED_BY_ADMIN (Admin Approval)
 * - APPROVED_BY_ADMIN -> APPROVED (Super Admin Approval)
 * Endpoint: /api/deliveries/pending-approvals
 */
export async function PATCH(request: Request) {
    try {
        const { delivery_id, action } = await request.json();

        if (!delivery_id || !action || (action !== 'APPROVE' && action !== 'REJECT')) {
            return NextResponse.json({
                message: 'Delivery ID and valid action (APPROVE/REJECT) are required.'
            }, { status: 400 });
        }

        const delivery = await prisma.delivery.findUnique({
            where: { delivery_id: parseInt(delivery_id) }
        });

        if (!delivery) {
            return NextResponse.json({
                message: 'Delivery record not found.'
            }, { status: 404 });
        }

        let newStatus: ApprovalStatus;

        if (action === 'REJECT') {
            newStatus = ApprovalStatus.REJECTED;
        } else {
            // Sequential Approval Logic
            if (delivery.approval_status === ApprovalStatus.PENDING) {
                // Admin Approval
                newStatus = ApprovalStatus.APPROVED_BY_ADMIN;
            } else if (delivery.approval_status === ApprovalStatus.APPROVED_BY_ADMIN) {
                // Super Admin Approval
                newStatus = ApprovalStatus.APPROVED;
            } else {
                return NextResponse.json({
                    message: `Delivery is already in status: ${delivery.approval_status}. Cannot approve further.`
                }, { status: 400 });
            }
        }

        const updatedDelivery = await prisma.delivery.update({
            where: { delivery_id: parseInt(delivery_id) },
            data: {
                approval_status: newStatus
            }
        });

        const statusDescription = newStatus === ApprovalStatus.APPROVED ? 'Approved (Final)' : 
                                 newStatus === ApprovalStatus.APPROVED_BY_ADMIN ? 'Approved by Admin' : 
                                 'Rejected';

        return NextResponse.json({
            message: `Delivery #${updatedDelivery.delivery_id} status updated to ${statusDescription}.`
        }, { status: 200 });

    } catch (error) {
        console.error('Error updating delivery approval status:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to update status.' },
            { status: 500 }
        );
    }
}