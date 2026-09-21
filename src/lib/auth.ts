import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readSessionCookie, rejectCrossOrigin, verifySessionToken } from '@/lib/session';
import * as bcrypt from 'bcryptjs'; 

// --- Role Definition (Mirroring Prisma Enum) ---
export enum UserRole {
    OPERATOR = 'OPERATOR',
    ADMIN = 'ADMIN',
    SUPERADMIN = 'SUPERADMIN',
}

export interface UserSession {
    id: number;
    username: string;
    role: UserRole;
}

// --- Permission Map ---
// Define which roles are required for specific UI paths/features.
// This map is used by both the frontend (for visibility) and the backend (for API checks).
export const Permissions = {
    // Master Data Creation/Management (High Privilege)
    MASTER_DATA_WRITE: [UserRole.ADMIN, UserRole.SUPERADMIN],
    // Full database restore (destructive — SuperAdmin only)
    BACKUP_RESTORE: [UserRole.SUPERADMIN],
    // Viewing Reports (Medium Privilege)
    REPORTS_VIEW: [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR],
    // Financial Approval (High Privilege - Only SuperAdmin for Deliveries)
    DELIVERY_APPROVAL_ADMIN: [UserRole.ADMIN, UserRole.SUPERADMIN], // Admin and SuperAdmin can handle the first stage
    DELIVERY_APPROVAL_SUPERADMIN: [UserRole.SUPERADMIN],
    // Labour Management (Medium Privilege)
    LABOUR_MANAGEMENT: [UserRole.ADMIN, UserRole.SUPERADMIN],
    // Core Operations (Low Privilege)
    CORE_OPERATIONS: [UserRole.OPERATOR, UserRole.ADMIN, UserRole.SUPERADMIN],
};

// --- Password Utilities (Requires bcryptjs) ---
const saltRounds = 10;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Verifies the signed session cookie, then loads the user from the database
 * so role changes take effect without waiting for the token to expire.
 */
export async function getSession(request: NextRequest | Request): Promise<UserSession | null> {
    const token = readSessionCookie(request);
    if (!token) return null;

    const claims = await verifySessionToken(token);
    if (!claims) return null;

    const user = await prisma.user.findUnique({
        where: { id: claims.id },
        select: { id: true, username: true, role: true }
    });

    if (!user) return null;

    return {
        id: user.id,
        username: user.username,
        role: user.role as UserRole,
    };
}


/**
 * Utility function to check if a user has the required role from a role array.
 */
export function checkPermission(currentUser: UserSession | null, requiredRoles: UserRole[]): boolean {
    if (!currentUser) return false;
    
    // Check if the user's current role is included in the list of required roles
    return requiredRoles.includes(currentUser.role);
}

export type AuthResult = 
    | { authorized: true; session: UserSession; response?: never }
    | { authorized: false; response: NextResponse; session?: never };

/**
 * Middleware-like function for API Routes
 */
export async function authenticate(request: NextRequest | Request, requiredRoles: UserRole[]): Promise<AuthResult> {
    const originBlock = rejectCrossOrigin(request);
    if (originBlock) {
        return { authorized: false, response: originBlock };
    }

    const session = await getSession(request);

    if (!session) {
        return {
            authorized: false,
            response: NextResponse.json({ message: 'Authentication required.' }, { status: 401 }),
        };
    }

    if (!checkPermission(session, requiredRoles)) {
        return {
            authorized: false,
            response: NextResponse.json({ message: 'Authorization required: Insufficient permissions.' }, { status: 403 }),
        };
    }
    
    return {
        authorized: true,
        session: session,
    };
}

export async function requireAuth(
    request: NextRequest | Request,
    requiredRoles: UserRole[],
): Promise<UserSession | NextResponse> {
    const result = await authenticate(request, requiredRoles);
    if (!result.authorized) return result.response;
    return result.session;
}

export function isAuthError(value: UserSession | NextResponse): value is NextResponse {
    return value instanceof NextResponse;
}

