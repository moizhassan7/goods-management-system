import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
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
          create: items.map((item: any) => ({
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
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to create return shipment", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shipmentId = searchParams.get("shipmentId");
    const status = searchParams.get("status");

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
      }
    });

    return NextResponse.json(returns);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch returns", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, action_taken, comments } = body;

    const updateData: any = {
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
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update return shipment", details: error.message },
      { status: 500 }
    );
  }
}