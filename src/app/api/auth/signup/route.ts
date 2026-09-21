import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, requireAuth, isAuthError, UserRole } from '@/lib/auth';
import { rejectCrossOrigin } from '@/lib/session';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import * as z from 'zod';
import { Prisma } from '@prisma/client';

const AvailableRoles = z.enum([UserRole.OPERATOR, UserRole.ADMIN, UserRole.SUPERADMIN]);

const SignupSchema = z.object({
    username: z.string().min(3).max(100),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    role: AvailableRoles,
});

export async function POST(request: NextRequest) {
    const originBlock = rejectCrossOrigin(request);
    if (originBlock) return originBlock;

    if (!rateLimit(`signup:${clientIp(request)}`, 10, 60_000)) {
        return NextResponse.json(tooManyRequests(), { status: 429 });
    }

    try {
        const validatedData = SignupSchema.parse(await request.json());
        const { username, password, role } = validatedData;
        const hashedPassword = await hashPassword(password);

        const userCount = await prisma.user.count();

        if (userCount === 0) {
            try {
                const newUser = await prisma.$transaction(async (tx) => {
                    const count = await tx.user.count();
                    if (count > 0) {
                        throw new Error('BOOTSTRAP_CLOSED');
                    }
                    return tx.user.create({
                        data: {
                            username,
                            password: hashedPassword,
                            role: UserRole.SUPERADMIN,
                        },
                        select: { id: true, username: true, role: true },
                    });
                });

                return NextResponse.json({
                    message: `User created successfully with role: ${newUser.role}`,
                    user: { username: newUser.username, role: newUser.role },
                }, { status: 200 });
            } catch (error) {
                if (error instanceof Error && error.message === 'BOOTSTRAP_CLOSED') {
                    return NextResponse.json(
                        { message: 'Initial setup is already complete. A SuperAdmin must create additional users.' },
                        { status: 403 },
                    );
                }
                throw error;
            }
        }

        const auth = await requireAuth(request, [UserRole.SUPERADMIN]);
        if (isAuthError(auth)) return auth;

        if (role === UserRole.SUPERADMIN) {
            return NextResponse.json(
                { message: 'Only one SuperAdmin account is allowed for initial setup.' },
                { status: 403 },
            );
        }

        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role,
            },
            select: { id: true, username: true, role: true },
        });

        return NextResponse.json({
            message: `User created successfully with role: ${newUser.role}`,
            user: { username: newUser.username, role: newUser.role },
        }, { status: 200 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: 'Validation Error', errors: error.issues },
                { status: 400 },
            );
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { message: 'Username already taken.' },
                { status: 409 },
            );
        }

        console.error('Signup Error:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to create user. See server logs for details.' },
            { status: 500 },
        );
    }
}
