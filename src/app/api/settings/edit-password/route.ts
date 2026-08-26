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

// GET /api/settings/edit-password
export async function GET() {
    try {
        await ensureTableExists();

        const rows: any[] = await prisma.$queryRaw`
            SELECT id, key, value FROM "System_Settings" WHERE key = ${EDIT_PASSWORD_KEY} LIMIT 1
        `;

        const setting = rows && rows.length > 0 ? rows[0] : null;

        return NextResponse.json({
            isSet: Boolean(setting?.value),
            password: setting?.value || DEFAULT_PASSWORD,
        });
    } catch (error: any) {
        console.error('Error fetching edit password setting:', error);
        return NextResponse.json({
            isSet: true,
            password: DEFAULT_PASSWORD,
        });
    }
}

// POST /api/settings/edit-password
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password } = body;

        if (!password || typeof password !== 'string' || password.trim().length === 0) {
            return NextResponse.json(
                { error: 'Password cannot be empty.' },
                { status: 400 }
            );
        }

        const trimmedPassword = password.trim();
        await ensureTableExists();

        await prisma.$executeRaw`
            INSERT INTO "System_Settings" ("key", "value", "createdAt", "updatedAt")
            VALUES (${EDIT_PASSWORD_KEY}, ${trimmedPassword}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT ("key") DO UPDATE
            SET "value" = ${trimmedPassword}, "updatedAt" = CURRENT_TIMESTAMP
        `;

        return NextResponse.json({
            success: true,
            message: 'Edit bilty password updated successfully.',
            isSet: true,
        });
    } catch (error: any) {
        console.error('Error updating edit password setting:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update edit password setting.' },
            { status: 500 }
        );
    }
}
