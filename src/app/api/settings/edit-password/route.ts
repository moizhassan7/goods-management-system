import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, isAuthError, requireAuth, UserRole } from '@/lib/auth';

const EDIT_PASSWORD_KEY = 'EDIT_BILTY_PASSWORD';

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
        const { password } = body;

        if (!password || typeof password !== 'string' || password.trim().length < 3) {
            return NextResponse.json(
                { error: 'Password must be at least 3 characters.' },
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
