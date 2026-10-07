import { requireAuth, isAuthError, Permissions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { paginationMeta, parsePagination } from '@/lib/pagination';
import { prismaErrorMessage } from '@/lib/api-client';
import { isBookingPaymentStatus } from '@/lib/booking';
import { bookingInclude, parseBookingDate, prepareBookingWrite, serializeBooking } from '@/lib/booking-write';

export async function GET(request: Request) {
    const auth = await requireAuth(request, Permissions.CORE_OPERATIONS);
    if (isAuthError(auth)) return auth;

    try {
        const { searchParams } = new URL(request.url);
        const { page, pageSize, skip } = parsePagination(searchParams);
        const query = searchParams.get('q')?.trim() || '';
        const date = searchParams.get('date')?.trim() || '';
        const payment = searchParams.get('payment_status')?.trim() || '';

        const where: Prisma.BookingWhereInput = {};
        if (query) {
            where.OR = [
                { bility_number: { contains: query, mode: 'insensitive' } },
                { sender: { name: { contains: query, mode: 'insensitive' } } },
                { receiver: { name: { contains: query, mode: 'insensitive' } } },
                { fromCity: { name: { contains: query, mode: 'insensitive' } } },
                { toCity: { name: { contains: query, mode: 'insensitive' } } },
            ];
        }
        if (date) {
            const bookingDate = parseBookingDate(date);
            if (!bookingDate) {
                return NextResponse.json({ message: 'Date filter must be YYYY-MM-DD.' }, { status: 400 });
            }
            where.booking_date = bookingDate;
        }
        if (payment) {
            if (!isBookingPaymentStatus(payment)) {
                return NextResponse.json({ message: 'Unknown payment status.' }, { status: 400 });
            }
            where.payment_status = payment;
        }

        const [total, bookings] = await prisma.$transaction([
            prisma.booking.count({ where }),
            prisma.booking.findMany({
                where,
                include: bookingInclude,
                orderBy: [{ booking_date: 'desc' }, { id: 'desc' }],
                skip,
                take: pageSize,
            }),
        ]);

        return NextResponse.json({
            bookings: bookings.map(serializeBooking),
            ...paginationMeta(total, page, pageSize),
        });
    } catch (error) {
        console.error('Booking list error:', error);
        return NextResponse.json(
            { message: prismaErrorMessage(error, 'Failed to load bookings.') },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    const auth = await requireAuth(request, Permissions.CORE_OPERATIONS);
    if (isAuthError(auth)) return auth;

    try {
        const payload = await request.json();
        const prepared = await prepareBookingWrite(payload);
        if ('error' in prepared) {
            return NextResponse.json({ message: prepared.error }, { status: 'status' in prepared ? prepared.status : 400 });
        }

        const { items, ...bookingData } = prepared.data;
        const booking = await prisma.booking.create({
            data: {
                ...bookingData,
                items: { create: items },
            },
            include: bookingInclude,
        });

        return NextResponse.json({
            message: 'Booking saved.',
            booking: serializeBooking(booking),
        }, { status: 201 });
    } catch (error) {
        console.error('Booking create error:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ message: 'That bilty number is already used.' }, { status: 409 });
        }
        return NextResponse.json(
            { message: prismaErrorMessage(error, 'Failed to save booking.') },
            { status: 500 },
        );
    }
}
