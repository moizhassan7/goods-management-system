'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
    // collected_amount will hold the final net payable after discount from the API
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
        total_charges: number; // The gross receivable amount (Shipment Charge)
        receiver: { name: string };
        departureCity: { name: string };
        toCity?: { name: string };
    };
    // NOTE: For a real app, the API would return expense/discount fields directly on this object
    // For now, we rely on shipment.total_charges and assignment.collected_amount
}

export default function LabourSettlements() {
    const { toast } = useToast();
    const [assignments, setAssignments] = useState<LabourAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAssignment, setSelectedAssignment] = useState<LabourAssignment | null>(null);
    const [action, setAction] = useState<'DELIVER' | 'COLLECT' | 'SETTLE'>('DELIVER');
    
    // NEW STATES for Expense and Discount Fields
    const [collectedAmount, setCollectedAmount] = useState('');
    const [stationExpense, setStationExpense] = useState('');
    const [bilityExpense, setBilityExpense] = useState('');
    const [stationLabour, setStationLabour] = useState('');
    const [cartLabour, setCartLabour] = useState('');
    const [discountAmount, setDiscountAmount] = useState(''); // NEW STATE
    
    const [notes, setNotes] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Helper to clear all modal inputs
    const resetModalStates = () => {
        setSelectedAssignment(null);
        setCollectedAmount('');
        setStationExpense('');
        setBilityExpense('');
        setStationLabour('');
        setCartLabour('');
        setDiscountAmount(''); // Reset Discount
        setNotes('');
    };

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

    // Calculate estimated total expenses for display in the Collect modal summary
    const totalEstimatedExpenses = useMemo(() => {
        return (parseFloat(stationExpense || '0') || 0) +
               (parseFloat(bilityExpense || '0') || 0) +
               (parseFloat(stationLabour || '0') || 0) +
               (parseFloat(cartLabour || '0') || 0);
    }, [stationExpense, bilityExpense, stationLabour, cartLabour]);

    // Calculate total payable pre-discount
    const totalPayablePreDiscount = useMemo(() => {
        const shipmentCharges = Number(selectedAssignment?.shipment.total_charges || 0);
        return shipmentCharges + totalEstimatedExpenses;
    }, [selectedAssignment, totalEstimatedExpenses]);
    
    // Calculate final collected amount after discount
    const finalPayableAfterDiscount = useMemo(() => {
        const discount = parseFloat(discountAmount || '0') || 0;
        return totalPayablePreDiscount - discount;
    }, [totalPayablePreDiscount, discountAmount]);


    const handleAction = async () => {
        if (!selectedAssignment) return;

        try {
            const payload: any = {
                assignment_id: selectedAssignment.id,
                action,
                notes: notes || undefined,
            };

            if (action === 'COLLECT') {
                // We'll send the FINAL calculated payable amount in 'collected_amount' to record the transaction amount.
                payload.collected_amount = finalPayableAfterDiscount; 
                
                // Ensure collected_amount validation is based on the final calculated amount
                if (payload.collected_amount <= 0 || isNaN(payload.collected_amount)) {
                     throw new Error('Final Collected Amount must be a valid amount greater than zero.');
                }
                
                // Include expense fields for Delivery Record update (as implemented in API)
                payload.station_expense = parseFloat(stationExpense || '0') || 0;
                payload.bility_expense = parseFloat(bilityExpense || '0') || 0;
                payload.station_labour = parseFloat(stationLabour || '0') || 0;
                payload.cart_labour = parseFloat(cartLabour || '0') || 0;
                
                // Add discount field to payload if you plan to update the Delivery record to track it
                payload.discount_amount = parseFloat(discountAmount || '0') || 0; 
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
            resetModalStates(); // Reset all states
            fetchAssignments(); // Refresh data

        } catch (error: any) {
            toast.error({
                title: 'Error',
                description: error.message
            });
        }
    };

    const openActionDialog = (assignment: LabourAssignment, actionType: 'DELIVER' | 'COLLECT' | 'SETTLE') => {
        // Reset states when opening the dialog
        resetModalStates();

        setSelectedAssignment(assignment);
        setAction(actionType);
        
        // Populate collected amount if it exists and action is SETTLE
        if (actionType === 'SETTLE' && assignment.collected_amount) {
            setCollectedAmount(assignment.collected_amount.toString());
        }

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
    
    const formatCurrencyDisplay = (amount: string | number) => {
        const num = parseFloat(amount.toString()) || 0;
        return num.toFixed(2);
    };


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
                                    <TableHead className='text-right'>Shipment Charges</TableHead>
                                    <TableHead className='text-right'>Collected</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignments.map((assignment) => {
                                    // Calculate gross charges for display
                                    const shipmentCharges = Number(assignment.shipment.total_charges || 0);
                                    const collected = Number(assignment.collected_amount || 0);

                                    return (
                                        <TableRow key={assignment.id}>
                                            <TableCell className='font-medium'>{assignment.labourPerson.name}</TableCell>
                                            <TableCell>{assignment.shipment.bility_number}</TableCell>
                                            <TableCell>{assignment.shipment.receiver.name}</TableCell>
                                            
                                            {/* Column 4: Total Receivable (Shipment Charges) */}
                                            <TableCell className='font-medium text-right text-blue-700'>
                                                ${shipmentCharges.toFixed(2)}
                                            </TableCell>
                                            
                                            {/* Column 5: Collected Amount (Net after discount/expense handling on API side) */}
                                            <TableCell className={`font-medium text-right ${collected > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                ${collected.toFixed(2)}
                                            </TableCell>

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
                                                            variant='default'
                                                            className='bg-orange-600 hover:bg-orange-700'
                                                            onClick={() => openActionDialog(assignment, 'COLLECT')}
                                                        >
                                                            Collect Funds
                                                        </Button>
                                                    )}
                                                    {canSettle(assignment) && (
                                                        <Button
                                                            size='sm'
                                                            variant='default'
                                                            className='bg-green-600 hover:bg-green-700'
                                                            onClick={() => openActionDialog(assignment, 'SETTLE')}
                                                        >
                                                            Settle
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className='sm:max-w-[450px]'>
                    <DialogHeader>
                        <DialogTitle>
                            {action === 'DELIVER' && 'Mark as Delivered'}
                            {action === 'COLLECT' && 'Record Collection & Expenses'}
                            {action === 'SETTLE' && 'Settle Assignment'}
                        </DialogTitle>
                        <DialogDescription>
                            {action === 'DELIVER' && 'Confirm that the shipment has been physically delivered by the labour person.'}
                            {action === 'COLLECT' && `Enter the funds collected and associated expenses for Shipment #${selectedAssignment?.shipment.bility_number}.`}
                            {action === 'SETTLE' && 'Finalize the transaction and clear the labour person\'s account.'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* === COLLECT FIELDS === */}
                    {action === 'COLLECT' && (
                        <div className='space-y-4'>
                            
                            {/* --- FINANCIAL BREAKDOWN (READ-ONLY) --- */}
                            <div className='space-y-1 p-3 bg-blue-50/50 rounded-md border border-blue-200'>
                                <div className='flex justify-between font-medium'>
                                    <span className='text-gray-700'>Shipment Charges (Receivable)</span>
                                    <span className='text-blue-800'>${formatCurrencyDisplay(selectedAssignment?.shipment.total_charges || 0)}</span>
                                </div>
                                <div className='flex justify-between font-medium'>
                                    <span className='text-gray-700'>Total Recorded Expense</span>
                                    <span className='text-red-600'>${totalEstimatedExpenses.toFixed(2)}</span>
                                </div>
                                <div className='flex justify-between font-bold pt-1 border-t border-blue-200'>
                                    <span className='text-blue-900'>Total Payable (Pre-Discount)</span>
                                    <span className='text-blue-900'>${totalPayablePreDiscount.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            {/* --- DISCOUNT FIELD (INPUT) --- */}
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='discountAmount' className='text-right'>
                                    Discount Given
                                </Label>
                                <Input
                                    id='discountAmount'
                                    type='number'
                                    step='0.01'
                                    placeholder='0.00'
                                    value={discountAmount}
                                    onChange={(e) => setDiscountAmount(e.target.value)}
                                    className='col-span-3 font-semibold text-red-700'
                                />

                                 <Label htmlFor='collectedAmount' className='text-right'>
                                    Collected Amount
                                </Label>
                                <Input
                                    id='collectedAmount'
                                    type='number'
                                    step='0.01'
                                    placeholder='0.00'
                                    // value={finalPayableAfterDiscount.toFixed(2)}
                                    onChange={(e) => setCollectedAmount(e.target.value)}
                                    className='col-span-3 font-semibold text-red-700'
                                />
                            </div>

                            {/* --- FINAL PAYABLE (READ-ONLY) --- */}
                            <div className='p-3 bg-green-50/50 rounded-md border border-green-200'>
                                <div className='flex justify-between font-extrabold'>
                                    <span className='text-green-900 text-lg'>Final Collected Amount</span>
                                    <span className='text-green-900 text-lg'>${finalPayableAfterDiscount.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Hidden Collected Amount Field (using finalPayableAfterDiscount as value) */}
                            <Input
                                id='collectedAmount'
                                type='hidden'
                                value={finalPayableAfterDiscount.toFixed(2)}
                                // This input is included to satisfy the handleAction payload structure
                            />
                            
                            <h4 className='text-md font-semibold mt-6 pt-2 border-t'>Delivery Expenses</h4>

                            {/* Station Expense */}
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='stationExpense' className='text-right text-sm'>
                                    Station Expense
                                </Label>
                                <Input
                                    id='stationExpense'
                                    type='number'
                                    step='0.01'
                                    placeholder='0.00'
                                    value={stationExpense}
                                    onChange={(e) => setStationExpense(e.target.value)}
                                    className='col-span-3'
                                />
                            </div>

                            {/* Bility Expense */}
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='bilityExpense' className='text-right text-sm'>
                                    Bility Expense
                                </Label>
                                <Input
                                    id='bilityExpense'
                                    type='number'
                                    step='0.01'
                                    placeholder='0.00'
                                    value={bilityExpense}
                                    onChange={(e) => setBilityExpense(e.target.value)}
                                    className='col-span-3'
                                />
                            </div>

                            {/* Station Labour */}
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='stationLabour' className='text-right text-sm'>
                                    Station Labour
                                </Label>
                                <Input
                                    id='stationLabour'
                                    type='number'
                                    step='0.01'
                                    placeholder='0.00'
                                    value={stationLabour}
                                    onChange={(e) => setStationLabour(e.target.value)}
                                    className='col-span-3'
                                />
                            </div>

                            {/* Cart Labour */}
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='cartLabour' className='text-right text-sm'>
                                    Cart Labour
                                </Label>
                                <Input
                                    id='cartLabour'
                                    type='number'
                                    step='0.01'
                                    placeholder='0.00'
                                    value={cartLabour}
                                    onChange={(e) => setCartLabour(e.target.value)}
                                    className='col-span-3'
                                />
                            </div>
                        </div>
                    )}
                    {/* === END COLLECT FIELDS === */}


                    {/* Notes Field (Always present for any action) */}
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
                        <Button 
                            onClick={handleAction} 
                            // Disable if the final payable amount is zero or negative (unless it's set to exactly 0.00)
                            disabled={action === 'COLLECT' && (finalPayableAfterDiscount < 0 || isNaN(finalPayableAfterDiscount))}
                        >
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
