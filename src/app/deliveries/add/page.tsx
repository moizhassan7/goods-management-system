// src/app/deliveries/add/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast as sonnerToast } from 'sonner';
import { Printer } from 'lucide-react';

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
    receiver_phone: z.string().optional(),
    // MODIFIED: CNIC is now optional (min length requirement removed)
    receiver_cnic: z.string().max(15, 'CNIC cannot exceed 15 characters').optional(),
    // MODIFIED: Address is now optional (min length requirement removed)
    receiver_address: z.string().optional(),
    
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

                // NOTE: Do NOT auto-fill receiver_name or receiver_phone here.
                // Leave those fields for the user to enter/confirm manually.

                // Auto-populate Expense Fields from Shipment Data (still desired)
                form.setValue('station_expense', foundShipment.station_expense || 0);
                form.setValue('bility_expense', foundShipment.bility_expense || 0);
                form.setValue('station_labour', foundShipment.station_labour || 0);
                form.setValue('cart_labour', foundShipment.cart_labour || 0);
                // Note: total_expenses is set here, but also recalculated by the useEffect above
                form.setValue('total_expenses', foundShipment.total_expenses || 0);

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

    const formatCurrency = (amount: number | string) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2,
        }).format(Number(amount));
    };

    const handlePrintDelivery = (values: DeliveryFormValues) => {
        if (!shipmentData) {
            toast.error({ title: 'Error', description: 'No shipment data available to print.' });
            return;
        }
        try {
            const printHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Delivery Record</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 20px;
            background-color: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid black; 
            padding-bottom: 20px; 
            margin-bottom: 20px; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: bold;
        }
        .header p { 
            margin: 5px 0; 
            font-size: 14px; 
            color: #666;
        }
        .section { 
            border: 1px solid #ccc; 
            padding: 15px; 
            margin-bottom: 15px; 
        }
        .section-title { 
            font-weight: bold; 
            font-size: 14px; 
            color: #333;
            text-transform: uppercase; 
            margin-bottom: 10px; 
            padding-bottom: 5px;
            border-bottom: 1px solid #999;
        }
        .row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 10px;
        }
        .field {
            font-size: 13px;
        }
        .field-label { 
            font-weight: bold; 
            color: #555;
        }
        .field-value {
            color: #000;
            margin-top: 2px;
        }
        .expense-section {
            background-color: #ffe4b5;
        }
        .financial-section {
            background-color: #fffacd;
        }
        .expense-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
            font-size: 13px;
        }
        .expense-row:last-child {
            border-bottom: 2px solid #999;
            font-weight: bold;
            padding-top: 10px;
            margin-top: 10px;
        }
        .footer { 
            text-align: center; 
            border-top: 2px solid black; 
            padding-top: 15px; 
            margin-top: 20px; 
            font-size: 11px; 
            color: #666; 
        }
        @media print {
            body { margin: 0; padding: 0; }
            .container { max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DELIVERY RECORD</h1>
            <p>Zikria Goods Transports Company</p>
        </div>

        <div class="section">
            <div class="section-title">Shipment Information</div>
            <div class="row">
                <div class="field">
                    <div class="field-label">Registration Number:</div>
                    <div class="field-value" style="font-size: 16px; color: #0066cc; font-weight: bold;">${shipmentData.register_number}</div>
                </div>
                <div class="field">
                    <div class="field-label">Bility Number:</div>
                    <div class="field-value" style="font-size: 16px; color: #0066cc; font-weight: bold;">${shipmentData.bility_number}</div>
                </div>
            </div>
            <div class="row">
                <div class="field">
                    <div class="field-label">Bility Date:</div>
                    <div class="field-value">${new Date(shipmentData.bility_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
                <div class="field">
                    <div class="field-label">Delivery Date:</div>
                    <div class="field-value">${new Date(values.delivery_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Route Information</div>
            <div class="row">
                <div class="field">
                    <div class="field-label">From City:</div>
                    <div class="field-value">${shipmentData.departureCity?.name || 'N/A'}</div>
                </div>
                <div class="field">
                    <div class="field-label">To City:</div>
                    <div class="field-value">${shipmentData.toCity?.name || 'Local'}</div>
                </div>
            </div>
            <div class="row">
                <div class="field">
                    <div class="field-label">Sender:</div>
                    <div class="field-value">${shipmentData.walk_in_sender_name || shipmentData.sender?.name || 'N/A'}</div>
                </div>
                <div class="field">
                    <div class="field-label">Original Receiver:</div>
                    <div class="field-value">${shipmentData.walk_in_receiver_name || shipmentData.receiver?.name || 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Delivery Details</div>
            <div class="row">
                <div class="field">
                    <div class="field-label">Receiver Name:</div>
                    <div class="field-value" style="font-weight: bold;">${values.receiver_name}</div>
                </div>
                <div class="field">
                    <div class="field-label">Phone Number:</div>
                    <div class="field-value">${values.receiver_phone || 'N/A'}</div>
                </div>
            </div>
            <div class="row">
                <div class="field">
                    <div class="field-label">CNIC:</div>
                    <div class="field-value">${values.receiver_cnic || 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="section financial-section">
            <div class="section-title">Financial Information</div>
            <div class="field" style="padding: 10px 0;">
                <div class="field-label">Total Amount (Shipment):</div>
                <div class="field-value" style="font-size: 16px; color: #008000; font-weight: bold;">${formatCurrency(shipmentData.total_charges.toString())}</div>
            </div>
        </div>

        <div class="section expense-section">
            <div class="section-title">Expense Breakdown</div>
            <div class="expense-row">
                <span>Station Expense:</span>
                <span>${formatCurrency(values.station_expense)}</span>
            </div>
            <div class="expense-row">
                <span>Bility Expense:</span>
                <span>${formatCurrency(values.bility_expense)}</span>
            </div>
            <div class="expense-row">
                <span>Station Labour:</span>
                <span>${formatCurrency(values.station_labour)}</span>
            </div>
            <div class="expense-row">
                <span>Cart Labour:</span>
                <span>${formatCurrency(values.cart_labour)}</span>
            </div>
            <div class="expense-row">
                <span>Total Expenses:</span>
                <span>${formatCurrency(values.total_expenses)}</span>
            </div>
        </div>

        ${values.delivery_notes ? `
        <div class="section">
            <div class="section-title">Delivery Notes</div>
            <div style="font-size: 13px; color: #333; white-space: pre-wrap; line-height: 1.5;">
                ${values.delivery_notes}
            </div>
        </div>
        ` : ''}

        <div class="footer">
            <p>Printed on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p>© Switch2itech. All Rights Reserved.</p>
        </div>
    </div>
</body>
</html>
            `;

            const printWindow = window.open('', '', 'height=800,width=900');
            if (printWindow) {
                printWindow.document.write(printHTML);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                }, 250);
            }
        } catch (err) {
            console.error('Print error:', err);
            toast.error({ title: 'Print Error', description: 'Unable to print the delivery record.' });
        }
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
                                                <Input
                                                    placeholder={t('delivery_bility_number_placeholder')}
                                                    {...field}
                                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleSearch();
                                                        }
                                                    }}
                                                />
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
                                        <label className='text-sm font-medium text-gray-600'>{t('delivery_detail_bility_number') || 'Bility #'}</label>
                                        <p className='text-lg font-semibold'>{shipmentData.bility_number}</p>
                                    </div>
                                    <div>
                                        <label className='text-sm font-medium text-gray-600'>{t('delivery_detail_total_amount')}</label>
                                        <p className='text-lg font-semibold text-green-600'>
                                            {/* FIX: Ensure total_charges is converted to string before Number() to handle Prisma Decimal type reliably */}
                                            Rs {Number(shipmentData.total_charges.toString()).toFixed(2)}/-
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
                                    <div>
                                        <label className='text-sm font-medium text-gray-600'>{t('delivery_detail_reciver')}</label>
                                        <p className='text-lg'>
                                                {shipmentData.walk_in_receiver_name || shipmentData.receiver?.name || 'N/A'}
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
                        <div className='flex gap-4'>
                            <Button 
                                type='submit' 
                                className='flex-1 bg-green-700 hover:bg-green-800 py-4 text-lg font-bold'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? t('delivery_recording_button') : t('delivery_record_button')} 
                            </Button>
                            <Button 
                                type='button' 
                                className='flex-1 bg-blue-600 hover:bg-blue-700 py-4 text-lg font-bold flex items-center justify-center gap-2'
                                onClick={() => handlePrintDelivery(form.getValues())}
                                disabled={isSubmitting}
                            >
                                <Printer className='h-5 w-5' />
                                Print
                            </Button>
                        </div>
                    )}
                </form>
            </Form>
        </div>
    );
}