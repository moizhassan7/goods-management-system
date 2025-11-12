// src/app/vehicles/ledgers/page.tsx

'use client';
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; 
import { Badge } from '@/components/ui/badge'; // ADDED

interface Vehicle {
  id: number;
  vehicleNumber: string;
}

// NEW: Simplified summary interface
interface VehiclePaymentSummary {
  vehicle: Vehicle;
  fareStatus: 'PAID' | 'UNPAID' | 'N/A';
  amountDue: number; 
  lastTripDate: string | null;
}

export default function VehicleLedgers() {
    const [ledgers, setLedgers] = useState<VehiclePaymentSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLedgers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetching from the updated API
            const response = await fetch('/api/vehicles/ledgers'); 
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: VehiclePaymentSummary[] = await response.json();
            setLedgers(data);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to fetch vehicle ledgers.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLedgers();
    }, []);

    // Filter ledgers based on the simplified status
    const unpaidLedgers = ledgers.filter(l => l.fareStatus === 'UNPAID');
    const paidLedgers = ledgers.filter(l => l.fareStatus === 'PAID');
    const naLedgers = ledgers.filter(l => l.fareStatus === 'N/A');

    const renderFareStatusBadge = (status: 'PAID' | 'UNPAID' | 'N/A') => {
        switch (status) {
            case 'PAID':
                return <Badge className="bg-green-600 hover:bg-green-700">PAID</Badge>;
            case 'UNPAID':
                return <Badge className="bg-red-600 hover:bg-red-700">UNPAID</Badge>;
            case 'N/A':
            default:
                return <Badge variant="secondary">N/A</Badge>;
        }
    };

    const renderLedgerTable = (data: VehiclePaymentSummary[]) => {
        if (data.length === 0) {
            return <p className="text-gray-500 italic p-6">No records found for this status.</p>;
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="py-2 px-4 border-b text-left">Vehicle Number</th>
                            <th className="py-2 px-4 border-b text-center">Payment Status</th>
                            <th className="py-2 px-4 border-b text-right">Amount Due / Paid</th>
                            <th className="py-2 px-4 border-b text-center">Last Trip Date</th>
                            <th className="py-2 px-4 border-b text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((ledger) => (
                            <tr key={ledger.vehicle.id} className="hover:bg-gray-50">
                                <td className="py-2 px-4 border-b font-medium">
                                    {ledger.vehicle.vehicleNumber}
                                </td>
                                <td className="py-2 px-4 border-b text-center">
                                    {renderFareStatusBadge(ledger.fareStatus)}
                                </td>
                                <td className={`py-2 px-4 border-b text-right font-semibold ${
                                    ledger.fareStatus === 'PAID' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {/* Display the amount associated with the last trip */}
                                    {ledger.amountDue.toFixed(2)}
                                </td>
                                <td className="py-2 px-4 border-b text-center text-gray-500">
                                    {ledger.lastTripDate || 'No Trip Recorded'}
                                </td>
                                <td className="py-2 px-4 border-b text-center">
                                    <a
                                        href={`/vehicles/financials/${ledger.vehicle.id}`}
                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background h-8 px-3 text-blue-600 border border-blue-200 hover:bg-blue-50"
                                    >
                                        View Details
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    if (isLoading) {
        return <div className="p-6">Loading vehicle payment summary...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-500">Error: {error}</div>;
    }

    // Combine N/A vehicles into the Paid tab for simplicity, or keep a third tab
    // Let's keep two main tabs (UNPAID/PAID) and group N/A into PAID as they are not *currently* due.
    const settledLedgers = [...paidLedgers, ...naLedgers]; 

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Vehicle Payment Status</h1>

            <Tabs defaultValue="unpaid">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="unpaid">
                        Unpaid Fares ({unpaidLedgers.length})
                    </TabsTrigger>
                    <TabsTrigger value="paid">
                        Paid Fares({settledLedgers.length})
                    </TabsTrigger>
                </TabsList>
                
                {/* Unpaid Tab Content */}
                <TabsContent value="unpaid" className="mt-4 border rounded-lg shadow-md">
                    {renderLedgerTable(unpaidLedgers)}
                </TabsContent>
                
                {/* Paid Tab Content (Includes N/A for vehicles with no trips) */}
                <TabsContent value="paid" className="mt-4 border rounded-lg shadow-md">
                    {renderLedgerTable(settledLedgers)}
                </TabsContent>
            </Tabs>
        </div>
    );
}