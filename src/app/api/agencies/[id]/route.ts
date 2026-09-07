import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const agencyId = parseInt(id, 10);

    if (isNaN(agencyId)) {
        return NextResponse.json({ error: 'Invalid Agency ID.' }, { status: 400 });
    }

    try {
        const { name } = await request.json();

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ error: 'Invalid agency name' }, { status: 400 });
        }

        const updatedAgency = await prisma.agency.update({
            where: { id: agencyId },
            data: { name: name.trim() },
        });

        return NextResponse.json(updatedAgency, { status: 200 });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ error: 'Agency name already exists' }, { status: 409 });
        }
        console.error(`Error updating agency ${agencyId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const agencyId = parseInt(id, 10);

    if (isNaN(agencyId)) {
        return NextResponse.json({ error: 'Invalid Agency ID.' }, { status: 400 });
    }

    try {
        await prisma.agency.delete({
            where: { id: agencyId },
        });
        return NextResponse.json({ message: 'Agency deleted successfully.' }, { status: 200 });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return NextResponse.json({ error: 'Cannot delete this agency because it is being used in existing shipments.' }, { status: 409 });
        }
        console.error(`Error deleting agency ${agencyId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
