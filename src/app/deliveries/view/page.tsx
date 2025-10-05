"use client";

import React, { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DeliveryData {
    delivery_id: number;
    delivery_date: string;
    delivery_time: string;
    station_expense: number;
    bility_expense: number;
    station_labour: number;
    cart_labour: number;
    total_expenses: number;
    receiver_name: string;
    receiver_phone: string;
    receiver_cnic: string;
    receiver_address: string;
    delivery_notes?: string;
    delivery_status: string;
    shipment: {
        register_number: string;
        bility_number: string;
        bility_date: string;
        total_charges: number;
        departureCity?: { name: string };
        toCity?: { name: string };
        sender?: { name: string };
        receiver?: { name: string };
        walk_in_sender_name?: string;
        walk_in_receiver_name?: string;
    };
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 2,
    }).format(amount);
};

export default function ViewDeliveries() {
    const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchDeliveries = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/deliveries');
            if (!response.ok) throw new Error('Failed to load delivery records.');
            const data = await response.json();
            setDeliveries(data);
        } catch (error: any) {
            console.error("Deliveries fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const filteredDeliveries = deliveries.filter(delivery =>
        delivery.shipment.bility_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.receiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.shipment.register_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className='p-6 max-w-6xl mx-auto text-center'>
                <p className="text-xl text-indigo-600">Loading delivery records...</p>
            </div>
        );
    }

    return (
        <div className='p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen'>
            <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>Delivery Records</h2>

            {/* Search and Stats */}
            <div className='grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8'>
                <Card className='lg:col-span-3'>
                    <CardHeader>
                        <CardTitle className='text-xl text-blue-800'>Search Deliveries</CardTitle>
                        <CardDescription>Search by bility number, receiver name, or register number</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className='flex gap-4'>
                            <Input
                                placeholder='Search deliveries...'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className='flex-1'
                            />
                            <Button
                                onClick={fetchDeliveries}
                                variant='outline'
                            >
                                Refresh
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className='bg-green-50 border-green-200'>
                    <CardHeader>
                        <CardTitle className='text-lg text-green-800'>Total Deliveries</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className='text-3xl font-bold text-green-600'>{deliveries.length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Deliveries Table */}
            <Card className='shadow-lg'>
                <CardHeader>
                    <CardTitle className='text-2xl text-gray-800'>All Delivery Records</CardTitle>
                    <CardDescription>Complete delivery history with expense tracking</CardDescription>
                </CardHeader>
                <CardContent>
                    {deliveries.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No delivery records found.</p>
                    ) : (
                        <div className='overflow-x-auto'>
                            <Table>
                                <TableCaption>All recorded deliveries with expense details</TableCaption>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Delivery Date</TableHead>
                                        <TableHead>Bility No</TableHead>
                                        <TableHead>Register No</TableHead>
                                        <TableHead>Receiver Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Station Exp</TableHead>
                                        <TableHead>Bility Exp</TableHead>
                                        <TableHead>Station Lab</TableHead>
                                        <TableHead>Cart Lab</TableHead>
                                        <TableHead className='text-right'>Total Expenses</TableHead>
                                        <TableHead className='text-right'>Delivery Charges</TableHead>
                                        <TableHead className='text-right'>Total (Delivery + Expense)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDeliveries.map((delivery) => (
                                        <TableRow key={delivery.delivery_id}>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${delivery.delivery_status === 'DELIVERED'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {delivery.delivery_status}
                                                </span>
                                            </TableCell>
                                            <TableCell className='font-medium'>
                                                {new Date(delivery.delivery_date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>{delivery.shipment.bility_number}</TableCell>
                                            <TableCell>{delivery.shipment.register_number}</TableCell>
                                            <TableCell>{delivery.receiver_name}</TableCell>
                                            <TableCell>{delivery.receiver_phone}</TableCell>
                                            <TableCell>{formatCurrency(delivery.station_expense)}</TableCell>
                                            <TableCell>{formatCurrency(delivery.bility_expense)}</TableCell>
                                            <TableCell>{formatCurrency(delivery.station_labour)}</TableCell>
                                            <TableCell>{formatCurrency(delivery.cart_labour)}</TableCell>
                                            <TableCell className='text-right font-bold text-red-600'>
                                                {formatCurrency(delivery.total_expenses)}
                                            </TableCell>
                                            <TableCell className='text-right font-bold text-blue-600'>
                                                {formatCurrency(delivery.shipment.total_charges)}
                                            </TableCell>
                                            <TableCell className='text-right font-bold text-purple-600'>
                                                {formatCurrency(Number(delivery.shipment.total_charges) + Number(delivery.total_expenses))}

                                            </TableCell>

                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {deliveries.length > 0 && (
                <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-8'>
                    <Card className='bg-blue-50 border-blue-200'>
                        <CardHeader>
                            <CardTitle className='text-lg text-blue-800'>Total Station Expenses</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className='text-2xl font-bold text-blue-600'>
                                {/* FIXED: Added Number() conversion */}
                                {formatCurrency(deliveries.reduce((sum, d) => sum + Number(d.station_expense), 0))}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className='bg-purple-50 border-purple-200'>
                        <CardHeader>
                            <CardTitle className='text-lg text-purple-800'>Total Station Labour</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className='text-2xl font-bold text-purple-600'>
                                {/* FIXED: Added Number() conversion */}
                                {formatCurrency(deliveries.reduce((sum, d) => sum + Number(d.station_labour), 0))}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className='bg-purple-50 border-purple-200'>
                        <CardHeader>
                            <CardTitle className='text-lg text-purple-800'>Total Cart Labour</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className='text-2xl font-bold text-purple-600'>
                                {/* FIXED: Added Number() conversion */}
                                {formatCurrency(deliveries.reduce((sum, d) => sum + Number(d.cart_labour), 0))}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className='bg-red-50 border-red-200'>
                        <CardHeader>
                            <CardTitle className='text-lg text-red-800'>Total All Expenses</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className='text-2xl font-bold text-red-600'>
                                {/* FIXED: Added Number() conversion */}
                                {formatCurrency(deliveries.reduce((sum, d) => sum + Number(d.total_expenses), 0))}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}        </div>
    );
}
