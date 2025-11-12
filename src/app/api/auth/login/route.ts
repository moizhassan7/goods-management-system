// src/moizhassan7/goods-management-system/goods-management-system-36a96deb04db0b296f5178c3c6a89a34c19278dd/src/app/api/auth/login/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword } from '@/lib/auth';
import * as z from 'zod';

const LoginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
});

const AUTH_COOKIE_NAME = 'goods_auth_session';

export async function POST(request: NextRequest) {
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
            user: { username: user.username, role: user.role }
        }, { status: 200 });

        // 4. Set the session cookie (User ID is stored as the token for simplicity)
        // This is a session-only cookie - it will be cleared when the browser closes
        response.cookies.set({
            name: AUTH_COOKIE_NAME,
            value: String(user.id),
            path: '/',
            httpOnly: true, // Important for security
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            // No maxAge specified = session cookie (cleared when browser closes)
        });

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