// src/moizhassan7/goods-management-system/goods-management-system-36a96deb04db0b296f5178c3c6a89a34c19278dd/src/app/api/auth/login/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword } from '@/lib/auth';
import { rejectCrossOrigin, setSessionCookie, signSessionToken } from '@/lib/session';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import * as z from 'zod';

const LoginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
});

export async function POST(request: NextRequest) {
    const originBlock = rejectCrossOrigin(request);
    if (originBlock) return originBlock;

    if (!rateLimit(`login:${clientIp(request)}`, 10, 60_000)) {
        return NextResponse.json(tooManyRequests(), { status: 429 });
    }

    try {
        const validatedData = LoginSchema.parse(await request.json());
        const { username, password } = validatedData;

        // 1. Find the user
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            return NextResponse.json(
                { message: 'Invalid username or password.' },
                { status: 401 }
            );
        }

        // 2. Compare the password
        const passwordMatch = await comparePassword(password, user.password);

        if (!passwordMatch) {
            return NextResponse.json(
                { message: 'Invalid username or password.' },
                { status: 401 }
            );
        }

        // 3. Create successful response
        const response = NextResponse.json({
            message: 'Login successful.',
            user: { id: user.id, username: user.username, role: user.role }
        }, { status: 200 });

        const token = await signSessionToken({
            id: user.id,
            username: user.username,
            role: user.role,
        });
        setSessionCookie(response, token);

        return response;

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: 'Validation Error', errors: error.issues },
                { status: 400 }
            );
        }

        console.error('Login Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to process login.' },
            { status: 500 }
        );
    }
}