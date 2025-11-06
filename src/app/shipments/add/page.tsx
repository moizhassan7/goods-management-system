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
import { Checkbox } from '@/components/ui/checkbox'; 
import {
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { 
    Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'; 

// Import the necessary i18n hook
import { useTranslation } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


// --- Toast/Utility Setup ---
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
    register_number: z.string().optional(), 
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
    total_amount: z.coerce.number().min(0, 'Total Amount must be greater than zero'),

    // NEW PAYMENT STATUS FIELDS
    is_already_paid: z.boolean().default(false),
    is_free_of_cost: z.boolean().default(false),
    
    remarks: z.string().max(255).optional(),
}).superRefine((data, ctx) => {
    // Validation for Walk-in
    if (data.sender_id === WALK_IN_CUSTOMER_ID && (!data.walk_in_sender_name || data.walk_in_sender_name.trim().length < 2)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Name is required for the Walk-in Sender.', path: ['walk_in_sender_name'] });
    }
    if (data.receiver_id === WALK_IN_CUSTOMER_ID && (!data.walk_in_receiver_name || data.walk_in_receiver_name.trim().length < 2)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Name is required for the Walk-in Receiver.', path: ['walk_in_receiver_name'] });
      }
    
    // NEW: Validation for payment status conflict
    if (data.is_already_paid && data.is_free_of_cost) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Shipment cannot be both Already Paid and Free of Cost.',
            path: ['is_free_of_cost'], // Path points to one of the conflicting fields
        });
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
    total_delivery_charges: number; // Confirmed available
    walk_in_sender_name?: string;
    walk_in_receiver_name?: string;
    created_at: string; // Confirmed available
    goodsDetails?: { quantity: number; itemCatalog?: { item_description?: string } | null }[];
    payment_status?: string | null; 
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
    // NEW: Default payment status fields
    is_already_paid: false,
    is_free_of_cost: false,
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
    const { t } = useTranslation(); 
    const [data, setData] = useState<DropdownData | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [shipments, setShipments] = useState<ShipmentData[]>([]);
    const [isLoadingShipments, setIsLoadingShipments] = useState(false);
    const [isFetchingRegNum, setIsFetchingRegNum] = useState(false);

    // MODIFIED: fetchShipments now accepts the date to filter by
    const fetchShipments = async (dateToFilter: string) => { 
        if (!dateToFilter) {
             setShipments([]);
             return;
        }
        setIsLoadingShipments(true);
        try {
            // MODIFIED: Pass the date to the API via query param
            const response = await fetch(`/api/shipments?date=${dateToFilter}`);
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
    // WATCH THE BILITY DATE FIELD
    const bilityDate = form.watch("bility_date"); 
    const isAlreadyPaid = form.watch("is_already_paid"); 
    const isFreeOfCost = form.watch("is_free_of_cost"); 
    
    // Determine the status string to send to the API/DB
    const paymentStatusToSend = useMemo(() => {
        if (isFreeOfCost) return 'FREE';
        if (isAlreadyPaid) return 'ALREADY_PAID';
        return 'PENDING'; // Default for normal, billable shipments
    }, [isAlreadyPaid, isFreeOfCost]);


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

    // Load initial data (including filters) on mount
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
            // MODIFIED: Pass the initial today's date to fetchShipments for the table
            fetchShipments(today); 
        }
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 
    
    // NEW: Fetch and display shipments whenever the bility_date changes
    useEffect(() => {
        // This ensures the table list updates instantly when the user changes the Bility Date on the form.
        if (bilityDate) {
            fetchShipments(bilityDate);
        }
    }, [bilityDate]);


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
                
                // NEW: Include the calculated payment status
                payment_status: paymentStatusToSend,
                
                goods_details: values.goods_details.map(detail => ({
                    item_id: Number(detail.item_id),
                    quantity: Number(detail.quantity),
                }))
            };

            // Remove internal form fields not mapped to the DB
            delete payloadToSend.register_number;
            delete payloadToSend.is_already_paid;
            delete payloadToSend.is_free_of_cost;

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
                title: t('shipment_save_button'), 
                description: `Registration #: ${regNum} | Bility No: ${values.bility_number} saved to database.`
            });

            // Reset form
            form.reset({ ...generateDefaultValues(), register_number: regNum });
            // Re-fetch only the shipments for the *new* bilityDate (which is 'today' from the reset)
            fetchShipments(today); 

        } catch (error: any) {
            console.error('Submission Error:', error);
            toast.error({ title: t('shipment_saving_button'), description: error.message }); 
        }
    }

    if (isLoadingData) {
        return (
            <div className='p-6 max-w-4xl mx-auto text-center'>
                <p className="text-xl text-indigo-600">{t('loading_initial_data')}</p>
            </div>
        );
    }

    const itemIsLoading = form.formState.isSubmitting;
    const isSenderWalkIn = senderId === WALK_IN_CUSTOMER_ID;
    const isReceiverWalkIn = receiverId === WALK_IN_CUSTOMER_ID;
    const isFormValid = form.formState.isValid;
    const manualTotalAmount = form.watch("total_amount");
    
    // Formatting the current date for display in the new box
    const displayDate = new Date(today).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className='p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen'>
            {/* *** START NEW FLEX CONTAINER FOR TITLE AND DATE BOX *** */}
            <div className="flex justify-between items-center mb-6 border-b pb-2">
                <h2 className='text-3xl font-extrabold text-gray-900'>
                    {t('shipment_register_title')}
                </h2>
                
                {/* *** NEW DATE BOX *** */}
                <div className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg">
                    <span className="text-sm font-medium">Today's Date:</span>
                    <span className="text-xl font-bold ml-2">
                        {displayDate}
                    </span>
                </div>
            </div>
            {/* *** END NEW CONTAINER *** */}
            
            <Form {...form}>
                <form 
                    onSubmit={form.handleSubmit(handleDirectSave)} 
                    className='space-y-6 p-8 rounded-xl shadow-2xl border border-indigo-100 bg-white mb-10'
                >
                    {/* 1. Registration Number, Bility Number, Bility Date, Departure City */}
                    <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                        <FormField control={form.control} name='register_number' render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('shipment_reg_num_label')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('shipment_reg_num_placeholder')} {...field} readOnly disabled={isFetchingRegNum} />
                                </FormControl>
                                {isFetchingRegNum && <div className="text-xs text-gray-400">{t('shipment_reg_num_loading')}</div>}
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name='bility_number' render={({ field }) => (
                            <FormItem><FormLabel>{t('shipment_bility_num_label')}</FormLabel><FormControl><Input placeholder={t('shipment_bility_num_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='bility_date' render={({ field }) => (
                            <FormItem><FormLabel>{t('shipment_bility_date_label')}</FormLabel><FormControl><Input type='date' {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='departure_city_id' render={({ field }) => (
                            <FormItem><FormLabel>{t('shipment_departure_city_label')}</FormLabel><Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                <FormControl><SelectTrigger><SelectValue placeholder={t('shipment_departure_city_placeholder')} /></SelectTrigger></FormControl>
                                <SelectContent>{data?.cities.map(city => (<SelectItem key={city.id} value={String(city.id)}>{city.name}</SelectItem>))}</SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                    </div>

                    {/* 2. Forwarding Agency, Vehicle Number, Quantity, Item Type */}
                    <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                        <FormField control={form.control} name='forwarding_agency_id' render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('shipment_agency_label')}</FormLabel>
                                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('shipment_agency_placeholder')} />
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
                                <FormLabel>{t('shipment_vehicle_label')}</FormLabel>
                                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('shipment_vehicle_placeholder')} />
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
                                <FormLabel>{t('shipment_quantity_label')}</FormLabel>
                                <FormControl>
                                    <Input 
                                        type='number' 
                                        placeholder={t('shipment_quantity_placeholder')}
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
                                <FormLabel>{t('shipment_item_type_label')}</FormLabel>
                                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('shipment_item_type_placeholder')} />
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
                            <FormItem><FormLabel>{t('shipment_sender_label')}</FormLabel><Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                <FormControl><SelectTrigger><SelectValue placeholder={t('shipment_sender_placeholder')} /></SelectTrigger></FormControl>
                                <SelectContent>{data?.parties.map(party => (<SelectItem key={party.id} value={String(party.id)}>{party.name}</SelectItem>))}</SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name='receiver_id' render={({ field }) => (
                            <FormItem><FormLabel>{t('shipment_receiver_label')}</FormLabel><Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                <FormControl><SelectTrigger><SelectValue placeholder={t('shipment_receiver_placeholder')} /></SelectTrigger></FormControl>
                                <SelectContent>{data?.parties.map(party => (<SelectItem key={party.id} value={String(party.id)}>{party.name}</SelectItem>))}</SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                    </div>

                    {/* Walk-in fields if needed */}
                    {(isSenderWalkIn || isReceiverWalkIn) && (
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            {isSenderWalkIn && <FormField control={form.control} name='walk_in_sender_name' render={({ field }) => (
                                <FormItem><FormLabel>{t('shipment_walk_in_sender_label')}</FormLabel><FormControl><Input placeholder={t('shipment_walk_in_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />}
                            {isReceiverWalkIn && <FormField control={form.control} name='walk_in_receiver_name' render={({ field }) => (
                                <FormItem><FormLabel>{t('shipment_walk_in_receiver_label')}</FormLabel><FormControl><Input placeholder={t('shipment_walk_in_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />}
                        </div>
                    )}

                    {/* 5. Destination, Delivery Charges, Total Amount */}
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                        <FormField control={form.control} name='to_city_id' render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('shipment_dest_city_label')}</FormLabel>
                                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : ''} disabled={itemIsLoading}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('shipment_dest_city_placeholder')} />
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
                                <FormLabel>{t('shipment_delivery_charges_label')}</FormLabel>
                                <FormControl>
                                    <Input 
                                        type='number' 
                                        placeholder={t('shipment_delivery_charges_placeholder')} 
                                        {...field} 
                                        step='0' 
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
                                <FormLabel>{t('shipment_total_amount_label')}</FormLabel>
                                <FormControl>
                                    <Input 
                                        type='number' 
                                        placeholder={t('shipment_total_amount_placeholder')} 
                                        {...field} 
                                        step='0' 
                                        min='0' 
                                        onChange={(e) => field.onChange(e.target.valueAsNumber)} 
                                        className='text-lg font-semibold text-green-800 border-green-300 focus:border-green-500'
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    
                    {/* NEW: Payment Status Checkboxes */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t'>
                        <FormField
                            control={form.control}
                            name='is_already_paid'
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 bg-yellow-50">
                                    <FormControl>
                                        <Checkbox 
                                            checked={field.value} 
                                            onCheckedChange={field.onChange} 
                                            disabled={isFreeOfCost} // Disable if Free is checked
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel className="text-base font-semibold cursor-pointer">
                                            Is Already Paid (Cash Received)
                                        </FormLabel>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name='is_free_of_cost'
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 bg-gray-100">
                                    <FormControl>
                                        <Checkbox 
                                            checked={field.value} 
                                            onCheckedChange={field.onChange} 
                                            disabled={isAlreadyPaid} // Disable if Paid is checked
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel className="text-base font-semibold cursor-pointer">
                                            Is Free of Cost
                                        </FormLabel>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* 8. Remarks */}
                    <FormField control={form.control} name='remarks' render={({ field }) => (
                        <FormItem><FormLabel>{t('shipment_remarks_label')}</FormLabel><FormControl><Textarea placeholder={t('shipment_remarks_placeholder')} {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                    )} />


                    <Button 
                        type='submit' 
                        className='w-full bg-green-700 hover:bg-green-800 py-4 text-lg font-bold'
                        disabled={itemIsLoading || !isFormValid || manualTotalAmount <= 0}
                    >
                        {form.formState.isSubmitting ? t('shipment_saving_button') : t('shipment_save_button')}
                    </Button>
                </form>
            </Form>

            {/* Shipments Table */}
            <div className='mt-12 p-8 rounded-xl shadow-2xl border bg-white'>
                {/* MODIFIED HEADER TEXT */}
                <h2 className='text-2xl font-extrabold mb-6'>Today's Shipments ({bilityDate ? new Date(bilityDate).toLocaleDateString() : 'Loading...'})</h2>
                {isLoadingShipments ? (
                    <p className="text-center text-gray-500">Loading...</p>
                ) : shipments.length === 0 ? (
                    <p className="text-center text-gray-500">No shipments found for the selected date.</p>
                ) : (
                    <div className='overflow-x-auto'>
                        <Table>
                            <TableCaption>{t('shipment_table_caption')}</TableCaption>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('shipment_table_reg_no')}</TableHead>
                                    <TableHead>{t('shipment_table_bility_no')}</TableHead>
                                    <TableHead>{t('shipment_table_date')}</TableHead>
                                    <TableHead>{t('shipment_table_departure')}</TableHead>
                                    <TableHead>{t('shipment_table_agency')}</TableHead>
                                    <TableHead>{t('shipment_table_vehicle')}</TableHead>
                                    <TableHead>{t('shipment_table_sender')}</TableHead>
                                    <TableHead>{t('shipment_table_receiver')}</TableHead>
                                    <TableHead>{t('shipment_table_destination')}</TableHead>
                                    {/* --- NEW COLUMNS ADDED HERE --- */}
                                    <TableHead>Current Date</TableHead> 
                                    {/* ------------------------------- */}
                                    <TableHead>{t('shipment_table_item_type')}</TableHead>
                                    <TableHead>{t('shipment_table_quantity')}</TableHead>
                                    <TableHead className='text-right'>Delivery Charges</TableHead>
                                    <TableHead className='text-right'>Payment Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shipments.map((shipment) => (
                                    <TableRow key={shipment.register_number}>
                                        <TableCell className='font-mono text-sm'>{shipment.register_number}</TableCell>
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
                                        {/* --- NEW CELLS ADDED HERE --- */}
                                        <TableCell>
                                            {/* Uses the createdAt timestamp, formatted to local date string */}
{                                            new Date(shipment.bility_date).toLocaleDateString()
}                                        </TableCell>
                                       
                                        {/* ------------------------------- */}
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
                                         <TableCell className='text-right'>
                                            {/* Formats and displays the total_delivery_charges */}
                                            {formatCurrency(shipment.total_delivery_charges)}
                                        </TableCell>
                                        <TableCell className='text-right font-bold'>
                                            {/* Display Payment Status */}
                                            {shipment.payment_status === 'ALREADY_PAID' && <span className='text-green-600'>PAID</span>}
                                            {shipment.payment_status === 'FREE' && <span className='text-blue-600'>FREE</span>}
                                            {shipment.payment_status === 'PENDING' && <span className='text-red-600'>{formatCurrency(shipment.total_charges)}</span>}
                                            {/* Fallback if no status, default to amount */}
                                            {!shipment.payment_status && formatCurrency(shipment.total_charges)} 
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