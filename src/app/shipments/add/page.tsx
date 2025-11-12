// components/AddShipment.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Check, ChevronsUpDown, Printer, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import the necessary i18n hook
import { useTranslation } from '@/lib/i18n';
import { SearchableDropdown } from "@/components/ui/SearchableDropdown";

// --- Toast/Utility Setup (Keep existing useToast implementation) ---
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

    // EXPENSE FIELDS
    station_expense: z.coerce.number().optional().default(0),
    bility_expense: z.coerce.number().optional().default(0),
    station_labour: z.coerce.number().optional().default(0),
    cart_labour: z.coerce.number().optional().default(0),
    total_expenses: z.coerce.number().optional().default(0),

    // PAYMENT STATUS FIELDS
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

    // Validation for payment status conflict
    if (data.is_already_paid && data.is_free_of_cost) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Shipment cannot be both Already Paid and Free of Cost.',
            path: ['is_free_of_cost'],
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
    total_delivery_charges: number;
    walk_in_sender_name?: string;
    walk_in_receiver_name?: string;
    created_at: string;
    goodsDetails?: { quantity: number; itemCatalog?: { item_description?: string } | null }[];
    payment_status?: string | null;
    station_expense: number;
    bility_expense: number;
    station_labour: number;
    cart_labour: number;
    total_expenses: number;
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
    station_expense: 0.00,
    bility_expense: 0.00,
    station_labour: 0.00,
    cart_labour: 0.00,
    total_expenses: 0.00,
    is_already_paid: false,
    is_free_of_cost: false,
    remarks: '',
});

const findNameById = (data: DropdownData | null, listName: keyof DropdownData, id: number | null | undefined): string => {
    // Treat 0 as valid id — only treat null/undefined as absent
    if (!data || id == null) return 'N/A';
    const list = data[listName] as DropdownItem[];
    const item = list.find(item => item.id === id);
    if (!item) return 'Unknown';
    if (listName === 'vehicles') return item.vehicleNumber || 'Unknown Vehicle';
    if (listName === 'items') return item.item_description || 'Unknown Item';
    return item.name || 'Unknown Party/City';
};


export default function AddShipment() {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useTranslation();
    const [data, setData] = useState<DropdownData | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [shipments, setShipments] = useState<ShipmentData[]>([]);
    const [isLoadingShipments, setIsLoadingShipments] = useState(false);
    const [isFetchingRegNum, setIsFetchingRegNum] = useState(false);
    const [lastSavedShipment, setLastSavedShipment] = useState<any>(null);
    const [showPrintOptions, setShowPrintOptions] = useState(false);

    // --- MODAL STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'city' | 'agency' | 'vehicle' | 'party' | 'item' | null>(null);
    const [modalInput, setModalInput] = useState<any>({});
    const [isModalSubmitting, setIsModalSubmitting] = useState(false);
    const [city, setCity] = useState<string | null>(null);
    const [agency, setAgency] = useState<string | null>(null);
    const [vehicles, setVehicles] = useState<string | null>(null);
    const [item, setItem] = useState<string | null>(null);
    const [sender, setSender] = useState<string | null>(null);
    const [reciver, setReciver] = useState<string | null>(null);

    const fetchShipments = async (dateToFilter: string) => {
        if (!dateToFilter) {
            setShipments([]);
            return;
        }
        setIsLoadingShipments(true);
        try {
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

    const { setValue } = form;

    const stationExpense = form.watch("station_expense");
    const bilityExpense = form.watch("bility_expense");
    const stationLabour = form.watch("station_labour");
    const cartLabour = form.watch("cart_labour");
    const totalDeliveryCharges = form.watch("total_delivery_charges");
    const isAlreadyPaid = form.watch("is_already_paid");
    const isFreeOfCost = form.watch("is_free_of_cost");
    const senderId = form.watch("sender_id");
    const receiverId = form.watch("receiver_id");
    const bilityDate = form.watch("bility_date");

    // Recalculate Total Expenses only (Total Amount is independent)
    useEffect(() => {
        const calculatedTotalExp = (Number(stationExpense) || 0) + (Number(bilityExpense) || 0) + (Number(stationLabour) || 0) + (Number(cartLabour) || 0);
        setValue("total_expenses", calculatedTotalExp);
    }, [stationExpense, bilityExpense, stationLabour, cartLabour, setValue]);

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "goods_details",
    });

    const paymentStatusToSend = useMemo(() => {
        if (isFreeOfCost) return 'FREE';
        if (isAlreadyPaid) return 'ALREADY_PAID';
        return 'PENDING';
    }, [isAlreadyPaid, isFreeOfCost]);

    const fetchDropdownData = async () => {
        try {
            const response = await fetch('/api/lists');
            if (!response.ok) throw new Error('Failed to load dependency lists.');
            const lists = await response.json();
            setData(lists);
            return lists;
        } catch (error: any) {
            console.error("Data fetch error:", error);
            toast.error({ title: 'Error Loading Data', description: error.message || 'Could not fetch lists. Check API /api/lists.' });
        }
        return null;
    }

    // Load initial dropdown data
    useEffect(() => {
        async function fetchInitialDataAndSetDefaults() {
            setIsLoadingData(true);
            const lists = await fetchDropdownData();

            if (lists?.parties?.length > 0) {
                const defaultPartyId = lists.parties.find((p: any) => p.id === WALK_IN_CUSTOMER_ID)?.id || lists.parties[0].id;
                setValue('sender_id', defaultPartyId, { shouldValidate: true });
                setValue('receiver_id', defaultPartyId, { shouldValidate: true });
            }

            fetchShipments(today);
            setIsLoadingData(false);
        }
        fetchInitialDataAndSetDefaults();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch next registration number when bility_date changes
    useEffect(() => {
        async function fetchNextRegNum() {
            if (!bilityDate) {
                setValue('register_number', '');
                return;
            }
            setIsFetchingRegNum(true);
            try {
                const res = await fetch(`/api/shipments/next-register-number?bility_date=${bilityDate}`);
                if (res.ok) {
                    const { register_number } = await res.json();
                    setValue('register_number', register_number);
                } else {
                    setValue('register_number', '');
                }
            } catch {
                setValue('register_number', '');
            } finally {
                setIsFetchingRegNum(false);
            }
        }
        fetchNextRegNum();
        if (bilityDate) {
            fetchShipments(bilityDate);
        }
    }, [bilityDate, setValue]);

    // --- Master Data Modal Logic ---
    const openMasterDataModal = (type: typeof modalType) => {
        setModalType(type);
        setModalInput({});
        setIsModalOpen(true);
    };

    const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setModalInput((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddMasterData = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalType) return;

        setIsModalSubmitting(true);
        let endpoint = '';
        let payload: any = {};
        let successMessage = '';

        try {
            switch (modalType) {
                case 'city':
                    if (!modalInput.cityName || modalInput.cityName.trim().length < 2) throw new Error('City name required.');
                    endpoint = '/api/cities';
                    payload = { name: modalInput.cityName.trim() };
                    successMessage = `City ${modalInput.cityName} added successfully.`;
                    break;
                case 'agency':
                    if (!modalInput.agencyName || modalInput.agencyName.trim().length < 2) throw new Error('Agency name required.');
                    endpoint = '/api/agencies';
                    payload = { name: modalInput.agencyName.trim() };
                    successMessage = `Agency ${modalInput.agencyName} added successfully.`;
                    break;
                case 'vehicle':
                    if (!modalInput.vehicleNumber || modalInput.vehicleNumber.trim().length < 2) throw new Error('Vehicle number required.');
                    endpoint = '/api/vehicles';
                    payload = { vehicleNumber: modalInput.vehicleNumber.trim().toUpperCase() };
                    successMessage = `Vehicle ${modalInput.vehicleNumber} added successfully.`;
                    break;
                case 'item':
                    if (!modalInput.description || modalInput.description.trim().length < 3) throw new Error('Item description required.');
                    endpoint = '/api/items';
                    payload = { description: modalInput.description.trim() };
                    successMessage = `Item ${modalInput.description} added successfully.`;
                    break;
                case 'party':
                    if (!modalInput.name || modalInput.name.trim().length < 3) throw new Error('Party name required.');
                    if (modalInput.openingBalance === undefined) throw new Error('Opening balance required.');
                    endpoint = '/api/parties';
                    payload = {
                        name: modalInput.name.trim(),
                        contactInfo: modalInput.contactInfo?.trim() || '',
                        openingBalance: parseFloat(modalInput.openingBalance) || 0
                    };
                    successMessage = `Party ${modalInput.name} registered successfully.`;
                    break;
                default:
                    throw new Error('Invalid master data type.');
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to add ${modalType}.`);
            }

            const newEntry = await response.json();

            toast.success({ title: "Success", description: successMessage });

            // Update the local dropdown data
            const latestLists = await fetchDropdownData();

            // Select the newly added item in the main form (coerce to number)
            const newIdRaw = newEntry.id ?? newEntry.register_number ?? null;
            const newIdNumber = newIdRaw != null ? Number(newIdRaw) : null;

            if (newIdNumber != null) {
                switch (modalType) {
                    case 'agency':
                        setValue('forwarding_agency_id', newIdNumber, { shouldValidate: true });
                        break;
                    case 'vehicle':
                        setValue('vehicle_number_id', newIdNumber, { shouldValidate: true });
                        break;
                    case 'item':
                        // Place newly created item into the first goods detail
                        setValue('goods_details.0.item_id', newIdNumber, { shouldValidate: true });
                        break;
                    case 'city':
                        // if you want to auto-select for departure/to city add logic here
                        break;
                }
            }

            setIsModalOpen(false);
            setModalInput({});

        } catch (error: any) {
            console.error(`Master Data Add Error (${modalType}):`, error);
            toast.error({ title: `Error Adding ${modalType?.toUpperCase()}`, description: error.message });
        } finally {
            setIsModalSubmitting(false);
        }
    };

    const handleDirectSave = useCallback(async (values: ShipmentFormValues) => {
        try {
            const { register_number, is_already_paid, is_free_of_cost, ...restValues } = values;

            const payloadToSend = {
                ...restValues,
                total_charges: values.total_amount,
                total_delivery_charges: values.total_delivery_charges,
                departure_city_id: Number(values.departure_city_id),
                to_city_id: values.to_city_id ? Number(values.to_city_id) : undefined,
                forwarding_agency_id: Number(values.forwarding_agency_id),
                vehicle_number_id: Number(values.vehicle_number_id),
                sender_id: Number(values.sender_id),
                receiver_id: Number(values.receiver_id),
                payment_status: paymentStatusToSend,
                station_expense: values.station_expense,
                bility_expense: values.bility_expense,
                station_labour: values.station_labour,
                cart_labour: values.cart_labour,
                total_expenses: values.total_expenses,
                goods_details: values.goods_details.map(detail => ({
                    item_id: Number(detail.item_id),
                    quantity: Number(detail.quantity),
                }))
            };

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

            // Prepare printable data
            const printableData = {
                register_number: regNum,
                bility_number: values.bility_number,
                bility_date: values.bility_date,
                departure_city: findNameById(data, 'cities', values.departure_city_id),
                forwarding_agency: findNameById(data, 'agencies', values.forwarding_agency_id),
                vehicle_number: findNameById(data, 'vehicles', values.vehicle_number_id),
                sender_name: values.sender_id === WALK_IN_CUSTOMER_ID && values.walk_in_sender_name 
                    ? values.walk_in_sender_name 
                    : findNameById(data, 'parties', values.sender_id),
                receiver_name: values.receiver_id === WALK_IN_CUSTOMER_ID && values.walk_in_receiver_name 
                    ? values.walk_in_receiver_name 
                    : findNameById(data, 'parties', values.receiver_id),
                destination_city: values.to_city_id ? findNameById(data, 'cities', values.to_city_id) : 'Local',
                item_type: values.goods_details[0]?.item_id 
                    ? findNameById(data, 'items', values.goods_details[0].item_id)
                    : 'N/A',
                quantity: values.goods_details[0]?.quantity || 0,
                total_delivery_charges: values.total_delivery_charges,
                total_amount: values.total_amount,
                payment_status: paymentStatusToSend === 'FREE' ? 'FREE' : paymentStatusToSend === 'ALREADY_PAID' ? 'PAID' : 'PENDING',
                remarks: values.remarks,
                station_expense: values.station_expense,
                bility_expense: values.bility_expense,
                station_labour: values.station_labour,
                cart_labour: values.cart_labour,
                total_expenses: values.total_expenses,
            };

            setLastSavedShipment(printableData);
            setShowPrintOptions(true);

            toast.success({
                title: t('shipment_save_button'),
                description: `Registration #: ${regNum} | Bility No: ${values.bility_number} saved to database.`
            });

            form.reset({ ...generateDefaultValues(), register_number: regNum });
            fetchShipments(values.bility_date);

        } catch (error: any) {
            console.error('Submission Error:', error);
            toast.error({ title: t('shipment_saving_button'), description: error.message });
        }
    }, [form, paymentStatusToSend, toast, t, data]);

    // Print handler functions
    const handlePrintOnly = () => {
        if (!lastSavedShipment) return;
        const printWindow = window.open('', '', 'height=auto,width=auto');
        if (printWindow) {
            // Create a temporary container with the print content
            const printContent = createPrintContent(lastSavedShipment);
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
        }
        setShowPrintOptions(false);
    };

    const handleSaveAndPrint = () => {
        if (!lastSavedShipment) return;
        handlePrintOnly();
    };

    const handleGoToDetailedPrint = () => {
        if (!lastSavedShipment) return;
        // Store the data in session storage for the print page
        sessionStorage.setItem('shipmentPrintData', JSON.stringify(lastSavedShipment));
        router.push('/shipments/printing');
    };

    const createPrintContent = (shipmentData: any) => {
        const formatCurrency = (amount: number) => {
            return new Intl.NumberFormat('en-PK', {
                style: 'currency',
                currency: 'PKR',
                minimumFractionDigits: 2,
            }).format(amount);
        };

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Shipment Receipt</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; border-bottom: 2px solid black; padding-bottom: 20px; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 24px; }
                .section { border: 1px solid #ccc; padding: 15px; margin-bottom: 15px; }
                .section-title { font-weight: bold; font-size: 14px; color: #666; text-transform: uppercase; margin-bottom: 10px; }
                .section-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                .section-row-label { font-weight: bold; }
                .section-row-value { font-size: 14px; }
                .financial { background-color: #fffacd; }
                .expense { background-color: #ffe4b5; }
                .footer { text-align: center; border-top: 2px solid black; padding-top: 20px; margin-top: 20px; font-size: 12px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f0f0f0; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>SHIPMENT RECEIPT</h1>
                <p>Goods Management System</p>
            </div>

            <div class="section">
                <div class="section-title">Registration & Bility Information</div>
                <table>
                    <tr>
                        <td><strong>Registration Number:</strong></td>
                        <td style="color: #0066cc; font-weight: bold; font-size: 16px;">${shipmentData.register_number}</td>
                    </tr>
                    <tr>
                        <td><strong>Bility Number:</strong></td>
                        <td style="color: #0066cc; font-weight: bold; font-size: 16px;">${shipmentData.bility_number}</td>
                    </tr>
                    <tr>
                        <td><strong>Bility Date:</strong></td>
                        <td>${new Date(shipmentData.bility_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    </tr>
                    <tr>
                        <td><strong>Payment Status:</strong></td>
                        <td style="font-weight: bold; color: ${shipmentData.payment_status === 'PAID' ? '#008000' : shipmentData.payment_status === 'FREE' ? '#0066cc' : '#cc0000'};">${shipmentData.payment_status}</td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Route Information</div>
                <table>
                    <tr>
                        <td><strong>Departure City:</strong></td>
                        <td>${shipmentData.departure_city}</td>
                        <td><strong>Destination City:</strong></td>
                        <td>${shipmentData.destination_city}</td>
                    </tr>
                    <tr>
                        <td><strong>Agency:</strong></td>
                        <td>${shipmentData.forwarding_agency}</td>
                        <td><strong>Vehicle:</strong></td>
                        <td>${shipmentData.vehicle_number}</td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Parties Information</div>
                <table>
                    <tr>
                        <td><strong>Sender Name:</strong></td>
                        <td>${shipmentData.sender_name}</td>
                    </tr>
                    <tr>
                        <td><strong>Receiver Name:</strong></td>
                        <td>${shipmentData.receiver_name}</td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Goods Details</div>
                <table>
                    <tr>
                        <td><strong>Item Type:</strong></td>
                        <td>${shipmentData.item_type}</td>
                        <td><strong>Quantity:</strong></td>
                        <td>${shipmentData.quantity}</td>
                    </tr>
                </table>
            </div>

            <div class="section financial">
                <div class="section-title">Financial Details</div>
                <div class="section-row">
                    <span class="section-row-label">Total Delivery Charges:</span>
                    <span class="section-row-value">${formatCurrency(shipmentData.total_delivery_charges)}</span>
                </div>
                <div class="section-row">
                    <span class="section-row-label">Total Amount:</span>
                    <span class="section-row-value" style="font-weight: bold; font-size: 16px;">${formatCurrency(shipmentData.total_amount)}</span>
                </div>
            </div>

            <div class="section expense">
                <div class="section-title">Expense Breakdown</div>
                <div class="section-row">
                    <span>Station Expense:</span>
                    <span>${formatCurrency(shipmentData.station_expense)}</span>
                </div>
                <div class="section-row">
                    <span>Bility Expense:</span>
                    <span>${formatCurrency(shipmentData.bility_expense)}</span>
                </div>
                <div class="section-row">
                    <span>Station Labour:</span>
                    <span>${formatCurrency(shipmentData.station_labour)}</span>
                </div>
                <div class="section-row">
                    <span>Cart Labour:</span>
                    <span>${formatCurrency(shipmentData.cart_labour)}</span>
                </div>
                <div class="section-row" style="border-top: 2px solid #999; padding-top: 10px; margin-top: 10px;">
                    <span style="font-weight: bold;">Total Expenses:</span>
                    <span style="font-weight: bold; font-size: 16px;">${formatCurrency(shipmentData.total_expenses)}</span>
                </div>
            </div>

            ${shipmentData.remarks ? `
            <div class="section">
                <div class="section-title">Remarks</div>
                <p>${shipmentData.remarks}</p>
            </div>
            ` : ''}

            <div class="footer">
                <p>Printed on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <p>© Goods Management System. All Rights Reserved.</p>
            </div>
        </body>
        </html>
        `;
    };

    // Prepare printable payload from a shipment row (from the shipments table)
    const preparePrintableFromShipment = (shipment: ShipmentData) => {
        const firstItemDesc = shipment.goodsDetails && shipment.goodsDetails.length > 0
            ? (shipment.goodsDetails[0].itemCatalog?.item_description || 'N/A')
            : 'N/A';

        const totalQuantity = shipment.goodsDetails && shipment.goodsDetails.length > 0
            ? shipment.goodsDetails.reduce((s, d) => s + (Number(d.quantity) || 0), 0)
            : 0;

        return {
            register_number: shipment.register_number,
            bility_number: shipment.bility_number,
            bility_date: shipment.bility_date,
            departure_city: findNameById(data, 'cities', shipment.departure_city_id),
            forwarding_agency: findNameById(data, 'agencies', shipment.forwarding_agency_id),
            vehicle_number: findNameById(data, 'vehicles', shipment.vehicle_number_id),
            sender_name: shipment.sender_id === WALK_IN_CUSTOMER_ID && shipment.walk_in_sender_name
                ? shipment.walk_in_sender_name
                : findNameById(data, 'parties', shipment.sender_id),
            receiver_name: shipment.receiver_id === WALK_IN_CUSTOMER_ID && shipment.walk_in_receiver_name
                ? shipment.walk_in_receiver_name
                : findNameById(data, 'parties', shipment.receiver_id),
            destination_city: shipment.to_city_id ? findNameById(data, 'cities', shipment.to_city_id) : 'Local',
            item_type: firstItemDesc,
            quantity: totalQuantity,
            total_delivery_charges: shipment.total_delivery_charges ?? 0,
            total_amount: shipment.total_charges ?? 0,
            payment_status: shipment.payment_status === 'FREE' ? 'FREE' : shipment.payment_status === 'ALREADY_PAID' ? 'PAID' : shipment.payment_status === 'PENDING' ? 'PENDING' : (shipment.payment_status || 'N/A'),
            remarks: '',
            station_expense: shipment.station_expense ?? 0,
            bility_expense: shipment.bility_expense ?? 0,
            station_labour: shipment.station_labour ?? 0,
            cart_labour: shipment.cart_labour ?? 0,
            total_expenses: shipment.total_expenses ?? 0,
        };
    };

    const handlePrintShipmentRow = (shipment: ShipmentData) => {
        try {
            const printableData = preparePrintableFromShipment(shipment);
            const printWindow = window.open('', '', 'height=auto,width=auto');
            if (printWindow) {
                const html = createPrintContent(printableData);
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.print();
            }
        } catch (err) {
            console.error('Print row error:', err);
            toast.error({ title: 'Print Error', description: 'Unable to print the selected shipment.' });
        }
    };

    // Generate HTML for printing the entire shipments table
    const generateTablePrintHTML = () => {
        const tableDate = bilityDate ? new Date(bilityDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Today';
        
        const tableRowsHTML = shipments.map((shipment, idx) => `
            <tr>
                <td>${shipment.register_number}</td>
                <td>${shipment.bility_number}</td>
                <td>${shipment.bility_date ? new Date(shipment.bility_date).toLocaleDateString() : 'N/A'}</td>
                <td>${findNameById(data, 'cities', shipment.departure_city_id)}</td>
                <td>${findNameById(data, 'agencies', shipment.forwarding_agency_id)}</td>
                <td>${findNameById(data, 'vehicles', shipment.vehicle_number_id)}</td>
                <td>${shipment.sender_id === WALK_IN_CUSTOMER_ID && shipment.walk_in_sender_name
                    ? shipment.walk_in_sender_name
                    : findNameById(data, 'parties', shipment.sender_id)}</td>
                <td>${shipment.receiver_id === WALK_IN_CUSTOMER_ID && shipment.walk_in_receiver_name
                    ? shipment.walk_in_receiver_name
                    : findNameById(data, 'parties', shipment.receiver_id)}</td>
                <td>${shipment.to_city_id ? findNameById(data, 'cities', shipment.to_city_id) : 'Local'}</td>
                <td>${shipment.created_at ? new Date(shipment.created_at).toLocaleDateString() : 'N/A'}</td>
                <td>${shipment.goodsDetails && shipment.goodsDetails.length > 0
                    ? shipment.goodsDetails.map(d => d.itemCatalog?.item_description).filter(Boolean).join(', ')
                    : 'N/A'}</td>
                <td>${shipment.goodsDetails && shipment.goodsDetails.length > 0
                    ? shipment.goodsDetails.reduce((t, d) => t + (Number(d.quantity) || 0), 0)
                    : 'N/A'}</td>
                <td style="text-align: right;">${formatCurrency(Number(shipment.total_delivery_charges || 0))}</td>
                <td style="text-align: right; font-weight: bold;">
                    ${shipment.payment_status === 'ALREADY_PAID' ? '<span style="color: #008000;">PAID</span>'
                    : shipment.payment_status === 'FREE' ? '<span style="color: #0066cc;">FREE</span>'
                    : shipment.payment_status === 'PENDING' ? `<span style="color: #cc0000;">${formatCurrency(shipment.total_charges)}</span>`
                    : formatCurrency(shipment.total_charges)}
                </td>
            </tr>
        `).join('');

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Today's Shipments Report</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px; 
                    background-color: #f5f5f5;
                }
                .header { 
                    text-align: center; 
                    border-bottom: 3px solid #333; 
                    padding-bottom: 20px; 
                    margin-bottom: 20px; 
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 28px; 
                    color: #333;
                }
                .header p { 
                    margin: 5px 0; 
                    font-size: 14px; 
                    color: #666;
                }
                .report-date {
                    font-size: 16px;
                    font-weight: bold;
                    color: #0066cc;
                    text-align: center;
                    margin-bottom: 20px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 20px;
                    background-color: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                th { 
                    background-color: #003d82; 
                    color: white; 
                    padding: 12px; 
                    text-align: left;
                    font-weight: bold;
                    font-size: 12px;
                    border: 1px solid #333;
                }
                td { 
                    padding: 10px; 
                    border: 1px solid #ddd; 
                    font-size: 12px;
                }
                tr:nth-child(even) { 
                    background-color: #f9f9f9; 
                }
                tr:hover {
                    background-color: #f0f0f0;
                }
                .footer {
                    text-align: center;
                    border-top: 2px solid #333;
                    padding-top: 15px;
                    margin-top: 30px;
                    font-size: 11px;
                    color: #666;
                }
                .total-row {
                    background-color: #e8f4f8;
                    font-weight: bold;
                }
                .summary {
                    margin: 20px 0;
                    padding: 15px;
                    background-color: #f0f0f0;
                    border-left: 4px solid #0066cc;
                }
                .summary p {
                    margin: 5px 0;
                    font-size: 13px;
                }
                @media print {
                    body { margin: 0; }
                    table { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>TODAY'S BILITY REPORT</h1>
                <p>Zikria Goods Transports Company</p>
            </div>

            <div class="report-date">
                Report Date: ${tableDate}
            </div>

            <div class="summary">
                <p><strong>Total Shipments:</strong> ${shipments.length}</p>
                <p><strong>Total Delivery Charges:</strong> ${formatCurrency(shipments.reduce((s, sh) => s + (Number(sh.total_delivery_charges || 0)), 0))}</p>
                <p><strong>Total Amount:</strong> ${formatCurrency(shipments.reduce((s, sh) => s + (Number(sh.total_charges || 0)), 0))}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Reg No</th>
                        <th>Bility No</th>
                        <th>Date</th>
                        <th>Departure</th>
                        <th>Agency</th>
                        <th>Vehicle</th>
                        <th>Sender</th>
                        <th>Receiver</th>
                        <th>Destination</th>
                        <th>Current Date</th>
                        <th>Item Type</th>
                        <th>Qty</th>
                        <th style="text-align: right;">Delivery Charges</th>
                        <th style="text-align: right;">Payment Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHTML}
                </tbody>
            </table>

            <div class="footer">
                <p>Printed on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <p>© Switch2itech. All Rights Reserved.</p>
            </div>
        </body>
        </html>
        `;
    };

    const handlePrintTable = () => {
        try {
            if (shipments.length === 0) {
                toast.error({ title: 'No Data', description: 'There are no shipments to print for the selected date.' });
                return;
            }
            const printWindow = window.open('', '', 'height=auto,width=auto');
            if (printWindow) {
                const html = generateTablePrintHTML();
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.print();
            }
        } catch (err) {
            console.error('Print table error:', err);
            toast.error({ title: 'Print Error', description: 'Unable to print the table.' });
        }
    };

    const modalContent = useMemo(() => {
        const titleMap: Record<string, string> = {
            city: 'New City',
            agency: 'New Forwarding Agency',
            vehicle: 'New Vehicle',
            party: 'New Party (Sender/Receiver)',
            item: 'New Item Type',
        };

        const currentTitle = modalType ? (titleMap[modalType] || 'Add Master Data') : 'Add Master Data';

        return (
            <DialogContent className='sm:max-w-[450px]'>
                <DialogHeader>
                    <DialogTitle className='text-xl text-blue-700'>{currentTitle}</DialogTitle>
                    <DialogDescription>
                        Enter details for a new entry. It will be immediately available in the dropdowns.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddMasterData} className="space-y-4 pt-2">
                    {modalType === 'city' && (
                        <div className='space-y-2'>
                            <Label htmlFor="cityName">City Name</Label>
                            <Input
                                id="cityName"
                                name="cityName"
                                placeholder="e.g., Islamabad"
                                onChange={handleModalInputChange}
                                value={modalInput.cityName || ''}
                                required
                                autoFocus
                            />
                        </div>
                    )}
                    {modalType === 'agency' && (
                        <div className='space-y-2'>
                            <Label htmlFor="agencyName">Agency Name</Label>
                            <Input
                                id="agencyName"
                                name="agencyName"
                                placeholder="e.g., Global Express Logistics"
                                onChange={handleModalInputChange}
                                value={modalInput.agencyName || ''}
                                required
                                autoFocus
                            />
                        </div>
                    )}
                    {modalType === 'vehicle' && (
                        <div className='space-y-2'>
                            <Label htmlFor="vehicleNumber">Vehicle Registration Number</Label>
                            <Input
                                id="vehicleNumber"
                                name="vehicleNumber"
                                placeholder="e.g., ABC-1234"
                                onChange={handleModalInputChange}
                                value={modalInput.vehicleNumber || ''}
                                required
                                autoFocus
                            />
                        </div>
                    )}
                    {modalType === 'item' && (
                        <div className='space-y-2'>
                            <Label htmlFor="description">Item Type Description</Label>
                            <Input
                                id="description"
                                name="description"
                                placeholder="e.g., Electronics, Textiles"
                                onChange={handleModalInputChange}
                                value={modalInput.description || ''}
                                required
                                autoFocus
                            />
                        </div>
                    )}
                    {modalType === 'party' && (
                        <>
                            <div className='space-y-2'>
                                <Label htmlFor="name">Party Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="e.g., Acme Corp"
                                    onChange={handleModalInputChange}
                                    value={modalInput.name || ''}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor="contactInfo">Contact Info</Label>
                                <Input
                                    id="contactInfo"
                                    name="contactInfo"
                                    placeholder="Address / Phone"
                                    onChange={handleModalInputChange}
                                    value={modalInput.contactInfo || ''}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor="openingBalance">Opening Balance</Label>
                                <Input
                                    id="openingBalance"
                                    name="openingBalance"
                                    type="text"
                                    placeholder="0.00"
                                    value={modalInput.openingBalance || '0.00'}
                                    onChange={handleModalInputChange}
                                    required
                                />
                            </div>
                        </>
                    )}

                    <Button type="submit" className='w-full mt-4' disabled={isModalSubmitting}>
                        {isModalSubmitting ? <><Loader2 className='h-4 w-4 animate-spin mr-2' /> Saving...</> : 'Save & Update List'}
                    </Button>
                </form>
            </DialogContent>
        );
    }, [modalType, modalInput, isModalSubmitting, handleModalInputChange, handleAddMasterData]);


    // --- Searchable Combobox Component ---
    const SearchableCombobox = ({
        field,
        labelTKey,
        placeholderTKey,
        listName,
        onAddClick,
        disabled = false
    }: {
        field: any;
        labelTKey: string;
        placeholderTKey: string;
        listName: keyof DropdownData;
        onAddClick: () => void;
        disabled?: boolean;
    }) => {
        const [open, setOpen] = useState(false);
        const items = data?.[listName] || [];

        const getItemLabel = (item: DropdownItem) => {
            if (listName === 'vehicles') return item.vehicleNumber || '';
            if (listName === 'items') return item.item_description || '';
            return item.name || '';
        };

        const selectedItem = items.find(item => item.id === field.value);
        const selectedLabel = selectedItem ? getItemLabel(selectedItem) : '';

        return (
            <FormItem className="flex flex-col">
                <div className='flex justify-between items-center'>
                    <FormLabel>{t(labelTKey)}</FormLabel>
                    <Button
                        type='button'
                        size='sm'
                        variant='ghost'
                        className='h-7 w-7 p-0 text-blue-600 hover:bg-blue-100'
                        onClick={(e) => {
                            e.preventDefault();
                            onAddClick();
                        }}
                        title={`Add new ${listName.slice(0, -1)}`}
                    >
                        <Plus className='h-4 w-4' />
                    </Button>
                </div>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                                variant="outline"
                                role="combobox"
                                disabled={disabled}
                                className={cn(
                                    "w-full justify-between",
                                    !field.value && "text-muted-foreground"
                                )}
                            >
                                {field.value && selectedLabel
                                    ? selectedLabel
                                    : t(placeholderTKey)}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder={`Search ${listName}...`} />
                            <CommandEmpty>No {listName} found.</CommandEmpty>
                            <CommandGroup className="max-h-[200px] overflow-auto">
                                {items.map((item) => {
                                    const label = getItemLabel(item);
                                    return (
                                        <CommandItem
                                            key={item.id}
                                            value={label}
                                            onSelect={() => {
                                                field.onChange(item.id);
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    item.id === field.value
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                )}
                                            />
                                            {label}
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
                <FormMessage />
            </FormItem>
        );
    };

    // --- Render Logic ---
    const itemIsLoading = form.formState.isSubmitting;
    const isSenderWalkIn = senderId === WALK_IN_CUSTOMER_ID;
    const isReceiverWalkIn = receiverId === WALK_IN_CUSTOMER_ID;
    const isFormValid = form.formState.isValid;
    const manualTotalAmount = form.watch("total_amount");

    if (isLoadingData) {
        return (
            // This div now controls the full-screen layout
           <div className='flex justify-center items-center min-h-screen'>
    <div className='text-4xl font-extrabold text-blue-600 flex space-x-1'>
        {/* We apply the bounce animation to each letter, 
            using arbitrary values for 'animation-delay' to stagger them.
        */}
        <span className="animate-bounce [animation-delay:-0.45s]">Z</span>
        <span className="animate-bounce [animation-delay:-0.30s]">G</span>
        <span className="animate-bounce [animation-delay:-0.15s]">T</span>
        <span className="animate-bounce">C</span>
    </div>
</div>
        );
    }

    return (
        <div className='p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen'>
            <div className="flex justify-between items-center mb-6 border-b pb-2">
                <h2 className='text-3xl font-extrabold text-gray-900'>
                    {t('shipment_register_title')}
                </h2>

                <div className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg">
                    <span className="text-sm font-medium">Today's Date:</span>
                    <span className="text-xl font-bold ml-2">
                        {new Date(today).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>

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

                        {/* DEPARTURE CITY */}
                        <FormField control={form.control} name='departure_city_id' render={({ field }) => (
                            <SearchableDropdown
                                label="Departure City"
                                endpoint="/api/cities"
                                placeholder="Select or add city"
                                value={field.value}
                                onChange={(name) => setCity(name)}
                                onSelectItem={(it) => field.onChange(Number(it.id))}
                                items={data?.cities}
                            />

                        )} />
                    </div>

                    {/* 2. Forwarding Agency, Vehicle Number, Quantity, Item Type */}
                    <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                        {/* FORWARDING AGENCY */}
                        <FormField control={form.control} name='forwarding_agency_id' render={({ field }) => (
                            <SearchableDropdown
                                label="Forwading Agency"
                                endpoint="/api/agencies"
                                placeholder="Select or add agency"
                                value={field.value}
                                onChange={(name) => setAgency(name)}
                                onSelectItem={(it) => field.onChange(Number(it.id))}
                                items={data?.agencies}
                            />
                        )} />
                        {/* VEHICLE NUMBER */}
                        <FormField control={form.control} name='vehicle_number_id' render={({ field }) => (
                            <SearchableDropdown
                                label="Vehicle Number"
                                endpoint="/api/vehicles"
                                placeholder="Select or add vehicle"
                                value={field.value}
                                onChange={(name) => setVehicles(name)}
                                onSelectItem={(it) => field.onChange(Number(it.id))}
                                items={data?.vehicles}
                                createPropertyName="vehicleNumber"
                            />
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

                        {/* ITEM TYPE */}
                        <FormField control={form.control} name={`goods_details.0.item_id`} render={({ field }) => (
                            <SearchableDropdown
                                label="Item Type"
                                endpoint="/api/items"
                                placeholder="Select or add item type"
                                value={field.value}
                                onChange={(name) => setItem(name)}
                                onSelectItem={(it) => field.onChange(Number(it.id))}
                                items={data?.items}
                                createPropertyName="description"
                            />
                        )} />

                    </div>

                    {/* 4. Sender, Receiver */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        {/* SENDER */}
                        <FormField control={form.control} name='sender_id' render={({ field }) => (
                           <SearchableDropdown
                                label="Sender"
                                endpoint="/api/parties"
                                placeholder="Select or add sender"
                                value={field.value}
                                onChange={(name) => setSender(name)}
                                onSelectItem={(it) => field.onChange(Number(it.id))}
                                items={data?.parties}
                            />
                        )} />
                        {/* RECEIVER */}
                        <FormField control={form.control} name='receiver_id' render={({ field }) => (
                            <SearchableDropdown
                                label="Receiver"
                                endpoint="/api/parties"
                                placeholder="Select or add receiver"
                                value={field.value}
                                onChange={(name) => setReciver(name)}
                                onSelectItem={(it) => field.onChange(Number(it.id))}
                                items={data?.parties}
                            />
                        )} />
                    </div>

                    {/* Walk-in fields if needed */}
                    {/* {(isSenderWalkIn || isReceiverWalkIn) && (
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            {isSenderWalkIn && <FormField control={form.control} name='walk_in_sender_name' render={({ field }) => (
                                <FormItem><FormLabel>{t('shipment_walk_in_sender_label')}</FormLabel><FormControl><Input placeholder={t('shipment_walk_in_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />}
                            {isReceiverWalkIn && <FormField control={form.control} name='walk_in_receiver_name' render={({ field }) => (
                                <FormItem><FormLabel>{t('shipment_walk_in_receiver_label')}</FormLabel><FormControl><Input placeholder={t('shipment_walk_in_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />}
                        </div>
                    )} */}

                    {/* 5. Destination, Delivery Charges, Total Amount */}
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                        {/* DESTINATION CITY */}
                        <FormField control={form.control} name='to_city_id' render={({ field }) => (
                            <SearchableDropdown
                                label="Destination City"
                                endpoint="/api/cities"
                                placeholder="Select or add city"
                                value={field.value}
                                onChange={(name) => setCity(name)}
                                onSelectItem={(it) => field.onChange(Number(it.id))}
                                items={data?.cities}
                            />
                        )} />

                        <FormField control={form.control} name='total_delivery_charges' render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('shipment_delivery_charges_label')}</FormLabel>
                                <FormControl>
                                    <Input
                                        type='number'
                                        placeholder={t('shipment_delivery_charges_placeholder')}
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

                        {/* TOTAL AMOUNT - Independent field */}
                        <FormField control={form.control} name='total_amount' render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('shipment_total_amount_label')}</FormLabel>
                                <FormControl>
                                    <Input
                                        type='number'
                                        placeholder={t('shipment_total_amount_placeholder')}
                                        {...field}
                                        step='0.01'
                                        min='0'
                                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                        className='text-lg font-semibold text-green-800 border-green-300 focus:border-green-500'
                                    />
                                </FormControl>
                                <FormDescription className="text-xs">
                                    Enter total amount manually (independent of expenses)
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    {/* 6. Delivery Expense Fields */}
                    <div className='grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t'>
                        <h4 className='col-span-full text-lg font-bold text-gray-700'>Delivery Expenses (Data Entry)</h4>

                        <FormField
                            control={form.control}
                            name='station_expense'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('delivery_station_expense_label')}</FormLabel>
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
                                    <FormLabel>{t('delivery_bility_expense_label')}</FormLabel>
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
                                    <FormLabel>{t('delivery_station_labour_label')}</FormLabel>
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
                                    <FormLabel>{t('delivery_cart_labour_label')}</FormLabel>
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
                                    <FormLabel className='text-red-700 font-bold'>{t('delivery_total_expenses_label')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type='number'
                                            {...field}
                                            step='0.01'
                                            readOnly
                                            className='bg-red-50 font-bold text-red-600'
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* 7. Payment Status Checkboxes */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t'>
                        <FormField
                            control={form.control}
                            name='is_already_paid'
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 bg-yellow-50">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={(v) => {
                                                const newValue = Boolean(v);
                                                const currentCharges = form.getValues('total_delivery_charges') || 0;
                                                if (newValue && !field.value) {
                                                    // Checking: add 1
                                                    setValue('total_delivery_charges', currentCharges + 1);
                                                } else if (!newValue && field.value) {
                                                    // Unchecking: subtract 1
                                                    setValue('total_delivery_charges', Math.max(0, currentCharges - 1));
                                                }
                                                field.onChange(newValue);
                                            }}
                                            disabled={isFreeOfCost}
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
                                            onCheckedChange={(v) => {
                                                const newValue = Boolean(v);
                                                const currentCharges = form.getValues('total_delivery_charges') || 0;
                                                if (newValue && !field.value) {
                                                    // Checking: add 1
                                                    setValue('total_delivery_charges', currentCharges + 1);
                                                } else if (!newValue && field.value) {
                                                    // Unchecking: subtract 1
                                                    setValue('total_delivery_charges', Math.max(0, currentCharges - 1));
                                                }
                                                field.onChange(newValue);
                                            }}
                                            disabled={isAlreadyPaid}
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
                        disabled={itemIsLoading || !isFormValid || manualTotalAmount < 0}
                    >
                        {form.formState.isSubmitting ? t('shipment_saving_button') : t('shipment_save_button')}
                    </Button>
                </form>
            </Form>

            {/* Print Options Dialog */}
            <Dialog open={showPrintOptions} onOpenChange={setShowPrintOptions}>
                <DialogContent className='sm:max-w-[450px]'>
                    <DialogHeader>
                        <DialogTitle className='text-xl text-green-700'>Shipment Saved Successfully! 🎉</DialogTitle>
                        <DialogDescription>
                            Your shipment has been saved. What would you like to do next?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-4">
                        <Button
                            onClick={handlePrintOnly}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2 py-6"
                            size="lg"
                        >
                            <Printer className="h-5 w-5" />
                            Print Now
                        </Button>
                        <Button
                            onClick={handleGoToDetailedPrint}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 py-6"
                            size="lg"
                        >
                            <FileText className="h-5 w-5" />
                            Detailed Print Page
                        </Button>
                        <Button
                            onClick={() => setShowPrintOptions(false)}
                            className="w-full bg-gray-500 hover:bg-gray-600 text-white py-6"
                            size="lg"
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Shipments Table */}
            <div className='mt-12 p-8 rounded-xl shadow-2xl border bg-white'>
                <div className='flex justify-between items-center mb-6'>
                    <h2 className='text-2xl font-extrabold'>Today's Shipments ({bilityDate ? new Date(bilityDate).toLocaleDateString() : 'Loading...'})</h2>
                    {!isLoadingShipments && shipments.length > 0 && (
                        <Button 
                            onClick={handlePrintTable}
                            className='bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2'
                            size='lg'
                        >
                            <Printer className='h-5 w-5' />
                            Print Table
                        </Button>
                    )}
                </div>
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
                                    <TableHead>Current Date</TableHead>
                                    <TableHead>{t('shipment_table_item_type')}</TableHead>
                                    <TableHead>{t('shipment_table_quantity')}</TableHead>
                                    <TableHead className='text-right'>Delivery Charges</TableHead>
                                    <TableHead className='text-right'>Payment Status</TableHead>
                                    <TableHead className='text-right'>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shipments.map((shipment, idx) => (
                                    <TableRow key={shipment.id ?? shipment.register_number ?? idx}>
                                        <TableCell className='font-mono text-sm'>{shipment.register_number}</TableCell>
                                        <TableCell>{shipment.bility_number}</TableCell>
                                        <TableCell>{shipment.bility_date ? new Date(shipment.bility_date).toLocaleDateString() : 'N/A'}</TableCell>
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
                                            {shipment.created_at ? new Date(shipment.created_at).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {shipment.goodsDetails && shipment.goodsDetails.length > 0
                                                ? shipment.goodsDetails
                                                    .map(detail => detail.itemCatalog?.item_description)
                                                    .filter(Boolean) // remove undefined/null
                                                    .join(', ')
                                                : 'N/A'
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {shipment.goodsDetails && shipment.goodsDetails.length > 0
                                                ? shipment.goodsDetails.reduce((total, detail) => total + (Number(detail.quantity) || 0), 0)
                                                : 'N/A'
                                            }
                                        </TableCell>
                                        <TableCell className='text-right'>
                                            {formatCurrency(Number(shipment.total_delivery_charges || 0))}
                                        </TableCell>
                                        <TableCell className='text-right font-bold'>
                                            {shipment.payment_status === 'ALREADY_PAID' && <span className='text-green-600'>PAID</span>}
                                            {shipment.payment_status === 'FREE' && <span className='text-blue-600'>FREE</span>}
                                            {shipment.payment_status === 'PENDING' && <span className='text-red-600'>{formatCurrency(shipment.total_charges)}</span>}
                                            {!shipment.payment_status && formatCurrency(shipment.total_charges)}
                                        </TableCell>
                                        <TableCell className='text-right'>
                                            <div className='flex justify-end space-x-2'>
                                                <Button size='sm' variant='ghost' onClick={() => handlePrintShipmentRow(shipment)} title='Print'>
                                                    <Printer className='h-4 w-4' />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* --- Master Data Dialog/Modal --- */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                {modalType && modalContent}
            </Dialog>
        </div>
    );
}
