import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
        return NextResponse.json({ error: 'Invalid Item ID.' }, { status: 400 });
    }

    try {
        const { description } = await request.json();

        if (!description || typeof description !== 'string' || description.trim() === '') {
            return NextResponse.json({ error: 'Invalid item description' }, { status: 400 });
        }

        const updatedItem = await prisma.itemCatalog.update({
            where: { id: itemId },
            data: { item_description: description.trim() },
        });

        return NextResponse.json(updatedItem, { status: 200 });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ error: 'Item description already exists' }, { status: 409 });
        }
        console.error(`Error updating item ${itemId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
        return NextResponse.json({ error: 'Invalid Item ID.' }, { status: 400 });
    }

    try {
        await prisma.itemCatalog.delete({
            where: { id: itemId },
        });
        return NextResponse.json({ message: 'Item deleted successfully.' }, { status: 200 });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return NextResponse.json({ error: 'Cannot delete this item because it is being used in existing shipments.' }, { status: 409 });
        }
        console.error(`Error deleting item ${itemId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
