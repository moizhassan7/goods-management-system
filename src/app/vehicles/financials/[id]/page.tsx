// src/app/vehicles/financials/[id]/page.tsx

'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button'; 
import { Input } from '@/components/ui/input'; 
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge'; 
import { Loader2 } from 'lucide-react'; 
import { toast as sonnerToast } from 'sonner'; 
import { useParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Used for description
import { cn } from '@/lib/utils';


// --- Data Interfaces ---

interface VehicleTransaction {
  id: number;
  transaction_date: string;
  credit_amount: number;
  debit_amount: number;
  description: string | null;
  balance: number;
}

interface Vehicle {
  id: number;
  vehicleNumber: string;
}

interface LedgerData {
  vehicle: Vehicle;
  ledger: VehicleTransaction[];
  summary: {
      currentBalance: number;
      farePaymentStatus: 'PAID' | 'UNPAID' | 'N/A';
      tripToSettleId: number | null;
  }
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 2,
    }).format(amount);
};


export default function VehicleFinancialsPage() {
  
    const params = useParams();
    const id = params.id as string;
    const vehicleId = parseInt(id, 10);
    
    const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // State for the payment form (Amount Paid)
    const [amountPaid, setAmountPaid] = useState<number | ''>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentDescription, setPaymentDescription] = useState('');


    const fetchLedger = async () => {
        setIsLoading(true);
        setError(null);
        
        if (isNaN(vehicleId)) {
            setError('Vehicle ID is missing.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`/api/vehicles/${vehicleId}/financials`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: LedgerData = await response.json();
            
            setLedgerData(data);
            
            // Auto-populate with the negative balance (amount owed)
            if (data.summary.currentBalance < 0) {
                setAmountPaid(Math.abs(data.summary.currentBalance));
            } else {
                setAmountPaid('');
            }
            setPaymentDescription('');
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to fetch vehicle financial ledger.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isNaN(vehicleId)) {
            fetchLedger();
        }
    }, [vehicleId]);


    // MODIFIED: This function now handles *any* payment (partial or full) 
    // by recording a generic CREDIT transaction, without touching the trip status.
    const handlePayAmount = async () => {
        if (!ledgerData) return;

        const amount = Number(amountPaid);
        
        if (isNaN(amount) || amount <= 0) {
            sonnerToast.error('Validation Error', { description: 'Please enter a valid amount greater than zero.' });
            return;
        }
        if (!paymentDescription.trim()) {
            sonnerToast.error('Validation Error', { description: 'Please enter a description for the payment.' });
            return;
        }

        setIsProcessing(true);
        try {
            // Hitting the generic transaction API to record a CREDIT
            const response = await fetch(`/api/vehicles/${vehicleId}/transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amount,
                    description: paymentDescription.trim(),
                    type: 'CREDIT', // Always a credit (payment from company to vehicle)
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to record payment.');
            }

            sonnerToast.success('Payment Recorded', { description: `Payment of ${formatCurrency(amount)} recorded successfully.` });
            
            // Re-fetch the ledger to show updated balance
            await fetchLedger();
            setAmountPaid('');
            setPaymentDescription('');

        } catch (error: any) {
            console.error('Payment Error:', error);
            sonnerToast.error('Payment Failed', { description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };


    if (isLoading) {
        return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin mr-2 inline" /> Loading financial ledger...</div>;
    }

    if (error || !ledgerData) {
        return <div className="p-6 text-red-500">Error: {error || 'No data available.'}</div>;
    }

    const { summary, ledger, vehicle } = ledgerData;
    const amountOwed = summary.currentBalance < 0 ? Math.abs(summary.currentBalance) : 0;
    const balanceColor = summary.currentBalance >= 0 ? 'text-green-600' : 'text-red-600';

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">
                Financial Ledger for Vehicle: {vehicle.vehicleNumber}
            </h1>
            
            {/* Summary Card and Payment Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <Card className="lg:col-span-1 border-blue-300 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="text-xl text-blue-800">Financial Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-medium text-gray-700">Payment Status:</span>
                            {summary.farePaymentStatus === 'UNPAID' ? (
                                <Badge className="bg-red-600 hover:bg-red-700 text-lg">FARE UNPAID</Badge>
                            ) : (
                                <Badge className="bg-green-600 hover:bg-green-700 text-lg">FARE PAID</Badge>
                            )}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                            <span className="text-lg font-medium text-gray-700">Current Balance:</span>
                            <span className={`text-2xl font-extrabold ${balanceColor}`}>
                                {formatCurrency(summary.currentBalance)}
                            </span>
                        </div>
                        {amountOwed > 0 && (
                             <p className="text-sm text-red-700 pt-1">
                                (Total negative balance: {formatCurrency(amountOwed)})
                             </p>
                        )}
                    </CardContent>
                </Card>

                {/* MODIFIED: Generic Payment/Credit Form */}
                <Card className={cn(
                    "lg:col-span-2 border-green-300 bg-green-50"
                )}>
                    <CardHeader>
                        <CardTitle className="text-xl text-green-800">Record Payment to Vehicle (Credit)</CardTitle>
                        <CardDescription>Use this to pay the vehicle owner or driver, reducing the negative balance.</CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor="totalOwed">Total Outstanding Owed</Label>
                            <Input
                                id="totalOwed"
                                type="text"
                                readOnly
                                value={formatCurrency(amountOwed)}
                                className="text-xl font-bold text-red-800 bg-white border-red-500"
                            />
                        </div>
                        
                        <div className='space-y-2'>
                            <Label htmlFor="amountPaid">Amount Paid Now</Label>
                            <Input
                                id="amountPaid"
                                type="number"
                                step="0.01"
                                value={amountPaid}
                                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || '')}
                                placeholder={amountOwed > 0 ? String(amountOwed.toFixed(2)) : '0.00'}
                                className="text-xl font-bold text-green-800 border-green-500"
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor="paymentDescription">Description for Payment</Label>
                            <Textarea 
                                id="paymentDescription"
                                value={paymentDescription}
                                onChange={(e) => setPaymentDescription(e.target.value)}
                                placeholder="e.g., Partial payment for Trip ID #5 / Cash advance for fuel."
                                rows={2}
                            />
                        </div>

                        <Button 
                            onClick={handlePayAmount}
                            disabled={isProcessing || Number(amountPaid) <= 0 || !paymentDescription.trim()}
                            className="w-full bg-green-700 hover:bg-green-800 py-3"
                        >
                            {isProcessing ? (
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            ) : (
                                'Record Payment (Credit)'
                            )}
                        </Button>
                        
                    </CardContent>
                </Card>
            </div>

            {/* Transaction History Table */}
            <div>
                <h2 className="text-xl font-bold mb-4 mt-6">Transaction History</h2>
                {ledger.length === 0 ? (
                    <p className="text-gray-500 italic">No transactions found for this vehicle.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="py-2 px-4 border-b text-left">Date</th>
                                    <th className="py-2 px-4 border-b text-left">Description</th>
                                    <th className="py-2 px-4 border-b text-right">Credit (Paid to Vehicle)</th>
                                    <th className="py-2 px-4 border-b text-right">Debit (Received from Trip)</th>
                                    <th className="py-2 px-4 border-b text-right">Running Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.map((transaction) => (
                                    <TableRow key={transaction.id} className="hover:bg-gray-50">
                                        <TableCell className="py-2 px-4 border-b">
                                            {new Date(transaction.transaction_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="py-2 px-4 border-b">
                                            {transaction.description || 'N/A'}
                                        </TableCell>
                                        <TableCell className="py-2 px-4 border-b text-right text-green-600">
                                            {transaction.credit_amount > 0 ? transaction.credit_amount.toFixed(2) : '-'}
                                        </TableCell>
                                        <TableCell className="py-2 px-4 border-b text-right text-red-600">
                                            {transaction.debit_amount > 0 ? transaction.debit_amount.toFixed(2) : '-'}
                                        </TableCell>
                                        <TableCell className={`py-2 px-4 border-b text-right font-semibold ${
                                            transaction.balance >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {transaction.balance.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}