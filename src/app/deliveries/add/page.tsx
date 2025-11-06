// src/app/deliveries/add/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast as sonnerToast } from 'sonner';

// Import the translation hook
import { useTranslation } from '@/lib/i18n';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { 
    Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';

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
    // MODIFIED: CNIC is now optional (min length requirement removed)
    receiver_cnic: z.string().max(15, 'CNIC cannot exceed 15 characters'),
    // MODIFIED: Address is now optional (min length requirement removed)
    receiver_address: z.string(),
    
    delivery_notes: z.string().optional(),
});

type DeliveryFormValues = z.infer<typeof DeliveryFormSchema>;

interface ShipmentData {
    register_number: string;
    bility_number: string;
    bility_date: string;
    total_charges: number | string; 
    departureCity?: { name: string; };
    toCity?: { name: string; };
    sender?: { name: string; };
    receiver?: { name: string; contactInfo?: string; };
    walk_in_sender_name?: string;
    walk_in_receiver_name?: string;
    // *** NEW EXPENSE FIELDS ON SHIPMENT OBJECT ***
    station_expense: number;
    bility_expense: number;
    station_labour: number;
    cart_labour: number;
    total_expenses: number;
    // *******************************************
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
    const { t } = useTranslation(); 
    
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
        // This recalculation remains important if the user edits the pre-filled fields
        const total = (stationExpense || 0) + (bilityExpense || 0) + (stationLabour || 0) + (cartLabour || 0);
        form.setValue("total_expenses", total);
    }, [stationExpense, bilityExpense, stationLabour, cartLabour, form]);

    const searchShipment = async (bilityNumber: string) => {
        if (!bilityNumber.trim()) {
            toast.error({ title: t('delivery_search_card_title'), description: t('delivery_bility_number_placeholder') });
            return;
        }

        setIsSearching(true);
        // Clear previous shipment data immediately.
        setShipmentData(null); 
        
        // Reset fields (keeping the bility number but clearing all populated/expense fields)
        form.reset({ 
            ...form.getValues(),
            receiver_name: '', 
            receiver_phone: '', 
            receiver_cnic: '', 
            receiver_address: '', 
            delivery_notes: '',
            station_expense: 0,
            bility_expense: 0,
            station_labour: 0,
            cart_labour: 0,
            total_expenses: 0,
            bility_number: bilityNumber
        }, { keepDefaultValues: true }); 

        try {
            const response = await fetch(`/api/shipments?bility_number=${bilityNumber}`);
            
            if (!response.ok) {
                 throw new Error('Failed to search shipment or shipment not found.');
            }
            
            const shipment = await response.json();
            
            const foundShipment = Array.isArray(shipment) && shipment.length > 0 ? shipment[0] : null;

            if (foundShipment) {
                setShipmentData(foundShipment);
                
                // Pre-fill receiver name and phone
                const receiverName = foundShipment.walk_in_receiver_name || foundShipment.receiver?.name || '';
                const receiverPhone = foundShipment.receiver?.contactInfo || ''; 

                form.setValue('receiver_name', receiverName);
                form.setValue('receiver_phone', receiverPhone);
                
                // *** CRITICAL FIX: Auto-populate Expense Fields from Shipment Data ***
                form.setValue('station_expense', foundShipment.station_expense || 0);
                form.setValue('bility_expense', foundShipment.bility_expense || 0);
                form.setValue('station_labour', foundShipment.station_labour || 0);
                form.setValue('cart_labour', foundShipment.cart_labour || 0);
                // Note: total_expenses is set here, but also recalculated by the useEffect above
                form.setValue('total_expenses', foundShipment.total_expenses || 0); 
                // *******************************************************************
                
                toast.success({ 
                    title: t('delivery_search_button'), 
                    description: `Found shipment: ${foundShipment.bility_number} (Reg: ${foundShipment.register_number})` 
                });
            } else {
                 toast.error({ 
                    title: t('delivery_search_button'), 
                    description: `Shipment with bility number: ${bilityNumber} not found.` 
                });
            }
        } catch (error: any) {
            console.error("Search error:", error);
            toast.error({ title: t('delivery_search_button'), description: error.message || 'Could not search for shipment.' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async (values: DeliveryFormValues) => {
        if (!shipmentData || !shipmentData.register_number) {
            toast.error({ title: t('delivery_record_button'), description: 'Please search and select a valid shipment first.' });
            return;
        }
        
        // Safety check: Do not allow delivery if an expense field was missed and remained 0
        if (values.total_expenses === 0) {
            // Note: Since expenses are now prepopulated from the shipment, this might only trigger 
            // if the original data entry was flawed, or if the user cleared the fields.
             toast.error({ title: t('delivery_record_button'), description: 'Total expenses must be greater than 0.' });
             return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...values,
                shipment_id: shipmentData.register_number, 
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
                title: t('delivery_record_button'),
                description: `Delivery for bility ${values.bility_number} has been recorded.`
            });
            
            form.reset(generateDefaultValues());
            setShipmentData(null);

        } catch (error: any) {
            console.error('Submission Error:', error);
            toast.error({ title: t('delivery_recording_button'), description: error.message });
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
            <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>{t('delivery_page_title')}</h2>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
                    
                    {/* Search Section */}
                    <Card className='p-6 shadow-lg'>
                        <CardHeader>
                            <CardTitle className='text-xl text-blue-800'>{t('delivery_search_card_title')}</CardTitle>
                            <CardDescription>{t('delivery_search_card_description')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                <FormField 
                                    control={form.control} 
                                    name='bility_number' 
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('delivery_bility_number_label')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder={t('delivery_bility_number_placeholder')} {...field} />
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
                                        {isSearching ? t('delivery_searching_button') : t('delivery_search_button')}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shipment Details Display */}
                    {shipmentData && (
                        <Card className='p-6 shadow-lg border-green-200 bg-green-50'>
                            <CardHeader>
                                <CardTitle className='text-xl text-green-800'>{t('delivery_details_card_title')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                    <div>
                                        <label className='text-sm font-medium text-gray-600'>{t('delivery_detail_reg_num')}</label>
                                        <p className='text-lg font-semibold'>{shipmentData.register_number}</p>
                                    </div>
                                    <div>
                                        <label className='text-sm font-medium text-gray-600'>{t('delivery_detail_bility_date')}</label>
                                        <p className='text-lg font-semibold'>
                                           {new Date(shipmentData.bility_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                    <label className='text-sm font-medium text-gray-600'>{t('delivery_detail_total_amount')}</label>
                                        <p className='text-lg font-semibold text-green-600'>
                                            {/* FIX: Ensure total_charges is converted to string before Number() to handle Prisma Decimal type reliably */}
                                            **${Number(shipmentData.total_charges.toString()).toFixed(2)}**
                                        </p>
                                    </div>
                                    <div>
                                        <label className='text-sm font-medium text-gray-600'>{t('delivery_detail_from')}</label>
                                        <p className='text-lg'>{shipmentData.departureCity?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className='text-sm font-medium text-gray-600'>{t('delivery_detail_to')}</label>
                                        <p className='text-lg'>{shipmentData.toCity?.name || 'Local'}</p>
                                    </div>
                                    <div>
                                        <label className='text-sm font-medium text-gray-600'>{t('delivery_detail_sender')}</label>
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
                                    <CardTitle className='text-xl text-purple-800'>{t('delivery_details_card_delivery_title')}</CardTitle>
                                </CardHeader>
                                <CardContent className='space-y-4'>
                                    <FormField 
                                        control={form.control} 
                                        name='delivery_date' 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('delivery_date_label')}</FormLabel>
                                                <FormControl>
                                                    <Input type='date' {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />

                                    {/* Expense Fields - Now pre-filled */}
                                    <div className='space-y-4'>
                                        <h4 className='font-semibold text-gray-700'>{t('delivery_expenses_heading')} (Pre-filled, editable)</h4>
                                        
                                        <FormField 
                                            control={form.control} 
                                            name='station_expense' 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('delivery_station_expense_label')}</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type='number' 
                                                            placeholder={t('shipment_delivery_charges_placeholder')} 
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
                                                    <FormLabel>{t('delivery_bility_expense_label')}</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type='number' 
                                                            placeholder={t('shipment_delivery_charges_placeholder')} 
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
                                                    <FormLabel>{t('delivery_station_labour_label')}</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type='number' 
                                                            placeholder={t('shipment_delivery_charges_placeholder')} 
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
                                                    <FormLabel>{t('delivery_cart_labour_label')}</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type='number' 
                                                            placeholder={t('shipment_delivery_charges_placeholder')} 
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
                                                    <FormLabel>{t('delivery_total_expenses_label')}</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type='number' 
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
                                    <CardTitle className='text-xl text-orange-800'>{t('delivery_receiver_details_title')}</CardTitle>
                                </CardHeader>
                                <CardContent className='space-y-4'>
                                    <FormField 
                                        control={form.control} 
                                        name='receiver_name' 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('delivery_receiver_name_label')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('delivery_receiver_name_placeholder')} {...field} />
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
                                                <FormLabel>{t('delivery_phone_label')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('delivery_phone_placeholder')} {...field} />
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
                                                <FormLabel>{t('delivery_cnic_label')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('delivery_cnic_placeholder')} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />

                                    {/* <FormField 
                                        control={form.control} 
                                        name='receiver_address' 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('delivery_address_label')}</FormLabel>
                                                <FormControl>
                                                    <Textarea 
                                                        placeholder={t('delivery_address_placeholder')} 
                                                        {...field} 
                                                        rows={4}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    /> */}

                                    <FormField 
                                        control={form.control} 
                                        name='delivery_notes' 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('delivery_notes_label')}</FormLabel>
                                                <FormControl>
                                                    <Textarea 
                                                        placeholder={t('delivery_notes_placeholder')} 
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
                            {isSubmitting ? t('delivery_recording_button') : t('delivery_record_button')} 
                        </Button>
                    )}
                </form>
            </Form>
        </div>
    );
}