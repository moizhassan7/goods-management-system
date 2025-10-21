// src/moizhassan7/goods-management-system/goods-management-system-36a96deb04db0b296f5178c3c6a89a34c19278dd/src/app/api/auth/signup/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma'; // <-- FIX: Ensure correct path to prisma client
import { hashPassword, UserRole } from '@/lib/auth';
import * as z from 'zod';
import { Prisma } from '@prisma/client';

// Define the available roles for signup
const AvailableRoles = z.enum([UserRole.OPERATOR, UserRole.ADMIN, UserRole.SUPERADMIN]);

const SignupSchema = z.object({
    username: z.string().min(3).max(100),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    // NEW: Role field is mandatory in the payload
    role: AvailableRoles,
});

export async function POST(request: NextRequest) {
    try {
        const validatedData = SignupSchema.parse(await request.json());
        const { username, password, role } = validatedData;

        // 1. Check if the database is empty.
        // The error `TypeError: Cannot read properties of undefined (reading 'count')`
        // is likely because `prisma` was undefined or null at that moment. 
        // We ensure correct import and handle the potential first user logic.
        const userCount = await prisma.user.count();

        // 2. Determine final role (Enforce SUPERADMIN for the first user, regardless of payload)
        let finalRole: UserRole = role;
        if (userCount === 0) {
            finalRole = UserRole.SUPERADMIN;
        } else if (role === UserRole.SUPERADMIN) {
             // Block creation of more SUPERADMINs after the first one
             return NextResponse.json(
                { message: 'Only one SuperAdmin account is allowed for initial setup.' },
                { status: 403 }
            );
        }
        
        // 3. Hash the password
        const hashedPassword = await hashPassword(password);

        // 4. Create the user
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: finalRole as any, // Prisma enum conversion
            },
            select: { id: true, username: true, role: true }
        });

        return NextResponse.json({
            message: `User created successfully with role: ${newUser.role}`,
            user: { username: newUser.username, role: newUser.role }
        }, { status: 201 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: 'Validation Error', errors: error.issues },
                { status: 400 }
            );
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { message: 'Username already taken.' },
                { status: 409 }
            );
        }

        console.error('Signup Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to create user. See server logs for details.' },
            { status: 500 }
        );
    }
}
