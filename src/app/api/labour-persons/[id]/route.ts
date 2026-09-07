import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const personId = parseInt(id, 10);

    if (isNaN(personId)) {
        return NextResponse.json({ error: 'Invalid Labour Person ID.' }, { status: 400 });
    }

    try {
        const { name, contact_info } = await request.json();

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
        }
        if (!contact_info || typeof contact_info !== 'string' || contact_info.trim() === '') {
            return NextResponse.json({ error: 'Invalid contact info' }, { status: 400 });
        }

        const updatedPerson = await prisma.labourPerson.update({
            where: { id: personId },
            data: { 
                name: name.trim(),
                contact_info: contact_info.trim()
            },
        });

        return NextResponse.json(updatedPerson, { status: 200 });
    } catch (error: any) {
        console.error(`Error updating labour person ${personId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const personId = parseInt(id, 10);

    if (isNaN(personId)) {
        return NextResponse.json({ error: 'Invalid Labour Person ID.' }, { status: 400 });
    }

    try {
        await prisma.labourPerson.delete({
            where: { id: personId },
        });
        return NextResponse.json({ message: 'Labour person deleted successfully.' }, { status: 200 });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return NextResponse.json({ error: 'Cannot delete this labour person because they are assigned to shipments.' }, { status: 409 });
        }
        console.error(`Error deleting labour person ${personId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
