import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const partyId = parseInt(id, 10);

    if (isNaN(partyId)) {
        return NextResponse.json({ error: 'Invalid Party ID.' }, { status: 400 });
    }

    try {
        const { name, contactInfo } = await request.json();

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ error: 'Invalid party name' }, { status: 400 });
        }

        const updatedParty = await prisma.party.update({
            where: { id: partyId },
            data: { 
                name: name.trim(),
                contactInfo: contactInfo ? contactInfo.trim() : null
            },
        });

        return NextResponse.json(updatedParty, { status: 200 });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ error: 'Party name already exists' }, { status: 409 });
        }
        console.error(`Error updating party ${partyId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const partyId = parseInt(id, 10);

    if (isNaN(partyId)) {
        return NextResponse.json({ error: 'Invalid Party ID.' }, { status: 400 });
    }

    try {
        await prisma.party.delete({
            where: { id: partyId },
        });
        return NextResponse.json({ message: 'Party deleted successfully.' }, { status: 200 });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return NextResponse.json({ error: 'Cannot delete this party because it is being used in existing shipments.' }, { status: 409 });
        }
        console.error(`Error deleting party ${partyId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
