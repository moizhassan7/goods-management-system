import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handles GET requests to retrieve a single Vehicle and its Transaction ledger.
 * Endpoint: /api/vehicles/[id]
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const vehicleId = parseInt(id, 10);

    if (isNaN(vehicleId)) {
        return NextResponse.json(
            { message: 'Vehicle ID must be a valid number.' },
            { status: 400 }
        );
    }

    try {
        // Fetch the vehicle and INCLUDE all related vehicle transactions.
        const vehicleWithLedger = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
            include: {
                // Order vehicle transactions chronologically for the ledger view
                vehicleTransactions: {
                    orderBy: {
                        transaction_date: 'asc', // Show oldest transactions first
                    },
                },
            },
        });

        if (!vehicleWithLedger) {
            return NextResponse.json(
                { message: `Vehicle with ID ${vehicleId} not found.` },
                { status: 404 }
            );
        }

        // Return the full object: vehicle details + transactions array
        return NextResponse.json(vehicleWithLedger, { status: 200 });

    } catch (error) {
        console.error(`Error fetching ledger for vehicle ${vehicleId}:`, error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to fetch vehicle ledger.' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const vehicleId = parseInt(id, 10);

    if (isNaN(vehicleId)) {
        return NextResponse.json({ error: 'Invalid Vehicle ID.' }, { status: 400 });
    }

    try {
        const { vehicleNumber } = await request.json();

        if (!vehicleNumber || typeof vehicleNumber !== 'string' || vehicleNumber.trim() === '') {
            return NextResponse.json({ error: 'Invalid vehicle number' }, { status: 400 });
        }

        const updatedVehicle = await prisma.vehicle.update({
            where: { id: vehicleId },
            data: { vehicleNumber: vehicleNumber.trim() },
        });

        return NextResponse.json(updatedVehicle, { status: 200 });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ error: 'Vehicle number already exists' }, { status: 409 });
        }
        console.error(`Error updating vehicle ${vehicleId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const vehicleId = parseInt(id, 10);

    if (isNaN(vehicleId)) {
        return NextResponse.json({ error: 'Invalid Vehicle ID.' }, { status: 400 });
    }

    try {
        await prisma.vehicle.delete({
            where: { id: vehicleId },
        });
        return NextResponse.json({ message: 'Vehicle deleted successfully.' }, { status: 200 });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return NextResponse.json({ error: 'Cannot delete this vehicle because it is being used in existing shipments or trips.' }, { status: 409 });
        }
        console.error(`Error deleting vehicle ${vehicleId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}