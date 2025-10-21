import { NextResponse, NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'goods_auth_session';

export async function POST(request: NextRequest) {
    const response = NextResponse.json({ message: 'Logout successful.' }, { status: 200 });

    // Clear the session cookie by setting its value to empty and maxAge to 0
    response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: '',
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Immediately expire the cookie
    });

    return response;
}
