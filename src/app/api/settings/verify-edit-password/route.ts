import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, hashPassword, isAuthError, Permissions, requireAuth } from '@/lib/auth';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

const EDIT_PASSWORD_KEY = 'EDIT_BILTY_PASSWORD';
const DEFAULT_PASSWORD = '1234';

function isBcryptHash(value: string) {
    return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}

export async function POST(request: NextRequest) {
    if (!rateLimit(`edit-password:${clientIp(request)}`, 10, 60_000)) {
        return NextResponse.json({ success: false, ...tooManyRequests() }, { status: 429 });
    }

    const auth = await requireAuth(request, Permissions.CORE_OPERATIONS);
    if (isAuthError(auth)) return auth;

    try {
        const body = await request.json();
        const { password } = body;

        if (password == null || typeof password !== 'string' || password.trim().length === 0) {
            return NextResponse.json(
                { success: false, message: 'Password is required.' },
                { status: 400 },
            );
        }

        const submitted = password.trim();
        const setting = await prisma.systemSetting.findUnique({
            where: { key: EDIT_PASSWORD_KEY },
        });

        if (!setting) {
            if (submitted !== DEFAULT_PASSWORD) {
                return NextResponse.json(
                    { success: false, message: 'Incorrect edit password. Access denied.' },
                    { status: 401 },
                );
            }
            await prisma.systemSetting.create({
                data: { key: EDIT_PASSWORD_KEY, value: await hashPassword(DEFAULT_PASSWORD) },
            });
            return NextResponse.json({
                success: true,
                message: 'Password verified successfully.',
            });
        }

        const stored = setting.value;
        const matches = isBcryptHash(stored)
            ? await comparePassword(submitted, stored)
            : submitted === stored.trim();

        if (!matches) {
            return NextResponse.json(
                { success: false, message: 'Incorrect edit password. Access denied.' },
                { status: 401 },
            );
        }

        if (!isBcryptHash(stored)) {
            await prisma.systemSetting.update({
                where: { key: EDIT_PASSWORD_KEY },
                data: { value: await hashPassword(submitted) },
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Password verified successfully.',
        });
    } catch (error) {
        console.error('Error verifying edit password:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json(
            { success: false, message: 'Server error during password verification.' },
            { status: 500 },
        );
    }
}
