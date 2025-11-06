// src/app/shipments/view/page.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, RefreshCw } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

// Re-implement a local useToast based on sonner, assuming the component/hook is in use
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


interface ShipmentData {
    register_number: string;
    bility_number: string;
    bility_date: string; // Already mapped to YYYY-MM-DD in API
    total_charges: number;
    // --- ADDED FIELDS ---
    total_delivery_charges: number; // Added for the new column
    createdAt: string; // Assumed creation timestamp from API for "Current Date"
    // --------------------
    delivery_date: string | null; // Already mapped to YYYY-MM-DD or null in API
    departureCity: { name: string };
    toCity: { name: string } | null;
    sender: { name: string };
    receiver: { name: string };
    vehicle: { vehicleNumber: string };
    walk_in_receiver_name: string | null;
    payment_status?: string | null; // NEW: Payment status field
}

// NEW: Interface for filter data (Vehicles)
interface Vehicle {
    id: number;
    vehicleNumber: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 2,
    }).format(amount);
};

// Helper to get start and end date for the current month
const getCurrentMonthDateRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Format to YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    return {
        startDate: formatDate(startOfMonth),
        endDate: formatDate(endOfMonth),
    };
};

export default function ViewShipments() {
    const { toast } = useToast();
    const [shipments, setShipments] = useState<ShipmentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filter States
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [vehicleId, setVehicleId] = useState<number | 'all'>('all');
    const [startDate, setStartDate] = useState<string>(getCurrentMonthDateRange().startDate);
    const [endDate, setEndDate] = useState<string>(getCurrentMonthDateRange().endDate);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    const fetchShipments = useCallback(async (query = '', currentStartDate: string, currentEndDate: string, currentVehicleId: number | 'all') => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (query) {
                params.append('query', query);
            }
            // Include date range filters
            if (currentStartDate) {
                params.append('startDate', currentStartDate);
            }
            if (currentEndDate) {
                params.append('endDate', currentEndDate);
            }
            // Include vehicle filter
            if (currentVehicleId !== 'all') {
                params.append('vehicleId', String(currentVehicleId));
            }

            const response = await fetch(`/api/shipments/view-all?${params.toString()}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load shipment records.');
            }
            
            const data: ShipmentData[] = await response.json();
            setShipments(data);
        } catch (error: any) {
            console.error("Shipments fetch error:", error);
            toast.error({
                title: 'Fetch Error',
                description: error.message || 'Could not load shipment records.',
            });
            setShipments([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load initial data (including filters) on mount
    useEffect(() => {
        async function loadFilters() {
            try {
                const listsRes = await fetch('/api/lists');
                const lists = await listsRes.json();
                setVehicles(lists.vehicles || []);
            } catch (e) {
                console.error('Failed to load filter lists', e);
            }
        }
        loadFilters();
        
        // Initial fetch: Load current month's shipments
        const { startDate: initialStart, endDate: initialEnd } = getCurrentMonthDateRange();
        fetchShipments(debouncedSearchTerm, initialStart, initialEnd, vehicleId);
        
        // The dependency array will manage subsequent fetches via debouncedSearchTerm and the button click handler.
    }, []); // Empty dependency array for component mount only

    // Debounce logic for search (unmodified)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); // 500ms delay

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    // Fetch data whenever debouncedSearchTerm changes (other filters remain fixed unless explicitly changed via form/button)
    useEffect(() => {
        fetchShipments(debouncedSearchTerm, startDate, endDate, vehicleId);
    }, [debouncedSearchTerm, fetchShipments, startDate, endDate, vehicleId]);


    const handleFilterLoad = () => {
        // Force a fetch using current filter states
        fetchShipments(searchTerm, startDate, endDate, vehicleId);
    }


    return (
        <div className='p-6 max-w-[1400px] mx-auto bg-gray-50 min-h-screen'>
            <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>All Shipment Records</h2>

            {/* Search and Filter Card */}
            <Card className='shadow-lg mb-8'>
                <CardHeader>
                    <CardTitle className='text-xl text-blue-800'>Search & Filter</CardTitle>
                    <CardDescription>Filter shipments by date range, vehicle, or search by Party/Bilty.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className='grid grid-cols-1 lg:grid-cols-5 gap-4 items-end'>
                        {/* 1. Search Bar */}
                        <div className='lg:col-span-2 relative flex-1'>
                            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                            <Input
                                placeholder='Search Bilty #, or Receiver Name...'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className='pl-10 pr-4'
                                disabled={isLoading}
                            />
                        </div>
                        
                        {/* 2. Date Filters */}
                        <div className='grid gap-2'>
                            <label className='text-sm font-medium'>Start Date</label>
                            <Input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className='grid gap-2'>
                            <label className='text-sm font-medium'>End Date</label>
                            <Input type='date' value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>

                        {/* 3. Vehicle Filter */}
                        <div className='grid gap-2'>
                            <label className='text-sm font-medium'>Vehicle Number</label>
                            <Select
                                value={String(vehicleId)}
                                onValueChange={(v) => setVehicleId(v === 'all' ? 'all' : parseInt(v))}
                                disabled={isLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='All Vehicles' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='all'>All Vehicles</SelectItem>
                                    {vehicles.map((v) => (
                                        <SelectItem key={v.id} value={String(v.id)}>
                                            {v.vehicleNumber}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* 4. Load Button */}
                        <Button
                            onClick={handleFilterLoad} 
                            className='lg:col-span-1 h-9'
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Apply Filters'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Shipments Table Card */}
            <Card className='shadow-lg'>
                <CardHeader>
                    <CardTitle className='text-2xl text-gray-800'>Shipment Details</CardTitle>
                    <CardDescription>{shipments.length} records currently displayed.</CardDescription>
                </CardHeader>
                <CardContent className='p-0'>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                            <p className="text-gray-600 mt-3">Loading shipment data...</p>
                        </div>
                    ) : shipments.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No shipments found matching the criteria.</p>
                    ) : (
                        <div className='overflow-x-auto'>
                            <Table>
                                <TableCaption>List of all registered shipments.</TableCaption>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Reg. No</TableHead>
                                        <TableHead>Bilty No</TableHead>
                                        <TableHead>Bilty Date</TableHead>
                                        <TableHead>Created Date</TableHead> 
                                        <TableHead>Sender</TableHead>
                                        <TableHead>Receiver</TableHead>
                                        <TableHead>From</TableHead>
                                        <TableHead>To</TableHead>
                                        {/* --- NEW COLUMNS ADDED --- */}
                                        {/* ------------------------- */}
                                        <TableHead>Vehicle</TableHead>
                                        <TableHead className='text-right'>Delivery Charges</TableHead>
                                        <TableHead className='text-right'>Payment Status / Charges</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shipments.map((shipment) => {
                                        const isDelivered = !!shipment.delivery_date;
                                        const receiverDisplay = shipment.walk_in_receiver_name || shipment.receiver.name;
                                        
                                        return (
                                            <TableRow key={shipment.register_number} className={isDelivered ? 'bg-green-50/50 hover:bg-green-100' : 'hover:bg-yellow-50/50'}>
                                                <TableCell className='font-mono text-sm'>{shipment.register_number}</TableCell>
                                                <TableCell className='font-semibold'>{shipment.bility_number}</TableCell>
                                                <TableCell>{shipment.bility_date ? new Date(shipment.bility_date).toLocaleDateString() : null}</TableCell>
                                                  <TableCell>
                                                    {/* Format the creation timestamp to a local date string */}
                                                    {shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : null}
                                                </TableCell>
                                                <TableCell>{shipment.sender.name}</TableCell>
                                                <TableCell className='font-medium'>{receiverDisplay}</TableCell>
                                                <TableCell>{shipment.departureCity.name}</TableCell>
                                                <TableCell>{shipment.toCity?.name || 'Local'}</TableCell>  
                                                <TableCell>{shipment.vehicle.vehicleNumber}</TableCell>
                                                 <TableCell className='text-right'>
                                                    {/* Format and display the delivery charges */}
                                                    {formatCurrency(shipment.total_delivery_charges)}
                                                </TableCell>
                                                {/* Payment Status / Charges Cell */}
                                                <TableCell className='text-right font-bold'>
                                                    {shipment.payment_status === 'ALREADY_PAID' && <span className='px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700'>PAID</span>}
                                                    {shipment.payment_status === 'FREE' && <span className='px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700'>FREE</span>}
                                                    {shipment.payment_status === 'PENDING' && <span className='font-bold text-green-700'>{formatCurrency(shipment.total_charges)}</span>}
                                                    {(!shipment.payment_status || shipment.payment_status === null) && <span className='font-bold text-green-700'>{formatCurrency(shipment.total_charges)}</span>}
                                                </TableCell>
                                                
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDelivered ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`}>
                                                        {isDelivered ? 'DELIVERED' : 'IN TRANSIT'}
                                                    </span>
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
        </div>
    );
}