import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const EDIT_PASSWORD_KEY = 'EDIT_BILTY_PASSWORD';
const DEFAULT_PASSWORD = '1234';

// Helper to ensure table exists
async function ensureTableExists() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "System_Settings" (
            "id" SERIAL PRIMARY KEY,
            "key" VARCHAR(100) UNIQUE NOT NULL,
            "value" TEXT NOT NULL,
            "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
            "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
    `);
}

// POST /api/settings/verify-edit-password
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password } = body;

        if (password == null || typeof password !== 'string') {
            return NextResponse.json(
                { success: false, message: 'Password is required.' },
                { status: 400 }
            );
        }

        await ensureTableExists();

        const rows: any[] = await prisma.$queryRaw`
            SELECT id, key, value FROM "System_Settings" WHERE key = ${EDIT_PASSWORD_KEY} LIMIT 1
        `;

        const setting = rows && rows.length > 0 ? rows[0] : null;
        const activePassword = setting?.value || DEFAULT_PASSWORD;

        if (password.trim() === activePassword.trim()) {
            return NextResponse.json({
                success: true,
                message: 'Password verified successfully.',
            });
        } else {
            return NextResponse.json(
                { success: false, message: 'Incorrect edit password. Access denied.' },
                { status: 401 }
            );
        }
    } catch (error: any) {
        console.error('Error verifying edit password:', error);
        return NextResponse.json(
            { success: false, message: 'Server error during password verification.' },
            { status: 500 }
        );
    }
}
