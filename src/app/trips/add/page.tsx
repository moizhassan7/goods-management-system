// components/AddTrip.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 2,
    }).format(amount);
};

// --- Zod Schemas ---
const TripShipmentLogSchema = z.object({
    id: z.string().optional(),
    serial_number: z.number().int().min(1),
    shipment_id: z.string().min(1, 'Shipment is required'),
    receiver_name: z.string().min(1, 'Receiver name is required'),
    item_details: z.string().min(1, 'Item details are required'),
    quantity: z.number().int().min(1),
    delivery_charges: z.number().min(0),
});

// UPDATED TripLogFormSchema with new fields/names
const TripLogFormSchema = z.object({
    vehicle_id: z.number().min(1, 'Vehicle is required'),
    driver_name: z.string().min(1, 'Driver name is required'),
    driver_mobile: z.string().min(1, 'Driver mobile is required'),
    station_name: z.string().min(1, 'Station name is required'),
    city: z.string().min(1, 'City is required'),
    date: z.string().min(1, 'Date is required'),
    arrival_time: z.string().min(1, 'Arrival time is required'),
    departure_time: z.string().min(1, 'Departure time is required'),
    total_fare_collected: z.number().min(0),
    delivery_cut: z.number().min(0),
    commission: z.number().min(0),
    arrears: z.number().min(0), // Renamed from received_amount
    cuts: z.number().min(0).optional().default(0), // New Field
    munsihna_reward: z.number().min(0).optional().default(0), // Renamed from accountant_reward
    distant_charges: z.number().min(0).optional().default(0), // New Field
    received_amount: z.number().min(0), // Renamed from remaining_fare (The calculated amount)
    note: z.string().optional(),
    shipmentLogs: z.array(TripShipmentLogSchema).min(1, { message: "You must add at least one shipment log." }),
});

type TripLogFormValues = z.infer<typeof TripLogFormSchema>;

interface DropdownItem {
    id: number;
    name?: string;
    vehicleNumber?: string;
    item_description?: string;
    contactInfo?: string;
    register_number?: string;
    bility_number?: string;
    receiver?: { name: string };
    goodsDetails?: { itemCatalog: { item_description: string }, quantity: number, delivery_charges: number }[];
}

interface DropdownData {
    cities: DropdownItem[];
    agencies: DropdownItem[];
    vehicles: DropdownItem[];
    parties: DropdownItem[];
    items: DropdownItem[];
    shipments: DropdownItem[];
}

const today = new Date().toISOString().substring(0, 10);

// UPDATED generateDefaultValues
const generateDefaultValues = (): TripLogFormValues => ({
    vehicle_id: 0,
    driver_name: '',
    driver_mobile: '',
    station_name: '',
    city: '',
    date: today,
    arrival_time: '',
    departure_time: '',
    total_fare_collected: 0.00,
    delivery_cut: 0.00,
    commission: 0.00,
    arrears: 0.00, // Renamed
    cuts: 0.00, // New
    munsihna_reward: 0.00, // Renamed
    distant_charges: 0.00, // New
    received_amount: 0.00, // Renamed (Calculated amount)
    note: '',
    shipmentLogs: [
      { id: uuidv4(), serial_number: 1, shipment_id: '', receiver_name: '', item_details: '', quantity: 1, delivery_charges: 0.00 }
    ],
});

const findNameById = (data: DropdownData | null, listName: keyof DropdownData, id: number | null | undefined): string => {
    if (!data || !id) return 'N/A';
    const list = data[listName] as DropdownItem[];
    const item = list.find(item => item.id === id);
    if (listName === 'vehicles') return item?.vehicleNumber || 'Unknown Vehicle';
    if (listName === 'items') return item?.item_description || 'Unknown Item';
    return item?.name || 'Unknown';
};

const findShipmentById = (data: DropdownData | null, shipmentId: string): DropdownItem | null => {
    if (!data) return null;
    return data.shipments.find(s => s.register_number === shipmentId) || null;
};

export default function AddTrip() {
    const { toast } = useToast();
    const [data, setData] = useState<DropdownData | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const form = useForm<TripLogFormValues>({
        resolver: zodResolver(TripLogFormSchema) as any,
        defaultValues: generateDefaultValues(),
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "shipmentLogs",
    });

    const shipmentLogs = form.watch("shipmentLogs");
    // Watch all dependent fields
    const watchedDeliveryCut = form.watch('delivery_cut');
    const watchedCommission = form.watch('commission');
    const watchedCuts = form.watch('cuts');
    const watchedDistantCharges = form.watch('distant_charges');


    useEffect(() => {
        async function fetchInitialData() {
            try {
                const response = await fetch('/api/lists');
                if (!response.ok) throw new Error('Failed to load dependency lists.');
                const lists = await response.json();
                setData(lists);
            } catch (error: any) {
                console.error("Data fetch error:", error);
                toast.error({ title: 'Error Loading Data', description: error.message || 'Could not fetch lists. Check API /api/lists.' });
            } finally {
                setIsLoadingData(false);
            }
        }
        fetchInitialData();
    }, []);

    const handleShipmentChange = (index: number, shipmentId: string) => {
        const shipment = findShipmentById(data, shipmentId);
        if (shipment) {
            const receiverName = shipment.receiver?.name || '';
            const itemDetails = shipment.goodsDetails?.map(g => g.itemCatalog.item_description).join(', ') || '';
            const quantity = shipment.goodsDetails?.reduce((sum, g) => sum + g.quantity, 0) || 1;
            const deliveryCharges = shipment.goodsDetails?.reduce((sum, g) => sum + Number(g.delivery_charges), 0) || 0;

            form.setValue(`shipmentLogs.${index}.receiver_name`, receiverName);
            form.setValue(`shipmentLogs.${index}.item_details`, itemDetails);
            form.setValue(`shipmentLogs.${index}.quantity`, quantity);
            form.setValue(`shipmentLogs.${index}.delivery_charges`, deliveryCharges);
        }
    };

    const addShipmentLog = () => {
        const nextSerial = Math.max(...shipmentLogs.map(s => s.serial_number), 0) + 1;
        append({ id: uuidv4(), serial_number: nextSerial, shipment_id: '', receiver_name: '', item_details: '', quantity: 1, delivery_charges: 0.00 });
    };

    const totalFareFromLogs = useMemo(() => {
        return shipmentLogs.reduce((sum, log) => sum + (log.delivery_charges || 0), 0);
    }, [shipmentLogs]);

    // UPDATED useEffect for recalculating
    useEffect(() => {
        form.setValue('total_fare_collected', totalFareFromLogs);
        
        // Calculated Received Amount (was remaining_fare)
        // Formula: Total Fare Collected - Delivery Cut - Commission - Cuts - Distant Charges
        const calculatedReceivedAmount = totalFareFromLogs 
            - (watchedDeliveryCut || 0) 
            - (watchedCommission || 0)
            - (watchedCuts || 0)
            - (watchedDistantCharges || 0);

        form.setValue('received_amount', calculatedReceivedAmount); 
    }, [
        totalFareFromLogs, 
        watchedDeliveryCut, 
        watchedCommission, 
        watchedCuts, 
        watchedDistantCharges, 
        form
    ]);

    async function handleDirectSave(values: TripLogFormValues) {
        try {
            // Recalculate values before sending to ensure correctness
            const totalFare = values.shipmentLogs.reduce((sum, log) => sum + (log.delivery_charges || 0), 0);
            const calculatedReceivedAmount = totalFare 
                - (values.delivery_cut || 0) 
                - (values.commission || 0) 
                - (values.cuts || 0)
                - (values.distant_charges || 0);

            const payloadToSend = {
                ...values,
                total_fare_collected: totalFare, 
                received_amount: calculatedReceivedAmount, 
                shipmentLogs: values.shipmentLogs.map(log => ({
                    serial_number: Number(log.serial_number),
                    shipment_id: log.shipment_id,
                    receiver_name: log.receiver_name,
                    item_details: log.item_details,
                    quantity: Number(log.quantity),
                    delivery_charges: Number(log.delivery_charges),
                }))
            };

            const response = await fetch('/api/trips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadToSend), 
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to register trip log.');
            }

            toast.success({
                title: 'Trip Log Registered Successfully 🚀',
                description: `Trip for vehicle ${findNameById(data, 'vehicles', values.vehicle_id)} saved.`
            });

            form.reset(generateDefaultValues());

        } catch (error: any) {
            console.error('Submission Error:', error);
            toast.error({ title: 'Error Registering Trip Log ⚠️', description: error.message });
        }
    }

    if (isLoadingData) {
        return (
            <div className='p-6 max-w-4xl mx-auto text-center'>
                <p className="text-xl text-indigo-600">Loading essential data for the form...</p>
            </div>
        );
    }

    const itemIsLoading = form.formState.isSubmitting;
    const isFormValid = form.formState.isValid;

    return (
        <div className='p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen'>
            <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>New Trip Log Registration</h2>

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(handleDirectSave)}
                    className='space-y-6 p-8 rounded-xl shadow-2xl border border-indigo-100 bg-white mb-10'
                >
                    {/* Vehicle and Driver Details */}
                    <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                        <FormField control={form.control} name='vehicle_id' render={({ field }) => (
                            <FormItem><FormLabel>Vehicle Number</FormLabel><Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select Vehicle" /></SelectTrigger></FormControl>
                                <SelectContent>{data?.vehicles.map(vehicle => (<SelectItem key={vehicle.id} value={String(vehicle.id)}>{vehicle.vehicleNumber}</SelectItem>))}</SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='driver_name' render={({ field }) => (
                            <FormItem><FormLabel>Driver Name</FormLabel><FormControl><Input placeholder='Driver Name' {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='driver_mobile' render={({ field }) => (
                            <FormItem><FormLabel>Driver Mobile</FormLabel><FormControl><Input placeholder='0300-1234567' {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='station_name' render={({ field }) => (
                            <FormItem><FormLabel>Station Name</FormLabel><FormControl><Input placeholder='Station Name' {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>

                    {/* Location and Time */}
                    <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
                        <FormField control={form.control} name='city' render={({ field }) => (
                            <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder='City' {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='date' render={({ field }) => (
                            <FormItem><FormLabel>Date</FormLabel><FormControl><Input type='date' {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='arrival_time' render={({ field }) => (
                            <FormItem><FormLabel>Arrival Time</FormLabel><FormControl><Input type='time' {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='departure_time' render={({ field }) => (
                            <FormItem><FormLabel>Departure Time</FormLabel><FormControl><Input type='time' {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div></div> 
                    </div>

                    {/* Shipment Logs Cart */}
                    <div>
                        <h3 className='text-lg font-semibold mb-4'>Shipment Logs</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Serial #</TableHead>
                                    <TableHead>Bility Number</TableHead>
                                    <TableHead>Receiver Name</TableHead>
                                    <TableHead>Item Details</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Delivery Charges</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell>
                                            <FormField control={form.control} name={`shipmentLogs.${index}.serial_number`} render={({ field }) => (
                                                <FormControl><Input type='number' {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} /></FormControl>
                                            )} />
                                        </TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`shipmentLogs.${index}.shipment_id`} render={({ field }) => (
                                                <Select onValueChange={(val) => { field.onChange(val); handleShipmentChange(index, val); }} value={field.value} disabled={itemIsLoading}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Bility" /></SelectTrigger></FormControl>
                                                    <SelectContent>{data?.shipments.map(shipment => (<SelectItem key={shipment.register_number} value={shipment.register_number!}>{shipment.bility_number}</SelectItem>))}</SelectContent>
                                                </Select>
                                            )} />
                                        </TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`shipmentLogs.${index}.receiver_name`} render={({ field }) => (
                                                <FormControl><Input {...field} /></FormControl>
                                            )} />
                                        </TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`shipmentLogs.${index}.item_details`} render={({ field }) => (
                                                <FormControl><Input {...field} /></FormControl>
                                            )} />
                                        </TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`shipmentLogs.${index}.quantity`} render={({ field }) => (
                                                <FormControl><Input type='number' {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} /></FormControl>
                                            )} />
                                        </TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`shipmentLogs.${index}.delivery_charges`} render={({ field }) => (
                                                <FormControl><Input type='number' step='0.01' {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} /></FormControl>
                                            )} />
                                        </TableCell>
                                        <TableCell>
                                            <Button type='button' variant='destructive' onClick={() => remove(index)}>Remove</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Button type='button' onClick={addShipmentLog} className='mt-4'>Add Shipment Log</Button>
                        <FormMessage>{form.formState.errors.shipmentLogs?.message}</FormMessage>
                    </div>

                    {/* Financial Details - First Row */}
                    <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                        <FormField control={form.control} name='total_fare_collected' render={({ field }) => (
                            <FormItem><FormLabel>Total Fare Collected</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} readOnly /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='delivery_cut' render={({ field }) => (
                            <FormItem><FormLabel>Delivery Cut</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='commission' render={({ field }) => (
                            <FormItem><FormLabel>Commission</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                        )} />
                        {/* Renamed: received_amount -> arrears */}
                        <FormField control={form.control} name='arrears' render={({ field }) => (
                            <FormItem><FormLabel>Arrears</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>

                    {/* Financial Details - Second Row (New Fields) */}
                    <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                        {/* New Field: cuts */}
                        <FormField control={form.control} name='cuts' render={({ field }) => (
                            <FormItem><FormLabel>Cuts</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                        )} />
                         {/* Renamed: accountant_reward -> munsihna_reward */}
                        <FormField control={form.control} name='munsihna_reward' render={({ field }) => (
                            <FormItem><FormLabel>Accountant Reward (Munsihna)</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                        )} />
                         {/* New Field: distant_charges */}
                        <FormField control={form.control} name='distant_charges' render={({ field }) => (
                            <FormItem><FormLabel>Distant Charges</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                        )} />
                        {/* Renamed: remaining_fare -> received_amount (This is the calculated field now) */}
                        <FormField control={form.control} name='received_amount' render={({ field }) => (
                            <FormItem><FormLabel>Received Amount</FormLabel><FormControl><Input type='number' step='0.01' {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} readOnly /></FormControl><FormDescription>Calculated: Total Fare - Cuts - Commission - Delivery Cut - Distant Charges</FormDescription><FormMessage /></FormItem>
                        )} />
                    </div>

                    {/* Note */}
                    <FormField control={form.control} name='note' render={({ field }) => (
                        <FormItem><FormLabel>Note</FormLabel><FormControl><Textarea placeholder='Additional notes...' {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <Button
                        type='submit'
                        className='w-full bg-green-700 hover:bg-green-800 py-4 text-lg font-bold'
                        disabled={itemIsLoading || !isFormValid}
                    >
                        {form.formState.isSubmitting ? 'Saving...' : 'Save Trip Log'}
                    </Button>
                </form>
            </Form>
        </div>
    );
}