import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readSessionCookie, verifySessionToken } from '@/lib/session';

const publicPages = ['/login', '/signup'];
const publicApi = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/auth/signup',
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = readSessionCookie(request);

  let authenticated = false;
  if (token) {
    try {
      authenticated = Boolean(await verifySessionToken(token));
    } catch (error) {
      console.error('Session verification failed:', error instanceof Error ? error.message : 'unknown');
      authenticated = false;
    }
  }

  if (pathname.startsWith('/api/')) {
    if (publicApi.has(pathname)) {
      return NextResponse.next();
    }
    if (!authenticated) {
      return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isPublicPage = publicPages.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!authenticated && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (authenticated && isPublicPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|ico)$).*)',
  ],
};
