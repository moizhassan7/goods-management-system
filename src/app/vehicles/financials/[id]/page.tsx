// src/app/vehicles/financials/[id]/page.tsx

'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button'; 
import { Input } from '@/components/ui/input'; 
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge'; 
import { Loader2 } from 'lucide-react'; 
import { toast as sonnerToast } from 'sonner'; 


// --- Data Interfaces (Updated) ---

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
  // NEW: Summary block from the API
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


// MODIFIED: Component is now async to properly handle Next.js App Router dynamic props
export default function VehicleFinancialsPage(context: { params: { id: string } }) {
  
    const { id } = context.params; // ✅ await params
    const vehicleId = parseInt(id, 10);
    const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // NEW State for the payment form
    const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
    const [isSettling, setIsSettling] = useState(false);

    const fetchLedger = async () => {
        setIsLoading(true);
        setError(null);
        
        if (!vehicleId) {
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
            
            // Auto-populate the payment amount if unpaid
            if (data.summary.farePaymentStatus === 'UNPAID') {
                // Use the absolute value of the current balance
                setPaymentAmount(Math.abs(data.summary.currentBalance));
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to fetch vehicle financial ledger.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (vehicleId) {
            fetchLedger();
        }
    }, [vehicleId]);


    const handleSettleFare = async () => {
        if (!ledgerData || ledgerData.summary.farePaymentStatus !== 'UNPAID' || ledgerData.summary.tripToSettleId === null) {
            sonnerToast.error('Settlement Error', { description: 'No outstanding fare found or trip ID is missing.' });
            return;
        }

        const amount = Number(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            sonnerToast.error('Validation Error', { description: 'Please enter a valid amount greater than zero.' });
            return;
        }

        setIsSettling(true);
        try {
            // New dedicated endpoint to handle the settlement logic
            const response = await fetch(`/api/vehicles/${vehicleId}/settle-fare`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentAmount: amount,
                    tripId: ledgerData.summary.tripToSettleId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to record settlement.');
            }

            sonnerToast.success('Fare Settled', { description: `Payment of ${formatCurrency(amount)} recorded successfully.` });
            
            // Re-fetch the ledger to show updated balance/status
            await fetchLedger();
            setPaymentAmount(''); // Clear the payment field

        } catch (error: any) {
            console.error('Settlement Error:', error);
            sonnerToast.error('Settlement Failed', { description: error.message });
        } finally {
            setIsSettling(false);
        }
    };


    if (isLoading) {
        return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin mr-2 inline" /> Loading financial ledger...</div>;
    }

    if (error || !ledgerData) {
        return <div className="p-6 text-red-500">Error: {error || 'No data available.'}</div>;
    }

    const { summary, ledger, vehicle } = ledgerData;
    const isUnpaid = summary.farePaymentStatus === 'UNPAID';
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
                            {isUnpaid ? (
                                <Badge className="bg-red-600 hover:bg-red-700 text-lg">UNPAID</Badge>
                            ) : (
                                <Badge className="bg-green-600 hover:bg-green-700 text-lg">PAID</Badge>
                            )}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                            <span className="text-lg font-medium text-gray-700">Current Balance:</span>
                            <span className={`text-2xl font-extrabold ${balanceColor}`}>
                                {formatCurrency(summary.currentBalance)}
                            </span>
                        </div>
                        {isUnpaid && (
                             <p className="text-sm text-red-700 pt-1">
                                (A negative balance indicates the amount owed by the company for the trip fare.)
                             </p>
                        )}
                    </CardContent>
                </Card>

                {/* Settle Fare Form (Conditional) */}
                {isUnpaid && (
                    <Card className="lg:col-span-2 border-red-300 bg-red-50">
                        <CardHeader>
                            <CardTitle className="text-xl text-red-800">Settle Outstanding Fare</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-4">
                                <div className="flex-1 space-y-2">
                                    <label htmlFor="paymentAmount" className="font-medium text-gray-700">Amount to Mark as Paid (Owed: {formatCurrency(Math.abs(summary.currentBalance))})</label>
                                    <Input
                                        id="paymentAmount"
                                        type="number"
                                        step="0.01"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || '')}
                                        placeholder={String(Math.abs(summary.currentBalance).toFixed(2))}
                                        className="text-xl font-bold text-red-800 border-red-500"
                                    />
                                </div>
                                <Button 
                                    onClick={handleSettleFare}
                                    disabled={isSettling || Number(paymentAmount) <= 0}
                                    className="bg-green-700 hover:bg-green-800 py-3"
                                >
                                    {isSettling ? (
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    ) : (
                                        'Mark Trip Fare as Paid (Credit)'
                                    )}
                                </Button>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                                This action will add a **Credit** transaction to the ledger, marking the trip fare as paid.
                            </p>
                        </CardContent>
                    </Card>
                )}
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
                                    <tr key={transaction.id} className="hover:bg-gray-50">
                                        <td className="py-2 px-4 border-b">
                                            {new Date(transaction.transaction_date).toLocaleDateString()}
                                        </td>
                                        <td className="py-2 px-4 border-b">
                                            {transaction.description || 'N/A'}
                                        </td>
                                        <td className="py-2 px-4 border-b text-right text-green-600">
                                            {transaction.credit_amount > 0 ? transaction.credit_amount.toFixed(2) : '-'}
                                        </td>
                                        <td className="py-2 px-4 border-b text-right text-red-600">
                                            {transaction.debit_amount > 0 ? transaction.debit_amount.toFixed(2) : '-'}
                                        </td>
                                        <td className={`py-2 px-4 border-b text-right font-semibold ${
                                            transaction.balance >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {transaction.balance.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}