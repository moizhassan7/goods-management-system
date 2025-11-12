import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/labour-settlements
 * Fetches all labour persons with their shipments, delivery expenses, and complete payment history
 * Maintains running balance calculations for each labour person
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const labour_person_id = searchParams.get('labour_person_id');

        const where = labour_person_id ? { id: parseInt(labour_person_id) } : {};

        const labourPersons = await prisma.labourPerson.findMany({
            where,
            include: {
                assignments: {
                    include: {
                        shipment: {
                            include: {
                                deliveries: {
                                    select: {
                                        station_expense: true,
                                        bility_expense: true,
                                        station_labour: true,
                                        cart_labour: true,
                                        total_expenses: true,
                                    }
                                }
                            }
                        }
                    }
                },
                paymentHistory: {
                    orderBy: { payment_date: 'asc' }
                }
            }
        });

        // Calculate total owed, paid, and remaining balance for each labour person
        const formattedData = labourPersons.map((person: any) => {
            // Calculate total amount due from all assignments
            const totalDue = person.assignments.reduce((sum: number, assignment: any) => {
                const shipmentCharges = Number(assignment.shipment.total_charges || 0);
                const delivery = assignment.shipment.deliveries?.[0];
                const totalExpenses = Number(delivery?.total_expenses || 0);
                return sum + shipmentCharges + totalExpenses;
            }, 0);

            // Calculate total paid from payment history
            const totalPaid = person.paymentHistory.reduce((sum: number, payment: any) => {
                return sum + Number(payment.amount_paid || 0);
            }, 0);

            return {
                id: person.id,
                name: person.name,
                contact_info: person.contact_info,
                totalDue: totalDue,
                totalPaid: totalPaid,
                balance: totalDue - totalPaid,
                assignments: person.assignments.map((a: any) => ({
                    id: a.id,
                    shipment_id: a.shipment_id,
                    bility_number: a.shipment.bility_number,
                    register_number: a.shipment.register_number,
                    shipment_charges: Number(a.shipment.total_charges),
                    delivery_expenses: a.shipment.deliveries?.[0] ? {
                        station_expense: Number(a.shipment.deliveries[0].station_expense || 0),
                        bility_expense: Number(a.shipment.deliveries[0].bility_expense || 0),
                        station_labour: Number(a.shipment.deliveries[0].station_labour || 0),
                        cart_labour: Number(a.shipment.deliveries[0].cart_labour || 0),
                        total_expenses: Number(a.shipment.deliveries[0].total_expenses || 0),
                    } : null,
                    total_due: Number(a.shipment.total_charges) + (Number(a.shipment.deliveries?.[0]?.total_expenses || 0)),
                    status: a.status,
                    collected_amount: Number(a.collected_amount || 0),
                })),
                paymentHistory: person.paymentHistory.map((p: any) => ({
                    id: p.id,
                    shipment_id: p.shipment_id,
                    payment_date: p.payment_date,
                    amount_paid: Number(p.amount_paid),
                    payment_method: p.payment_method,
                    notes: p.notes,
                })),
            };
        });

        return NextResponse.json(formattedData, { status: 200 });
    } catch (error) {
        console.error('Error fetching labour settlements:', error);
        return NextResponse.json(
            { message: 'Internal Server Error while fetching labour settlements.' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/labour-settlements
 * Records a payment for a labour person
 */
export async function POST(request: Request) {
    try {
        const { labour_person_id, shipment_id, amount_paid, payment_method, notes } = await request.json();

        if (!labour_person_id || !shipment_id || !amount_paid) {
            return NextResponse.json({
                message: 'Labour person ID, shipment ID, and amount paid are required.'
            }, { status: 400 });
        }

        if (Number(amount_paid) <= 0) {
            return NextResponse.json({
                message: 'Amount paid must be greater than zero.'
            }, { status: 400 });
        }

        // Verify labour person and shipment exist
        const [labourPerson, shipment, assignment] = await Promise.all([
            prisma.labourPerson.findUnique({ where: { id: labour_person_id } }),
            prisma.shipment.findUnique({ where: { register_number: shipment_id } }),
            prisma.labourAssignment.findFirst({
                where: { labour_person_id, shipment_id }
            })
        ]);

        if (!labourPerson) {
            return NextResponse.json({ message: 'Labour person not found.' }, { status: 404 });
        }

        if (!shipment) {
            return NextResponse.json({ message: 'Shipment not found.' }, { status: 404 });
        }

        if (!assignment) {
            return NextResponse.json({ 
                message: 'No assignment found for this labour person and shipment.' 
            }, { status: 404 });
        }

        // Record the payment in the LabourPaymentHistory table
        const paymentRecord = await prisma.labourPaymentHistory.create({
            data: {
                labour_person_id,
                shipment_id,
                amount_paid: Number(amount_paid),
                payment_method: payment_method || 'CASH',
                notes: notes || undefined,
            }
        });

        return NextResponse.json({
            message: 'Payment recorded successfully.',
            payment: paymentRecord
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error recording labour payment:', error);
        return NextResponse.json(
            { message: `Internal Server Error: ${error.message}` },
            { status: 500 }
        );
    }
}
