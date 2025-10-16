// Vehicle Ledgers Overview Page
'use client';
import React, { useState, useEffect } from 'react';

interface Vehicle {
  id: number;
  vehicleNumber: string;
}

interface VehicleLedgerSummary {
  vehicle: Vehicle;
  totalCredits: number;
  totalDebits: number;
  balance: number;
  transactionCount: number;
}

export default function VehicleLedgers() {
    const [ledgers, setLedgers] = useState<VehicleLedgerSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLedgers = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/vehicles/ledgers');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data: VehicleLedgerSummary[] = await response.json();
                setLedgers(data);
            } catch (err) {
                console.error('Fetch error:', err);
                setError('Failed to fetch vehicle ledgers.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLedgers();
    }, []);

    if (isLoading) {
        return <div className="p-6">Loading vehicle ledgers...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Vehicle Financial Ledgers</h1>

            {ledgers.length === 0 ? (
                <p className="text-gray-500 italic">No vehicles with ledger data found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="py-2 px-4 border-b text-left">Vehicle Number</th>
                                <th className="py-2 px-4 border-b text-right">Total Credits</th>
                                <th className="py-2 px-4 border-b text-right">Total Debits</th>
                                <th className="py-2 px-4 border-b text-right">Balance</th>
                                <th className="py-2 px-4 border-b text-center">Transactions</th>
                                <th className="py-2 px-4 border-b text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledgers.map((ledger) => (
                                <tr key={ledger.vehicle.id} className="hover:bg-gray-50">
                                    <td className="py-2 px-4 border-b font-medium">
                                        {ledger.vehicle.vehicleNumber}
                                    </td>
                                    <td className="py-2 px-4 border-b text-right text-green-600">
                                        {ledger.totalCredits.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-4 border-b text-right text-red-600">
                                        {ledger.totalDebits.toFixed(2)}
                                    </td>
                                    <td className={`py-2 px-4 border-b text-right font-semibold ${
                                        ledger.balance >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {ledger.balance.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-4 border-b text-center">
                                        {ledger.transactionCount}
                                    </td>
                                    <td className="py-2 px-4 border-b text-center">
                                        <a
                                            href={`/vehicles/financials/${ledger.vehicle.id}`}
                                            className="text-blue-500 hover:text-blue-700 underline"
                                        >
                                            View Details
                                        </a>
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
