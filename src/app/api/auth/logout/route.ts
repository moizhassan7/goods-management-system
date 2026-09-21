import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/session';

export async function POST() {
    const response = NextResponse.json({ message: 'Logout successful.' }, { status: 200 });
    clearSessionCookie(response);
    return response;
}
