// Vehicle Financial Ledger Page
'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

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
}

export default function VehicleFinancials() {
    const params = useParams();
    const vehicleId = params.id as string;
    const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLedger = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/vehicles/${vehicleId}/financials`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data: LedgerData = await response.json();
                setLedgerData(data);
            } catch (err) {
                console.error('Fetch error:', err);
                setError('Failed to fetch vehicle financial ledger.');
            } finally {
                setIsLoading(false);
            }
        };

        if (vehicleId) {
            fetchLedger();
        }
    }, [vehicleId]);

    if (isLoading) {
        return <div className="p-6">Loading financial ledger...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-500">Error: {error}</div>;
    }

    if (!ledgerData) {
        return <div className="p-6">No data available.</div>;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">
                Financial Ledger for Vehicle: {ledgerData.vehicle.vehicleNumber}
            </h1>

            {ledgerData.ledger.length === 0 ? (
                <p className="text-gray-500 italic">No transactions found for this vehicle.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="py-2 px-4 border-b text-left">Date</th>
                                <th className="py-2 px-4 border-b text-left">Description</th>
                                <th className="py-2 px-4 border-b text-right">Credit</th>
                                <th className="py-2 px-4 border-b text-right">Debit</th>
                                <th className="py-2 px-4 border-b text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledgerData.ledger.map((transaction) => (
                                <tr key={transaction.id} className="hover:bg-gray-50">
                                    <td className="py-2 px-4 border-b">
                                        {new Date(transaction.transaction_date).toLocaleDateString()}
                                    </td>
                                    <td className="py-2 px-4 border-b">
                                        {transaction.description || 'N/A'}
                                    </td>
                                    <td className="py-2 px-4 border-b text-right">
                                        {transaction.credit_amount > 0 ? transaction.credit_amount.toFixed(2) : '-'}
                                    </td>
                                    <td className="py-2 px-4 border-b text-right">
                                        {transaction.debit_amount > 0 ? transaction.debit_amount.toFixed(2) : '-'}
                                    </td>
                                    <td className="py-2 px-4 border-b text-right font-semibold">
                                        {transaction.balance.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
