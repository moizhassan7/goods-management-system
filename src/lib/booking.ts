export const BOOKING_PAYMENT_LABELS = {
    PAID: 'Paid',
    TO_COLLECT: 'Collected to be',
} as const;

export type BookingPaymentStatus = keyof typeof BOOKING_PAYMENT_LABELS;

export function isBookingPaymentStatus(value: unknown): value is BookingPaymentStatus {
    return value === 'PAID' || value === 'TO_COLLECT';
}

export function roundMoney(value: unknown) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 0;
    return Math.round(amount * 100) / 100;
}

export function bookingTotal(parts: {
    karaya: unknown;
    station_rent: unknown;
    bility_expense: unknown;
    station_labour: unknown;
}) {
    const total = roundMoney(parts.karaya)
        + roundMoney(parts.station_rent)
        + roundMoney(parts.bility_expense)
        + roundMoney(parts.station_labour);
    return Math.round(total * 100) / 100;
}

export function formatBookingMoney(amount: unknown) {
    return `Rs. ${roundMoney(amount).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function nextBilityNumber(existing: string[]) {
    let max = 0;
    for (const value of existing) {
        const match = String(value).match(/(\d+)\s*$/);
        if (!match) continue;
        const parsed = parseInt(match[1], 10);
        if (!Number.isNaN(parsed) && parsed > max) max = parsed;
    }
    return String(max + 1);
}
