import { NextResponse, NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';

/**
 * GET /api/auth/session
 * Checks the session cookie and returns the current user data.
 * This endpoint allows the client to verify if the server-side session cookie is valid.
 */
export async function GET(request: NextRequest) {
    const session = await getSession(request);

    if (session) {
        return NextResponse.json(session, { status: 200 });
    } else {
        // If no valid session, return 401 Unauthorized
        return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }
}
