import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, hashPassword, isAuthError, requireAuth, UserRole } from '@/lib/auth';

const EDIT_PASSWORD_KEY = 'EDIT_BILTY_PASSWORD';
const DEFAULT_PASSWORD = '1234';

function isBcryptHash(value: string) {
    return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request, [UserRole.SUPERADMIN]);
    if (isAuthError(auth)) return auth;

    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: EDIT_PASSWORD_KEY },
            select: { key: true },
        });

        return NextResponse.json({
            isSet: Boolean(setting),
        });
    } catch (error) {
        console.error('Error fetching edit password setting:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json(
            { message: 'Failed to load edit password status.' },
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAuth(request, [UserRole.SUPERADMIN]);
    if (isAuthError(auth)) return auth;

    try {
        const body = await request.json();
        const { oldPassword, currentPassword, password } = body;
        const current = (oldPassword ?? currentPassword)?.toString()?.trim();

        if (!current) {
            return NextResponse.json(
                { error: 'Current password is required.' },
                { status: 400 },
            );
        }

        const setting = await prisma.systemSetting.findUnique({
            where: { key: EDIT_PASSWORD_KEY },
        });

        const stored = setting?.value;
        let matches = false;
        if (!stored) {
            matches = current === DEFAULT_PASSWORD;
        } else {
            matches = isBcryptHash(stored)
                ? await comparePassword(current, stored)
                : current === stored.trim();
        }

        if (!matches) {
            return NextResponse.json(
                { error: 'Incorrect current password.' },
                { status: 401 },
            );
        }

        if (!password || typeof password !== 'string' || password.trim().length < 3) {
            return NextResponse.json(
                { error: 'New password must be at least 3 characters.' },
                { status: 400 },
            );
        }

        const hashed = await hashPassword(password.trim());

        await prisma.systemSetting.upsert({
            where: { key: EDIT_PASSWORD_KEY },
            create: { key: EDIT_PASSWORD_KEY, value: hashed },
            update: { value: hashed },
        });

        return NextResponse.json({
            success: true,
            message: 'Edit bilty password updated successfully.',
            isSet: true,
        });
    } catch (error) {
        console.error('Error updating edit password setting:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json(
            { error: 'Failed to update edit password setting.' },
            { status: 500 },
        );
    }
}
