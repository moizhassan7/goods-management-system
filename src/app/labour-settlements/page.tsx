"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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

interface LabourAssignment {
    id: number;
    labour_person_id: number;
    shipment_id: string;
    assigned_date: string;
    status: string;
    collected_amount: number;
    due_date?: string;
    delivered_date?: string;
    settled_date?: string;
    notes?: string;
    labourPerson: {
        id: number;
        name: string;
        contact_info: string;
    };
    shipment: {
        register_number: string;
        bility_number: string;
        total_charges: number;
        receiver: { name: string };
        departureCity: { name: string };
        toCity?: { name: string };
    };
}

export default function LabourSettlements() {
    const { toast } = useToast();
    const [assignments, setAssignments] = useState<LabourAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAssignment, setSelectedAssignment] = useState<LabourAssignment | null>(null);
    const [action, setAction] = useState<'DELIVER' | 'COLLECT' | 'SETTLE'>('DELIVER');
    const [collectedAmount, setCollectedAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            const response = await fetch('/api/labour-assignments');
            if (!response.ok) throw new Error('Failed to fetch assignments');

            const data = await response.json();
            setAssignments(data);
        } catch (error: any) {
            toast.error({
                title: 'Error',
                description: 'Failed to load assignments.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async () => {
        if (!selectedAssignment) return;

        try {
            const payload: any = {
                assignment_id: selectedAssignment.id,
                action,
                notes: notes || undefined,
            };

            if (action === 'COLLECT') {
                payload.collected_amount = parseFloat(collectedAmount);
            }

            const response = await fetch('/api/labour-assignments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update assignment.');
            }

            const result = await response.json();
            toast.success({
                title: 'Success',
                description: result.message
            });

            setIsDialogOpen(false);
            setSelectedAssignment(null);
            setCollectedAmount('');
            setNotes('');
            fetchAssignments(); // Refresh data

        } catch (error: any) {
            toast.error({
                title: 'Error',
                description: error.message
            });
        }
    };

    const openActionDialog = (assignment: LabourAssignment, actionType: 'DELIVER' | 'COLLECT' | 'SETTLE') => {
        setSelectedAssignment(assignment);
        setAction(actionType);
        setCollectedAmount(assignment.collected_amount ? assignment.collected_amount.toString() : '');
        setNotes(assignment.notes || '');
        setIsDialogOpen(true);
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

    const canDeliver = (assignment: LabourAssignment) => assignment.status === 'ASSIGNED';
    const canCollect = (assignment: LabourAssignment) => assignment.status === 'DELIVERED';
    const canSettle = (assignment: LabourAssignment) => assignment.status === 'COLLECTED';

    if (isLoading) {
        return (
            <div className='p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen'>
                <div className='text-center'>Loading assignments...</div>
            </div>
        );
    }

    return (
        <div className='p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen'>
            <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>Labour Settlements</h2>

            <Card className='shadow-lg'>
                <CardHeader>
                    <CardTitle className='text-xl text-blue-800'>Assignments Overview</CardTitle>
                    <CardDescription>Manage delivery assignments and settlements</CardDescription>
                </CardHeader>
                <CardContent>
                    {assignments.length === 0 ? (
                        <p className='text-gray-500'>No assignments found.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Labour Person</TableHead>
                                    <TableHead>Bilty Number</TableHead>
                                    <TableHead>Receiver</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Collected</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignments.map((assignment) => (
                                    <TableRow key={assignment.id}>
                                        <TableCell className='font-medium'>{assignment.labourPerson.name}</TableCell>
                                        <TableCell>{assignment.shipment.bility_number}</TableCell>
                                        <TableCell>{assignment.shipment.receiver.name}</TableCell>
                                        <TableCell>${assignment.shipment.total_charges}</TableCell>
                                        <TableCell>${assignment.collected_amount}</TableCell>
                                        <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                                        <TableCell>{assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell>
                                            <div className='flex gap-2'>
                                                {canDeliver(assignment) && (
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        onClick={() => openActionDialog(assignment, 'DELIVER')}
                                                    >
                                                        Deliver
                                                    </Button>
                                                )}
                                                {canCollect(assignment) && (
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        onClick={() => openActionDialog(assignment, 'COLLECT')}
                                                    >
                                                        Collect
                                                    </Button>
                                                )}
                                                {canSettle(assignment) && (
                                                    <Button
                                                        size='sm'
                                                        variant='default'
                                                        onClick={() => openActionDialog(assignment, 'SETTLE')}
                                                    >
                                                        Settle
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {action === 'DELIVER' && 'Mark as Delivered'}
                            {action === 'COLLECT' && 'Record Collection'}
                            {action === 'SETTLE' && 'Settle Assignment'}
                        </DialogTitle>
                        <DialogDescription>
                            {action === 'DELIVER' && 'Confirm that the shipment has been delivered.'}
                            {action === 'COLLECT' && 'Enter the amount collected from the receiver.'}
                            {action === 'SETTLE' && 'Settle the assignment and create transaction records.'}
                        </DialogDescription>
                    </DialogHeader>

                    {action === 'COLLECT' && (
                        <div className='grid gap-4 py-4'>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='amount' className='text-right'>
                                    Collected Amount
                                </Label>
                                <Input
                                    id='amount'
                                    type='number'
                                    step='0.01'
                                    value={collectedAmount}
                                    onChange={(e) => setCollectedAmount(e.target.value)}
                                    className='col-span-3'
                                />
                            </div>
                        </div>
                    )}

                    <div className='grid gap-4 py-4'>
                        <div className='grid grid-cols-4 items-center gap-4'>
                            <Label htmlFor='notes' className='text-right'>
                                Notes
                            </Label>
                            <Input
                                id='notes'
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder='Optional notes'
                                className='col-span-3'
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant='outline' onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAction}>
                            {action === 'DELIVER' && 'Mark Delivered'}
                            {action === 'COLLECT' && 'Record Collection'}
                            {action === 'SETTLE' && 'Settle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
