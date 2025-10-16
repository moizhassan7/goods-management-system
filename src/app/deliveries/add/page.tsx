"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast as sonnerToast } from 'sonner';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { 
    Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

// --- Zod Schemas ---
const DeliveryFormSchema = z.object({
    bility_number: z.string().min(1, 'Bility number is required'),
    delivery_date: z.string().min(1, 'Delivery date is required'),
    
    // Expense fields
    station_expense: z.number().min(0, 'Must be 0 or greater'),
    bility_expense: z.number().min(0, 'Must be 0 or greater'),
    station_labour: z.number().min(0, 'Must be 0 or greater'),
    cart_labour: z.number().min(0, 'Must be 0 or greater'),
    total_expenses: z.number().min(0, 'Must be 0 or greater'),
    
    // Receiver details
    receiver_name: z.string().min(2, 'Receiver name is required'),
    receiver_phone: z.string().min(10, 'Phone number is required'),
    receiver_cnic: z.string().min(13, 'CNIC is required'),
    receiver_address: z.string().min(10, 'Address is required'),
    
    delivery_notes: z.string().optional(),
});

type DeliveryFormValues = z.infer<typeof DeliveryFormSchema>;

interface ShipmentData {
    register_number: string;
    bility_number: string;
    bility_date: string;
    // FIX: Changed type to handle Prisma Decimal which is usually returned as a string
    total_charges: number | string; 
    departureCity?: {
        name: string;
    };
    toCity?: {
        name: string;
    };
    sender?: {
        name: string;
    };
    receiver?: {
        name: string;
    };
    walk_in_sender_name?: string;
    walk_in_receiver_name?: string;
}

const today = new Date().toISOString().substring(0, 10);

const generateDefaultValues = (): DeliveryFormValues => ({
    bility_number: '',
    delivery_date: today,
    station_expense: 0,
    bility_expense: 0,
    station_labour: 0,
    cart_labour: 0,
    total_expenses: 0,
    receiver_name: '',
    receiver_phone: '',
    receiver_cnic: '',
    receiver_address: '',
    delivery_notes: '',
});

export default function AddDelivery() {
    const { toast } = useToast();
    const [shipmentData, setShipmentData] = useState<ShipmentData | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<DeliveryFormValues>({
        resolver: zodResolver(DeliveryFormSchema),
        defaultValues: generateDefaultValues(),
        mode: 'onChange',
    });

    // Watch expense fields to calculate total
    const stationExpense = form.watch("station_expense");
    const bilityExpense = form.watch("bility_expense");
    const stationLabour = form.watch("station_labour");
    const cartLabour = form.watch("cart_labour");

    // Calculate total expenses whenever any expense field changes
    useEffect(() => {
        const total = stationExpense + bilityExpense + stationLabour + cartLabour;
        form.setValue("total_expenses", total);
    }, [stationExpense, bilityExpense, stationLabour, cartLabour, form]);

    const searchShipment = async (bilityNumber: string) => {
        if (!bilityNumber.trim()) {
            toast.error({ title: 'Error', description: 'Please enter a bility number to search.' });
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(`/api/shipments?bility_number=${bilityNumber}`);
            if (!response.ok) {
                // If response is not ok, but not a 404, throw a generic error
                if (response.status !== 404) {
                    throw new Error('Failed to search shipment');
                }
            }
            const shipment = await response.json();
            
            // The API search by query returns an array, but searching by exact bility_number 
            // from the frontend form should probably return a single object or null/empty array
            const foundShipment = Array.isArray(shipment) ? shipment[0] : shipment;

            if (foundShipment) {
                setShipmentData(foundShipment);
                toast.success({ 
                    title: 'Shipment Found', 
                    description: `Found shipment for bility number: ${bilityNumber}` 
                });
            } else {
                setShipmentData(null);
                toast.error({ 
                    title: 'Shipment Not Found', 
                    description: `No shipment found with bility number: ${bilityNumber}` 
                });
            }
        } catch (error: any) {
            console.error("Search error:", error);
            setShipmentData(null);
            toast.error({ title: 'Search Error', description: error.message || 'Could not search for shipment.' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async (values: DeliveryFormValues) => {
        // Ensure that the register_number (which is the shipment_id) is used
        if (!shipmentData || !shipmentData.register_number) {
            toast.error({ title: 'Error', description: 'Please search and select a valid shipment first.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...values,
                // Use the register_number as the shipment_id for the delivery
                shipment_id: shipmentData.register_number, 
                // delivery_date is already correctly formatted in values
            };

            const response = await fetch('/api/deliveries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to record delivery.');
            }
            
            toast.success({ 
                title: 'Delivery Recorded Successfully 🚀',
                description: `Delivery for bility ${values.bility_number} has been recorded.`
            });
            
            form.reset(generateDefaultValues());
            setShipmentData(null);

        } catch (error: any) {
            console.error('Submission Error:', error);
            toast.error({ title: 'Error Recording Delivery ⚠️', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSearch = () => {
        const bilityNumber = form.getValues("bility_number");
        searchShipment(bilityNumber);
    };

    return (
        <div className='p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen'>
            <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>Delivery Record</h2>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
                    
                    {/* Search Section */}
                    <Card className='p-6 shadow-lg'>
                        <CardHeader>
                            <CardTitle className='text-xl text-blue-800'>Search Shipment</CardTitle>
                            <CardDescription>Enter the bility number to find the shipment details</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                <FormField 
                                    control={form.control} 
                                    name='bility_number' 
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bility Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder='BL-001' {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} 
                                />
                                <div className='flex items-end'>
                                    <Button 
                                        type='button' 
                                        onClick={handleSearch}
                                        disabled={isSearching}
                                        className='w-full bg-blue-600 hover:bg-blue-700'
                                    >
                                        {isSearching ? 'Searching...' : 'Search Shipment'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shipment Details Display */}
                    {shipmentData && (
                        <Card className='p-6 shadow-lg border-green-200 bg-green-50'>
                            <CardHeader>
                                <CardTitle className='text-xl text-green-800'>Shipment Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                    <div>
                                        <label className='text-sm font-medium text-gray-600'>Register Number</label>
                                        <p className='text-lg font-semibold'>{shipmentData.register_number}</p>
                                    </div>
                                    <div>
                                        <label className='text-sm font-medium text-gray-600'>Bility Date</label>
                                        <p className='text-lg font-semibold'>
                                            {/* FIX: Explicitly parse date with time to prevent "Invalid Date" errors */}
                                            {new Date(shipmentData.bility_date + 'T00:00:00').toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                    <label className='text-sm font-medium text-gray-600'>Total Amount</label>
                                        <p className='text-lg font-semibold text-green-600'>
                                            {/* FIX: Ensure total_charges is converted to string before Number() to handle Prisma Decimal type reliably */}
                                            **${Number(shipmentData.total_charges.toString()).toFixed(2)}**
                                        </p>
                                    </div>
                                    <div>
                                        <label className='text-sm font-medium text-gray-600'>From</label>
                                        <p className='text-lg'>{shipmentData.departureCity?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className='text-sm font-medium text-gray-600'>To</label>
                                        <p className='text-lg'>{shipmentData.toCity?.name || 'Local'}</p>
                                    </div>
                                    <div>
                                        <label className='text-sm font-medium text-gray-600'>Sender</label>
                                        <p className='text-lg'>
                                            {shipmentData.walk_in_sender_name || shipmentData.sender?.name || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Delivery Form */}
                    {shipmentData && (
                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                            
                            {/* Delivery Details */}
                            <Card className='p-6 shadow-lg'>
                                <CardHeader>
                                    <CardTitle className='text-xl text-purple-800'>Delivery Details</CardTitle>
                                </CardHeader>
                                <CardContent className='space-y-4'>
                                    <FormField 
                                        control={form.control} 
                                        name='delivery_date' 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Delivery Date</FormLabel>
                                                <FormControl>
                                                    <Input type='date' {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />

                                    {/* Expense Fields */}
                                    <div className='space-y-4'>
                                        <h4 className='font-semibold text-gray-700'>Delivery Expenses</h4>
                                        
                                        <FormField 
                                            control={form.control} 
                                            name='station_expense' 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Station Expense</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type='number' 
                                                            placeholder='0.00' 
                                                            {...field} 
                                                            step='0.01' 
                                                            min='0' 
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} 
                                        />

                                        <FormField 
                                            control={form.control} 
                                            name='bility_expense' 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Bility Expense</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type='number' 
                                                            placeholder='0.00' 
                                                            {...field} 
                                                            step='0.01' 
                                                            min='0' 
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} 
                                        />

                                        <FormField 
                                            control={form.control} 
                                            name='station_labour' 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Station Labour</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type='number' 
                                                            placeholder='0.00' 
                                                            {...field} 
                                                            step='0.01' 
                                                            min='0' 
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} 
                                        />

                                        <FormField 
                                            control={form.control} 
                                            name='cart_labour' 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Cart Labour</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type='number' 
                                                            placeholder='0.00' 
                                                            {...field} 
                                                            step='0.01' 
                                                            min='0' 
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} 
                                        />

                                        <FormField 
                                            control={form.control} 
                                            name='total_expenses' 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Total Expenses</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type='number' 
                                                            placeholder='0.00' 
                                                            {...field} 
                                                            step='0.01' 
                                                            min='0' 
                                                            readOnly
                                                            className='bg-gray-100 font-bold text-lg text-red-600'
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} 
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Receiver Details */}
                            <Card className='p-6 shadow-lg'>
                                <CardHeader>
                                    <CardTitle className='text-xl text-orange-800'>Receiver Details</CardTitle>
                                </CardHeader>
                                <CardContent className='space-y-4'>
                                    <FormField 
                                        control={form.control} 
                                        name='receiver_name' 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Receiver Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder='Full name' {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />

                                    <FormField 
                                        control={form.control} 
                                        name='receiver_phone' 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone Number</FormLabel>
                                                <FormControl>
                                                    <Input placeholder='+92XXXXXXXXXX' {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />

                                    <FormField 
                                        control={form.control} 
                                        name='receiver_cnic' 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>CNIC</FormLabel>
                                                <FormControl>
                                                    <Input placeholder='12345-1234567-1' {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />

                                    <FormField 
                                        control={form.control} 
                                        name='receiver_address' 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Address</FormLabel>
                                                <FormControl>
                                                    <Textarea 
                                                        placeholder='Complete delivery address...' 
                                                        {...field} 
                                                        rows={4}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />

                                    <FormField 
                                        control={form.control} 
                                        name='delivery_notes' 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Delivery Notes</FormLabel>
                                                <FormControl>
                                                    <Textarea 
                                                        placeholder='Additional notes about the delivery...' 
                                                        {...field} 
                                                        rows={3}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Submit Button */}
                    {shipmentData && (
                        <Button 
                            type='submit' 
                            className='w-full bg-green-700 hover:bg-green-800 py-4 text-lg font-bold'
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Recording Delivery...' : 'Record Delivery'} 
                        </Button>
                    )}
                </form>
            </Form>
        </div>
    );
}