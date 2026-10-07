import { describe, expect, it } from 'vitest';
import { bookingTotal, nextBilityNumber } from '@/lib/booking';

describe('booking charges', () => {
    it('adds karaya, station rent, bility expense, and station labour', () => {
        expect(bookingTotal({
            karaya: 2100,
            station_rent: 180,
            bility_expense: 100,
            station_labour: 400,
        })).toBe(2780);
    });

    it('suggests the next bilty number after the highest existing number', () => {
        expect(nextBilityNumber([])).toBe('1');
        expect(nextBilityNumber(['12', '1080', 'B-40'])).toBe('1081');
    });
});
