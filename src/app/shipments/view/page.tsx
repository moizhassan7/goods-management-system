'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
    delivery_date: string | null; // Already mapped to YYYY-MM-DD or null in API
    departureCity: { name: string };
    toCity: { name: string } | null;
    sender: { name: string };
    receiver: { name: string };
    vehicle: { vehicleNumber: string };
    walk_in_receiver_name: string | null;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 2,
    }).format(amount);
};

export default function ViewShipments() {
    const { toast } = useToast();
    const [shipments, setShipments] = useState<ShipmentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    const fetchShipments = useCallback(async (query = '') => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (query) {
                params.append('query', query);
            }
            // Hitting the dedicated API route
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


    // Debounce logic for search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); // 500ms delay

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    // Fetch data whenever debouncedSearchTerm changes
    useEffect(() => {
        fetchShipments(debouncedSearchTerm);
    }, [debouncedSearchTerm, fetchShipments]);


    return (
        <div className='p-6 max-w-[1400px] mx-auto bg-gray-50 min-h-screen'>
            <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>All Shipment Records</h2>

            {/* Search and Stats Card */}
            <Card className='shadow-lg mb-8'>
                <CardHeader>
                    <CardTitle className='text-xl text-blue-800'>Search & Filter</CardTitle>
                    <CardDescription>Search by Bilty Number, Party Name, or Receiver Name.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className='flex items-center gap-4'>
                        <div className='relative flex-1'>
                            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                            <Input
                                placeholder='Search Bilty #, or Receiver Name...'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className='pl-10 pr-4'
                                disabled={isLoading}
                            />
                        </div>
                        <Button
                            onClick={() => {
                                setSearchTerm(''); 
                                fetchShipments('');
                            }} 
                            variant='outline'
                            size='icon'
                            disabled={isLoading}
                            title="Refresh Data"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className='h-4 w-4' />}
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
                                        <TableHead>Bilty #</TableHead>
                                        <TableHead>Bilty Date</TableHead>
                                        <TableHead>Sender</TableHead>
                                        <TableHead>Receiver</TableHead>
                                        <TableHead>From</TableHead>
                                        <TableHead>To</TableHead>
                                        <TableHead>Vehicle</TableHead>
                                        <TableHead className='text-right'>Charges</TableHead>
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
                                                <TableCell>{shipment.bility_date}</TableCell>
                                                <TableCell>{shipment.sender.name}</TableCell>
                                                <TableCell className='font-medium'>{receiverDisplay}</TableCell>
                                                <TableCell>{shipment.departureCity.name}</TableCell>
                                                <TableCell>{shipment.toCity?.name || 'Local'}</TableCell>
                                                <TableCell>{shipment.vehicle.vehicleNumber}</TableCell>
                                                <TableCell className='text-right font-bold text-green-700'>
                                                    {formatCurrency(shipment.total_charges)}
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
