"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';

interface DeliveryPrintData {
    register_number: string;
    bility_number: string;
    bility_date: string;
    delivery_date: string;
    departure_city: string;
    destination_city: string;
    sender_name: string;
    receiver_name: string;
    receiver_phone: string;
    receiver_cnic: string;
    total_amount: number | string;
    station_expense: number;
    bility_expense: number;
    station_labour: number;
    cart_labour: number;
    total_expenses: number;
    delivery_notes?: string;
}

export default function DeliveryPrintingPage() {
    const router = useRouter();
    const [printData, setPrintData] = useState<DeliveryPrintData | null>(null);

    useEffect(() => {
        // Retrieve data from session storage
        const stored = sessionStorage.getItem('deliveryPrintData');
        if (stored) {
            try {
                setPrintData(JSON.parse(stored));
            } catch (err) {
                console.error('Failed to parse print data:', err);
            }
        }
    }, []);

    const formatCurrency = (amount: number | string) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2,
        }).format(Number(amount));
    };

    if (!printData) {
        return (
            <div className='p-6 max-w-4xl mx-auto'>
                <div className='text-center py-12'>
                    <p className='text-gray-600 mb-4'>No delivery data found. Please print from the delivery add page.</p>
                    <Button onClick={() => router.push('/deliveries/add')} className='gap-2'>
                        <ArrowLeft className='h-4 w-4' />
                        Back to Deliveries
                    </Button>
                </div>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className='p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen'>
            {/* Print Controls */}
            <div className='flex gap-2 mb-6 no-print'>
                <Button 
                    onClick={handlePrint}
                    className='bg-blue-600 hover:bg-blue-700 flex items-center gap-2'
                    size='lg'
                >
                    <Printer className='h-5 w-5' />
                    Print Now
                </Button>
                <Button 
                    onClick={() => router.push('/deliveries/add')}
                    variant='outline'
                    className='flex items-center gap-2'
                    size='lg'
                >
                    <ArrowLeft className='h-4 w-4' />
                    Back
                </Button>
            </div>

            {/* Printable Content */}
            <div className='bg-white p-12 rounded-lg shadow-lg print:shadow-none'>
                <div className='text-center border-b-2 border-black pb-6 mb-6'>
                    <h1 className='text-3xl font-bold mb-2'>DELIVERY RECORD</h1>
                    <p className='text-gray-600'>Zikria Goods Transports Company</p>
                    <p className='text-gray-600'>Goods Management System</p>
                </div>

                {/* Shipment Information */}
                <div className='mb-8 border border-gray-300 p-6'>
                    <h2 className='text-lg font-bold mb-4 text-blue-800'>SHIPMENT INFORMATION</h2>
                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <label className='font-semibold text-gray-700'>Registration Number:</label>
                            <p className='text-lg text-blue-600 font-bold'>{printData.register_number}</p>
                        </div>
                        <div>
                            <label className='font-semibold text-gray-700'>Bility Number:</label>
                            <p className='text-lg text-blue-600 font-bold'>{printData.bility_number}</p>
                        </div>
                        <div>
                            <label className='font-semibold text-gray-700'>Bility Date:</label>
                            <p>{new Date(printData.bility_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div>
                            <label className='font-semibold text-gray-700'>Delivery Date:</label>
                            <p>{new Date(printData.delivery_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                </div>

                {/* Route Information */}
                <div className='mb-8 border border-gray-300 p-6'>
                    <h2 className='text-lg font-bold mb-4 text-green-800'>ROUTE INFORMATION</h2>
                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <label className='font-semibold text-gray-700'>From City:</label>
                            <p>{printData.departure_city}</p>
                        </div>
                        <div>
                            <label className='font-semibold text-gray-700'>To City:</label>
                            <p>{printData.destination_city}</p>
                        </div>
                        <div>
                            <label className='font-semibold text-gray-700'>Sender:</label>
                            <p>{printData.sender_name}</p>
                        </div>
                        <div>
                            <label className='font-semibold text-gray-700'>Original Receiver:</label>
                            <p>{printData.receiver_name}</p>
                        </div>
                    </div>
                </div>

                {/* Delivery Details */}
                <div className='mb-8 border border-gray-300 p-6'>
                    <h2 className='text-lg font-bold mb-4 text-purple-800'>DELIVERY DETAILS</h2>
                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <label className='font-semibold text-gray-700'>Receiver Name:</label>
                            <p className='font-semibold'>{printData.receiver_name}</p>
                        </div>
                        <div>
                            <label className='font-semibold text-gray-700'>Phone Number:</label>
                            <p>{printData.receiver_phone || 'N/A'}</p>
                        </div>
                        <div>
                            <label className='font-semibold text-gray-700'>CNIC:</label>
                            <p>{printData.receiver_cnic || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Financial Information */}
                <div className='mb-8 border border-gray-300 p-6 bg-yellow-50'>
                    <h2 className='text-lg font-bold mb-4 text-yellow-800'>FINANCIAL INFORMATION</h2>
                    <div className='mb-4'>
                        <label className='font-semibold text-gray-700'>Total Amount (Shipment):</label>
                        <p className='text-xl font-bold text-green-600'>{formatCurrency(printData.total_amount)}</p>
                    </div>
                </div>

                {/* Expense Breakdown */}
                <div className='mb-8 border border-gray-300 p-6 bg-orange-50'>
                    <h2 className='text-lg font-bold mb-4 text-orange-800'>EXPENSE BREAKDOWN</h2>
                    <div className='space-y-2'>
                        <div className='flex justify-between'>
                            <span>Station Expense:</span>
                            <span className='font-semibold'>{formatCurrency(printData.station_expense)}</span>
                        </div>
                        <div className='flex justify-between'>
                            <span>Bility Expense:</span>
                            <span className='font-semibold'>{formatCurrency(printData.bility_expense)}</span>
                        </div>
                        <div className='flex justify-between'>
                            <span>Station Labour:</span>
                            <span className='font-semibold'>{formatCurrency(printData.station_labour)}</span>
                        </div>
                        <div className='flex justify-between'>
                            <span>Cart Labour:</span>
                            <span className='font-semibold'>{formatCurrency(printData.cart_labour)}</span>
                        </div>
                        <div className='flex justify-between border-t-2 border-orange-400 pt-2 mt-2'>
                            <span className='font-bold'>Total Expenses:</span>
                            <span className='font-bold text-lg'>{formatCurrency(printData.total_expenses)}</span>
                        </div>
                    </div>
                </div>

                {/* Delivery Notes */}
                {printData.delivery_notes && (
                    <div className='mb-8 border border-gray-300 p-6'>
                        <h2 className='text-lg font-bold mb-4 text-gray-800'>DELIVERY NOTES</h2>
                        <p className='text-gray-700 whitespace-pre-wrap'>{printData.delivery_notes}</p>
                    </div>
                )}

                {/* Footer */}
                <div className='text-center border-t-2 border-black pt-6 mt-8'>
                    <p className='text-sm text-gray-600'>
                        Printed on: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className='text-sm text-gray-600 mt-2'>© Zikria Goods Transports Company. All Rights Reserved.</p>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    .no-print {
                        display: none;
                    }
                    body {
                        background-color: white;
                        margin: 0;
                        padding: 0;
                    }
                    .bg-gray-50 {
                        background-color: white !important;
                    }
                }
            `}</style>
        </div>
    );
}
