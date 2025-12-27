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
import { Textarea } from '@/components/ui/textarea'; 
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

// Interface for a single recorded payment (for the ledger feature)
interface LabourPayment {
    id: number;
    amount_paid: number;
    payment_date: string;
    notes?: string;
}

interface LabourAssignment {
    id: number;
    labour_person_id: number;
    shipment_id: string;
    assigned_date: string;
    status: string;
    // NOTE: This field is now used to hold the **Total Paid** (sum of payments)
    collected_amount: number; 
    due_date?: string;
    delivered_date?: string;
    settled_date?: string;
    notes?: string;
    // Expense fields are stored on LabourAssignment after COLLECT action
    station_expense: number;
    bility_expense: number;
    station_labour: number;
    cart_labour: number;
    total_expenses: number;
    total_amount: number; // Shipment Charges + Total Expenses (The Total Due)
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
    // Add payment history structure. Assuming backend sends this.
    paymentHistory?: LabourPayment[]; 
}

// Interface for the fetched Delivery data (only what is needed for calculations)
interface DeliveryData {
    delivery_id: number;
    station_expense: number;
    bility_expense: number;
    station_labour: number;
    cart_labour: number;
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
                        Final Corrected Total Paid
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

// --- Record Payment Dialog Component (New for Requirement 1 & 2) ---

interface RecordPaymentProps {
    assignment: LabourAssignment;
    onRecordPaymentConfirmed: (id: number, amount: number, notes: string) => void;
    onClose: () => void;
}

function RecordPaymentDialog({ assignment, onRecordPaymentConfirmed, onClose }: RecordPaymentProps) {
    const { toast } = useToast();
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculate Remaining Balance for display
    const totalDue = Number(assignment.total_amount || 0);
    const totalPaid = Number(assignment.collected_amount || 0);
    const remainingBalance = totalDue - totalPaid;
    const absRemaining = Math.abs(remainingBalance);
    const isDue = remainingBalance > 0.01;
    
    // Suggest the amount due as the default payment amount
    useEffect(() => {
        if (isDue) {
            // Suggest the remaining balance or the entire amount if it's the first payment
            setPaymentAmount(absRemaining.toFixed(2));
        } else {
             setPaymentAmount('');
        }
    }, [absRemaining, isDue]);


    const handleConfirmPayment = () => {
        const amount = parseFloat(paymentAmount || '0');
        
        if (amount <= 0 || isNaN(amount)) {
             toast.error({ title: "Validation Error", description: "Payment Amount must be a valid positive number." });
             return;
        }

        if (isDue && amount > absRemaining + 0.01) { // Adding small tolerance
            toast.error({ title: "Validation Error", description: `Payment amount cannot exceed the remaining balance of $${absRemaining.toFixed(2)}.` });
            return;
        }

        setIsSubmitting(true);
        // Call the parent handler
        onRecordPaymentConfirmed(assignment.id, amount, paymentNotes); 
    };
    
    // Group payment records by day for a clearer ledger view (Requirement 1)
    const groupedPayments = useMemo(() => {
        if (!assignment.paymentHistory || assignment.paymentHistory.length === 0) return {};
        
        return assignment.paymentHistory.reduce((acc, payment) => {
            const date = new Date(payment.payment_date).toLocaleDateString();
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(payment);
            return acc;
        }, {} as Record<string, LabourPayment[]>);
    }, [assignment.paymentHistory]);


    return (
        <DialogContent className='sm:max-w-[600px]'>
            <DialogHeader>
                <DialogTitle>Record Payment from Labour Person</DialogTitle>
                <DialogDescription>
                    Log a payment received from **{assignment.labourPerson.name}** for Shipment **#{assignment.shipment.bility_number}**.
                </DialogDescription>
            </DialogHeader>
            
            {/* Balance Card */}
            <div className='space-y-4 p-4 bg-blue-50/50 rounded-md border border-blue-200'>
                <div className='flex justify-between font-bold text-lg'>
                    <span className='text-gray-700'>Total Due</span>
                    <span className='text-blue-900'>${totalDue.toFixed(2)}</span>
                </div>
                 <div className='flex justify-between font-bold'>
                    <span className='text-gray-700'>Total Paid</span>
                    <span className='text-green-600'>${totalPaid.toFixed(2)}</span>
                </div>
                 <div className='flex justify-between font-extrabold pt-2 border-t border-blue-200'>
                    <span className='text-gray-900'>{isDue ? 'Remaining Balance Due' : 'Account Settled'}</span>
                    <span className={`text-xl ${isDue ? 'text-red-700' : 'text-green-700'}`}>
                        ${absRemaining.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Payment History (Requirement 1) */}
             <div className='max-h-40 overflow-y-auto border-t pt-2'>
                <h4 className='text-md font-semibold mb-2'>Payment History:</h4>
                {Object.keys(groupedPayments).length === 0 ? (
                    <p className='text-sm italic text-gray-500'>No payments recorded yet.</p>
                ) : (
                    <div className='space-y-3'>
                        {Object.entries(groupedPayments).map(([date, payments]) => (
                            <div key={date}>
                                <h5 className='text-sm font-bold text-gray-600'>{date}</h5>
                                {payments.map((payment) => (
                                    <div key={payment.id} className='flex justify-between text-sm ml-2 border-l pl-2'>
                                        <span className='text-gray-800'>${payment.amount_paid.toFixed(2)}</span>
                                        <span className='text-xs text-gray-500 italic'>{payment.notes || 'No notes'}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* New Payment Input */}
            <div className='grid grid-cols-4 items-center gap-4 border-t pt-4'>
                <Label htmlFor='paymentAmount' className='text-right'>
                    Payment Amount
                </Label>
                <Input
                    id='paymentAmount'
                    type='number'
                    step='0.01'
                    placeholder={isDue ? absRemaining.toFixed(2) : '0.00'}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className='col-span-3 font-extrabold text-lg'
                    disabled={!isDue}
                />
            </div>
            <div className='grid grid-cols-4 items-start gap-4'>
                <Label htmlFor='paymentNotes' className='text-right pt-2'>
                    Notes
                </Label>
                 <Textarea
                    id='paymentNotes'
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder='Payment notes (e.g., Cash payment, partial payment)'
                    className='col-span-3'
                />
            </div>
            
            <DialogFooter>
                <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleConfirmPayment}
                    disabled={isSubmitting || parseFloat(paymentAmount || '0') <= 0 || isNaN(parseFloat(paymentAmount || '0')) || !isDue}
                >
                    {isSubmitting ? 'Processing...' : 'Record Payment'}
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
    // Renaming COLLECT action to RECORD_EXPENSES for clarity on its true function (updating expenses)
    const [action, setAction] = useState<'DELIVER' | 'RECORD_EXPENSES' | 'SETTLE'>('DELIVER'); 
    
    // New States for Dialogs
    const [isDialogOpen, setIsDialogOpen] = useState(false); // For DELIVER/RECORD_EXPENSES/SETTLE
    const [isPaymentDueOpen, setIsPaymentDueOpen] = useState(false); // For the new payment dialog
    const [isSettleDueOpen, setIsSettleDueOpen] = useState(false); // For settlement corrections
    const [remainingDue, setRemainingDue] = useState(0); 

    // Expense Fields (for RECORD_EXPENSES modal)
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
        setIsPaymentDueOpen(false); 
        setIsDialogOpen(false);
    };

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            // NOTE: Assuming the backend correctly returns a list of assignments, 
            // where `collected_amount` is the total paid sum, and `paymentHistory` 
            // is an array of individual payments for the ledger view.
            const response = await fetch('/api/labour-assignments'); 
            if (!response.ok) throw new Error('Failed to fetch assignments');

            const data = await response.json();
            
            // Client-side mapping to ensure data integrity for calculations
            const mappedData: LabourAssignment[] = data.map((item: LabourAssignment) => ({
                ...item,
                paymentHistory: item.paymentHistory || [],
                collected_amount: Number(item.collected_amount || 0),
                total_amount: Number(item.total_amount || 0),
                station_expense: Number(item.station_expense || 0),
                bility_expense: Number(item.bility_expense || 0),
                station_labour: Number(item.station_labour || 0),
                cart_labour: Number(item.cart_labour || 0),
                total_expenses: Number(item.total_expenses || 0),
            }));
            
            setAssignments(mappedData);
        } catch (error: any) {
            console.error(error);
            toast.error({
                title: 'Error',
                description: error.message || 'Failed to load assignments.'
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Calculate sum of expenses entered by user (for RECORD_EXPENSES modal display)
    const totalEstimatedExpenses = useMemo(() => {
        return (parseFloat(stationExpense || '0') || 0) +
               (parseFloat(bilityExpense || '0') || 0) +
               (parseFloat(stationLabour || '0') || 0) +
               (parseFloat(cartLabour || '0') || 0);
    }, [stationExpense, bilityExpense, stationLabour, cartLabour]);
    
    // Total Receivable for the Shipment (Charges)
    const shipmentCharges = Number(selectedAssignment?.shipment.total_charges || 0);


    // --- API HANDLERS ---
    
    // Mocked function to fetch delivery expenses for auto-population (Requirement 3)
    const fetchDeliveryData = async (shipmentId: string): Promise<DeliveryData | null> => {
        // This is the implementation of the mock/placeholder function needed for Requirement 3
        try {
            // NOTE: Assuming this API route returns a single delivery object or an array of size 1
            const response = await fetch(`/api/deliveries/report?shipment_id=${shipmentId}`); 
            if (!response.ok) return null;
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                 return {
                    delivery_id: data[0].delivery_id,
                    station_expense: Number(data[0].station_expense || 0),
                    bility_expense: Number(data[0].bility_expense || 0),
                    station_labour: Number(data[0].station_labour || 0),
                    cart_labour: Number(data[0].cart_labour || 0),
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

    // Generic handler for DELIVER/RECORD_EXPENSES/SETTLE
    const handleAction = async (forcedId?: number, forcedAction?: 'DELIVER' | 'RECORD_EXPENSES' | 'SETTLE') => {
        const assignmentId = forcedId || selectedAssignment?.id;
        if (!assignmentId) return;

        // Map 'RECORD_EXPENSES' back to 'COLLECT' for the existing API endpoint for compatibility
        const currentAction = forcedAction === 'RECORD_EXPENSES' ? 'COLLECT' : (forcedAction || action); 

        try {
            const payload: any = {
                assignment_id: assignmentId,
                action: currentAction,
                notes: notes || undefined,
            };

            // Only send these fields if we are recording expenses
            if (currentAction === 'COLLECT') {
                
                // IMPORTANT: The existing API call expects collected_amount, 
                // but we disable it in the modal to enforce the new payment flow.
                // We send the existing total collected amount to prevent overwriting it on the backend.
                payload.collected_amount = selectedAssignment?.collected_amount || 0; 
                
                // Include expense fields for Delivery Record update and setting assignment to COLLECTED
                payload.station_expense = parseFloat(stationExpense || '0') || 0;
                payload.bility_expense = parseFloat(bilityExpense || '0') || 0;
                payload.station_labour = parseFloat(stationLabour || '0') || 0;
                payload.cart_labour = parseFloat(cartLabour || '0') || 0;

                // Simple validation check for expenses
                 if (selectedAssignment?.status === 'DELIVERED' && !payload.station_expense && !payload.bility_expense && !payload.station_labour && !payload.cart_labour) {
                     throw new Error('You must enter at least one expense amount to set the status to Collected/Record Expenses.');
                }
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
    
    // Handler for new payments (Requirement 1 & 2)
    const handleRecordPayment = async (assignmentId: number, amount: number, paymentNotes: string) => {
        
        // MOCK API ASSUMPTION: User must create a new API route at /api/labour-settlements
        // that logs the payment to LabourPaymentHistory and updates the collected_amount 
        // on the LabourAssignment model.
        try {
            const mockApiRoute = '/api/labour-settlements'; 

            // Sending new payment data to the hypothetical new endpoint
            const response = await fetch(mockApiRoute, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignment_id: assignmentId,
                    amount_paid: amount,
                    notes: paymentNotes
                }),
            });
            
            if (!response.ok) {
                // For a proper test, we simulate an error if the backend is not yet implemented
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to record payment. Please implement the POST /api/labour-settlements route to log payment to LabourPaymentHistory and update collected_amount.");
            }

            toast.success({
                title: 'Payment Recorded',
                description: `Payment of $${amount.toFixed(2)} recorded successfully.`
            });

            resetModalStates();
            fetchAssignments(); // Refetch to update the collected_amount/balance

        } catch (error: any) {
            toast.error({
                title: 'Payment Recording Failed',
                description: error.message
            });
            setIsLoading(false);
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
                    collected_amount: finalAmount, // Update the running total directly
                    // Pass existing expense fields to prevent overwriting old delivery expense records with zeros
                    station_expense: selectedAssignment?.station_expense || 0,
                    bility_expense: selectedAssignment?.bility_expense || 0,
                    station_labour: selectedAssignment?.station_labour || 0,
                    cart_labour: selectedAssignment?.cart_labour || 0,
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
        
        // This relies on the assignment having the latest, correct total_amount (total due) 
        // and collected_amount (total paid) from the backend fetch.
        const totalDue = Number(assignment.total_amount || 0);
        const collected = Number(assignment.collected_amount || 0);
        
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
    
    // --- UI Logic Functions ---
    const openActionDialog = async (assignment: LabourAssignment, actionType: 'DELIVER' | 'RECORD_EXPENSES' | 'SETTLE') => {
        resetModalStates();

        setSelectedAssignment(assignment);
        setAction(actionType);
        
        if (actionType === 'RECORD_EXPENSES') {
             // --- Requirement 3: Auto-populate Delivery Expenses ---
            const deliveryData = await fetchDeliveryData(assignment.shipment_id);
            if (deliveryData) {
                // Auto-populate with data from the Delivery table
                setStationExpense(deliveryData.station_expense.toFixed(2));
                setBilityExpense(deliveryData.bility_expense.toFixed(2));
                setStationLabour(deliveryData.station_labour.toFixed(2));
                setCartLabour(deliveryData.cart_labour.toFixed(2));
            } else {
                 // Fallback to pre-fill existing assignment values for re-entry/correction
                setStationExpense(assignment.station_expense.toFixed(2));
                setBilityExpense(assignment.bility_expense.toFixed(2));
                setStationLabour(assignment.station_labour.toFixed(2));
                setCartLabour(assignment.cart_labour.toFixed(2));
                toast.error({ title: "Data Warning", description: "Could not fetch fresh delivery expense data. Using saved values." });
            }
            // Set the collected amount to the existing total (to be sent in payload if user changes it)
            setCollectedAmount(assignment.collected_amount.toFixed(2));
        }
        
        setNotes(assignment.notes || '');

        setIsDialogOpen(true);
    };

    const openPaymentDialog = (assignment: LabourAssignment) => {
         resetModalStates();
         setSelectedAssignment(assignment);
         setIsPaymentDueOpen(true);
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success'> = {
            ASSIGNED: 'secondary',
            DELIVERED: 'default',
            COLLECTED: 'outline',
            SETTLED: 'success' as 'default', 
            CANCELLED: 'destructive',
        };
        return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
    };

    const canDeliver = (assignment: LabourAssignment) => assignment.status === 'ASSIGNED';
    // User can record expenses (COLLECT status) or payments once delivered
    const canRecordExpenses = (assignment: LabourAssignment) => assignment.status === 'DELIVERED';
    const canRecordPayment = (assignment: LabourAssignment) => assignment.status === 'COLLECTED' || assignment.status === 'DELIVERED';
    const canSettle = (assignment: LabourAssignment) => assignment.status === 'COLLECTED';
    
    const formatCurrencyDisplay = (amount: string | number) => {
        const num = parseFloat(amount.toString()) || 0;
        return num.toFixed(2);
    };


    if (isLoading) {
        return (
            <div className='p-6 max-w-full mx-auto bg-gray-50 min-h-screen'>
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
                                        <TableHead className='text-right'>Total Due</TableHead>
                                        <TableHead className='text-right'>Total Exp</TableHead>
                                        <TableHead className='text-right'>Paid</TableHead>
                                        <TableHead className='text-right font-bold'>Balance Due</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assignments.map((assignment) => {
                                        
                                        const totalDue = Number(assignment.total_amount || 0); // Total collectible
                                        const totalPaid = Number(assignment.collected_amount || 0); // Total collected/paid
                                        const totalExpenses = Number(assignment.total_expenses || 0);
                                        const balanceDue = totalDue - totalPaid;
                                        const isOverpaid = balanceDue < -0.01; // With a small tolerance
                                        const isDue = balanceDue > 0.01;

                                        return (
                                            <TableRow key={assignment.id}>
                                                <TableCell className='font-medium'>{assignment.labourPerson.name}</TableCell>
                                                <TableCell>{assignment.shipment.bility_number}</TableCell>
                                                
                                                {/* Total Amount Due (Charges + Expenses) */}
                                                <TableCell className='font-extrabold text-right text-blue-900'>
                                                    ${totalDue.toFixed(2)}
                                                </TableCell>
                                                
                                                {/* Total Expenses */}
                                                <TableCell className='font-medium text-right text-red-600'>
                                                    ${formatCurrencyDisplay(totalExpenses)}
                                                </TableCell>

                                                {/* Collected Amount (Total Paid) */}
                                                <TableCell className={`font-medium text-right ${totalPaid > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                    ${totalPaid.toFixed(2)}
                                                </TableCell>
                                                
                                                {/* Balance Due (New Calculation) */}
                                                <TableCell className={`font-extrabold text-right ${isOverpaid ? 'text-green-700' : isDue ? 'text-red-700' : 'text-gray-900'}`}>
                                                    ${Math.abs(balanceDue).toFixed(2)}
                                                </TableCell>

                                                <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                                                <TableCell>
                                                    <div className='flex gap-2'>
                                                        {canDeliver(assignment) && (
                                                            <Button size='sm' variant='outline' onClick={() => openActionDialog(assignment, 'DELIVER')}>Deliver</Button>
                                                        )}
                                                        {canRecordExpenses(assignment) && (
                                                            <Button size='sm' variant='default' className='bg-orange-600 hover:bg-orange-700' onClick={() => openActionDialog(assignment, 'RECORD_EXPENSES')}>Record Expenses</Button>
                                                        )}
                                                         {/* New Button for Payment */}
                                                        {canRecordPayment(assignment) && isDue && (
                                                            <Button size='sm' variant='default' className='bg-indigo-600 hover:bg-indigo-700' onClick={() => openPaymentDialog(assignment)}>Record Payment</Button>
                                                        )}
                                                        {canSettle(assignment) && !isDue && (
                                                            <Button size='sm' variant='default' className='bg-green-600 hover:bg-green-700' onClick={() => handleSettle(assignment)}>Settle</Button>
                                                        )}
                                                        {canSettle(assignment) && isDue && (
                                                             <Button size='sm' variant='secondary' onClick={() => openPaymentDialog(assignment)}>Finish Payment</Button>
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

            {/* --- Main Action Dialog (DELIVER/RECORD_EXPENSES/SETTLE) --- */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className='sm:max-w-[450px]'>
                    <DialogHeader>
                        <DialogTitle>
                            {action === 'DELIVER' && 'Mark as Delivered'}
                            {action === 'RECORD_EXPENSES' && 'Record Expenses'}
                            {action === 'SETTLE' && 'Settle Assignment'}
                        </DialogTitle>
                        <DialogDescription>
                            {action === 'DELIVER' && 'Confirm that the shipment has been physically delivered by the labour person.'}
                            {action === 'RECORD_EXPENSES' && `Record the final delivery expenses for Shipment #${selectedAssignment?.shipment.bility_number} (Auto-populated).`}
                            {action === 'SETTLE' && 'Finalize the transaction and clear the labour person\'s account.'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* === RECORD_EXPENSES FIELDS (AUTO-POPULATED) === */}
                    {action === 'RECORD_EXPENSES' && (
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
                            
                            {/* Current Paid Amount Display - Disabled for consistency with payment flow */}
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='collectedAmount' className='text-right'>
                                    Current Total Paid
                                </Label>
                                <Input
                                    id='collectedAmount'
                                    type='text'
                                    value={selectedAssignment?.collected_amount.toFixed(2)}
                                    disabled
                                    className='col-span-3 font-extrabold text-green-700 border-green-300'
                                />
                            </div>

                            {/* Expense Fields - Auto-populated from Delivery data (Requirement 3) */}
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
                    {/* === END RECORD_EXPENSES FIELDS === */}


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
                            disabled={action === 'RECORD_EXPENSES' && (!Number(stationExpense) && !Number(bilityExpense) && !Number(stationLabour) && !Number(cartLabour))}
                        >
                            {action === 'DELIVER' && 'Mark Delivered'}
                            {action === 'RECORD_EXPENSES' && 'Save Expenses'}
                            {action === 'SETTLE' && 'Settle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* --- Remaining Due Dialog (Settlement Correction) --- */}
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
            
            {/* --- Record Payment Dialog (New for Requirement 1 & 2) --- */}
            <Dialog open={isPaymentDueOpen} onOpenChange={setIsPaymentDueOpen}>
                 {isPaymentDueOpen && selectedAssignment && (
                    <RecordPaymentDialog
                        assignment={selectedAssignment} 
                        onRecordPaymentConfirmed={handleRecordPayment}
                        onClose={resetModalStates}
                    />
                 )}
            </Dialog>

        </div>
    );
}