import { requireAuth, isAuthError, Permissions } from '@/lib/auth';
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { ReturnStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
    const auth = await requireAuth(request, Permissions.CORE_OPERATIONS);
    if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const {
      original_shipment_id,
      reason,
      items,
      action_taken,
      comments
    } = body;

    // Create return shipment
    const returnShipment = await prisma.returnShipment.create({
      data: {
        original_shipment_id,
        reason,
        action_taken,
        comments,
        status: "PENDING",
        returnItems: {
          create: (Array.isArray(items) ? items : []).map((item: { goods_detail_id: number; quantity_returned: number; condition: string }) => ({
            goods_detail_id: item.goods_detail_id,
            quantity_returned: item.quantity_returned,
            condition: item.condition
          }))
        }
      },
      include: {
        returnItems: true,
        originalShipment: {
          include: {
            goodsDetails: true,
            sender: true,
            receiver: true
          }
        }
      }
    });

    return NextResponse.json(returnShipment);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create return shipment" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request, Permissions.REPORTS_VIEW);
    if (isAuthError(auth)) return auth;

  try {
    const searchParams = request.nextUrl.searchParams;
    const shipmentId = searchParams.get("shipmentId");
    const status = searchParams.get("status") as ReturnStatus | null;

    const where = {
      ...(shipmentId && { original_shipment_id: shipmentId }),
      ...(status && { status: status })
    };

    const returns = await prisma.returnShipment.findMany({
      where,
      include: {
        returnItems: {
          include: {
            goodsDetail: {
              include: {
                itemCatalog: true
              }
            }
          }
        },
        originalShipment: {
          include: {
            sender: true,
            receiver: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 1000,
    });

    return NextResponse.json(returns);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
    const auth = await requireAuth(request, Permissions.CORE_OPERATIONS);
    if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { id, status, action_taken, comments } = body;

    const updateData: {
      status?: ReturnStatus;
      action_taken?: string;
      comments?: string;
      resolution_date?: Date;
    } = {
      status,
      ...(action_taken && { action_taken }),
      ...(comments && { comments })
    };

    if (status === "COMPLETED") {
      updateData.resolution_date = new Date();
    }

    const returnShipment = await prisma.returnShipment.update({
      where: { id },
      data: updateData,
      include: {
        returnItems: true,
        originalShipment: {
          include: {
            goodsDetails: true,
            sender: true,
            receiver: true
          }
        }
      }
    });

    return NextResponse.json(returnShipment);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update return shipment" },
      { status: 500 }
    );
  }
}