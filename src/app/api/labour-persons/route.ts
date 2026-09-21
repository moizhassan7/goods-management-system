import { requireAuth, isAuthError, Permissions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all labour persons
export async function GET(request: Request) {
    const auth = await requireAuth(request, Permissions.LABOUR_MANAGEMENT);
    if (isAuthError(auth)) return auth;

    try {
        const labourPersons = await prisma.labourPerson.findMany({
            include: {
                assignments: {
                    include: {
                        shipment: {
                            select: {
                                register_number: true,
                                bility_number: true,
                                total_charges: true,
                                receiver: { select: { name: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(labourPersons, { status: 200 });
    } catch (error) {
        console.error('Error fetching labour persons:', error);
        return NextResponse.json(
            { message: 'Internal Server Error while fetching labour persons.' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const auth = await requireAuth(request, Permissions.LABOUR_MANAGEMENT);
    if (isAuthError(auth)) return auth;

    try {
        const { name, contactInfo } = await request.json(); 

        if (!name) {
            return NextResponse.json({
                message: 'Name info are required.'
            }, { status: 400 });
        }

       const newLabourPerson = await prisma.labourPerson.create({
        data: { name: name.trim(), contact_info: contactInfo?.trim() || "" },
       })
        return NextResponse.json({
            message: 'Labour person created successfully.',
            labourPerson: newLabourPerson
        }, { status: 200 });

    } catch (error) {
        console.error('Error creating labour person:', error);
        return NextResponse.json(
            { message: 'Internal Server Error: Failed to create labour person.' },
            { status: 500 }
        );
    }
}