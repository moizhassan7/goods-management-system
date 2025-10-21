// src/app/deliveries/expense-report/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Truck, FileText } from 'lucide-react';
import { Loader2 } from 'lucide-react';

// --- Interfaces ---
interface DeliveryExpenseDetail {
    id: number;
    type: 'DELIVERY_EXPENSE' | 'TRIP_EXPENSE';
    date: string;
    bility_number: string;
    station_expense: number;
    bility_expense: number;
    station_labour: number;
    cart_labour: number;
    total_expense: number;
    // Trip specific fields
    delivery_cut?: number;
    vehicle_number?: string;
    driver_name?: string;
}

interface ExpenseSummary {
    totalDeliveryExpenses: number;
    totalBilityExpenses: number;
    totalStationExpenses: number;
    totalStationLabour: number;
    totalCartLabour: number;
    totalDeliveryCut: number;
    grandTotalExpenses: number;
}

interface ReportData {
    details: DeliveryExpenseDetail[];
    summary: ExpenseSummary;
}

// --- Utility ---
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 2,
    }).format(amount);
};

const today = new Date().toISOString().substring(0, 10);

// --- Component ---
export default function CombinedExpensesReportPage() {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>(today);
    const [loading, setLoading] = useState<boolean>(false);

    async function fetchReport() {
        setLoading(true);
        setReportData(null);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const res = await fetch(`/api/reports/combined-expenses?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch combined expenses report.');
            
            const data: ReportData = await res.json();
            setReportData(data);
        } catch (e) {
            console.error('Failed to fetch report', e);
            // In a real app, you would use a toast here
        } finally {
            setLoading(false);
        }
    }

    // Load a default report on mount (e.g., last 30 days)
    useEffect(() => {
        const defaultStart = new Date();
        defaultStart.setDate(defaultStart.getDate() - 30);
        setStartDate(defaultStart.toISOString().split('T')[0]);
        
        // Use a slight delay to ensure state update is processed before initial fetch
        const timer = setTimeout(() => fetchReport(), 50);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    return (
        <div className='p-6 max-w-7xl mx-auto'>
            <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>Combined Expenses Report</h2>

            {/* Filter Card */}
            <Card className='shadow-lg mb-8'>
                <CardHeader>
                    <CardTitle className='text-xl text-blue-800'>Report Filters (By Date)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                        <div>
                            <div className='grid gap-2'>
                                <Label>Start Date</Label>
                                <Input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <div className='grid gap-2'>
                                <Label>End Date</Label>
                                <Input type='date' value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                        </div>
                        <div className='flex items-end'>
                            <Button className='w-full' onClick={fetchReport} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Load Report'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading && !reportData && (
                 <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                    <p className="text-gray-600 mt-3">Loading report data...</p>
                </div>
            )}

            {!loading && reportData && (
                <div className='space-y-8'>
                    {/* Summary Card */}
                    <Card className='bg-indigo-50 border-indigo-200 shadow-xl'>
                        <CardHeader>
                            <CardTitle className='text-xl text-indigo-800'>Total Expenses Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
                                <div className="col-span-2 md:col-span-3 lg:col-span-2">
                                    <div className='text-gray-600 font-medium'>Total Expenses (All Types)</div>
                                    <div className='font-extrabold text-3xl text-indigo-900'>{formatCurrency(reportData.summary.grandTotalExpenses)}</div>
                                </div>
                                <div className='border-l pl-4'>
                                    <div className='text-gray-600'>Delivery Expenses (Itemized)</div>
                                    <div className='font-bold text-lg text-red-700'>{formatCurrency(reportData.summary.totalDeliveryExpenses)}</div>
                                </div>
                                <div className='border-l pl-4'>
                                    <div className='text-gray-600'>Delivery Cut (from Trips)</div>
                                    <div className='font-bold text-lg text-purple-700'>{formatCurrency(reportData.summary.totalDeliveryCut)}</div>
                                </div>
                                <div className='border-l pl-4'>
                                    <div className='text-gray-600'>Bility Expenses</div>
                                    <div className='font-bold text-lg'>{formatCurrency(reportData.summary.totalBilityExpenses)}</div>
                                </div>
                                <div className='border-l pl-4'>
                                    <div className='text-gray-600'>Station Labour</div>
                                    <div className='font-bold text-lg'>{formatCurrency(reportData.summary.totalStationLabour)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed List */}
                    <Card className='shadow-lg'>
                        <CardHeader>
                            <CardTitle className='text-xl text-gray-800'>Detailed Expense Records ({reportData.details.length})</CardTitle>
                        </CardHeader>
                        <CardContent className='p-0'>
                            <div className='overflow-x-auto'>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className='w-[100px]'>Type</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Reference</TableHead>
                                            <TableHead className='text-right'>Total Expense</TableHead>
                                            <TableHead className='text-right'>Station Exp</TableHead>
                                            <TableHead className='text-right'>Bility Exp</TableHead>
                                            <TableHead className='text-right'>Station Labour</TableHead>
                                            <TableHead className='text-right'>Delivery Cut</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.details.map((item) => (
                                            <TableRow key={item.type === 'DELIVERY_EXPENSE' ? `D-${item.id}` : `T-${item.id}`} className={item.type === 'TRIP_EXPENSE' ? 'bg-purple-50/50 hover:bg-purple-100' : 'hover:bg-gray-50'}>
                                                <TableCell>
                                                    {item.type === 'DELIVERY_EXPENSE' ? 
                                                        <FileText className='h-4 w-4 inline mr-2 text-red-500'/> : 
                                                        <Truck className='h-4 w-4 inline mr-2 text-purple-500'/>
                                                    }
                                                    {item.type === 'DELIVERY_EXPENSE' ? 'Delivery' : 'Trip'}
                                                </TableCell>
                                                <TableCell>{item.date}</TableCell>
                                                <TableCell className='font-medium'>
                                                    {item.type === 'DELIVERY_EXPENSE' ? item.bility_number : `${item.vehicle_number} (${item.driver_name})`}
                                                </TableCell>
                                                <TableCell className='text-right font-bold text-red-700'>{formatCurrency(item.total_expense)}</TableCell>
                                                <TableCell className='text-right'>{item.type === 'DELIVERY_EXPENSE' ? formatCurrency(item.station_expense) : '-'}</TableCell>
                                                <TableCell className='text-right'>{item.type === 'DELIVERY_EXPENSE' ? formatCurrency(item.bility_expense) : '-'}</TableCell>
                                                <TableCell className='text-right'>{item.type === 'DELIVERY_EXPENSE' ? formatCurrency(item.station_labour) : '-'}</TableCell>
                                                <TableCell className='text-right font-semibold text-purple-600'>{item.type === 'TRIP_EXPENSE' ? formatCurrency(item.delivery_cut || 0) : '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {!loading && !reportData?.details.length && (
                 <div className='p-4 text-gray-600'>No expenses found for the selected criteria.</div>
            )}
        </div>
    );
}