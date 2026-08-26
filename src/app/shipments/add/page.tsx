"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { toast as sonnerToast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
    Plus, Loader2, Check, Printer, FileText, Truck, MapPin, 
    Building, Package, Users, DollarSign, Calendar, 
    CreditCard, ArrowRight, CheckCircle2, ChevronDown, ChevronUp,
    MoreVertical, Pencil, X, RotateCcw, Lock, ShieldCheck, KeyRound, Eye, EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { SearchableDropdown } from "@/components/ui/SearchableDropdown";

export interface Toast {
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
}

export function useToast() {
    return useMemo(() => ({
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
            info: (toast: Omit<Toast, 'id'>) => {
                sonnerToast.info(toast.title, {
                    description: toast.description,
                });
            },
            dismiss: (id: string) => {
                sonnerToast.dismiss(id);
            },
        },
        toasts: [],
    }), []);
}

const WALK_IN_CUSTOMER_ID = 1;

const formatCurrency = (amount: number) => {
    return `Rs. ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const GoodsDetailSchema = z.object({
    id: z.string().optional(),
    item_id: z.coerce.number().int().min(1, 'Item is required'),
    quantity: z.coerce.number().min(1, 'Min quantity is 1'),
});

const ShipmentFormSchema = z.object({
    register_number: z.string().optional(),
    bility_number: z.string().min(1, 'Bility number is required').max(50),
    bility_date: z.string().min(1, 'Bility date is required'),
    departure_city_id: z.coerce.number().int().min(1, 'Departure city is required'),
    forwarding_agency_id: z.coerce.number().int().min(1, 'Agency is required'),
    vehicle_number_id: z.coerce.number().int().min(1, 'Vehicle is required'),

    goods_details: z.array(GoodsDetailSchema)
        .min(1, { message: "You must add at least one item detail." }),

    sender_id: z.coerce.number().int().min(1, 'Sender is required'),
    receiver_id: z.coerce.number().int().min(1, 'Receiver is required'),
    walk_in_sender_name: z.string().optional(),
    walk_in_receiver_name: z.string().optional(),
    to_city_id: z.coerce.number().int().min(1, 'Destination is required'),

    total_delivery_charges: z.coerce.number().optional().default(0),
    total_amount: z.coerce.number().optional().default(0),

    station_expense: z.coerce.number().optional().default(0),
    bility_expense: z.coerce.number().optional().default(0),
    station_labour: z.coerce.number().optional().default(0),
    cart_labour: z.coerce.number().optional().default(0),
    total_expenses: z.coerce.number().optional().default(0),

    is_already_paid: z.boolean().default(false),
    is_free_of_cost: z.boolean().default(false),

    remarks: z.string().max(255).optional(),
}).superRefine((data, ctx) => {
    if (data.is_already_paid && data.is_free_of_cost) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Shipment cannot be both Free and Paid.',
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
    createdAt?: string;
    created_day?: string;
    created_at?: string;
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
    goodsDetails?: { quantity: number; itemCatalog?: { item_description?: string } | null }[];
    payment_status?: string | null;
    remarks?: string | null;
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
    walk_in_sender_name: '',
    walk_in_receiver_name: '',
    to_city_id: 0,
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
    const [showExpenses, setShowExpenses] = useState(false);
    const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);

    // Modal state for quick add
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'city' | 'agency' | 'vehicle' | 'party' | 'item' | null>(null);
    const [modalInput, setModalInput] = useState<any>({});
    const [isModalSubmitting, setIsModalSubmitting] = useState(false);

    const fetchShipments = useCallback(async (dateToFilter: string) => {
        if (!dateToFilter) {
            setShipments([]);
            return;
        }
        setIsLoadingShipments(true);
        try {
            const response = await fetch(`/api/shipments?date=${dateToFilter}`);
            if (!response.ok) throw new Error('Failed to fetch shipments.');
            const list = await response.json();
            setShipments(list);
        } catch (error: any) {
            console.error("Shipments fetch error:", error);
            sonnerToast.error('Error loading shipments', { description: 'Could not retrieve saved shipments list.' });
        } finally {
            setIsLoadingShipments(false);
        }
    }, []);

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
    const isAlreadyPaid = form.watch("is_already_paid");
    const isFreeOfCost = form.watch("is_free_of_cost");
    const bilityDate = form.watch("bility_date");
    const senderId = form.watch("sender_id");
    const receiverId = form.watch("receiver_id");

    useEffect(() => {
        const calculatedTotalExp = (Number(stationExpense) || 0) + (Number(bilityExpense) || 0) + (Number(stationLabour) || 0) + (Number(cartLabour) || 0);
        if (form.getValues('total_expenses') !== calculatedTotalExp) {
            setValue("total_expenses", calculatedTotalExp);
        }
    }, [stationExpense, bilityExpense, stationLabour, cartLabour, setValue, form]);

    const { fields } = useFieldArray({
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
            if (!response.ok) throw new Error('Failed to fetch lists.');
            const lists = await response.json();
            setData(lists);
            return lists;
        } catch (error: any) {
            console.error("Data fetch error:", error);
            sonnerToast.error('Error loading data', { description: error.message || 'Could not retrieve lists.' });
        }
        return null;
    };

    const handleEditShipment = useCallback((shipment: ShipmentData) => {
        setEditingShipmentId(shipment.register_number);

        const isAlreadyPaid = shipment.payment_status === 'ALREADY_PAID' || 
            (shipment.remarks?.includes('PAYMENT_STATUS:ALREADY_PAID') ?? false);
        const isFreeOfCost = shipment.payment_status === 'FREE' || 
            (shipment.remarks?.includes('PAYMENT_STATUS:FREE') ?? false);

        const cleanRemarks = (shipment.remarks || '').replace(/PAYMENT_STATUS:\w+\s*/, '');

        form.reset({
            register_number: shipment.register_number,
            bility_number: shipment.bility_number,
            bility_date: shipment.bility_date ? new Date(shipment.bility_date).toISOString().substring(0, 10) : today,
            departure_city_id: Number(shipment.departure_city_id),
            forwarding_agency_id: Number(shipment.forwarding_agency_id),
            vehicle_number_id: Number(shipment.vehicle_number_id),
            goods_details: (shipment.goodsDetails && shipment.goodsDetails.length > 0)
                ? shipment.goodsDetails.map((gd: any) => ({
                    id: uuidv4(),
                    item_id: gd.item_name_id || gd.itemCatalog?.id || gd.item_id || 0,
                    quantity: Number(gd.quantity || 1),
                }))
                : [{ id: uuidv4(), item_id: 0, quantity: 1 }],
            sender_id: Number(shipment.sender_id),
            receiver_id: Number(shipment.receiver_id),
            to_city_id: shipment.to_city_id ? Number(shipment.to_city_id) : 0,
            total_delivery_charges: Number(shipment.total_delivery_charges || 0),
            total_amount: Number(shipment.total_charges || 0),
            station_expense: Number(shipment.station_expense || 0),
            bility_expense: Number(shipment.bility_expense || 0),
            station_labour: Number(shipment.station_labour || 0),
            cart_labour: Number(shipment.cart_labour || 0),
            total_expenses: Number(shipment.total_expenses || 0),
            is_already_paid: isAlreadyPaid,
            is_free_of_cost: isFreeOfCost,
            remarks: cleanRemarks,
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
        sonnerToast.info('Editing Mode Active', {
            description: `Loaded Bilty #${shipment.bility_number} (Reg #${shipment.register_number}) into the form.`,
        });
    }, [form]);

    // Password Security Modal State for Bilty Edit
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [targetShipmentToEdit, setTargetShipmentToEdit] = useState<ShipmentData | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [showPasswordInModal, setShowPasswordInModal] = useState(false);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const handleCancelEdit = useCallback(() => {
        setEditingShipmentId(null);
        form.reset(generateDefaultValues());
        sonnerToast.info('Editing Cancelled', {
            description: 'Form reset to new bilty registration.',
        });
    }, [form]);

    const handleRequestEdit = useCallback((shipment: ShipmentData) => {
        if (typeof window !== 'undefined' && sessionStorage.getItem('bilty_edit_auth') === 'true') {
            sessionStorage.removeItem('bilty_edit_auth');
            handleEditShipment(shipment);
            return;
        }
        setTargetShipmentToEdit(shipment);
        setPasswordInput('');
        setPasswordError(null);
        setIsPasswordModalOpen(true);
    }, [handleEditShipment]);

    const handleVerifyAndProceed = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!passwordInput || passwordInput.trim().length === 0) {
            setPasswordError('Please enter the edit password.');
            return;
        }
        setIsVerifyingPassword(true);
        setPasswordError(null);
        try {
            const res = await fetch('/api/settings/verify-edit-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: passwordInput.trim() }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setIsPasswordModalOpen(false);
                setPasswordInput('');
                if (targetShipmentToEdit) {
                    handleEditShipment(targetShipmentToEdit);
                }
            } else {
                setPasswordError(data.message || 'Incorrect edit password. Access denied.');
            }
        } catch (err: any) {
            setPasswordError('Verification failed. Please try again.');
        } finally {
            setIsVerifyingPassword(false);
        }
    };

    useEffect(() => {
        async function fetchInitialDataAndSetDefaults() {
            setIsLoadingData(true);
            const lists = await fetchDropdownData();

            if (lists?.parties?.length > 0) {
                const defaultPartyId = lists.parties[0].id;
                setValue('sender_id', defaultPartyId, { shouldValidate: true });
                setValue('receiver_id', defaultPartyId, { shouldValidate: true });
            }

            fetchShipments(today);
            setIsLoadingData(false);

            // Check if ?edit=register_number is present in URL
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                const editId = urlParams.get('edit');
                if (editId) {
                    try {
                        const res = await fetch(`/api/shipments/${encodeURIComponent(editId)}`);
                        if (res.ok) {
                            const editData = await res.json();
                            if (sessionStorage.getItem('bilty_edit_auth') === 'true') {
                                sessionStorage.removeItem('bilty_edit_auth');
                                handleEditShipment(editData);
                            } else {
                                handleRequestEdit(editData);
                            }
                        }
                    } catch (err) {
                        console.error("Error loading bilty for editing:", err);
                    }
                }
            }
        }
        fetchInitialDataAndSetDefaults();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
    }, [bilityDate, setValue, fetchShipments]);

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
                    successMessage = `City "${modalInput.cityName}" added.`;
                    break;
                case 'agency':
                    if (!modalInput.agencyName || modalInput.agencyName.trim().length < 2) throw new Error('Agency name required.');
                    endpoint = '/api/agencies';
                    payload = { name: modalInput.agencyName.trim() };
                    successMessage = `Agency "${modalInput.agencyName}" registered.`;
                    break;
                case 'vehicle':
                    if (!modalInput.vehicleNumber || modalInput.vehicleNumber.trim().length < 2) throw new Error('Vehicle number required.');
                    endpoint = '/api/vehicles';
                    payload = { vehicleNumber: modalInput.vehicleNumber.trim().toUpperCase() };
                    successMessage = `Vehicle "${modalInput.vehicleNumber}" added.`;
                    break;
                case 'item':
                    if (!modalInput.description || modalInput.description.trim().length < 3) throw new Error('Item description required.');
                    endpoint = '/api/items';
                    payload = { description: modalInput.description.trim() };
                    successMessage = `Item "${modalInput.description}" added.`;
                    break;
                case 'party':
                    if (!modalInput.name || modalInput.name.trim().length < 3) throw new Error('Party name required.');
                    endpoint = '/api/parties';
                    payload = {
                        name: modalInput.name.trim(),
                        contactInfo: modalInput.contactInfo?.trim() || '',
                        openingBalance: parseFloat(modalInput.openingBalance) || 0
                    };
                    successMessage = `Party "${modalInput.name}" registered.`;
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
                throw new Error(errorData.message || `Failed to add data.`);
            }

            const newEntry = await response.json();
            toast.success({ title: "Success", description: successMessage });

            await fetchDropdownData();

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
                        setValue('goods_details.0.item_id', newIdNumber, { shouldValidate: true });
                        break;
                }
            }

            setIsModalOpen(false);
            setModalInput({});

        } catch (error: any) {
            console.error(`Master Data Add Error (${modalType}):`, error);
            toast.error({ title: `Error adding data`, description: error.message });
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
                station_expense: values.station_expense || 0,
                bility_expense: values.bility_expense || 0,
                station_labour: values.station_labour || 0,
                cart_labour: values.cart_labour || 0,
                total_expenses: values.total_expenses || 0,
                goods_details: values.goods_details.map(detail => ({
                    item_id: Number(detail.item_id),
                    quantity: Number(detail.quantity),
                }))
            };

            const isEditing = Boolean(editingShipmentId);
            const endpoint = isEditing ? `/api/shipments/${editingShipmentId}` : '/api/shipments';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadToSend),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'register'} shipment.`);
            }
            const result = await response.json();
            const regNum = result.register_number || editingShipmentId;

            toast.success({
                title: isEditing ? 'Bilty Updated Successfully' : 'Bilty Saved Successfully',
                description: `Reg #${regNum} | Bilty No: ${values.bility_number} ${isEditing ? 'updated' : 'recorded'}.`
            });

            setEditingShipmentId(null);
            form.reset({ ...generateDefaultValues(), register_number: regNum });
            fetchShipments(values.bility_date);

        } catch (error: any) {
            console.error('Submission Error:', error);
            toast.error({ title: editingShipmentId ? 'Error Updating Bilty' : 'Error Saving Bilty', description: error.message });
        }
    }, [form, paymentStatusToSend, toast, data, editingShipmentId, fetchShipments]);

    const onInvalid = useCallback((errors: any) => {
        console.error("Form Validation Errors:", errors);
        const errorKeys = Object.keys(errors);
        const friendlyNames: Record<string, string> = {
            bility_number: 'Bilty Number',
            bility_date: 'Bilty Date',
            departure_city_id: 'Departure City',
            to_city_id: 'Destination City',
            forwarding_agency_id: 'Forwarding Agency',
            vehicle_number_id: 'Fleet Vehicle',
            goods_details: 'Goods / Item Category',
            sender_id: 'Sender Party',
            receiver_id: 'Receiver Party',
        };
        const missing = errorKeys.map(k => friendlyNames[k] || k).join(', ');
        toast.error({
            title: "Incomplete Bilty Details",
            description: `Please select or enter: ${missing}`,
        });
    }, [toast]);

    const createPrintContent = (shipmentData: any) => {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Shipment Receipt - ${shipmentData.bility_number}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
                .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
                .header h1 { margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; }
                .header p { margin: 2px 0 0; font-size: 12px; color: #475569; }
                .section { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; }
                .section-title { font-weight: 700; font-size: 11px; color: #475569; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                td { padding: 4px 0; vertical-align: top; }
                .val-highlight { font-weight: 700; color: #1d4ed8; font-size: 14px; font-family: monospace; }
                .financial-box { background: #f8fafc; border: 1px solid #cbd5e1; }
                .total-line { font-size: 14px; font-weight: 800; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 6px; display: flex; justify-content: space-between; }
                .footer { text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 10px; margin-top: 16px; font-size: 10px; color: #94a3b8; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Zikria Goods Transports Company</h1>
                <p>Consignment & Bilty Receipt</p>
            </div>

            <div class="section">
                <div class="section-title">Registration & Bilty</div>
                <table>
                    <tr>
                        <td width="30%"><strong>Bilty Number:</strong></td>
                        <td width="30%" class="val-highlight">${shipmentData.bility_number}</td>
                        <td width="20%"><strong>Reg. Number:</strong></td>
                        <td width="20%" style="font-family: monospace;">${shipmentData.register_number}</td>
                    </tr>
                    <tr>
                        <td><strong>Bilty Date:</strong></td>
                        <td>${new Date(shipmentData.bility_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td><strong>Payment:</strong></td>
                        <td style="font-weight: 700;">${shipmentData.payment_status}</td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Route & Vehicle</div>
                <table>
                    <tr>
                        <td width="25%"><strong>From:</strong></td>
                        <td width="25%">${shipmentData.departure_city}</td>
                        <td width="25%"><strong>To:</strong></td>
                        <td width="25%">${shipmentData.destination_city}</td>
                    </tr>
                    <tr>
                        <td><strong>Agency:</strong></td>
                        <td>${shipmentData.forwarding_agency}</td>
                        <td><strong>Vehicle:</strong></td>
                        <td><strong style="font-family: monospace;">${shipmentData.vehicle_number}</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Parties</div>
                <table>
                    <tr>
                        <td width="50%"><strong>Sender:</strong> ${shipmentData.sender_name}</td>
                        <td width="50%"><strong>Receiver:</strong> ${shipmentData.receiver_name}</td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Goods</div>
                <table>
                    <tr>
                        <td><strong>Item:</strong> ${shipmentData.item_type}</td>
                        <td><strong>Quantity:</strong> ${shipmentData.quantity} Units</td>
                    </tr>
                </table>
            </div>

            <div class="section financial-box">
                <div class="section-title">Billing</div>
                <table>
                    <tr>
                        <td>Chota Karaya:</td>
                        <td style="text-align: right;">${formatCurrency(shipmentData.total_delivery_charges)}</td>
                    </tr>
                </table>
                <div class="total-line">
                    <span>Bara Karaya:</span>
                    <span>${formatCurrency(shipmentData.total_amount)}</span>
                </div>
            </div>

            <div class="footer">
                <p>Printed on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • Zikria Goods Transports ERP</p>
            </div>
        </body>
        </html>
        `;
    };

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
            payment_status: shipment.payment_status === 'FREE' ? 'FREE' : shipment.payment_status === 'ALREADY_PAID' ? 'PAID' : 'PENDING',
        };
    };

    const handlePrintShipmentRow = (shipment: ShipmentData) => {
        try {
            const printableData = preparePrintableFromShipment(shipment);
            const printWindow = window.open('', '', 'height=650,width=800');
            if (printWindow) {
                const html = createPrintContent(printableData);
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.print();
            }
        } catch (err) {
            console.error('Print row error:', err);
            toast.error({ title: 'Print Error', description: 'Failed to generate printable receipt.' });
        }
    };

    const handlePrintTable = () => {
        if (shipments.length === 0) {
            toast.error({ title: 'No Data', description: 'There are no shipments to print for the selected date.' });
            return;
        }
        window.print();
    };

    const isFormValid = form.formState.isValid;

    if (isLoadingData) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[60vh]">
                <Loader2 className="w-7 h-7 text-blue-600 animate-spin mb-2" />
                <p className="text-xs font-semibold text-slate-500 font-mono">Loading bilty dispatch desk...</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 max-w-5xl mx-auto pb-10">
            {/* Minimal Sub-header: Date & Quick Add */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Dispatch Date: <strong className="text-slate-900 dark:text-white font-bold">{bilityDate || 'Today'}</strong></span>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => openMasterDataModal('party')}
                    className="rounded-lg text-xs font-semibold gap-1.5 h-7 px-2.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs"
                >
                    <Plus className="w-3 h-3 text-blue-600" />
                    Quick Add
                </Button>
            </div>

            {/* Unified Compact Bilty Form */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleDirectSave, onInvalid)} className="space-y-4">
                    <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
                        
                        {/* Editing Mode Indicator */}
                        {editingShipmentId && (
                            <div className="flex items-center justify-between p-2.5 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs">
                                <div className="flex items-center gap-2">
                                    <Pencil className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                                    <span>
                                        Editing Bilty: <strong className="font-mono font-bold">#{form.getValues('bility_number') || 'Bilty'}</strong> (Reg: <span className="font-mono font-bold">{editingShipmentId}</span>)
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    className="h-6 px-2 text-[11px] font-bold text-amber-900 hover:text-red-600 hover:bg-amber-100 dark:hover:bg-amber-900/50 gap-1 rounded-md"
                                >
                                    <X className="w-3 h-3" />
                                    Cancel Edit
                                </Button>
                            </div>
                        )}

                        {/* Row 1: Bilty details and Departure */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <FormField control={form.control} name="bility_number" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Bilty Number <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="e.g. 10452" 
                                            {...field} 
                                            className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
                                            onFocus={(e) => e.currentTarget.select()} 
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="bility_date" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Bilty Date <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="date" 
                                            {...field} 
                                            className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="departure_city_id" render={({ field }) => (
                                <SearchableDropdown
                                    label="Departure City *"
                                    endpoint="/api/cities"
                                    placeholder="Select departure"
                                    value={field.value}
                                    onSelectItem={(it) => field.onChange(Number(it.id))}
                                    items={data?.cities}
                                    onNewItemAdded={fetchDropdownData}
                                />
                            )} />
                        </div>

                        {/* Row 2: Forwarding Agency & Vehicle */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField control={form.control} name="forwarding_agency_id" render={({ field }) => (
                                <SearchableDropdown
                                    label="Forwarding Agency *"
                                    endpoint="/api/agencies"
                                    placeholder="Select forwarding partner agency"
                                    value={field.value}
                                    onSelectItem={(it) => field.onChange(Number(it.id))}
                                    items={data?.agencies}
                                    onNewItemAdded={fetchDropdownData}
                                />
                            )} />

                            <FormField control={form.control} name="vehicle_number_id" render={({ field }) => (
                                <SearchableDropdown
                                    label="Fleet Vehicle (License Plate) *"
                                    endpoint="/api/vehicles"
                                    placeholder="Select truck license plate"
                                    value={field.value}
                                    onSelectItem={(it) => field.onChange(Number(it.id))}
                                    items={data?.vehicles}
                                    createPropertyName="vehicleNumber"
                                    onNewItemAdded={fetchDropdownData}
                                />
                            )} />
                        </div>

                        {/* Row 3: Cargo & Quantity */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-3">
                                <FormField control={form.control} name="goods_details.0.item_id" render={({ field }) => (
                                    <SearchableDropdown
                                        label="Item Category / Goods Description *"
                                        endpoint="/api/items"
                                        placeholder="Select or enter item category"
                                        value={field.value}
                                        onSelectItem={(it) => field.onChange(Number(it.id))}
                                        items={data?.items}
                                        createPropertyName="description"
                                        onNewItemAdded={fetchDropdownData}
                                    />
                                )} />
                            </div>

                            <FormField control={form.control} name="goods_details.0.quantity" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Quantity (Units/Boxes) *
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min={1}
                                            placeholder="1"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.valueAsNumber || 1)}
                                            className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
                                            onFocus={(e) => e.currentTarget.select()} 
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />
                        </div>

                        {/* Row 4: Sender & Receiver Parties and Destination */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <FormField control={form.control} name="sender_id" render={({ field }) => (
                                <SearchableDropdown
                                    label="Sender Party *"
                                    endpoint="/api/parties"
                                    placeholder="Select sender party"
                                    value={field.value}
                                    onSelectItem={(it) => field.onChange(Number(it.id))}
                                    items={data?.parties}
                                    onNewItemAdded={fetchDropdownData}
                                />
                            )} />

                            <FormField control={form.control} name="receiver_id" render={({ field }) => (
                                <SearchableDropdown
                                    label="Receiver Party *"
                                    endpoint="/api/parties"
                                    placeholder="Select receiver party"
                                    value={field.value}
                                    onSelectItem={(it) => field.onChange(Number(it.id))}
                                    items={data?.parties}
                                    onNewItemAdded={fetchDropdownData}
                                />
                            )} />

                            <FormField control={form.control} name="to_city_id" render={({ field }) => (
                                <SearchableDropdown
                                    label="Destination City *"
                                    endpoint="/api/cities"
                                    placeholder="Select destination"
                                    value={field.value}
                                    onSelectItem={(it) => field.onChange(Number(it.id))}
                                    items={data?.cities}
                                    onNewItemAdded={fetchDropdownData}
                                />
                            )} />
                        </div>

                        {/* Row 5: Financials & Settlement */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField control={form.control} name="total_delivery_charges" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Chota Karaya (Rs.)
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            {...field}
                                            onChange={(e) => field.onChange(isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                                            className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold"
                                            onFocus={(e) => e.currentTarget.select()} 
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="total_amount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Bara Karaya (Rs.) *
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            {...field}
                                            onChange={(e) => field.onChange(isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                                            className="rounded-lg h-9 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 text-sm font-mono font-extrabold text-emerald-800 dark:text-emerald-300"
                                            onFocus={(e) => e.currentTarget.select()} 
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />
                        </div>

                        {/* Payment Mode Pills */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <FormField
                                control={form.control}
                                name="is_already_paid"
                                render={({ field }) => (
                                    <button 
                                        type="button"
                                        disabled={Boolean(isFreeOfCost)}
                                        onClick={() => {
                                            const nextVal = !field.value;
                                            field.onChange(nextVal);
                                            if (nextVal) {
                                                setValue('is_free_of_cost', false);
                                            }
                                        }}
                                        className={cn(
                                            "w-full text-left p-2.5 rounded-lg border transition-colors flex items-center justify-between",
                                            field.value 
                                                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500" 
                                                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700",
                                            isFreeOfCost ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", field.value ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600")}>
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">Already Paid</p>
                                                <p className="text-[10px] text-slate-500">Freight settled upfront</p>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "size-4 rounded-[4px] border flex items-center justify-center transition-colors",
                                            field.value ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                        )}>
                                            {field.value && <Check className="w-3 h-3 stroke-[3]" />}
                                        </div>
                                    </button>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="is_free_of_cost"
                                render={({ field }) => (
                                    <button 
                                        type="button"
                                        disabled={Boolean(isAlreadyPaid)}
                                        onClick={() => {
                                            const nextVal = !field.value;
                                            field.onChange(nextVal);
                                            if (nextVal) {
                                                setValue('is_already_paid', false);
                                            }
                                        }}
                                        className={cn(
                                            "w-full text-left p-2.5 rounded-lg border transition-colors flex items-center justify-between",
                                            field.value 
                                                ? "bg-blue-50 dark:bg-blue-950/30 border-blue-500" 
                                                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700",
                                            isAlreadyPaid ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", field.value ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600")}>
                                                <Package className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">Free of Cost (FOC)</p>
                                                <p className="text-[10px] text-slate-500">Zero charge shipment</p>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "size-4 rounded-[4px] border flex items-center justify-center transition-colors",
                                            field.value ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                        )}>
                                            {field.value && <Check className="w-3 h-3 stroke-[3]" />}
                                        </div>
                                    </button>
                                )}
                            />
                        </div>

                    </Card>

                    {/* Submit Button */}
                    <div className="flex items-center gap-2">
                        {editingShipmentId && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelEdit}
                                className="h-10 px-4 rounded-lg border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 gap-1.5 shrink-0"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Cancel
                            </Button>
                        )}
                        <Button
                            type="submit"
                            disabled={form.formState.isSubmitting}
                            className={cn(
                                "w-full h-10 rounded-lg text-white font-bold text-xs shadow-xs transition-colors gap-2 cursor-pointer",
                                editingShipmentId 
                                    ? "bg-amber-600 hover:bg-amber-700" 
                                    : "bg-blue-600 hover:bg-blue-700"
                            )}
                        >
                            {form.formState.isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {editingShipmentId ? 'Updating Bilty Consignment...' : 'Saving Bilty Consignment...'}
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    {editingShipmentId ? 'Update Consignment Bilty' : 'Save & Register Consignment Bilty'}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>

            {/* Quick-Add Master Data Dialog */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[420px] p-5 rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-extrabold capitalize text-slate-900 dark:text-white">
                            Quick Add New {modalType}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Register new {modalType} entry directly into master records.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        {modalType === 'city' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="cityName" className="text-xs font-bold text-slate-700 dark:text-slate-300">City Name *</Label>
                                <Input
                                    id="cityName"
                                    placeholder="e.g. Rawalpindi"
                                    value={modalInput.name || ''}
                                    onChange={(e) => setModalInput({ ...modalInput, name: e.target.value })}
                                    className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs"
                                    autoFocus
                                />
                            </div>
                        )}
                        {modalType === 'agency' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="agencyName" className="text-xs font-bold text-slate-700 dark:text-slate-300">Agency Name *</Label>
                                <Input
                                    id="agencyName"
                                    placeholder="e.g. Al-Madina Express"
                                    value={modalInput.name || ''}
                                    onChange={(e) => setModalInput({ ...modalInput, name: e.target.value })}
                                    className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs"
                                    autoFocus
                                />
                            </div>
                        )}
                        {modalType === 'vehicle' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="vehicleNumber" className="text-xs font-bold text-slate-700 dark:text-slate-300">Vehicle Number *</Label>
                                <Input
                                    id="vehicleNumber"
                                    placeholder="e.g. LES-19-4821"
                                    value={modalInput.vehicleNumber || ''}
                                    onChange={(e) => setModalInput({ ...modalInput, vehicleNumber: e.target.value })}
                                    className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs font-mono font-bold uppercase"
                                    autoFocus
                                />
                            </div>
                        )}
                        {modalType === 'party' && (
                            <>
                                <div className="space-y-1.5">
                                    <Label htmlFor="partyName" className="text-xs font-bold text-slate-700 dark:text-slate-300">Party Name *</Label>
                                    <Input
                                        id="partyName"
                                        placeholder="e.g. Master Traders"
                                        value={modalInput.name || ''}
                                        onChange={(e) => setModalInput({ ...modalInput, name: e.target.value })}
                                        className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="contactInfo" className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact / Phone</Label>
                                    <Input
                                        id="contactInfo"
                                        placeholder="0300-1234567"
                                        value={modalInput.contactInfo || ''}
                                        onChange={(e) => setModalInput({ ...modalInput, contactInfo: e.target.value })}
                                        className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs font-mono"
                                    />
                                </div>
                            </>
                        )}
                        {modalType === 'item' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="description" className="text-xs font-bold text-slate-700 dark:text-slate-300">Item Description *</Label>
                                <Input
                                    id="description"
                                    placeholder="e.g. Cotton Bales / Spare Parts"
                                    value={modalInput.description || ''}
                                    onChange={(e) => setModalInput({ ...modalInput, description: e.target.value })}
                                    className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs"
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="rounded-lg text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            type="button"
                            onClick={handleAddMasterData}
                            disabled={isModalSubmitting}
                            className="rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isModalSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save & Select'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Security Verification Dialog for Bilty Edit */}
            <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                <DialogContent className="sm:max-w-md rounded-xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl">
                    <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-bold">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-white">
                                    Security Authorization Required
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-500">
                                    بلٹی میں ترمیم کے لیے پاس ورڈ درج کریں
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <form onSubmit={handleVerifyAndProceed} className="space-y-4 pt-2">
                        {targetShipmentToEdit && (
                            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                                <div>
                                    <span className="text-slate-500">Editing Bilty: </span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">#{targetShipmentToEdit.bility_number}</span>
                                </div>
                                <div className="font-mono text-slate-500">
                                    Reg: #{targetShipmentToEdit.register_number}
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="editPasswordInput" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Enter Edit Password *
                            </Label>
                            <div className="relative">
                                <Input
                                    id="editPasswordInput"
                                    type={showPasswordInModal ? "text" : "password"}
                                    placeholder="Enter authorization password"
                                    value={passwordInput}
                                    onChange={(e) => {
                                        setPasswordInput(e.target.value);
                                        setPasswordError(null);
                                    }}
                                    autoFocus
                                    className="h-10 rounded-lg text-xs font-mono pr-10 border-slate-200 dark:border-slate-700"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showPasswordInModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {passwordError && (
                                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                    {passwordError}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="rounded-lg text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                type="submit"
                                disabled={isVerifyingPassword}
                                className="rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                            >
                                {isVerifyingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                                Verify & Edit
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Saved Shipments Today */}
            <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                            Saved Bilties for ({bilityDate})
                        </CardTitle>
                        <CardDescription className="text-[11px] text-slate-500">
                            {shipments.length} {shipments.length === 1 ? 'consignment' : 'consignments'} on record
                        </CardDescription>
                    </div>
                    {shipments.length > 0 && (
                        <Button
                            onClick={handlePrintTable}
                            size="sm"
                            variant="outline"
                            className="rounded-lg text-xs font-semibold gap-1.5 h-8 border-slate-200 dark:border-slate-700"
                        >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                            Print Day Sheet
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingShipments ? (
                        <div className="p-6 text-center text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-blue-600" />
                            <p className="text-xs">Updating bilty list...</p>
                        </div>
                    ) : shipments.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                            <p className="text-xs">No shipments recorded for this date yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-4">Bilty #</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Bilty Date</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Created Date</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Departure</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Destination</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Vehicle</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Sender</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Receiver</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Chota Karaya</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Bara Karaya</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center pr-4">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shipments.map((s) => {
                                        const createdDateFormatted = (s.created_day || s.created_at || s.createdAt)
                                            ? new Date(s.created_day || s.created_at || s.createdAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                            : '-';

                                        return (
                                            <TableRow 
                                                key={s.register_number} 
                                                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors"
                                            >
                                                <TableCell className="pl-4 font-mono font-bold text-slate-900 dark:text-white">
                                                    <span>{s.bility_number}</span>
                                                    <span className="block text-[10px] text-slate-400 font-mono">#{s.register_number}</span>
                                                </TableCell>
                                                <TableCell className="font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap text-[11px]">
                                                    {s.bility_date ? new Date(s.bility_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                                </TableCell>
                                                <TableCell className="font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                                                    {createdDateFormatted}
                                                </TableCell>
                                                <TableCell>{findNameById(data, 'cities', s.departure_city_id)}</TableCell>
                                                <TableCell>{s.to_city_id ? findNameById(data, 'cities', s.to_city_id) : 'Local'}</TableCell>
                                                <TableCell className="font-mono font-semibold">{findNameById(data, 'vehicles', s.vehicle_number_id)}</TableCell>
                                                <TableCell className="max-w-[100px] truncate">{findNameById(data, 'parties', s.sender_id)}</TableCell>
                                                <TableCell className="max-w-[100px] truncate">{findNameById(data, 'parties', s.receiver_id)}</TableCell>
                                                <TableCell className="text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                    {formatCurrency(Number(s.total_delivery_charges || 0))}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-white">
                                                    {formatCurrency(Number(s.total_charges || 0))}
                                                </TableCell>
                                                <TableCell className="text-center pr-4">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 w-7 p-0 rounded text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                title="Options"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-36 rounded-lg shadow-md border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                                                            <DropdownMenuItem
                                                                onClick={() => handleRequestEdit(s)}
                                                                className="gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-200 focus:bg-blue-50 focus:text-blue-700 dark:focus:bg-blue-950/40 dark:focus:text-blue-300 py-1.5"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5 text-blue-600" />
                                                                Edit Bilty
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handlePrintShipmentRow(s)}
                                                                className="gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-200 focus:bg-slate-100 dark:focus:bg-slate-800 py-1.5"
                                                            >
                                                                <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                                                                Print Receipt
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
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