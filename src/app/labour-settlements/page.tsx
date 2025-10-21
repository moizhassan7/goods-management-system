// src/app/labour-settlements/page.tsx
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

// --- Toast and Interface Definitions ---
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
    // New fields added from the backend API
    station_expense: number;
    bility_expense: number;
    station_labour: number;
    cart_labour: number;
    total_expenses: number;
    total_amount: number; // Shipment Charges + Total Expenses
    // End New fields
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
}

// Interface for the fetched Delivery data (only what is needed for calculations)
interface DeliveryData {
    delivery_id: number;
    total_expenses: number;
    shipment: {
        total_charges: number;
    }
}


// --- Settle Remaining Dialog Component (With input for final amount) ---

interface SettleRemainingProps {
    assignment: LabourAssignment;
    remainingAmount: number;
    // Function to proceed with the SETTLE action after handling the remaining amount
    onSettleConfirmed: (id: number, finalAmount: number) => void;
    onClose: () => void;
}

function SettleRemainingDialog({ assignment, remainingAmount, onSettleConfirmed, onClose }: SettleRemainingProps) {
    const { toast } = useToast();
    const absRemaining = Math.abs(remainingAmount);
    const isOverpaid = remainingAmount < 0;
    
    // Calculate the total collected amount required for full settlement (Original Collected + Remaining Due)
    const requiredTotalCollection = Number((assignment.collected_amount + remainingAmount).toFixed(2)); 

    // The amount the user is providing to settle (should be equal to requiredTotalCollection)
    const [finalCollectedAmountInput, setFinalCollectedAmountInput] = useState(requiredTotalCollection.toFixed(2));
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirmSettle = () => {
        const finalAmount = parseFloat(finalCollectedAmountInput);
        
        // This check ensures the user commits to the correct final amount
        if (Math.abs(finalAmount - requiredTotalCollection) > 0.01) { 
            toast.error({ 
                title: "Validation Error", 
                description: `To settle, the final Collected Amount must be exactly $${requiredTotalCollection.toFixed(2)}. Please correct the amount.` 
            });
            return;
        }

        setIsSubmitting(true);
        onSettleConfirmed(assignment.id, finalAmount); 
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle className={isOverpaid ? 'text-green-700' : 'text-red-700'}>
                    {isOverpaid ? 'Account Overpaid - Finalize Refund' : 'Remaining Payment Due - Finalize Collection'}
                </DialogTitle>
                <DialogDescription>
                    The collected amount (${assignment.collected_amount.toFixed(2)}) requires adjustment to finalize settlement. 
                </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md'>
                
                <div className='flex justify-between font-bold text-lg'>
                    <Label className='text-gray-700'>
                        Final Corrected Collected Amount
                    </Label>
                    <span className='text-xl text-blue-800'>
                        ${requiredTotalCollection.toFixed(2)}
                    </span>
                </div>
                
                <div className='grid grid-cols-4 items-center gap-4'>
                    <Label htmlFor='finalAmount' className='col-span-1 text-right text-sm font-semibold'>
                        Confirm Amount
                    </Label>
                    <Input
                        id='finalAmount'
                        type='number'
                        step='0.01'
                        value={finalCollectedAmountInput}
                        onChange={(e) => setFinalCollectedAmountInput(e.target.value)}
                        className='col-span-3 font-extrabold text-lg'
                        placeholder={requiredTotalCollection.toFixed(2)}
                    />
                </div>
                <p className='text-xs text-gray-600 italic'>
                    *By clicking 'Settle Now', you confirm this corrected amount is the final collected value, and the assignment status will be set to SETTLED.
                </p>
            </div>
            
            <DialogFooter>
                <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleConfirmSettle}
                    disabled={isSubmitting || Math.abs(parseFloat(finalCollectedAmountInput) - requiredTotalCollection) > 0.01}
                >
                    {isSubmitting ? 'Processing...' : 'Settle Now'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}


// --- Main Component ---
export default function LabourSettlements() {
    const { toast } = useToast();
    const [assignments, setAssignments] = useState<LabourAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAssignment, setSelectedAssignment] = useState<LabourAssignment | null>(null);
    const [action, setAction] = useState<'DELIVER' | 'COLLECT' | 'SETTLE'>('DELIVER');
    
    // New States for Forms
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSettleDueOpen, setIsSettleDueOpen] = useState(false);
    const [remainingDue, setRemainingDue] = useState(0); 

    // Expense Fields
    const [collectedAmount, setCollectedAmount] = useState('');
    const [stationExpense, setStationExpense] = useState('');
    const [bilityExpense, setBilityExpense] = useState('');
    const [stationLabour, setStationLabour] = useState('');
    const [cartLabour, setCartLabour] = useState('');
    const [notes, setNotes] = useState('');

    // Helper to clear all modal inputs
    const resetModalStates = () => {
        setSelectedAssignment(null);
        setCollectedAmount('');
        setStationExpense('');
        setBilityExpense('');
        setStationLabour('');
        setCartLabour('');
        setNotes('');
        setRemainingDue(0);
        setIsSettleDueOpen(false);
        setIsDialogOpen(false);
    };

    useEffect(() => {
        // Fetching assignments now excludes SETTLED ones based on backend logic
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
    
    // Calculate sum of expenses entered by user (for COLLECT modal display)
    const totalEstimatedExpenses = useMemo(() => {
        return (parseFloat(stationExpense || '0') || 0) +
               (parseFloat(bilityExpense || '0') || 0) +
               (parseFloat(stationLabour || '0') || 0) +
               (parseFloat(cartLabour || '0') || 0);
    }, [stationExpense, bilityExpense, stationLabour, cartLabour]);
    
    // Total Receivable for the Shipment (Charges)
    const shipmentCharges = Number(selectedAssignment?.shipment.total_charges || 0);


    // --- CORE API HANDLERS ---
    
    // Generic handler for DELIVER/COLLECT/SETTLE
    const handleAction = async (forcedId?: number, forcedAction?: 'DELIVER' | 'COLLECT' | 'SETTLE') => {
        const assignmentId = forcedId || selectedAssignment?.id;
        if (!assignmentId) return;

        const currentAction = forcedAction || action;

        try {
            const payload: any = {
                assignment_id: assignmentId,
                action: currentAction,
                notes: notes || undefined,
            };

            if (currentAction === 'COLLECT') {
                const finalAmount = parseFloat(collectedAmount || '0') || 0;
                
                if (finalAmount < 0 || isNaN(finalAmount)) {
                     throw new Error('Collected Amount must be a valid non-negative number.');
                }
                
                payload.collected_amount = finalAmount;
                
                // Include expense fields for Delivery Record update
                payload.station_expense = parseFloat(stationExpense || '0') || 0;
                payload.bility_expense = parseFloat(bilityExpense || '0') || 0;
                payload.station_labour = parseFloat(stationLabour || '0') || 0;
                payload.cart_labour = parseFloat(cartLabour || '0') || 0;
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

            resetModalStates(); 
            fetchAssignments(); 

        } catch (error: any) {
            toast.error({
                title: 'Error',
                description: error.message
            });
        }
    };
    
    // Simple mock/placeholder function since the required API endpoint doesn't exist separately
    const fetchDeliveryData = async (shipmentId: string): Promise<DeliveryData | null> => {
        try {
            const response = await fetch(`/api/deliveries/report?shipment_id=${shipmentId}`);
            if (!response.ok) return null;
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                 return {
                    delivery_id: data[0].delivery_id,
                    total_expenses: Number(data[0].total_expenses || 0),
                    shipment: {
                        total_charges: Number(data[0].shipment.total_charges || 0)
                    }
                 } as DeliveryData;
            }
            return null;
        } catch (error) {
            console.error("Error during delivery data fetch:", error);
            return null;
        }
    }

    // This handler forces an update of the collected_amount then immediately calls SETTLE
    const handleSettleCorrection = async (assignmentId: number, finalAmount: number) => {
        // 1. Update the stored collected amount to the final, corrected value using the COLLECT action
        try {
            const response = await fetch('/api/labour-assignments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignment_id: assignmentId,
                    action: 'COLLECT', 
                    collected_amount: finalAmount,
                    // Pass 0 for expenses to prevent overwriting old delivery expense records
                    station_expense: 0, bility_expense: 0, station_labour: 0, cart_labour: 0,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update collected amount.');
            }

            // 2. Proceed with the final SETTLE action
            await handleAction(assignmentId, 'SETTLE'); 
            
        } catch (error: any) {
            toast.error({
                title: 'Settlement Correction Failed',
                description: error.message
            });
            resetModalStates();
        }
    };

    // Handles the intelligent settlement logic (checks for final balance)
    const handleSettle = async (assignment: LabourAssignment) => {
        const deliveryData = await fetchDeliveryData(assignment.shipment_id);
        
        if (!deliveryData) {
            toast.error({ title: "Settlement Blocked", description: "Could not retrieve final expense data for this assignment. Ensure COLLECT action was performed." });
            return;
        }

        const collected = Number(assignment.collected_amount || 0);
        const recordedExpenses = Number(deliveryData.total_expenses || 0);
        const shipmentCharges = Number(assignment.shipment.total_charges || 0);
        
        // Total Due = Shipment Charges (Revenue) + Total Expenses (reimbursement to labour)
        const totalDue = shipmentCharges + recordedExpenses;
        
        // Remaining Balance = Total Due - Collected Amount (Positive means underpaid/due, Negative means overpaid/refunded)
        const remaining = totalDue - collected;
        
        const tolerance = 0.01; 
        
        if (Math.abs(remaining) > tolerance) { 
            // Difference found - open the dialog to resolve
            setRemainingDue(remaining);
            setSelectedAssignment(assignment);
            setIsSettleDueOpen(true);
        } else {
            // Full payment (or close enough) - proceed to final SETTLE
            openActionDialog(assignment, 'SETTLE');
        }
    };
    
    // --- Utility Functions ---
    const openActionDialog = (assignment: LabourAssignment, actionType: 'DELIVER' | 'COLLECT' | 'SETTLE') => {
        resetModalStates();

        setSelectedAssignment(assignment);
        setAction(actionType);
        
        // For COLLECT action, pre-fill collected amount if it exists
        if (actionType === 'COLLECT') {
            setCollectedAmount(assignment.collected_amount > 0 ? assignment.collected_amount.toFixed(2) : '');
            // For correction, pre-fill expenses based on what was previously recorded (if available, though API doesn't return it easily here)
        }

        setIsDialogOpen(true);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            ASSIGNED: 'secondary',
            DELIVERED: 'default',
            COLLECTED: 'outline',
            SETTLED: 'default',
            CANCELLED: 'destructive',
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
        <div className='p-6 max-w-full mx-auto bg-gray-50 min-h-screen'>
            <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>Labour Settlements</h2>

            <Card className='shadow-lg'>
                <CardHeader>
                    <CardTitle className='text-xl text-blue-800'>Assignments Overview</CardTitle>
                    <CardDescription>Manage delivery assignments and settlements (Settled shipments are excluded)</CardDescription>
                </CardHeader>
                <CardContent>
                    {assignments.length === 0 ? (
                        <p className='text-gray-500'>No active assignments found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Labour Person</TableHead>
                                        <TableHead>Bilty Number</TableHead>
                                        <TableHead className='text-right'>Shipment Charges</TableHead>
                                        <TableHead className='text-right'>S.Exp</TableHead>
                                        <TableHead className='text-right'>B.Exp</TableHead>
                                        <TableHead className='text-right'>S.Lab</TableHead>
                                        <TableHead className='text-right'>C.Lab</TableHead>
                                        <TableHead className='text-right'>Total Exp</TableHead>
                                        <TableHead className='text-right font-bold'>Total Due</TableHead>
                                        <TableHead className='text-right'>Collected</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assignments.map((assignment) => {
                                        
                                        const shipmentCharges = Number(assignment.shipment.total_charges || 0);
                                        const collected = Number(assignment.collected_amount || 0);
                                        const totalDue = Number(assignment.total_amount || 0);

                                        return (
                                            <TableRow key={assignment.id}>
                                                <TableCell className='font-medium'>{assignment.labourPerson.name}</TableCell>
                                                <TableCell>{assignment.shipment.bility_number}</TableCell>
                                                
                                                {/* Shipment Charges */}
                                                <TableCell className='font-medium text-right text-blue-700'>
                                                    ${shipmentCharges.toFixed(2)}
                                                </TableCell>

                                                {/* Individual Expenses */}
                                                <TableCell className='text-right'>{formatCurrencyDisplay(assignment.station_expense)}</TableCell>
                                                <TableCell className='text-right'>{formatCurrencyDisplay(assignment.bility_expense)}</TableCell>
                                                <TableCell className='text-right'>{formatCurrencyDisplay(assignment.station_labour)}</TableCell>
                                                <TableCell className='text-right'>{formatCurrencyDisplay(assignment.cart_labour)}</TableCell>
                                                
                                                {/* Total Expenses */}
                                                <TableCell className='font-medium text-right text-red-600'>
                                                    ${formatCurrencyDisplay(assignment.total_expenses)}
                                                </TableCell>

                                                {/* Total Amount Due (Charges + Expenses) */}
                                                <TableCell className='font-extrabold text-right text-blue-900'>
                                                    ${totalDue.toFixed(2)}
                                                </TableCell>
                                                
                                                {/* Collected Amount */}
                                                <TableCell className={`font-medium text-right ${collected > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                    ${collected.toFixed(2)}
                                                </TableCell>

                                                <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                                                <TableCell>
                                                    <div className='flex gap-2'>
                                                        {canDeliver(assignment) && (
                                                            <Button size='sm' variant='outline' onClick={() => openActionDialog(assignment, 'DELIVER')}>Deliver</Button>
                                                        )}
                                                        {canCollect(assignment) && (
                                                            <Button size='sm' variant='default' className='bg-orange-600 hover:bg-orange-700' onClick={() => openActionDialog(assignment, 'COLLECT')}>Collect Funds</Button>
                                                        )}
                                                        {canSettle(assignment) && (
                                                            <Button size='sm' variant='default' className='bg-green-600 hover:bg-green-700' onClick={() => handleSettle(assignment)}>Settle</Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* --- Main Action Dialog (DELIVER/COLLECT/SETTLE) --- */}
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
                            {action === 'COLLECT' && `Record the collected funds and any associated expenses for Shipment #${selectedAssignment?.shipment.bility_number}.`}
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
                                    <span className='text-blue-800'>${formatCurrencyDisplay(shipmentCharges)}</span>
                                </div>
                                <div className='flex justify-between font-medium'>
                                    <span className='text-gray-700'>Total Expenses (Claimed)</span>
                                    <span className='text-red-600'>${totalEstimatedExpenses.toFixed(2)}</span>
                                </div>
                                <div className='flex justify-between font-bold pt-1 border-t border-blue-200'>
                                    <span className='text-blue-900'>TOTAL DUE (Charges + Expenses)</span>
                                    <span className='text-blue-900'>${(shipmentCharges + totalEstimatedExpenses).toFixed(2)}</span>
                                </div>
                            </div>
                            
                            {/* --- COLLECTED AMOUNT INPUT (Directly Editable) --- */}
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='collectedAmount' className='text-right'>
                                    Collected Amount
                                </Label>
                                <Input
                                    id='collectedAmount'
                                    type='number'
                                    step='0.01'
                                    placeholder={(shipmentCharges + totalEstimatedExpenses).toFixed(2)}
                                    value={collectedAmount}
                                    onChange={(e) => setCollectedAmount(e.target.value)}
                                    className='col-span-3 font-extrabold text-green-700 border-green-300'
                                />
                            </div>

                            {/* Expense Fields */}
                            <h4 className='text-md font-semibold mt-6 pt-2 border-t'>Delivery Expenses</h4>

                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='stationExpense' className='text-right text-sm'>Station Expense</Label>
                                <Input id='stationExpense' type='number' step='0.01' placeholder='0.00' value={stationExpense} onChange={(e) => setStationExpense(e.target.value)} className='col-span-3' />
                            </div>

                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='bilityExpense' className='text-right text-sm'>Bility Expense</Label>
                                <Input id='bilityExpense' type='number' step='0.01' placeholder='0.00' value={bilityExpense} onChange={(e) => setBilityExpense(e.target.value)} className='col-span-3' />
                            </div>

                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='stationLabour' className='text-right text-sm'>Station Labour</Label>
                                <Input id='stationLabour' type='number' step='0.01' placeholder='0.00' value={stationLabour} onChange={(e) => setStationLabour(e.target.value)} className='col-span-3' />
                            </div>

                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='cartLabour' className='text-right text-sm'>Cart Labour</Label>
                                <Input id='cartLabour' type='number' step='0.01' placeholder='0.00' value={cartLabour} onChange={(e) => setCartLabour(e.target.value)} className='col-span-3' />
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
                        <Button variant='outline' onClick={resetModalStates}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={() => handleAction()} 
                            disabled={action === 'COLLECT' && (Number(collectedAmount) < 0 || isNaN(Number(collectedAmount)))}
                        >
                            {action === 'DELIVER' && 'Mark Delivered'}
                            {action === 'COLLECT' && 'Record Collection'}
                            {action === 'SETTLE' && 'Settle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* --- Remaining Due Dialog --- */}
            <Dialog open={isSettleDueOpen} onOpenChange={setIsSettleDueOpen}>
                {isSettleDueOpen && selectedAssignment && (
                    <SettleRemainingDialog 
                        assignment={selectedAssignment} 
                        remainingAmount={remainingDue} 
                        onSettleConfirmed={handleSettleCorrection}
                        onClose={resetModalStates}
                    />
                )}
            </Dialog>

        </div>
    );
}