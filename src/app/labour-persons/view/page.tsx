"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast as sonnerToast } from 'sonner';

export interface Toast {
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
}

export function useToast() {
    return {
        toast: {
            success: (toast: Omit<Toast, 'id'>) => {
                sonnerToast.success(toast.title, {
                    description: toast.description,
                });
            },
            error: (toast: Omit<Toast, 'id'>) => {
                sonnerToast.error(toast.title, {
                    description: toast.description,
                });
            },
            dismiss: (id: string) => {
                sonnerToast.dismiss(id);
            },
        },
        toasts: [],
    };
}

interface LabourPerson {
    id: number;
    name: string;
    contact_info: string;
    createdAt: string;
    assignments: Array<{
        id: number;
        status: string;
        collected_amount: number;
        shipment: {
            register_number: string;
            bility_number: string;
            total_charges: number;
            receiver: { name: string };
        };
    }>;
}

export default function ViewLabourPersons() {
    const { toast } = useToast();
    const [labourPersons, setLabourPersons] = useState<LabourPerson[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchLabourPersons();
    }, []);

    const fetchLabourPersons = async () => {
        try {
            const response = await fetch('/api/labour-persons');
            if (!response.ok) throw new Error('Failed to fetch labour persons');

            const data = await response.json();
            setLabourPersons(data);
        } catch (error: any) {
            toast.error({
                title: 'Error',
                description: 'Failed to load labour persons.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            ASSIGNED: 'secondary',
            DELIVERED: 'default',
            COLLECTED: 'outline',
            SETTLED: 'default'
        };
        return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
    };

    if (isLoading) {
        return (
            <div className='p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen'>
                <div className='text-center'>Loading labour persons...</div>
            </div>
        );
    }

    return (
        <div className='p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen'>
            <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>Labour Persons</h2>

            {labourPersons.length === 0 ? (
                <Card className='shadow-lg'>
                    <CardContent className='p-6 text-center'>
                        <p className='text-gray-500'>No labour persons found.</p>
                        <Button
                            className='mt-4'
                            onClick={() => window.location.href = '/labour-persons/add'}
                        >
                            Add First Labour Person
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className='space-y-6'>
                    {labourPersons.map((person) => (
                        <Card key={person.id} className='shadow-lg'>
                            <CardHeader>
                                <CardTitle className='text-xl text-blue-800'>{person.name}</CardTitle>
                                <CardDescription>{person.contact_info}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className='mb-4'>
                                    <h4 className='font-semibold mb-2'>Assignments ({person.assignments.length})</h4>
                                    {person.assignments.length === 0 ? (
                                        <p className='text-gray-500 text-sm'>No assignments yet.</p>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Bilty Number</TableHead>
                                                    <TableHead>Receiver</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Collected</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {person.assignments.map((assignment) => (
                                                    <TableRow key={assignment.id}>
                                                        <TableCell className='font-medium'>
                                                            {assignment.shipment.bility_number}
                                                        </TableCell>
                                                        <TableCell>{assignment.shipment.receiver.name}</TableCell>
                                                        <TableCell>${assignment.shipment.total_charges}</TableCell>
                                                        <TableCell>${assignment.collected_amount}</TableCell>
                                                        <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                                <Button
                                    variant='outline'
                                    onClick={() => window.location.href = `/labour-assignments/add?labour_person_id=${person.id}`}
                                >
                                    Assign Shipments
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
