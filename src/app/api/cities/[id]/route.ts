import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cityId = parseInt(id, 10);

    if (isNaN(cityId)) {
        return NextResponse.json({ error: 'Invalid City ID.' }, { status: 400 });
    }

    try {
        const { name } = await request.json();

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ error: 'Invalid city name' }, { status: 400 });
        }

        const updatedCity = await prisma.city.update({
            where: { id: cityId },
            data: { name: name.trim() },
        });

        return NextResponse.json(updatedCity, { status: 200 });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ error: 'City name already exists' }, { status: 409 });
        }
        console.error(`Error updating city ${cityId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cityId = parseInt(id, 10);

    if (isNaN(cityId)) {
        return NextResponse.json({ error: 'Invalid City ID.' }, { status: 400 });
    }

    try {
        await prisma.city.delete({
            where: { id: cityId },
        });
        return NextResponse.json({ message: 'City deleted successfully.' }, { status: 200 });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return NextResponse.json({ error: 'Cannot delete this city because it is being used in existing shipments.' }, { status: 409 });
        }
        console.error(`Error deleting city ${cityId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
