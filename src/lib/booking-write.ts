import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { bookingTotal, isBookingPaymentStatus, roundMoney, type BookingPaymentStatus } from '@/lib/booking';

export interface BookingGoodsInput {
    item_id: number;
    quantity: number;
}

export interface BookingWriteInput {
    bility_number?: string;
    booking_date?: string;
    from_city_id?: number;
    to_city_id?: number;
    sender_id?: number;
    receiver_id?: number;
    karaya?: number;
    station_rent?: number;
    bility_expense?: number;
    station_labour?: number;
    payment_status?: string;
    goods_details?: BookingGoodsInput[];
}

export const bookingInclude = {
    fromCity: { select: { id: true, name: true } },
    toCity: { select: { id: true, name: true } },
    sender: { select: { id: true, name: true } },
    receiver: { select: { id: true, name: true } },
    items: {
        orderBy: { id: 'asc' as const },
        select: { id: true, item_name_id: true, item_name: true, quantity: true },
    },
};

type BookingRecord = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

function toMoney(value: unknown) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) return null;
    return new Prisma.Decimal(roundMoney(amount).toFixed(2));
}

export interface PreparedBooking {
    bility_number: string;
    booking_date: Date;
    from_city_id: number;
    to_city_id: number;
    sender_id: number;
    receiver_id: number;
    karaya: Prisma.Decimal;
    station_rent: Prisma.Decimal;
    bility_expense: Prisma.Decimal;
    station_labour: Prisma.Decimal;
    total_amount: Prisma.Decimal;
    payment_status: BookingPaymentStatus;
    items: { item_name_id: number; item_name: string; quantity: number }[];
}

export type PrepareBookingResult =
    | { error: string; status?: number }
    | { data: PreparedBooking };

export function parseBookingDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return null;
    }
    return date;
}

export function serializeBooking(booking: BookingRecord) {
    return {
        id: booking.id,
        bility_number: booking.bility_number,
        booking_date: booking.booking_date.toISOString().slice(0, 10),
        from_city_id: booking.from_city_id,
        to_city_id: booking.to_city_id,
        sender_id: booking.sender_id,
        receiver_id: booking.receiver_id,
        from_city: booking.fromCity.name,
        to_city: booking.toCity.name,
        sender_name: booking.sender.name,
        receiver_name: booking.receiver.name,
        karaya: Number(booking.karaya),
        station_rent: Number(booking.station_rent),
        bility_expense: Number(booking.bility_expense),
        station_labour: Number(booking.station_labour),
        total_amount: Number(booking.total_amount),
        payment_status: booking.payment_status,
        items: booking.items.map((item) => ({
            id: item.id,
            item_name_id: item.item_name_id,
            item_name: item.item_name,
            quantity: item.quantity,
        })),
    };
}

export async function prepareBookingWrite(payload: BookingWriteInput, excludeId?: number): Promise<PrepareBookingResult> {
    const bilityNumber = payload.bility_number?.trim() || '';
    if (!bilityNumber || bilityNumber.length > 50) {
        return { error: 'Bilty number is required.' };
    }

    const bookingDate = parseBookingDate(payload.booking_date || '');
    if (!bookingDate) {
        return { error: 'A valid booking date is required.' };
    }

    const fromCityId = Number(payload.from_city_id);
    const toCityId = Number(payload.to_city_id);
    const senderId = Number(payload.sender_id);
    const receiverId = Number(payload.receiver_id);
    if (![fromCityId, toCityId, senderId, receiverId].every((id) => Number.isInteger(id) && id > 0)) {
        return { error: 'Select from city, to city, sender, and receiver.' };
    }

    if (!isBookingPaymentStatus(payload.payment_status)) {
        return { error: 'Choose Paid or Collected to be.' };
    }

    const goods = Array.isArray(payload.goods_details) ? payload.goods_details : [];
    if (goods.length === 0) {
        return { error: 'Add at least one item.' };
    }

    const normalizedGoods = goods.map((row) => ({
        item_id: Number(row.item_id),
        quantity: Number(row.quantity),
    }));
    if (normalizedGoods.some((row) => !Number.isInteger(row.item_id) || row.item_id < 1 || !Number.isInteger(row.quantity) || row.quantity < 1)) {
        return { error: 'Each row needs an item and a quantity of at least 1.' };
    }

    const karaya = toMoney(payload.karaya);
    const stationRent = toMoney(payload.station_rent);
    const bilityExpense = toMoney(payload.bility_expense);
    const stationLabour = toMoney(payload.station_labour);
    if (!karaya || !stationRent || !bilityExpense || !stationLabour) {
        return { error: 'Each charge must be 0 or greater.' };
    }

    const duplicate = await prisma.booking.findFirst({
        where: {
            bility_number: bilityNumber,
            ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
    });
    if (duplicate) {
        return { error: `Bilty number ${bilityNumber} is already used.`, status: 409 };
    }

    const itemIds = [...new Set(normalizedGoods.map((row) => row.item_id))];
    const catalog = await prisma.itemCatalog.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, item_description: true },
    });
    if (catalog.length !== itemIds.length) {
        return { error: 'One of the selected items no longer exists. Choose it again.' };
    }
    const names = new Map(catalog.map((item) => [item.id, item.item_description]));

    return {
        data: {
            bility_number: bilityNumber,
            booking_date: bookingDate,
            from_city_id: fromCityId,
            to_city_id: toCityId,
            sender_id: senderId,
            receiver_id: receiverId,
            karaya,
            station_rent: stationRent,
            bility_expense: bilityExpense,
            station_labour: stationLabour,
            total_amount: new Prisma.Decimal(bookingTotal({
                karaya: payload.karaya,
                station_rent: payload.station_rent,
                bility_expense: payload.bility_expense,
                station_labour: payload.station_labour,
            }).toFixed(2)),
            payment_status: payload.payment_status,
            items: normalizedGoods.map((row) => ({
                item_name_id: row.item_id,
                item_name: names.get(row.item_id) || 'Item',
                quantity: row.quantity,
            })),
        },
    };
}
