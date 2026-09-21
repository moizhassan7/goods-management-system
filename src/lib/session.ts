import { SignJWT, jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

export const AUTH_COOKIE_NAME = 'goods_auth_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const DEV_SECRET = 'dev-only-insecure-auth-secret-do-not-use-in-production';

export type SessionClaims = {
    id: number;
    username: string;
    role: string;
};

type CookieRequest = {
    cookies?: { get: (name: string) => { value: string } | undefined };
    headers: { get: (name: string) => string | null };
};

export function getAuthSecret(): Uint8Array {
    const secret = process.env.AUTH_SECRET?.trim();
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('AUTH_SECRET is required in production.');
        }
        return new TextEncoder().encode(DEV_SECRET);
    }
    if (secret.length < 16) {
        throw new Error('AUTH_SECRET must be at least 16 characters.');
    }
    return new TextEncoder().encode(secret);
}

export async function signSessionToken(user: SessionClaims): Promise<string> {
    return new SignJWT({ username: user.username, role: user.role })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(String(user.id))
        .setIssuedAt()
        .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
        .sign(getAuthSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
    try {
        const { payload } = await jwtVerify(token, getAuthSecret());
        const id = Number(payload.sub);
        if (!Number.isInteger(id) || id <= 0) return null;
        const username = typeof payload.username === 'string' ? payload.username : '';
        const role = typeof payload.role === 'string' ? payload.role : '';
        if (!username || !role) return null;
        return { id, username, role };
    } catch {
        return null;
    }
}

export function readSessionCookie(request: CookieRequest): string | undefined {
    if (request.cookies && typeof request.cookies.get === 'function') {
        const value = request.cookies.get(AUTH_COOKIE_NAME)?.value;
        if (value) return value;
    }
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : undefined;
}

export function setSessionCookie(response: NextResponse, token: string) {
    response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: token,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE_SECONDS,
    });
}

export function clearSessionCookie(response: NextResponse) {
    response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: '',
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
    });
}

/** Reject browser cross-origin mutations. Missing Origin is allowed (non-browser clients). */
export function rejectCrossOrigin(request: Request): NextResponse | null {
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
        return null;
    }
    const origin = request.headers.get('origin');
    if (!origin) return null;
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (!host) return null;
    try {
        if (new URL(origin).host !== host) {
            return NextResponse.json({ message: 'Cross-origin request rejected.' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ message: 'Invalid origin.' }, { status: 403 });
    }
    return null;
}
