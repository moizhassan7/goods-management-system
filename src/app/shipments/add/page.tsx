// components/AddShipment.tsx
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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WALK_IN_CUSTOMER_ID = 1; 

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 2,
    }).format(amount);
};

// --- Zod Schemas ---
const GoodsDetailSchema = z.object({
    id: z.string().optional(), 
    item_id: z.coerce.number().int().min(1, 'Item is required'),
    quantity: z.coerce.number().min(1, 'Min quantity is 1'),
});

const ShipmentFormSchema = z.object({
    register_number: z.string().optional(), // Will be set after POST response
    bility_number: z.string().min(1, 'Lading number required').max(50), 
    bility_date: z.string().min(1, 'Bility date is required'), 
    departure_city_id: z.coerce.number().int().min(1, 'Departure city is required'),
    forwarding_agency_id: z.coerce.number().int().min(1, 'Agency is required'),
    vehicle_number_id: z.coerce.number().int().min(1, 'Vehicle is required'),
    
    goods_details: z.array(GoodsDetailSchema)
        .min(1, { message: "You must add at least one item detail." }),
    
    sender_id: z.coerce.number().int().min(1, 'Sender is required'),
    receiver_id: z.coerce.number().int().min(1, 'Receiver is required'),
    to_city_id: z.coerce.number().int().min(1, 'Destination city is required'),
    
    walk_in_sender_name: z.string().optional(),
    walk_in_receiver_name: z.string().optional(),
    
    total_delivery_charges: z.coerce.number().optional().default(0),
    total_amount: z.coerce.number().min(0.01, 'Total Amount must be greater than zero'),
    remarks: z.string().max(255).optional(),
}).superRefine((data, ctx) => {
    if (data.sender_id === WALK_IN_CUSTOMER_ID && (!data.walk_in_sender_name || data.walk_in_sender_name.trim().length < 2)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Name is required for the Walk-in Sender.', path: ['walk_in_sender_name'] });
    }
    if (data.receiver_id === WALK_IN_CUSTOMER_ID && (!data.walk_in_receiver_name || data.walk_in_receiver_name.trim().length < 2)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Name is required for the Walk-in Receiver.', path: ['walk_in_receiver_name'] });
      }
});

type ShipmentFormValues = z.infer<typeof ShipmentFormSchema>;

interface DropdownItem {
    id: number;
    name?: string;
    vehicleNumber?: string;
    item_description?: string;
    contactInfo?: string;
}

interface DropdownData {
    cities: DropdownItem[];
    agencies: DropdownItem[];
    vehicles: DropdownItem[];
    parties: DropdownItem[];
    items: DropdownItem[];
}

interface ShipmentData {
    id: number;
    register_number: string;
    bility_number: string;
    bility_date: string;
    sender_id: number;
    receiver_id: number;
    departure_city_id: number;
    to_city_id: number | null;
    forwarding_agency_id: number;
    vehicle_number_id: number;
    total_charges: number;
    total_delivery_charges: number;
    walk_in_sender_name?: string;
    walk_in_receiver_name?: string;
    created_at: string;
    goodsDetails?: { quantity: number; itemCatalog?: { item_description?: string } | null }[];
}

const today = new Date().toISOString().substring(0, 10);

const generateDefaultValues = (): ShipmentFormValues => ({
    register_number: '',
    bility_number: '',
    bility_date: today,
    departure_city_id: 0,
    forwarding_agency_id: 0,
    vehicle_number_id: 0,
    goods_details: [
      { id: uuidv4(), item_id: 0, quantity: 1 }
    ],
    sender_id: 0,
    receiver_id: 0,
    to_city_id: 0,
    walk_in_sender_name: '',
    walk_in_receiver_name: '',
    total_delivery_charges: 0.00,
    total_amount: 0.00,
    remarks: '',
});

const findNameById = (data: DropdownData | null, listName: keyof DropdownData, id: number | null | undefined): string => {
    if (!data || !id) return 'N/A';
    const list = data[listName] as DropdownItem[];
    const item = list.find(item => item.id === id);
    if (listName === 'vehicles') return item?.vehicleNumber || 'Unknown Vehicle';
    if (listName === 'items') return item?.item_description || 'Unknown Item';
    return item?.name || 'Unknown Party/City';
};


export default function AddShipment() {
    const { toast } = useToast();
    const [data, setData] = useState<DropdownData | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [shipments, setShipments] = useState<ShipmentData[]>([]);
    const [isLoadingShipments, setIsLoadingShipments] = useState(false);
    const [isFetchingRegNum, setIsFetchingRegNum] = useState(false);

    const fetchShipments = async () => {
        setIsLoadingShipments(true);
        try {
            const response = await fetch('/api/shipments');
            if (!response.ok) throw new Error('Failed to load shipment list.');
            const list = await response.json();
            setShipments(list);
        } catch (error: any) {
            console.error("Shipments fetch error:", error);
            toast.error({ title: 'Error Loading Shipments', description: 'Could not fetch the list of saved shipments.' });
        } finally {
            setIsLoadingShipments(false);
        }
    };

    const form = useForm<ShipmentFormValues>({
        resolver: zodResolver(ShipmentFormSchema) as any,
        defaultValues: generateDefaultValues(), 
        mode: 'onChange',
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "goods_details",
    });

    const goodsDetails = form.watch("goods_details");
    const senderId = form.watch("sender_id");
    const receiverId = form.watch("receiver_id");
    const bilityDate = form.watch("bility_date");

    // Fetch next registration number when bility_date changes
    useEffect(() => {
        async function fetchNextRegNum() {
            if (!bilityDate) {
                form.setValue('register_number', '');
                return;
            }
            setIsFetchingRegNum(true);
            try {
                const res = await fetch(`/api/shipments/next-register-number?bility_date=${bilityDate}`);
                if (res.ok) {
                    const { register_number } = await res.json();
                    form.setValue('register_number', register_number);
                } else {
                    form.setValue('register_number', '');
                }
            } catch {
                form.setValue('register_number', '');
            } finally {
                setIsFetchingRegNum(false);
            }
        }
        fetchNextRegNum();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bilityDate]);

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
            fetchShipments(); 
        }
        fetchInitialData();
    }, []); 

    async function handleDirectSave(values: ShipmentFormValues) {
        try {
            const payloadToSend = {
                ...values,
                total_charges: values.total_amount, 
                total_delivery_charges: values.total_delivery_charges,
                departure_city_id: Number(values.departure_city_id),
                to_city_id: values.to_city_id ? Number(values.to_city_id) : undefined,
                forwarding_agency_id: Number(values.forwarding_agency_id),
                vehicle_number_id: Number(values.vehicle_number_id),
                sender_id: Number(values.sender_id),
                receiver_id: Number(values.receiver_id),
                goods_details: values.goods_details.map(detail => ({
                    item_id: Number(detail.item_id),
                    quantity: Number(detail.quantity),
                }))
            };

            // Remove register_number from payload, let backend generate it
            delete payloadToSend.register_number;

            const response = await fetch('/api/shipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadToSend),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to register shipment.');
            }
            const result = await response.json();
            const regNum = result.register_number;

            toast.success({ 
                title: 'Shipment Registered Successfully 🚀',
                description: `Registration #: ${regNum} | Bility No: ${values.bility_number} saved to database.`
            });

            // Show the generated registration number in the form (read-only)
            form.reset({ ...generateDefaultValues(), register_number: regNum });
            fetchShipments();

        } catch (error: any) {
            console.error('Submission Error:', error);
            toast.error({ title: 'Error Registering Shipment ⚠️', description: error.message });
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
    const isSenderWalkIn = senderId === WALK_IN_CUSTOMER_ID;
    const isReceiverWalkIn = receiverId === WALK_IN_CUSTOMER_ID;
    const isFormValid = form.formState.isValid;
    const manualTotalAmount = form.watch("total_amount");

    return (
        <div className='p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen'>
            <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>New Shipment Registration</h2>
            
            <Form {...form}>
                <form 
                    onSubmit={form.handleSubmit(handleDirectSave)} 
                    className='space-y-6 p-8 rounded-xl shadow-2xl border border-indigo-100 bg-white mb-10'
                >
                    {/* 1. Registration Number, Bility Number, Bility Date, Departure City */}
                    <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                        <FormField control={form.control} name='register_number' render={({ field }) => (
                            <FormItem>
                                <FormLabel>Registration Number</FormLabel>
                                <FormControl>
                                    <Input placeholder='Auto-generated' {...field} readOnly disabled={isFetchingRegNum} />
                                </FormControl>
                                {isFetchingRegNum && <div className="text-xs text-gray-400">Generating registration number...</div>}
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name='bility_number' render={({ field }) => (
                            <FormItem><FormLabel>Bility Number</FormLabel><FormControl><Input placeholder='BL-001' {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='bility_date' render={({ field }) => (
                            <FormItem><FormLabel>Bility Date</FormLabel><FormControl><Input type='date' {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='departure_city_id' render={({ field }) => (
                            <FormItem><FormLabel>Departure City</FormLabel><Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger></FormControl>
                                <SelectContent>{data?.cities.map(city => (<SelectItem key={city.id} value={String(city.id)}>{city.name}</SelectItem>))}</SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                    </div>

                    {/* 2. Forwarding Agency, Vehicle Number, Quantity, Item Type */}
                    <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                        <FormField control={form.control} name='forwarding_agency_id' render={({ field }) => (
                            <FormItem>
                                <FormLabel>Forwarding Agency</FormLabel>
                                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Agency" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {data?.agencies.map(agency => (
                                            <SelectItem key={agency.id} value={String(agency.id)}>
                                                {agency.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name='vehicle_number_id' render={({ field }) => (
                            <FormItem>
                                <FormLabel>Vehicle Number</FormLabel>
                                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Vehicle" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {data?.vehicles.map(vehicle => (
                                            <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                                                {vehicle.vehicleNumber}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name={`goods_details.0.quantity`} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                    <Input 
                                        type='number' 
                                        placeholder='1' 
                                        {...field} 
                                        min={1} 
                                        onChange={(e) => field.onChange(e.target.valueAsNumber)} 
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name={`goods_details.0.item_id`} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Item Type</FormLabel>
                                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Item" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {data?.items.map(item => (
                                            <SelectItem key={item.id} value={String(item.id)}>
                                                {item.item_description}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                   

                    {/* 4. Sender, Receiver */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <FormField control={form.control} name='sender_id' render={({ field }) => (
                            <FormItem><FormLabel>Sender</FormLabel><Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select Sender" /></SelectTrigger></FormControl>
                                <SelectContent>{data?.parties.map(party => (<SelectItem key={party.id} value={String(party.id)}>{party.name}</SelectItem>))}</SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='receiver_id' render={({ field }) => (
                            <FormItem><FormLabel>Receiver</FormLabel><Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select Receiver" /></SelectTrigger></FormControl>
                                <SelectContent>{data?.parties.map(party => (<SelectItem key={party.id} value={String(party.id)}>{party.name}</SelectItem>))}</SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                    </div>

                    {/* Walk-in fields if needed */}
                    {(isSenderWalkIn || isReceiverWalkIn) && (
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            {isSenderWalkIn && <FormField control={form.control} name='walk_in_sender_name' render={({ field }) => (
                                <FormItem><FormLabel>Walk-in Sender Name</FormLabel><FormControl><Input placeholder='Enter name' {...field} /></FormControl><FormMessage /></FormItem>
                            )} />}
                            {isReceiverWalkIn && <FormField control={form.control} name='walk_in_receiver_name' render={({ field }) => (
                                <FormItem><FormLabel>Walk-in Receiver Name</FormLabel><FormControl><Input placeholder='Enter name' {...field} /></FormControl><FormMessage /></FormItem>
                            )} />}
                        </div>
                    )}

                    {/* 5. Destination, Delivery Charges, Total Amount */}
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                        <FormField control={form.control} name='to_city_id' render={({ field }) => (
                            <FormItem>
                                <FormLabel>Destination City</FormLabel>
                                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Destination" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {data?.cities.map(city => (
                                            <SelectItem key={city.id} value={String(city.id)}>
                                                {city.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <FormField control={form.control} name='total_delivery_charges' render={({ field }) => (
                            <FormItem>
                                <FormLabel>Delivery Charges</FormLabel>
                                <FormControl>
                                    <Input 
                                        type='number' 
                                        placeholder='0.00' 
                                        {...field} 
                                        step='0.01' 
                                        min='0' 
                                        onChange={(e) => field.onChange(e.target.valueAsNumber)} 
                                        className='text-lg font-semibold text-blue-800 border-blue-300 focus:border-blue-500'
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name='total_amount' render={({ field }) => (
                            <FormItem>
                                <FormLabel>Total Amount</FormLabel>
                                <FormControl>
                                    <Input 
                                        type='number' 
                                        placeholder='0.00' 
                                        {...field} 
                                        step='0.01' 
                                        min='0.01' 
                                        onChange={(e) => field.onChange(e.target.valueAsNumber)} 
                                        className='text-lg font-semibold text-green-800 border-green-300 focus:border-green-500'
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    {/* 8. Remarks */}
                    <FormField control={form.control} name='remarks' render={({ field }) => (
                        <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder='Additional notes...' {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                    )} />


                    <Button 
                        type='submit' 
                        className='w-full bg-green-700 hover:bg-green-800 py-4 text-lg font-bold'
                        disabled={itemIsLoading || !isFormValid || manualTotalAmount <= 0}
                    >
                        {form.formState.isSubmitting ? 'Saving...' : 'Save Shipment'} 
                    </Button>
                </form>
            </Form>

            {/* Shipments Table */}
            <div className='mt-12 p-8 rounded-xl shadow-2xl border bg-white'>
                <h2 className='text-2xl font-extrabold mb-6'>Saved Shipments</h2>
                {isLoadingShipments ? (
                    <p className="text-center text-gray-500">Loading...</p>
                ) : shipments.length === 0 ? (
                    <p className="text-center text-gray-500">No shipments found.</p>
                ) : (
                    <div className='overflow-x-auto'>
                        <Table>
                            <TableCaption>All registered shipments</TableCaption>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Reg No</TableHead>
                                    <TableHead>Bility No</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Departure</TableHead>
                                    <TableHead>Agency</TableHead>
                                    <TableHead>Vehicle</TableHead>
                                    <TableHead>Sender</TableHead>
                                    <TableHead>Receiver</TableHead>
                                    <TableHead>Destination</TableHead>
                                    <TableHead>Item Type</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    {/* <TableHead className='text-right'>Delivery Charges</TableHead> */}
                                    <TableHead className='text-right'>Total Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shipments.map((shipment) => (
                                    <TableRow key={shipment.register_number}>
                                        <TableCell className='font-medium'>{shipment.register_number}</TableCell>
                                        <TableCell>{shipment.bility_number}</TableCell>
                                        <TableCell>{new Date(shipment.bility_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{findNameById(data, 'cities', shipment.departure_city_id)}</TableCell>
                                        <TableCell>{findNameById(data, 'agencies', shipment.forwarding_agency_id)}</TableCell>
                                        <TableCell>{findNameById(data, 'vehicles', shipment.vehicle_number_id)}</TableCell>
                                        <TableCell>
                                            {shipment.sender_id === WALK_IN_CUSTOMER_ID && shipment.walk_in_sender_name 
                                                ? shipment.walk_in_sender_name 
                                                : findNameById(data, 'parties', shipment.sender_id)}
                                        </TableCell>
                                        <TableCell>
                                            {shipment.receiver_id === WALK_IN_CUSTOMER_ID && shipment.walk_in_receiver_name 
                                                ? shipment.walk_in_receiver_name 
                                                : findNameById(data, 'parties', shipment.receiver_id)}
                                        </TableCell>
                                        <TableCell>
                                            {shipment.to_city_id ? findNameById(data, 'cities', shipment.to_city_id) : 'Local'}
                                        </TableCell>
                                        <TableCell>
                                            {shipment.goodsDetails && shipment.goodsDetails.length > 0 
                                                ? shipment.goodsDetails.map(detail => detail.itemCatalog?.item_description).join(', ')
                                                : 'N/A'
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {shipment.goodsDetails && shipment.goodsDetails.length > 0 
                                                ? shipment.goodsDetails.reduce((total, detail) => total + detail.quantity, 0)
                                                : 'N/A'
                                            }
                                        </TableCell>
                                        {/* <TableCell className='text-right'>{formatCurrency(shipment.total_delivery_charges)}</TableCell> */}
                                        <TableCell className='text-right font-bold text-green-700'>
                                            {formatCurrency(shipment.total_charges)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}