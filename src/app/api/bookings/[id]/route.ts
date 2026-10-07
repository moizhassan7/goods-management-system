import { requireAuth, isAuthError, Permissions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { prismaErrorMessage } from '@/lib/api-client';
import { bookingInclude, prepareBookingWrite, serializeBooking } from '@/lib/booking-write';

type RouteContext = { params: Promise<{ id: string }> };

function parseId(value: string) {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) return null;
    return id;
}

export async function GET(request: Request, context: RouteContext) {
    const auth = await requireAuth(request, Permissions.CORE_OPERATIONS);
    if (isAuthError(auth)) return auth;

    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });

    try {
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: bookingInclude,
        });
        if (!booking) return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });
        return NextResponse.json({ booking: serializeBooking(booking) });
    } catch (error) {
        console.error('Booking fetch error:', error);
        return NextResponse.json(
            { message: prismaErrorMessage(error, 'Failed to load booking.') },
            { status: 500 },
        );
    }
}

export async function PUT(request: Request, context: RouteContext) {
    const auth = await requireAuth(request, Permissions.CORE_OPERATIONS);
    if (isAuthError(auth)) return auth;

    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });

    try {
        const existing = await prisma.booking.findUnique({ where: { id }, select: { id: true } });
        if (!existing) return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });

        const payload = await request.json();
        const prepared = await prepareBookingWrite(payload, id);
        if ('error' in prepared) {
            return NextResponse.json({ message: prepared.error }, { status: 'status' in prepared ? prepared.status : 400 });
        }

        const booking = await prisma.$transaction(async (tx) => {
            await tx.bookingItem.deleteMany({ where: { booking_id: id } });
            return tx.booking.update({
                where: { id },
                data: {
                    bility_number: prepared.data.bility_number,
                    booking_date: prepared.data.booking_date,
                    from_city_id: prepared.data.from_city_id,
                    to_city_id: prepared.data.to_city_id,
                    sender_id: prepared.data.sender_id,
                    receiver_id: prepared.data.receiver_id,
                    karaya: prepared.data.karaya,
                    station_rent: prepared.data.station_rent,
                    bility_expense: prepared.data.bility_expense,
                    station_labour: prepared.data.station_labour,
                    total_amount: prepared.data.total_amount,
                    payment_status: prepared.data.payment_status,
                    items: { create: prepared.data.items },
                },
                include: bookingInclude,
            });
        });

        return NextResponse.json({
            message: 'Booking updated.',
            booking: serializeBooking(booking),
        });
    } catch (error) {
        console.error('Booking update error:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ message: 'That bilty number is already used.' }, { status: 409 });
        }
        return NextResponse.json(
            { message: prismaErrorMessage(error, 'Failed to update booking.') },
            { status: 500 },
        );
    }
}
