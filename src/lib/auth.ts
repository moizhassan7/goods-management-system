// src/moizhassan7/goods-management-system/goods-management-system-36a96deb04db0b296f5178c3c6a89a34c19278dd/src/lib/auth.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Assuming the user installs bcryptjs
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

// --- Session/Cookie Management ---

// This function mirrors the client's cookie name
const AUTH_COOKIE_NAME = 'goods_auth_session';

/**
 * Retrieves the user session based on the stored cookie/session token.
 */
export async function getSession(request: Request): Promise<UserSession | null> {
    const userId = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!userId || isNaN(parseInt(userId, 10))) return null;

    const user = await prisma.user.findUnique({
        where: { id: parseInt(userId, 10) },
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

/**
 * Middleware-like function for API Routes
 */
export async function authenticate(request: Request, requiredRoles: UserRole[]) {
    const session = await getSession(request);

    if (!session || !checkPermission(session, requiredRoles)) {
        return {
            authorized: false,
            response: NextResponse.json({ message: 'Authorization required: Insufficient permissions.' }, { status: 403 }),
        };
    }
    
    return {
        authorized: true,
        session: session,
        response: null,
    };
}
