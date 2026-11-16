"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { toast as sonnerToast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Plus, Loader2, Check, Printer, Calendar,
    CheckCircle2, ChevronDown, ChevronUp,
    Pencil, X, RotateCcw, Lock, Eye, EyeOff,
    Search, Trash2, BookOpenCheck, LogOut, PackageCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchableDropdown } from "@/components/ui/SearchableDropdown";
import { fetchMasterLists, clearMasterListsClientCache } from '@/lib/master-lists-client';
import { toDateInputValue } from '@/lib/created-date';
import { describeNetworkError, fetchWithTimeout, readApiErrorMessage } from '@/lib/api-client';
import BiltyDetailDialog from '@/components/shipments/BiltyDetailDialog';

export interface Toast {
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
}

export function useToast() {
    return useMemo(() => ({
        toast: {
            success: (t: Omit<Toast, 'id'>) => {
                sonnerToast.success(t.title, { description: t.description });
            },
            error: (t: Omit<Toast, 'id'>) => {
                sonnerToast.error(t.title, { description: t.description });
            },
            info: (t: Omit<Toast, 'id'>) => {
                sonnerToast.info(t.title, { description: t.description });
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
    quantity: z.coerce.number().min(0, 'Quantity cannot be negative'),
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
    const chota = Number(data.total_delivery_charges) || 0;
    const bara = Number(data.total_amount) || 0;
    if (chota <= 0 && bara <= 0 && !data.is_already_paid && !data.is_free_of_cost) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please enter Chota Karaya, Bara Karaya, or select Already Paid / Free of Cost.',
            path: ['total_amount'],
        });
    } else if (chota > 0 && bara <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Bara Karaya is required when Chota Karaya is entered.',
            path: ['total_amount'],
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
    goodsDetails?: { quantity: number; itemCatalog?: { item_description?: string } | null; item_id?: number }[];
    payment_status?: string | null;
    remarks?: string | null;
    station_expense: number;
    bility_expense: number;
    station_labour: number;
    cart_labour: number;
    total_expenses: number;
    isNew?: boolean;
}

const getLocalDateInput = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const today = getLocalDateInput();

const generateDefaultValues = (): ShipmentFormValues => ({
    register_number: '',
    bility_number: '',
    bility_date: today,
    departure_city_id: 0,
    forwarding_agency_id: 0,
    vehicle_number_id: 0,
    goods_details: [
        { id: uuidv4(), item_id: 0, quantity: 0 }
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

export default function AddShipmentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [data, setData] = useState<DropdownData | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [shipments, setShipments] = useState<ShipmentData[]>([]);
    const [savedBiltiesDate, setSavedBiltiesDate] = useState<string>(today);
    const [createdDate, setCreatedDate] = useState<string>(today);
    const [isLoadingShipments, setIsLoadingShipments] = useState(false);
    const [shipmentsPage, setShipmentsPage] = useState(1);
    const [shipmentsPageSize, setShipmentsPageSize] = useState(25);
    const [shipmentsTotal, setShipmentsTotal] = useState(0);
    const [shipmentsTotalPages, setShipmentsTotalPages] = useState(1);
    const [isFetchingRegNum, setIsFetchingRegNum] = useState(false);
    const [showExpenses, setShowExpenses] = useState(false);
    const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    // Micro-tab active state
    const [activeMicroTab, setActiveMicroTab] = useState<'CONSIGNMENT ENTRY' | 'QUICK DISPATCH' | 'BULK IMPORT' | 'TEMPLATES'>('CONSIGNMENT ENTRY');

    // Live ledger search
    const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');

    // Selected shipment for BiltyDetailDialog
    const [selectedViewShipmentId, setSelectedViewShipmentId] = useState<string | null>(null);

    // FOC backup values
    const savedChotaBeforeFOC = useRef<number>(0);
    const savedBaraBeforeFOC = useRef<number>(0);

    // Modal state for quick add master data
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'city' | 'agency' | 'vehicle' | 'party' | 'item' | null>(null);
    const [modalInput, setModalInput] = useState<any>({});
    const [isModalSubmitting, setIsModalSubmitting] = useState(false);

    // Password Security Modal State for Bilty Edit
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [targetShipmentToEdit, setTargetShipmentToEdit] = useState<ShipmentData | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [showPasswordInModal, setShowPasswordInModal] = useState(false);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const form = useForm<ShipmentFormValues>({
        resolver: zodResolver(ShipmentFormSchema) as any,
        defaultValues: generateDefaultValues(),
        mode: 'onChange',
    });

    const { setValue, watch, control, handleSubmit } = form;

    const bilityNumberInputRef = useRef<HTMLInputElement | null>(null);

    const focusBilityNumber = useCallback(() => {
        setTimeout(() => {
            const inputEl = (document.getElementById('bility_number_input') as HTMLInputElement | null) || bilityNumberInputRef.current;
            if (inputEl) {
                inputEl.focus();
                inputEl.select?.();
            } else {
                form.setFocus('bility_number');
            }
        }, 100);
    }, [form]);

    const stationExpense = watch("station_expense");
    const bilityExpense = watch("bility_expense");
    const stationLabour = watch("station_labour");
    const cartLabour = watch("cart_labour");
    const totalDeliveryCharges = watch("total_delivery_charges");
    const totalAmount = watch("total_amount");
    const isAlreadyPaid = watch("is_already_paid");
    const isFreeOfCost = watch("is_free_of_cost");
    const bilityDate = watch("bility_date");

    const liveTotalTariff = useMemo(() => {
        if (isFreeOfCost) return 0;
        return (Number(totalDeliveryCharges) || 0) + (Number(totalAmount) || 0);
    }, [totalDeliveryCharges, totalAmount, isFreeOfCost]);

    useEffect(() => {
        const calculatedTotalExp = (Number(stationExpense) || 0) + (Number(bilityExpense) || 0) + (Number(stationLabour) || 0) + (Number(cartLabour) || 0);
        if (form.getValues('total_expenses') !== calculatedTotalExp) {
            setValue("total_expenses", calculatedTotalExp);
        }
    }, [stationExpense, bilityExpense, stationLabour, cartLabour, setValue, form]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "goods_details",
    });

    const paymentStatusToSend = useMemo(() => {
        if (isFreeOfCost) return 'FREE';
        if (isAlreadyPaid) return 'ALREADY_PAID';
        return 'PENDING';
    }, [isAlreadyPaid, isFreeOfCost]);

    const isFetchingListsRef = useRef(false);
    const fetchDropdownData = useCallback(async (force = false) => {
        if (isFetchingListsRef.current) return null;
        isFetchingListsRef.current = true;
        try {
            const lists = await fetchMasterLists(force);
            setData(lists);
            return lists;
        } catch (error: any) {
            console.error("Data fetch error:", error);
            sonnerToast.error('Error loading data', { description: error.message || 'Could not retrieve lists.' });
        } finally {
            isFetchingListsRef.current = false;
        }
        return null;
    }, []);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const handleSync = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                fetchDropdownData(true);
            }, 100);
        };
        window.addEventListener('gms:master-lists-invalidated', handleSync);
        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener('gms:master-lists-invalidated', handleSync);
        };
    }, [fetchDropdownData]);

    // Restore last selected route/fleet fields on initial load & master data refresh
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const savedCityId = localStorage.getItem('last_departure_city_id');
                if (savedCityId) {
                    const parsed = Number(savedCityId);
                    if (parsed > 0 && !form.getValues('departure_city_id')) {
                        form.setValue('departure_city_id', parsed, { shouldValidate: true });
                    }
                }

                const savedAgencyId = localStorage.getItem('last_forwarding_agency_id');
                if (savedAgencyId) {
                    const parsed = Number(savedAgencyId);
                    if (parsed > 0 && !form.getValues('forwarding_agency_id')) {
                        form.setValue('forwarding_agency_id', parsed, { shouldValidate: true });
                    }
                }

                const savedVehicleId = localStorage.getItem('last_vehicle_number_id');
                if (savedVehicleId) {
                    const parsed = Number(savedVehicleId);
                    if (parsed > 0 && !form.getValues('vehicle_number_id')) {
                        form.setValue('vehicle_number_id', parsed, { shouldValidate: true });
                    }
                }

                const savedToCityId = localStorage.getItem('last_to_city_id') || localStorage.getItem('last_destination_city_id');
                if (savedToCityId) {
                    const parsed = Number(savedToCityId);
                    if (parsed > 0 && !form.getValues('to_city_id')) {
                        form.setValue('to_city_id', parsed, { shouldValidate: true });
                    }
                }
            } catch {
                // Ignore localStorage errors
            }
        }
    }, [data, form]);

    const fetchShipments = useCallback(async (dateToFilter: string, page = 1, pageSize = 25) => {
        if (!dateToFilter) {
            setShipments([]);
            setShipmentsTotal(0);
            setShipmentsTotalPages(1);
            return;
        }
        setIsLoadingShipments(true);
        try {
            const params = new URLSearchParams({
                date: dateToFilter,
                page: String(page),
                pageSize: String(pageSize),
            });
            const response = await fetchWithTimeout(`/api/shipments?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch shipments.');
            const payload = await response.json();
            const list: ShipmentData[] = Array.isArray(payload) ? payload : (payload.data || []);
            const sortedList = [...list].sort((a, b) => {
                const timeA = new Date(a.createdAt || a.created_day || 0).getTime();
                const timeB = new Date(b.createdAt || b.created_day || 0).getTime();
                if (timeB !== timeA) return timeB - timeA;
                return String(b.register_number || '').localeCompare(String(a.register_number || ''), undefined, { numeric: true });
            });
            setShipments(sortedList);
            setShipmentsTotal(Array.isArray(payload) ? payload.length : Number(payload.total || 0));
            setShipmentsTotalPages(Array.isArray(payload) ? 1 : Number(payload.totalPages || 1));
        } catch (error: any) {
            console.error("Shipments fetch error:", error);
            sonnerToast.error('Error loading shipments', { description: 'Could not retrieve saved shipments list.' });
            setShipments([]);
            setShipmentsTotal(0);
            setShipmentsTotalPages(1);
        } finally {
            setIsLoadingShipments(false);
        }
    }, []);

    const fetchNextRegNum = useCallback(async (targetDate?: string) => {
        const dateToUse = targetDate || bilityDate;
        if (!dateToUse) {
            setValue('register_number', '');
            return;
        }
        setIsFetchingRegNum(true);
        try {
            const res = await fetchWithTimeout(`/api/shipments/next-register-number?bility_date=${dateToUse}`);
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
    }, [bilityDate, setValue]);

    useEffect(() => {
        fetchNextRegNum();
    }, [bilityDate, fetchNextRegNum]);

    useEffect(() => {
        setShipmentsPage(1);
    }, [savedBiltiesDate, shipmentsPageSize]);

    useEffect(() => {
        if (savedBiltiesDate) {
            fetchShipments(savedBiltiesDate, shipmentsPage, shipmentsPageSize);
        }
    }, [savedBiltiesDate, shipmentsPage, shipmentsPageSize, fetchShipments]);

    // Initial loading
    useEffect(() => {
        async function fetchInitialDataAndSetDefaults() {
            setIsLoadingData(true);
            await fetchDropdownData();
            setIsLoadingData(false);

            // Handle query param for bilty_number
            const urlBiltyNo = searchParams.get('bility_number');
            if (urlBiltyNo) {
                form.setValue('bility_number', urlBiltyNo);
            }

            // Check if edit parameter exists in URL
            const editId = searchParams.get('edit');
            if (editId) {
                try {
                    const res = await fetchWithTimeout(`/api/shipments/${editId}`);
                    if (res.ok) {
                        const shipmentToEdit = await res.json();
                        if (shipmentToEdit) {
                            handleEditShipment(shipmentToEdit);
                        }
                    }
                } catch (err) {
                    console.error("Error loading bilty for editing:", err);
                }
            }
        }
        fetchInitialDataAndSetDefaults();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleEditShipment = useCallback((shipment: ShipmentData) => {
        setEditingShipmentId(shipment.register_number);

        const isPaid = shipment.payment_status === 'ALREADY_PAID' ||
            (shipment.remarks?.includes('PAYMENT_STATUS:ALREADY_PAID') ?? false);
        const isFoc = shipment.payment_status === 'FREE' ||
            (shipment.remarks?.includes('PAYMENT_STATUS:FREE') ?? false);

        const cleanRemarks = (shipment.remarks || '').replace(/PAYMENT_STATUS:\w+\s*/, '');
        const createdDay = toDateInputValue(shipment.created_day || shipment.created_at || shipment.createdAt) || today;
        setCreatedDate(createdDay);
        setSavedBiltiesDate(createdDay);

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
                    quantity: Number(gd.quantity ?? 0),
                }))
                : [{ id: uuidv4(), item_id: 0, quantity: 0 }],
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
            is_already_paid: isPaid,
            is_free_of_cost: isFoc,
            remarks: cleanRemarks,
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
        sonnerToast.info('Editing Mode Active', {
            description: `Loaded Bilty #${shipment.bility_number} (Reg #${shipment.register_number}) into the workstation.`,
        });
    }, [form]);

    const handleCancelEdit = () => {
        setEditingShipmentId(null);
        let deptCityId = 0;
        let agencyId = 0;
        let vehicleId = 0;
        let toCityId = 0;
        if (typeof window !== 'undefined') {
            try {
                deptCityId = Number(localStorage.getItem('last_departure_city_id')) || 0;
                agencyId = Number(localStorage.getItem('last_forwarding_agency_id')) || 0;
                vehicleId = Number(localStorage.getItem('last_vehicle_number_id')) || 0;
                toCityId = Number(localStorage.getItem('last_to_city_id')) || Number(localStorage.getItem('last_destination_city_id')) || 0;
            } catch {
                // Ignore localStorage errors
            }
        }
        form.reset({
            ...generateDefaultValues(),
            bility_date: savedBiltiesDate || today,
            departure_city_id: deptCityId,
            forwarding_agency_id: agencyId,
            vehicle_number_id: vehicleId,
            to_city_id: toCityId,
        });
        fetchNextRegNum();
        focusBilityNumber();
        sonnerToast.info('Edit Cancelled', { description: 'Workstation reset to new consignment registration mode.' });
    };

    const handleRequestEdit = (shipment: ShipmentData) => {
        setTargetShipmentToEdit(shipment);
        setPasswordInput('');
        setPasswordError(null);
        setIsPasswordModalOpen(true);
    };

    const handleVerifyAndProceed = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordInput || passwordInput.trim().length === 0) {
            setPasswordError('Please enter the edit password.');
            return;
        }
        setIsVerifyingPassword(true);
        setPasswordError(null);
        try {
            const res = await fetchWithTimeout('/api/settings/verify-edit-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: passwordInput.trim() }),
            });
            const data = await res.json();
            if (res.ok && data.valid) {
                setIsPasswordModalOpen(false);
                setPasswordInput('');
                if (targetShipmentToEdit) {
                    handleEditShipment(targetShipmentToEdit);
                }
            } else {
                setPasswordError(data.message || 'Incorrect edit password. Access denied.');
            }
        } catch {
            setPasswordError('Failed to verify password. Please try again.');
        } finally {
            setIsVerifyingPassword(false);
        }
    };

    // 1-Click Quick Add Sample Data (Inspiration feature)
    const quickFillSampleBilty = () => {
        const pool = [
            { no: '10452', qty: 24, chota: 2500, bara: 18500 },
            { no: '10453', qty: 15, chota: 1800, bara: 14200 },
            { no: '10454', qty: 40, chota: 1200, bara: 9500 },
        ];
        const pick = pool[Math.floor(Math.random() * pool.length)];

        // Select first available IDs from data
        const departureCity = data?.cities?.find(c => c.name?.toLowerCase().includes('sargodha')) || data?.cities?.[0];
        const destCity = data?.cities?.find(c => c.name?.toLowerCase().includes('karachi') || c.name?.toLowerCase().includes('lahore')) || data?.cities?.[1] || data?.cities?.[0];
        const agency = data?.agencies?.[0];
        const vehicle = data?.vehicles?.[0];
        const sender = data?.parties?.[0];
        const receiver = data?.parties?.[1] || data?.parties?.[0];
        const item = data?.items?.[0];

        if (isFreeOfCost) toggleFOC();

        form.setValue('bility_number', pick.no, { shouldValidate: true });
        if (departureCity) form.setValue('departure_city_id', Number(departureCity.id), { shouldValidate: true });
        if (destCity) form.setValue('to_city_id', Number(destCity.id), { shouldValidate: true });
        if (agency) form.setValue('forwarding_agency_id', Number(agency.id), { shouldValidate: true });
        if (vehicle) form.setValue('vehicle_number_id', Number(vehicle.id), { shouldValidate: true });
        if (sender) form.setValue('sender_id', Number(sender.id), { shouldValidate: true });
        if (receiver) form.setValue('receiver_id', Number(receiver.id), { shouldValidate: true });
        if (item) {
            form.setValue('goods_details', [{ id: uuidv4(), item_id: Number(item.id), quantity: pick.qty }], { shouldValidate: true });
        }
        form.setValue('total_delivery_charges', pick.chota, { shouldValidate: true });
        form.setValue('total_amount', pick.bara, { shouldValidate: true });
        form.setValue('is_already_paid', false);
        form.setValue('is_free_of_cost', false);

        sonnerToast.success(`Sample Bilty #${pick.no} Pre-filled!`, {
            description: 'Click "SAVE & REGISTER CONSIGNMENT BILTY" to record immediately.',
        });
    };

    // Toggle Already Paid switch card
    const toggleAlreadyPaid = () => {
        const nextVal = !isAlreadyPaid;
        setValue('is_already_paid', nextVal, { shouldValidate: true });
        if (nextVal) {
            setValue('is_free_of_cost', false, { shouldValidate: true });
        }
    };

    // Toggle Free of Cost switch card
    const toggleFOC = () => {
        const nextVal = !isFreeOfCost;
        setValue('is_free_of_cost', nextVal, { shouldValidate: true });

        if (nextVal) {
            // Backup current freight values
            savedChotaBeforeFOC.current = Number(totalDeliveryCharges) || 0;
            savedBaraBeforeFOC.current = Number(totalAmount) || 0;

            setValue('total_delivery_charges', 0, { shouldValidate: true });
            setValue('total_amount', 0, { shouldValidate: true });
            setValue('is_already_paid', false, { shouldValidate: true });
            sonnerToast.info('Free of Cost (FOC) enabled', { description: 'Freight tariffs set to Rs. 0.00' });
        } else {
            // Restore previous values
            setValue('total_delivery_charges', savedChotaBeforeFOC.current, { shouldValidate: true });
            setValue('total_amount', savedBaraBeforeFOC.current, { shouldValidate: true });
        }
    };

    // Master Data Quick Add
    const openMasterDataModal = (type: typeof modalType) => {
        setModalType(type);
        setModalInput({});
        setIsModalOpen(true);
    };

    const handleAddMasterData = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalType || isModalSubmitting) return;

        setIsModalSubmitting(true);
        let endpoint = '';
        let payload: any = {};
        let successMessage = '';

        try {
            switch (modalType) {
                case 'city':
                    if (!modalInput.name || modalInput.name.trim().length < 2) throw new Error('City name required.');
                    endpoint = '/api/cities';
                    payload = { name: modalInput.name.trim() };
                    successMessage = `City "${modalInput.name}" added.`;
                    break;
                case 'agency':
                    if (!modalInput.name || modalInput.name.trim().length < 2) throw new Error('Agency name required.');
                    endpoint = '/api/agencies';
                    payload = { name: modalInput.name.trim() };
                    successMessage = `Agency "${modalInput.name}" registered.`;
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

            const response = await fetchWithTimeout(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to add data.`);
            }

            const newEntry = await response.json();
            sonnerToast.success(successMessage);

            clearMasterListsClientCache();
            await fetchDropdownData(true);

            const newIdRaw = newEntry.id ?? newEntry.register_number ?? null;
            const newIdNumber = newIdRaw != null ? Number(newIdRaw) : null;

            if (newIdNumber != null) {
                switch (modalType) {
                    case 'party':
                        if (!form.getValues('sender_id')) {
                            setValue('sender_id', newIdNumber, { shouldValidate: true });
                        } else if (!form.getValues('receiver_id')) {
                            setValue('receiver_id', newIdNumber, { shouldValidate: true });
                        } else {
                            setValue('sender_id', newIdNumber, { shouldValidate: true });
                        }
                        break;
                    case 'city':
                        setValue('to_city_id', newIdNumber, { shouldValidate: true });
                        break;
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
            sonnerToast.error(`Error adding data: ${error.message}`);
        } finally {
            setIsModalSubmitting(false);
        }
    };

    // Save or Update Bilty
    const handleDirectSave = useCallback(async (values: ShipmentFormValues) => {
        if (isSavingRef.current) return;
        isSavingRef.current = true;

        const actionLabel = editingShipmentId ? 'Update' : 'Save';
        setIsSaving(true);
        try {
            const chota = Number(values.total_delivery_charges) || 0;
            const bara = Number(values.total_amount) || 0;
            if (chota <= 0 && bara <= 0 && !values.is_already_paid && !values.is_free_of_cost) {
                sonnerToast.error("Freight / Payment Required", {
                    description: "Please enter Chota Karaya, Bara Karaya, or select Already Paid / Free of Cost.",
                });
                return;
            }
            if (chota > 0 && bara <= 0) {
                sonnerToast.error("Bara Karaya Required", {
                    description: "Chota Karaya enter karne ke baad Bara Karaya enter karna lazmi hai.",
                });
                return;
            }

            const { register_number: _reg, is_already_paid: _paid, is_free_of_cost: _foc, ...restValues } = values; void _reg; void _paid; void _foc;

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
                created_date: createdDate,
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

            const response = await fetchWithTimeout(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadToSend),
            });

            if (!response.ok) {
                const message = await readApiErrorMessage(
                    response,
                    `Failed to ${isEditing ? 'update' : 'register'} shipment.`,
                );
                throw new Error(message);
            }

            let result: { register_number?: string; message?: string } = {};
            try {
                result = await response.json();
            } catch {
                throw new Error('Bilty was saved but the server response could not be read.');
            }
            const regNum = result.register_number || editingShipmentId;

            sonnerToast.success(isEditing ? 'Bilty Updated Successfully' : 'Bilty Saved Successfully', {
                description: `Reg #${regNum} | Bilty No: ${values.bility_number} recorded in Day Roznamcha.`,
            });

            const nextBilityDate = values.bility_date || today;
            const nextCreatedDate = createdDate;
            const nextDepartureCityId = values.departure_city_id
                ? Number(values.departure_city_id)
                : (typeof window !== 'undefined' ? Number(localStorage.getItem('last_departure_city_id')) || 0 : 0);

            const nextForwardingAgencyId = values.forwarding_agency_id
                ? Number(values.forwarding_agency_id)
                : (typeof window !== 'undefined' ? Number(localStorage.getItem('last_forwarding_agency_id')) || 0 : 0);

            const nextVehicleNumberId = values.vehicle_number_id
                ? Number(values.vehicle_number_id)
                : (typeof window !== 'undefined' ? Number(localStorage.getItem('last_vehicle_number_id')) || 0 : 0);

            const nextToCityId = values.to_city_id
                ? Number(values.to_city_id)
                : (typeof window !== 'undefined' ? (Number(localStorage.getItem('last_to_city_id')) || Number(localStorage.getItem('last_destination_city_id')) || 0) : 0);

            if (typeof window !== 'undefined') {
                try {
                    if (nextDepartureCityId > 0) {
                        localStorage.setItem('last_departure_city_id', String(nextDepartureCityId));
                    }
                    if (nextForwardingAgencyId > 0) {
                        localStorage.setItem('last_forwarding_agency_id', String(nextForwardingAgencyId));
                    }
                    if (nextVehicleNumberId > 0) {
                        localStorage.setItem('last_vehicle_number_id', String(nextVehicleNumberId));
                    }
                    if (nextToCityId > 0) {
                        localStorage.setItem('last_to_city_id', String(nextToCityId));
                        localStorage.setItem('last_destination_city_id', String(nextToCityId));
                    }
                } catch {
                    // Ignore localStorage errors
                }
            }
            setEditingShipmentId(null);

            window.setTimeout(() => {
                form.reset({
                    ...generateDefaultValues(),
                    bility_date: nextBilityDate,
                    departure_city_id: nextDepartureCityId,
                    forwarding_agency_id: nextForwardingAgencyId,
                    vehicle_number_id: nextVehicleNumberId,
                    to_city_id: nextToCityId,
                    sender_id: 0,
                    receiver_id: 0,
                });
                fetchNextRegNum(nextBilityDate);
                focusBilityNumber();
            }, 0);

            setSavedBiltiesDate(nextCreatedDate);
            setShipmentsPage(1);
            fetchShipments(nextCreatedDate, 1, shipmentsPageSize);

            // Scroll down smoothly to show the newly added row in Roznamcha
            document.getElementById('roznamcha-section')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        } catch (error: unknown) {
            console.error('Submission Error:', error);
            sonnerToast.error(editingShipmentId ? 'Bilty Update Failed' : 'Bilty Save Failed', {
                description: describeNetworkError(error, actionLabel),
            });
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }, [form, paymentStatusToSend, editingShipmentId, fetchShipments, fetchNextRegNum, focusBilityNumber, createdDate, shipmentsPageSize]);

    const onInvalid = useCallback((errors: Record<string, unknown>) => {
        const errorKeys = Object.keys(errors);
        if (errorKeys.length > 0) {
            const firstKey = errorKeys[0];
            sonnerToast.error("Form Incomplete", {
                description: `Please fill required consignment field: ${firstKey.replace(/_/g, ' ')}`,
            });
        }
    }, []);

    // Print Consignment Slip
    const handlePrintShipment = (shipment: ShipmentData) => {
        const printWindow = window.open('', '_blank', 'height=750,width=1050');
        if (printWindow) {
            const firstItemDesc = shipment.goodsDetails && shipment.goodsDetails.length > 0
                ? (shipment.goodsDetails[0].itemCatalog?.item_description || 'N/A')
                : 'N/A';
            const totalQuantity = shipment.goodsDetails && shipment.goodsDetails.length > 0
                ? shipment.goodsDetails.reduce((s, d) => s + (Number(d.quantity) || 0), 0)
                : 0;

            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Bilty Receipt #${shipment.bility_number}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 24px; color: #202022; }
                    .header { text-align: center; border-bottom: 2px solid #202022; padding-bottom: 12px; margin-bottom: 16px; }
                    .header h1 { margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; }
                    .header p { margin: 3px 0 0; font-size: 12px; color: #71717a; }
                    .card { border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
                    .title { font-weight: 700; font-size: 11px; text-transform: uppercase; color: #71717a; margin-bottom: 6px; }
                    table { width: 100%; border-collapse: collapse; font-size: 13px; }
                    td { padding: 4px 0; vertical-align: top; }
                    .highlight { font-weight: 800; font-size: 15px; font-family: monospace; }
                    .total { border-top: 1px solid #202022; margin-top: 8px; padding-top: 8px; font-size: 15px; font-weight: 800; display: flex; justify-content: space-between; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Zikria Goods Transport Company</h1>
                    <p>Consignment & Bilty Dispatch Receipt • Sargodha Dispatch Hub</p>
                </div>
                <div class="card">
                    <div class="title">Bilty Details</div>
                    <table>
                        <tr>
                            <td width="30%"><strong>Bilty Number:</strong></td>
                            <td width="30%" class="highlight">#${shipment.bility_number}</td>
                            <td width="20%"><strong>Reg. Number:</strong></td>
                            <td width="20%" style="font-family: monospace;">#${shipment.register_number}</td>
                        </tr>
                        <tr>
                            <td><strong>Bilty Date:</strong></td>
                            <td colspan="3">${new Date(shipment.bility_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        </tr>
                    </table>
                </div>
                <div class="card">
                    <div class="title">Route & Carrier</div>
                    <table>
                        <tr>
                            <td width="25%"><strong>From:</strong> ${findNameById(data, 'cities', shipment.departure_city_id)}</td>
                            <td width="25%"><strong>To:</strong> ${shipment.to_city_id ? findNameById(data, 'cities', shipment.to_city_id) : 'Local'}</td>
                            <td width="25%"><strong>Agency:</strong> ${findNameById(data, 'agencies', shipment.forwarding_agency_id)}</td>
                            <td width="25%"><strong>Vehicle:</strong> ${findNameById(data, 'vehicles', shipment.vehicle_number_id)}</td>
                        </tr>
                    </table>
                </div>
                <div class="card">
                    <div class="title">Parties & Goods</div>
                    <table>
                        <tr>
                            <td width="50%"><strong>Sender:</strong> ${shipment.sender_id === WALK_IN_CUSTOMER_ID && shipment.walk_in_sender_name ? shipment.walk_in_sender_name : findNameById(data, 'parties', shipment.sender_id)}</td>
                            <td width="50%"><strong>Receiver:</strong> ${shipment.receiver_id === WALK_IN_CUSTOMER_ID && shipment.walk_in_receiver_name ? shipment.walk_in_receiver_name : findNameById(data, 'parties', shipment.receiver_id)}</td>
                        </tr>
                        <tr>
                            <td><strong>Description:</strong> ${firstItemDesc}</td>
                            <td><strong>Quantity:</strong> ${totalQuantity} Units</td>
                        </tr>
                    </table>
                </div>
                <div class="card" style="background:#f4f4f5;">
                    <div class="title">Tariff & Settlement</div>
                    <table>
                        <tr>
                            <td>Chota Karaya (Delivery):</td>
                            <td style="text-align: right; font-family: monospace;">${formatCurrency(shipment.total_delivery_charges)}</td>
                        </tr>
                        <tr>
                            <td>Bara Karaya (Freight):</td>
                            <td style="text-align: right; font-family: monospace;">${formatCurrency(shipment.total_charges)}</td>
                        </tr>
                    </table>
                    <div class="total">
                        <span>Total Tariff:</span>
                        <span style="font-family: monospace;">${formatCurrency(Number(shipment.total_charges || 0) + Number(shipment.total_delivery_charges || 0))}</span>
                    </div>
                </div>
            </body>
            </html>
            `;
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 250);
        }
    };

    // Print Day Sheet
    const handlePrintDaySheet = async () => {
        try {
            const response = await fetchWithTimeout(`/api/shipments/by-vehicle-date?date=${savedBiltiesDate}`);
            if (!response.ok) throw new Error('Failed to load day consignments.');
            const list = await response.json();
            const dayShipments: ShipmentData[] = Array.isArray(list) ? list : [];
            if (dayShipments.length === 0) {
                sonnerToast.error('No Data', { description: 'There are no shipments to print for the selected date.' });
                return;
            }

            const printWindow = window.open('', '_blank', 'height=750,width=1050');
            if (printWindow) {
                let totalChota = 0;
                let totalBara = 0;

                const rowsHtml = dayShipments.map((s, idx) => {
                    const chota = Number(s.total_delivery_charges || 0);
                    const bara = Number(s.total_charges || 0);
                    totalChota += chota;
                    totalBara += bara;
                    return `
                        <tr>
                            <td style="padding: 6px 8px; border: 1px solid #d4d4d8; text-align: center;">${idx + 1}</td>
                            <td style="padding: 6px 8px; border: 1px solid #d4d4d8; font-weight: bold; font-family: monospace;">${s.bility_number}</td>
                            <td style="padding: 6px 8px; border: 1px solid #d4d4d8; font-family: monospace;">#${s.register_number}</td>
                            <td style="padding: 6px 8px; border: 1px solid #d4d4d8;">${findNameById(data, 'cities', s.departure_city_id)}</td>
                            <td style="padding: 6px 8px; border: 1px solid #d4d4d8;">${s.to_city_id ? findNameById(data, 'cities', s.to_city_id) : 'Local'}</td>
                            <td style="padding: 6px 8px; border: 1px solid #d4d4d8; font-family: monospace;">${findNameById(data, 'vehicles', s.vehicle_number_id)}</td>
                            <td style="padding: 6px 8px; border: 1px solid #d4d4d8;">${findNameById(data, 'parties', s.sender_id)}</td>
                            <td style="padding: 6px 8px; border: 1px solid #d4d4d8; font-weight: bold;">${findNameById(data, 'parties', s.receiver_id)}</td>
                            <td style="padding: 6px 8px; border: 1px solid #d4d4d8; text-align: right; font-family: monospace;">${formatCurrency(chota)}</td>
                            <td style="padding: 6px 8px; border: 1px solid #d4d4d8; text-align: right; font-family: monospace; font-weight: bold;">${formatCurrency(bara)}</td>
                        </tr>
                    `;
                }).join('');

                const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Day Roznamcha Sheet - ${savedBiltiesDate}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #202022; }
                        h1 { font-size: 20px; text-transform: uppercase; margin-bottom: 2px; }
                        p { font-size: 12px; color: #71717a; margin-top: 0; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; }
                        th { background: #f4f4f5; padding: 7px 8px; border: 1px solid #d4d4d8; text-align: left; font-size: 10px; text-transform: uppercase; }
                        .totals-row td { background: #f4f4f5; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>Zikria Goods Transport Company — Day Roznamcha Ledger</h1>
                    <p>Dispatch Register Sheet Date: <strong>${savedBiltiesDate}</strong> • Total Consignments: <strong>${dayShipments.length}</strong></p>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 30px; text-align: center;">#</th>
                                <th>Bilty #</th>
                                <th>Reg. #</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Vehicle</th>
                                <th>Sender</th>
                                <th>Receiver</th>
                                <th style="text-align: right;">Chota Karaya</th>
                                <th style="text-align: right;">Bara Karaya</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                            <tr class="totals-row">
                                <td colspan="8" style="padding: 8px; border: 1px solid #d4d4d8; text-align: right;">TOTAL:</td>
                                <td style="padding: 8px; border: 1px solid #d4d4d8; text-align: right; font-family: monospace;">${formatCurrency(totalChota)}</td>
                                <td style="padding: 8px; border: 1px solid #d4d4d8; text-align: right; font-family: monospace;">${formatCurrency(totalBara)}</td>
                            </tr>
                        </tbody>
                    </table>
                </body>
                </html>
                `;
                printWindow.document.open();
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => printWindow.print(), 250);
            }
        } catch (err) {
            console.error('Day Sheet error:', err);
            sonnerToast.error('Print Error', { description: 'Failed to generate Day Sheet.' });
        }
    };

    // Delete Shipment
    const handleDeleteShipment = async (regNumber: string) => {
        if (!confirm(`Are you sure you want to permanently delete Bilty Reg #${regNumber}?`)) return;
        try {
            const res = await fetchWithTimeout(`/api/shipments/${regNumber}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to delete consignment.');
            }
            sonnerToast.success('Consignment Deleted', { description: `Bilty Reg #${regNumber} removed.` });
            fetchShipments(savedBiltiesDate, shipmentsPage, shipmentsPageSize);
        } catch (err: any) {
            sonnerToast.error('Delete Failed', { description: err.message });
        }
    };

    // Filter shipments in Roznamcha
    const filteredRoznamchaShipments = useMemo(() => {
        const query = ledgerSearchQuery.toLowerCase().trim();
        if (!query) return shipments;

        return shipments.filter(item => {
            const depName = findNameById(data, 'cities', item.departure_city_id).toLowerCase();
            const toName = item.to_city_id ? findNameById(data, 'cities', item.to_city_id).toLowerCase() : 'local';
            const veh = findNameById(data, 'vehicles', item.vehicle_number_id).toLowerCase();
            const sender = (item.walk_in_sender_name || findNameById(data, 'parties', item.sender_id)).toLowerCase();
            const receiver = (item.walk_in_receiver_name || findNameById(data, 'parties', item.receiver_id)).toLowerCase();

            return item.bility_number?.toLowerCase().includes(query) ||
                item.register_number?.toLowerCase().includes(query) ||
                depName.includes(query) ||
                toName.includes(query) ||
                veh.includes(query) ||
                sender.includes(query) ||
                receiver.includes(query);
        });
    }, [shipments, ledgerSearchQuery, data]);

    // Financial summaries for Roznamcha
    const roznamchaTotals = useMemo(() => {
        let totalChota = 0;
        let totalBara = 0;
        let paidCount = 0;
        let unpaidCount = 0;

        filteredRoznamchaShipments.forEach(s => {
            const chota = Number(s.total_delivery_charges || 0);
            const bara = Number(s.total_charges || 0);
            totalChota += chota;
            totalBara += bara;

            if (s.payment_status === 'ALREADY_PAID' || s.payment_status === 'FREE') {
                paidCount += 1;
            } else {
                unpaidCount += 1;
            }
        });

        return {
            totalBilties: filteredRoznamchaShipments.length,
            paidCount,
            unpaidCount,
            totalFreight: totalChota + totalBara,
            totalChota,
            totalBara,
        };
    }, [filteredRoznamchaShipments]);

    if (isLoadingData) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-charcoal dark:text-lavender animate-spin mb-3" />
                <p className="text-xs font-semibold text-zinc-500 font-mono tracking-wider uppercase">
                    Loading Dispatch Workstation...
                </p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 pb-12">

            {/* TOP EDITORIAL PAGE TITLE & MICRO-TABS HEADER */}
            <header id="top-action-bar" className="flex flex-col xl:flex-row xl:items-start justify-between gap-5 pb-4 border-b border-hairline dark:border-zinc-800">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-softcard dark:bg-darkcard border border-hairline dark:border-zinc-700 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                            DISPATCH WORKSTATION
                        </span>
                        <span className="text-xs text-zinc-400 hidden sm:inline">• Immediate ledger &amp; roznamcha sync</span>
                    </div>

                    <h1 className="text-2xl sm:text-[32px] font-bold tracking-tight text-charcoal dark:text-white leading-tight">
                        {editingShipmentId ? `Edit Bilty #${form.getValues('bility_number') || ''}` : 'Register New Bilty'}
                    </h1>

                    {/* Uppercase Micro-Tab Sub-Navigation */}
                    <div className="flex items-center gap-5 sm:gap-7 mt-4 overflow-x-auto no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setActiveMicroTab('CONSIGNMENT ENTRY')}
                            className={`pb-2 text-[11px] font-bold uppercase tracking-wider shrink-0 transition-all ${
                                activeMicroTab === 'CONSIGNMENT ENTRY'
                                    ? 'text-charcoal dark:text-white border-b-2 border-charcoal dark:border-lavender'
                                    : 'text-zinc-400 hover:text-charcoal dark:hover:text-zinc-200 border-b-2 border-transparent'
                            }`}
                        >
                            CONSIGNMENT ENTRY
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveMicroTab('QUICK DISPATCH');
                                quickFillSampleBilty();
                            }}
                            className={`pb-2 text-[11px] font-semibold uppercase tracking-wider shrink-0 transition-all ${
                                activeMicroTab === 'QUICK DISPATCH'
                                    ? 'text-charcoal dark:text-white border-b-2 border-charcoal dark:border-lavender'
                                    : 'text-zinc-400 hover:text-charcoal dark:hover:text-zinc-200 border-b-2 border-transparent'
                            }`}
                        >
                            QUICK DISPATCH
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveMicroTab('BULK IMPORT');
                                router.push('/shipments/view');
                            }}
                            className={`pb-2 text-[11px] font-semibold uppercase tracking-wider shrink-0 transition-all ${
                                activeMicroTab === 'BULK IMPORT'
                                    ? 'text-charcoal dark:text-white border-b-2 border-charcoal dark:border-lavender'
                                    : 'text-zinc-400 hover:text-charcoal dark:hover:text-zinc-200 border-b-2 border-transparent'
                            }`}
                        >
                            BULK IMPORT
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveMicroTab('TEMPLATES');
                                sonnerToast.info('Templates', { description: 'Consignment templates are active based on frequent parties.' });
                            }}
                            className={`pb-2 text-[11px] font-semibold uppercase tracking-wider shrink-0 transition-all ${
                                activeMicroTab === 'TEMPLATES'
                                    ? 'text-charcoal dark:text-white border-b-2 border-charcoal dark:border-lavender'
                                    : 'text-zinc-400 hover:text-charcoal dark:hover:text-zinc-200 border-b-2 border-transparent'
                            }`}
                        >
                            TEMPLATES
                        </button>
                    </div>
                </div>

                {/* Right Controls: Search Pill, Entry Date Picker, + Quick Add Button, Exit */}
                <div className="flex flex-wrap items-center gap-2.5 self-start">
                    {/* Search Input Pill */}
                    <div className="relative">
                        <input
                            type="text"
                            value={ledgerSearchQuery}
                            onChange={(e) => setLedgerSearchQuery(e.target.value)}
                            placeholder="Search bilty #, party..."
                            className="pl-4 pr-9 py-2 rounded-full bg-white dark:bg-darkcard border border-hairline dark:border-zinc-700 text-xs font-medium text-charcoal dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-charcoal dark:focus:border-lavender w-44 sm:w-52 transition-colors shadow-2xs"
                        />
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Entry Date Picker Pill */}
                    <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-softcard dark:bg-darkcard border border-hairline dark:border-zinc-700 text-xs shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium hidden sm:inline">Entry Date:</span>
                        <input
                            type="date"
                            value={createdDate}
                            onChange={(e) => {
                                const nextDate = e.target.value;
                                if (!nextDate) return;
                                setCreatedDate(nextDate);
                                setSavedBiltiesDate(nextDate);
                                setShipmentsPage(1);
                                if (!editingShipmentId) {
                                    setValue('bility_date', nextDate, { shouldValidate: true });
                                }
                            }}
                            className="bg-transparent font-mono font-semibold text-charcoal dark:text-white focus:outline-none cursor-pointer text-xs"
                        />
                    </div>

                    {/* + Quick Add Soft Lavender Pill Button */}
                    <button
                        type="button"
                        onClick={quickFillSampleBilty}
                        className="px-4 py-2 rounded-full bg-lavender hover:bg-lavenderhover active:scale-[0.98] text-charcoal text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        title="1-Click Sample Consignment Fill"
                    >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Quick Add</span>
                    </button>

                    {/* Exit Button */}
                    <button
                        type="button"
                        onClick={() => router.push('/')}
                        className="px-3.5 py-2 rounded-full bg-softcard dark:bg-darkcard hover:bg-zinc-200/70 dark:hover:bg-zinc-700 border border-hairline dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Exit</span>
                    </button>
                </div>
            </header>

            {/* Editing Mode Alert Banner */}
            {editingShipmentId && (
                <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs shadow-2xs">
                    <div className="flex items-center gap-2.5">
                        <Pencil className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                        <span>
                            Editing Consignment Bilty: <strong className="font-mono font-bold">#{form.getValues('bility_number') || 'Bilty'}</strong> (Reg: <span className="font-mono font-bold">{editingShipmentId}</span>)
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="h-7 px-2.5 text-xs font-bold text-amber-900 hover:text-red-600 hover:bg-amber-100 dark:hover:bg-amber-900/50 gap-1 rounded-xl"
                    >
                        <X className="w-3.5 h-3.5" />
                        Cancel Edit
                    </Button>
                </div>
            )}

            {/* 5-STEP CONSIGNMENT REGISTRATION FORM */}
            <Form {...form}>
                <form onSubmit={handleSubmit(handleDirectSave, onInvalid)} className="space-y-4">

                    {/* STEP 1: CONSIGNMENT IDENTIFICATION & ORIGIN */}
                    <section className="bg-softcard dark:bg-darkcard rounded-[20px] p-5 sm:p-6 border border-hairline dark:border-zinc-800 transition-colors shadow-2xs">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-charcoal dark:bg-lavender text-white dark:text-charcoal font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                    1
                                </span>
                                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-charcoal dark:text-zinc-200">
                                    CONSIGNMENT IDENTIFICATION &amp; ORIGIN
                                </h2>
                            </div>

                            {/* Register Number Badge Indicator */}
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-darkbg border border-hairline dark:border-zinc-700 text-xs font-mono">
                                <span className="text-[10px] uppercase font-bold text-zinc-400">Reg #:</span>
                                <span className="font-bold text-charcoal dark:text-lavender">
                                    {form.watch('register_number') ? `#${form.watch('register_number')}` : (isFetchingRegNum ? 'Assigning...' : '#AUTO')}
                                </span>
                                {isFetchingRegNum && <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Bilty Number * */}
                            <FormField control={control} name="bility_number" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="block text-xs font-bold text-charcoal dark:text-zinc-200 mb-1.5">
                                        Bilty Number <span className="text-rose-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            id="bility_number_input"
                                            placeholder="E.G. 10452"
                                            {...field}
                                            ref={(e) => {
                                                field.ref(e);
                                                bilityNumberInputRef.current = e;
                                            }}
                                            onFocus={(e) => e.currentTarget.select()}
                                            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-darkbg border border-hairline dark:border-zinc-700 font-mono text-sm font-semibold text-charcoal dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-charcoal dark:focus:border-lavender focus:ring-2 focus:ring-lavender/50 transition-all shadow-2xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />

                            {/* Bilty Date * */}
                            <FormField control={control} name="bility_date" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="block text-xs font-bold text-charcoal dark:text-zinc-200 mb-1.5">
                                        Bilty Date <span className="text-rose-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            {...field}
                                            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-darkbg border border-hairline dark:border-zinc-700 font-mono text-sm font-semibold text-charcoal dark:text-white focus:outline-none focus:border-charcoal dark:focus:border-lavender focus:ring-2 focus:ring-lavender/50 transition-all shadow-2xs cursor-pointer"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />

                            {/* Departure City * */}
                            <FormField control={control} name="departure_city_id" render={({ field, fieldState }) => (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-charcoal dark:text-zinc-200">
                                            Departure City <span className="text-rose-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => openMasterDataModal('city')}
                                            className="text-[10px] text-zinc-500 hover:text-charcoal dark:hover:text-lavender font-bold flex items-center gap-0.5"
                                        >
                                            <Plus className="w-2.5 h-2.5" /> Add
                                        </button>
                                    </div>
                                    <SearchableDropdown
                                        label=""
                                        endpoint="/api/cities"
                                        placeholder="Select departure city"
                                        value={field.value}
                                        onSelectItem={(it) => {
                                            const id = Number(it.id);
                                            field.onChange(id);
                                            if (typeof window !== 'undefined' && id > 0) {
                                                try {
                                                    localStorage.setItem('last_departure_city_id', String(id));
                                                } catch {
                                                    // Ignore localStorage errors
                                                }
                                            }
                                        }}
                                        items={data?.cities}
                                        onNewItemAdded={() => fetchDropdownData(true)}
                                        error={fieldState.error?.message}
                                    />
                                </div>
                            )} />
                        </div>
                    </section>

                    {/* STEP 2: CARRIER FLEET & FORWARDING PARTNER */}
                    <section className="bg-softcard dark:bg-darkcard rounded-[20px] p-5 sm:p-6 border border-hairline dark:border-zinc-800 transition-colors shadow-2xs">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-6 h-6 rounded-full bg-charcoal dark:bg-lavender text-white dark:text-charcoal font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                2
                            </span>
                            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-charcoal dark:text-zinc-200">
                                CARRIER FLEET &amp; FORWARDING PARTNER
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Forwarding Agency * */}
                            <FormField control={control} name="forwarding_agency_id" render={({ field, fieldState }) => (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-charcoal dark:text-zinc-200">
                                            Forwarding Agency <span className="text-rose-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => openMasterDataModal('agency')}
                                            className="text-[10px] text-zinc-500 hover:text-charcoal dark:hover:text-lavender font-bold flex items-center gap-0.5"
                                        >
                                            <Plus className="w-2.5 h-2.5" /> Add
                                        </button>
                                    </div>
                                    <SearchableDropdown
                                        label=""
                                        endpoint="/api/agencies"
                                        placeholder="Select forwarding partner agency"
                                        value={field.value}
                                        onSelectItem={(it) => {
                                            const id = Number(it.id);
                                            field.onChange(id);
                                            if (typeof window !== 'undefined' && id > 0) {
                                                try {
                                                    localStorage.setItem('last_forwarding_agency_id', String(id));
                                                } catch {
                                                    // Ignore localStorage errors
                                                }
                                            }
                                        }}
                                        items={data?.agencies}
                                        onNewItemAdded={() => fetchDropdownData(true)}
                                        error={fieldState.error?.message}
                                    />
                                </div>
                            )} />

                            {/* Vehicle Number (License Plate) * */}
                            <FormField control={control} name="vehicle_number_id" render={({ field, fieldState }) => (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-charcoal dark:text-zinc-200">
                                            Vehicle Number (License Plate) <span className="text-rose-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => openMasterDataModal('vehicle')}
                                            className="text-[10px] text-zinc-500 hover:text-charcoal dark:hover:text-lavender font-bold flex items-center gap-0.5"
                                        >
                                            <Plus className="w-2.5 h-2.5" /> Add
                                        </button>
                                    </div>
                                    <SearchableDropdown
                                        label=""
                                        endpoint="/api/vehicles"
                                        placeholder="Select or enter truck license plate (e.g. LES-4512)"
                                        value={field.value}
                                        onSelectItem={(it) => {
                                            const id = Number(it.id);
                                            field.onChange(id);
                                            if (typeof window !== 'undefined' && id > 0) {
                                                try {
                                                    localStorage.setItem('last_vehicle_number_id', String(id));
                                                } catch {
                                                    // Ignore localStorage errors
                                                }
                                            }
                                        }}
                                        items={data?.vehicles}
                                        onNewItemAdded={() => fetchDropdownData(true)}
                                        error={fieldState.error?.message}
                                    />
                                </div>
                            )} />
                        </div>
                    </section>

                    {/* STEP 3: CARGO MANIFEST & DESCRIPTION */}
                    <section className="bg-softcard dark:bg-darkcard rounded-[20px] p-5 sm:p-6 border border-hairline dark:border-zinc-800 transition-colors shadow-2xs">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-charcoal dark:bg-lavender text-white dark:text-charcoal font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                    3
                                </span>
                                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-charcoal dark:text-zinc-200">
                                    CARGO MANIFEST &amp; DESCRIPTION
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => append({ id: uuidv4(), item_id: 0, quantity: 1 })}
                                className="text-[10px] font-bold text-charcoal dark:text-lavender hover:underline flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                Add Extra Item Row
                            </button>
                        </div>

                        <div className="space-y-3">
                            {fields.map((fieldItem, index) => (
                                <div key={fieldItem.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                    {/* Quantity */}
                                    <div className="md:col-span-4">
                                        <FormField control={control} name={`goods_details.${index}.quantity`} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="block text-xs font-bold text-charcoal dark:text-zinc-200 mb-1.5">
                                                    Quantity (Units/Boxes) <span className="text-rose-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        {...field}
                                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                                        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-darkbg border border-hairline dark:border-zinc-700 font-mono text-sm font-bold text-charcoal dark:text-white focus:outline-none focus:border-charcoal dark:focus:border-lavender focus:ring-2 focus:ring-lavender/50 transition-all shadow-2xs"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[11px]" />
                                            </FormItem>
                                        )} />
                                    </div>

                                    {/* Item Category */}
                                    <div className={fields.length > 1 ? "md:col-span-7" : "md:col-span-8"}>
                                        <FormField control={control} name={`goods_details.${index}.item_id`} render={({ field, fieldState }) => (
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="text-xs font-bold text-charcoal dark:text-zinc-200">
                                                        Item Category / Goods Description <span className="text-rose-500">*</span>
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => openMasterDataModal('item')}
                                                        className="text-[10px] text-zinc-500 hover:text-charcoal dark:hover:text-lavender font-bold flex items-center gap-0.5"
                                                    >
                                                        <Plus className="w-2.5 h-2.5" /> Add
                                                    </button>
                                                </div>
                                                <SearchableDropdown
                                                    label=""
                                                    endpoint="/api/items"
                                                    placeholder="Select or enter goods category"
                                                    value={field.value}
                                                    onSelectItem={(it) => field.onChange(Number(it.id))}
                                                    items={data?.items}
                                                    onNewItemAdded={() => fetchDropdownData(true)}
                                                    error={fieldState.error?.message}
                                                />
                                            </div>
                                        )} />
                                    </div>

                                    {fields.length > 1 && (
                                        <div className="md:col-span-1 pb-1">
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 flex items-center justify-center transition-colors"
                                                title="Remove Item Row"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* STEP 4: PARTIES & DESTINATION */}
                    <section className="bg-softcard dark:bg-darkcard rounded-[20px] p-5 sm:p-6 border border-hairline dark:border-zinc-800 transition-colors shadow-2xs">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-6 h-6 rounded-full bg-charcoal dark:bg-lavender text-white dark:text-charcoal font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                4
                            </span>
                            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-charcoal dark:text-zinc-200">
                                PARTIES &amp; DESTINATION
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Sender Party * */}
                            <FormField control={control} name="sender_id" render={({ field, fieldState }) => (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-charcoal dark:text-zinc-200">
                                            Sender Party <span className="text-rose-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => openMasterDataModal('party')}
                                            className="text-[10px] text-zinc-500 hover:text-charcoal dark:hover:text-lavender font-bold flex items-center gap-0.5"
                                        >
                                            <Plus className="w-2.5 h-2.5" /> Add
                                        </button>
                                    </div>
                                    <SearchableDropdown
                                        label=""
                                        endpoint="/api/parties"
                                        placeholder="Select sender party"
                                        value={field.value}
                                        onSelectItem={(it) => field.onChange(Number(it.id))}
                                        items={data?.parties}
                                        onNewItemAdded={() => fetchDropdownData(true)}
                                        error={fieldState.error?.message}
                                    />
                                    {field.value === WALK_IN_CUSTOMER_ID && (
                                        <FormField control={control} name="walk_in_sender_name" render={({ field: subField }) => (
                                            <div className="mt-2">
                                                <Input
                                                    placeholder="Enter walk-in sender name"
                                                    {...subField}
                                                    className="rounded-xl h-9 text-xs bg-white dark:bg-darkbg"
                                                />
                                            </div>
                                        )} />
                                    )}
                                </div>
                            )} />

                            {/* Receiver Party * */}
                            <FormField control={control} name="receiver_id" render={({ field, fieldState }) => (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-charcoal dark:text-zinc-200">
                                            Receiver Party <span className="text-rose-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => openMasterDataModal('party')}
                                            className="text-[10px] text-zinc-500 hover:text-charcoal dark:hover:text-lavender font-bold flex items-center gap-0.5"
                                        >
                                            <Plus className="w-2.5 h-2.5" /> Add
                                        </button>
                                    </div>
                                    <SearchableDropdown
                                        label=""
                                        endpoint="/api/parties"
                                        placeholder="Select receiver party"
                                        value={field.value}
                                        onSelectItem={(it) => field.onChange(Number(it.id))}
                                        items={data?.parties}
                                        onNewItemAdded={() => fetchDropdownData(true)}
                                        error={fieldState.error?.message}
                                    />
                                    {field.value === WALK_IN_CUSTOMER_ID && (
                                        <FormField control={control} name="walk_in_receiver_name" render={({ field: subField }) => (
                                            <div className="mt-2">
                                                <Input
                                                    placeholder="Enter walk-in receiver name"
                                                    {...subField}
                                                    className="rounded-xl h-9 text-xs bg-white dark:bg-darkbg"
                                                />
                                            </div>
                                        )} />
                                    )}
                                </div>
                            )} />

                            {/* Destination City * */}
                            <FormField control={control} name="to_city_id" render={({ field, fieldState }) => (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-charcoal dark:text-zinc-200">
                                            Destination City <span className="text-rose-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => openMasterDataModal('city')}
                                            className="text-[10px] text-zinc-500 hover:text-charcoal dark:hover:text-lavender font-bold flex items-center gap-0.5"
                                        >
                                            <Plus className="w-2.5 h-2.5" /> Add
                                        </button>
                                    </div>
                                    <SearchableDropdown
                                        label=""
                                        endpoint="/api/cities"
                                        placeholder="Select destination city"
                                        value={field.value}
                                        onSelectItem={(it) => {
                                            const id = Number(it.id);
                                            field.onChange(id);
                                            if (typeof window !== 'undefined' && id > 0) {
                                                try {
                                                    localStorage.setItem('last_to_city_id', String(id));
                                                    localStorage.setItem('last_destination_city_id', String(id));
                                                } catch {
                                                    // Ignore localStorage errors
                                                }
                                            }
                                        }}
                                        items={data?.cities}
                                        onNewItemAdded={() => fetchDropdownData(true)}
                                        error={fieldState.error?.message}
                                    />
                                </div>
                            )} />
                        </div>
                    </section>

                    {/* STEP 5: FREIGHT CHARGES & SETTLEMENT TERMS */}
                    <section className="bg-softcard dark:bg-darkcard rounded-[20px] p-5 sm:p-6 border border-hairline dark:border-zinc-800 transition-colors shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-charcoal dark:bg-lavender text-white dark:text-charcoal font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                    5
                                </span>
                                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-charcoal dark:text-zinc-200">
                                    FREIGHT CHARGES &amp; SETTLEMENT TERMS
                                </h2>
                            </div>

                            {/* Live Total Tariff Badge */}
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-darkbg border border-hairline dark:border-zinc-700 shadow-2xs">
                                <span className="text-[11px] font-semibold text-zinc-500">Total Tariff:</span>
                                <span className="font-mono text-xs font-bold text-charcoal dark:text-lavender">
                                    Rs. {liveTotalTariff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                {isFreeOfCost && (
                                    <span className="px-2 py-0.5 rounded-full bg-lavender text-charcoal font-mono text-[10px] font-extrabold">
                                        FOC
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Freight Inputs Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Chota Karaya (Delivery Surcharge) */}
                            <FormField control={control} name="total_delivery_charges" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-baseline gap-1.5 text-xs font-bold text-charcoal dark:text-zinc-200 mb-1.5">
                                        <span>Chota Karaya (Rs.)</span>
                                        <span className="text-[11px] font-medium text-zinc-400">(Delivery Surcharge)</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="10"
                                            disabled={Boolean(isFreeOfCost)}
                                            {...field}
                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-darkbg border border-hairline dark:border-zinc-700 font-mono text-sm font-bold text-charcoal dark:text-white focus:outline-none focus:border-charcoal dark:focus:border-lavender focus:ring-2 focus:ring-lavender/50 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />

                            {/* Bara Karaya (Primary Freight) */}
                            <FormField control={control} name="total_amount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-baseline gap-1.5 text-xs font-bold text-charcoal dark:text-zinc-200 mb-1.5">
                                        <span>Bara Karaya (Rs.)</span>
                                        <span className="text-[11px] font-medium text-zinc-400">(Primary Freight)</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="10"
                                            disabled={Boolean(isFreeOfCost)}
                                            {...field}
                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-darkbg border-2 border-lavender dark:border-lavender/70 font-mono text-sm font-bold text-charcoal dark:text-white focus:outline-none focus:border-charcoal dark:focus:border-lavender focus:ring-2 focus:ring-lavender/50 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />
                        </div>

                        {/* Two Interactive Toggle Cards: Already Paid & Free of Cost (FOC) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Card A: Already Paid */}
                            <div
                                onClick={toggleAlreadyPaid}
                                role="switch"
                                aria-checked={Boolean(isAlreadyPaid)}
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggleAlreadyPaid();
                                    }
                                }}
                                className={cn(
                                    "cursor-pointer select-none p-4 rounded-2xl bg-white dark:bg-darkbg border transition-all flex items-center justify-between shadow-2xs",
                                    isAlreadyPaid
                                        ? "border-charcoal dark:border-lavender bg-lavender/20 dark:bg-zinc-800"
                                        : "border-hairline dark:border-zinc-700 hover:border-charcoal/40 dark:hover:border-lavender/50"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                        isAlreadyPaid
                                            ? "bg-lavender text-charcoal"
                                            : "bg-softcard dark:bg-darkcard text-zinc-400"
                                    )}>
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-charcoal dark:text-white">Already Paid</div>
                                        <div className="text-[11px] text-zinc-400">Settled directly by sender</div>
                                    </div>
                                </div>
                                <span className={cn(
                                    "px-3 py-1 rounded-full font-mono text-[11px] font-bold transition-colors",
                                    isAlreadyPaid
                                        ? "bg-charcoal dark:bg-lavender text-white dark:text-charcoal"
                                        : "bg-softcard dark:bg-darkcard text-zinc-500"
                                )}>
                                    {isAlreadyPaid ? 'ON' : 'OFF'}
                                </span>
                            </div>

                            {/* Card B: Free of Cost (FOC) */}
                            <div
                                onClick={toggleFOC}
                                role="switch"
                                aria-checked={Boolean(isFreeOfCost)}
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggleFOC();
                                    }
                                }}
                                className={cn(
                                    "cursor-pointer select-none p-4 rounded-2xl bg-white dark:bg-darkbg border transition-all flex items-center justify-between shadow-2xs",
                                    isFreeOfCost
                                        ? "border-charcoal dark:border-lavender bg-lavender/25 dark:bg-zinc-800"
                                        : "border-hairline dark:border-zinc-700 hover:border-charcoal/40 dark:hover:border-lavender/50"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                        isFreeOfCost
                                            ? "bg-lavender text-charcoal"
                                            : "bg-softcard dark:bg-darkcard text-zinc-400"
                                    )}>
                                        <PackageCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-charcoal dark:text-white">Free of Cost (FOC)</div>
                                        <div className="text-[11px] text-zinc-400">Zero tariff consignment</div>
                                    </div>
                                </div>
                                <span className={cn(
                                    "px-3 py-1 rounded-full font-mono text-[11px] font-bold transition-colors",
                                    isFreeOfCost
                                        ? "bg-charcoal dark:bg-lavender text-white dark:text-charcoal"
                                        : "bg-softcard dark:bg-darkcard text-zinc-500"
                                )}>
                                    {isFreeOfCost ? 'ON' : 'OFF'}
                                </span>
                            </div>
                        </div>

                        {/* Collapsible Additional Logistics Expenses */}
                        <div className="mt-4 pt-3 border-t border-hairline dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setShowExpenses(!showExpenses)}
                                className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-charcoal dark:hover:text-white transition-colors"
                            >
                                {showExpenses ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                <span>Additional Station Expenses &amp; Remarks (Optional)</span>
                            </button>

                            {showExpenses && (
                                <div className="mt-3 p-4 rounded-xl bg-white dark:bg-darkbg border border-hairline dark:border-zinc-800 space-y-3">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <FormField control={control} name="station_expense" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">Station Exp.</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="0" step="10" {...field} onChange={e => field.onChange(Number(e.target.value))} className="h-8 text-xs rounded-lg" />
                                                </FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={control} name="bility_expense" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">Bilty Exp.</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="0" step="10" {...field} onChange={e => field.onChange(Number(e.target.value))} className="h-8 text-xs rounded-lg" />
                                                </FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={control} name="station_labour" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">Station Labour</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="0" step="10" {...field} onChange={e => field.onChange(Number(e.target.value))} className="h-8 text-xs rounded-lg" />
                                                </FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={control} name="cart_labour" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">Cart Labour</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="0" step="10" {...field} onChange={e => field.onChange(Number(e.target.value))} className="h-8 text-xs rounded-lg" />
                                                </FormControl>
                                            </FormItem>
                                        )} />
                                    </div>
                                    <div className="flex items-center justify-between text-xs pt-1">
                                        <span className="font-semibold text-zinc-500">Calculated Expenses:</span>
                                        <span className="font-mono font-bold text-charcoal dark:text-white">
                                            {formatCurrency(form.watch('total_expenses') || 0)}
                                        </span>
                                    </div>
                                    <FormField control={control} name="remarks" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">Remarks</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Optional dispatch notes..." {...field} className="h-8 text-xs rounded-lg" />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                            )}
                        </div>
                    </section>

                    {/* PRIMARY SUBMIT CTA ROW */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 py-4 px-6 rounded-2xl bg-charcoal hover:bg-zinc-800 dark:bg-lavender dark:hover:bg-lavenderhover active:scale-[0.995] text-white dark:text-charcoal font-bold text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-charcoal/15 disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin text-white dark:text-charcoal" />
                            ) : (
                                <span className="w-5 h-5 rounded-full bg-lavender dark:bg-charcoal text-charcoal dark:text-lavender flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                            )}
                            <span>{editingShipmentId ? 'UPDATE CONSIGNMENT BILTY' : 'SAVE & REGISTER CONSIGNMENT BILTY'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                form.reset(generateDefaultValues());
                                setEditingShipmentId(null);
                                fetchNextRegNum();
                                sonnerToast.info('Form cleared for new consignment entry.');
                            }}
                            className="py-4 px-5 rounded-2xl bg-softcard dark:bg-darkcard hover:bg-zinc-200/70 dark:hover:bg-zinc-700 border border-hairline dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center gap-2 shrink-0 shadow-2xs"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Form</span>
                        </button>
                    </div>
                </form>
            </Form>

            {/* DAY ROZNAMCHA LEDGER (Bottom Section from image_e0096b.png) */}
            <section id="roznamcha-section" className="bg-softcard dark:bg-darkcard rounded-[24px] border border-hairline dark:border-zinc-800 p-5 sm:p-6 transition-colors shadow-2xs space-y-4">
                
                {/* Ledger Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-hairline dark:border-zinc-800">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-darkbg border border-hairline dark:border-zinc-700 flex items-center justify-center text-charcoal dark:text-lavender shadow-2xs">
                            <BookOpenCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h2 className="text-base sm:text-lg font-extrabold text-charcoal dark:text-white tracking-tight">
                                    Day Roznamcha Ledger (<span className="font-mono">{savedBiltiesDate}</span>)
                                </h2>
                                <span className="px-2.5 py-0.5 rounded-full bg-lavender text-charcoal font-mono text-[11px] font-bold">
                                    {roznamchaTotals.totalBilties} consignment{roznamchaTotals.totalBilties === 1 ? '' : 's'} recorded on this date
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-0.5">Daily dispatch sheet &amp; verified karaya register</p>
                        </div>
                    </div>

                    {/* Date Filter & Print Day Sheet */}
                    <div className="flex flex-wrap items-center gap-2.5 no-print">
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-darkbg border border-hairline dark:border-zinc-700 shadow-2xs">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            <input
                                type="date"
                                value={savedBiltiesDate}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setSavedBiltiesDate(e.target.value);
                                        setShipmentsPage(1);
                                    }
                                }}
                                className="bg-transparent font-mono text-xs font-bold text-charcoal dark:text-white focus:outline-none cursor-pointer"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handlePrintDaySheet}
                            className="px-4 py-2 rounded-xl bg-white dark:bg-darkbg hover:bg-charcoal hover:text-white dark:hover:bg-lavender dark:hover:text-charcoal border border-hairline dark:border-zinc-700 text-xs font-bold text-charcoal dark:text-white transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Day Sheet</span>
                        </button>
                    </div>
                </div>

                {/* Day Summary Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-white dark:bg-darkbg border border-hairline dark:border-zinc-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Bilties</span>
                        <div className="text-base font-bold text-charcoal dark:text-white font-mono mt-0.5">{roznamchaTotals.totalBilties}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-darkbg border border-hairline dark:border-zinc-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Paid / FOC</span>
                        <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">{roznamchaTotals.paidCount}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-darkbg border border-hairline dark:border-zinc-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Unpaid / To-Pay</span>
                        <div className="text-base font-bold text-amber-700 dark:text-amber-400 font-mono mt-0.5">{roznamchaTotals.unpaidCount}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-darkbg border border-hairline dark:border-zinc-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Day Freight</span>
                        <div className="text-base font-bold text-charcoal dark:text-white font-mono mt-0.5">{formatCurrency(roznamchaTotals.totalFreight)}</div>
                    </div>
                </div>

                {/* Ledger Table */}
                <div className="overflow-x-auto mt-2 bg-white dark:bg-darkbg rounded-xl border border-hairline dark:border-zinc-800">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-hairline dark:border-zinc-800 text-[10.5px] font-extrabold uppercase tracking-wider text-zinc-400 bg-softcard/60 dark:bg-zinc-900/60">
                                <th className="py-3.5 pr-4 pl-4">BILTY #</th>
                                <th className="py-3.5 px-3">BILTY DATE</th>
                                <th className="py-3.5 px-3">DEPARTURE</th>
                                <th className="py-3.5 px-3">DESTINATION</th>
                                <th className="py-3.5 px-3">VEHICLE</th>
                                <th className="py-3.5 px-3">SENDER</th>
                                <th className="py-3.5 px-3">RECEIVER</th>
                                <th className="py-3.5 px-3 text-right">CHOTA KARAYA</th>
                                <th className="py-3.5 px-3 text-right">BARA KARAYA</th>
                                <th className="py-3.5 pr-4 pl-3 text-center no-print">ACTION</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline dark:divide-zinc-800 text-xs">
                            {isLoadingShipments ? (
                                <tr>
                                    <td colSpan={10} className="py-10 text-center text-xs text-zinc-400 font-mono">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-500" />
                                        Loading Day Roznamcha ledger records...
                                    </td>
                                </tr>
                            ) : filteredRoznamchaShipments.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-10 text-center text-xs text-zinc-400">
                                        No consignments recorded for <span className="font-mono font-bold text-charcoal dark:text-white">{savedBiltiesDate || 'selected filter'}</span>. Use the form above or click <strong>+ Quick Add</strong> to register a bilty.
                                    </td>
                                </tr>
                            ) : (
                                filteredRoznamchaShipments.map((row) => {
                                    const chotaFmt = formatCurrency(row.total_delivery_charges);
                                    const baraFmt = formatCurrency(row.total_charges);
                                    const isPaid = row.payment_status === 'ALREADY_PAID';
                                    const isFoc = row.payment_status === 'FREE';

                                    let statusBadge = null;
                                    if (isFoc) {
                                        statusBadge = <span className="ml-1.5 px-1.5 py-0.5 rounded bg-lavender text-charcoal font-mono text-[9px] font-extrabold">FOC</span>;
                                    } else if (isPaid) {
                                        statusBadge = <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[9px] font-bold">PAID</span>;
                                    }

                                    const senderDisplay = row.sender_id === WALK_IN_CUSTOMER_ID && row.walk_in_sender_name
                                        ? row.walk_in_sender_name
                                        : findNameById(data, 'parties', row.sender_id);

                                    const receiverDisplay = row.receiver_id === WALK_IN_CUSTOMER_ID && row.walk_in_receiver_name
                                        ? row.walk_in_receiver_name
                                        : findNameById(data, 'parties', row.receiver_id);

                                    const formattedDate = row.bility_date
                                        ? new Date(row.bility_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                        : '';

                                    return (
                                        <tr key={row.register_number} className="hover:bg-softcard/70 dark:hover:bg-zinc-800/40 transition-colors">
                                            <td className="py-3.5 pr-4 pl-4 whitespace-nowrap">
                                                <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-softcard dark:bg-darkcard border border-hairline dark:border-zinc-700 font-mono font-bold text-charcoal dark:text-white text-xs">
                                                    {row.bility_number}
                                                </div>
                                                <div className="font-mono text-[10px] text-zinc-400 mt-1 flex items-center">
                                                    <span>#{row.register_number}</span>
                                                    {statusBadge}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-3 whitespace-nowrap font-mono text-zinc-600 dark:text-zinc-300">
                                                {formattedDate}
                                            </td>
                                            <td className="py-3.5 px-3 whitespace-nowrap font-semibold text-charcoal dark:text-white">
                                                {findNameById(data, 'cities', row.departure_city_id)}
                                            </td>
                                            <td className="py-3.5 px-3 whitespace-nowrap font-bold text-charcoal dark:text-lavender">
                                                {row.to_city_id ? findNameById(data, 'cities', row.to_city_id) : 'Local'}
                                            </td>
                                            <td className="py-3.5 px-3 whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded-md bg-softcard dark:bg-darkcard border border-hairline dark:border-zinc-700 font-mono font-bold text-[11px] text-charcoal dark:text-zinc-200">
                                                    {findNameById(data, 'vehicles', row.vehicle_number_id)}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-3 whitespace-nowrap text-zinc-600 dark:text-zinc-300 font-medium">
                                                {senderDisplay}
                                            </td>
                                            <td className="py-3.5 px-3 whitespace-nowrap font-bold text-charcoal dark:text-white">
                                                {receiverDisplay}
                                            </td>
                                            <td className="py-3.5 px-3 whitespace-nowrap text-right font-mono font-medium text-zinc-600 dark:text-zinc-300">
                                                {chotaFmt}
                                            </td>
                                            <td className="py-3.5 px-3 whitespace-nowrap text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                {baraFmt}
                                            </td>
                                            <td className="py-3.5 pr-4 pl-3 whitespace-nowrap text-center no-print">
                                                <div className="inline-flex items-center gap-1">
                                                    {/* View Slip */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedViewShipmentId(row.register_number)}
                                                        title="View Consignment Slip"
                                                        className="p-1.5 rounded-lg hover:bg-lavender text-zinc-500 hover:text-charcoal dark:hover:text-charcoal transition-colors cursor-pointer"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    {/* Edit */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRequestEdit(row)}
                                                        title="Edit Consignment"
                                                        className="p-1.5 rounded-lg hover:bg-amber-100 text-zinc-500 hover:text-amber-800 transition-colors cursor-pointer"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    {/* Print Slip */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePrintShipment(row)}
                                                        title="Print Consignment Slip"
                                                        className="p-1.5 rounded-lg hover:bg-blue-100 text-zinc-500 hover:text-blue-700 transition-colors cursor-pointer"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                    </button>
                                                    {/* Delete */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteShipment(row.register_number)}
                                                        title="Remove Entry"
                                                        className="p-1.5 rounded-lg hover:bg-rose-100 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination Bar */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400 no-print">
                    <div className="flex flex-wrap items-center gap-3">
                        <span>
                            Showing <strong className="text-charcoal dark:text-white">{filteredRoznamchaShipments.length === 0 ? 0 : (shipmentsPage - 1) * shipmentsPageSize + 1}</strong> to <strong className="text-charcoal dark:text-white">{Math.min(shipmentsPage * shipmentsPageSize, shipmentsTotal)}</strong> of <strong className="text-charcoal dark:text-white">{shipmentsTotal}</strong> entries
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span>Per page:</span>
                            <select
                                value={shipmentsPageSize}
                                onChange={(e) => setShipmentsPageSize(Number(e.target.value))}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-darkbg border border-hairline dark:border-zinc-700 font-mono text-xs font-bold text-charcoal dark:text-white focus:outline-none"
                            >
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={shipmentsPage <= 1}
                            onClick={() => setShipmentsPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1.5 rounded-full bg-white dark:bg-darkbg border border-hairline dark:border-zinc-700 text-xs font-semibold text-zinc-500 hover:text-charcoal dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            &laquo; Previous
                        </button>
                        <span className="w-8 h-8 rounded-full bg-charcoal dark:bg-lavender text-white dark:text-charcoal font-mono text-xs font-bold flex items-center justify-center">
                            {shipmentsPage}
                        </span>
                        <button
                            type="button"
                            disabled={shipmentsPage >= shipmentsTotalPages}
                            onClick={() => setShipmentsPage(p => Math.min(shipmentsTotalPages, p + 1))}
                            className="px-3 py-1.5 rounded-full bg-white dark:bg-darkbg border border-hairline dark:border-zinc-700 text-xs font-semibold text-zinc-500 hover:text-charcoal dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Next &raquo;
                        </button>
                    </div>
                </div>
            </section>

            {/* Master Data Quick Add Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-charcoal dark:text-white">
                            Quick Add {modalType ? modalType.charAt(0).toUpperCase() + modalType.slice(1) : ''}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            Create a new master data entry instantly without leaving the workstation.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddMasterData} className="space-y-4 pt-2">
                        {modalType === 'city' && (
                            <div>
                                <Label className="text-xs font-bold mb-1.5 block">City Name *</Label>
                                <Input
                                    name="name"
                                    required
                                    placeholder="e.g. Gujranwala"
                                    onChange={(e) => setModalInput({ ...modalInput, name: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>
                        )}

                        {modalType === 'agency' && (
                            <div>
                                <Label className="text-xs font-bold mb-1.5 block">Agency Name *</Label>
                                <Input
                                    name="name"
                                    required
                                    placeholder="e.g. Shaheen Goods Forwarders"
                                    onChange={(e) => setModalInput({ ...modalInput, name: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>
                        )}

                        {modalType === 'vehicle' && (
                            <div>
                                <Label className="text-xs font-bold mb-1.5 block">Vehicle License Plate *</Label>
                                <Input
                                    name="vehicleNumber"
                                    required
                                    placeholder="e.g. LES-8821"
                                    onChange={(e) => setModalInput({ ...modalInput, vehicleNumber: e.target.value })}
                                    className="rounded-xl font-mono uppercase"
                                />
                            </div>
                        )}

                        {modalType === 'item' && (
                            <div>
                                <Label className="text-xs font-bold mb-1.5 block">Item Description *</Label>
                                <Input
                                    name="description"
                                    required
                                    placeholder="e.g. Cotton Bales / Raw Fabric"
                                    onChange={(e) => setModalInput({ ...modalInput, description: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>
                        )}

                        {modalType === 'party' && (
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs font-bold mb-1.5 block">Party / Business Name *</Label>
                                    <Input
                                        name="name"
                                        required
                                        placeholder="e.g. Rehman Traders"
                                        onChange={(e) => setModalInput({ ...modalInput, name: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-bold mb-1.5 block">Contact Phone / Info</Label>
                                    <Input
                                        name="contactInfo"
                                        placeholder="e.g. 0300-1234567"
                                        onChange={(e) => setModalInput({ ...modalInput, contactInfo: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2.5 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-xl text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isModalSubmitting}
                                className="rounded-xl bg-charcoal text-white hover:bg-zinc-800 dark:bg-lavender dark:text-charcoal text-xs font-bold"
                            >
                                {isModalSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                                Save Entry
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Password Verification Modal for Bilty Edit */}
            <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mb-2 border border-amber-200 dark:border-amber-800">
                            <Lock className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-base font-bold text-charcoal dark:text-white">
                            Security Verification
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            Editing registered consignments requires supervisor authorization. Please enter your edit password to proceed.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleVerifyAndProceed} className="space-y-4 pt-1">
                        {targetShipmentToEdit && (
                            <div className="p-3 rounded-xl bg-softcard dark:bg-darkcard border border-hairline dark:border-zinc-700 flex items-center justify-between text-xs">
                                <div>
                                    <span className="text-zinc-500">Target Bilty: </span>
                                    <span className="font-mono font-bold text-charcoal dark:text-white">#{targetShipmentToEdit.bility_number}</span>
                                </div>
                                <span className="font-mono text-zinc-400">Reg #{targetShipmentToEdit.register_number}</span>
                            </div>
                        )}

                        <div>
                            <Label className="text-xs font-bold mb-1.5 block">Enter Authorization Password *</Label>
                            <div className="relative">
                                <Input
                                    type={showPasswordInModal ? "text" : "password"}
                                    value={passwordInput}
                                    onChange={(e) => {
                                        setPasswordInput(e.target.value);
                                        if (passwordError) setPasswordError(null);
                                    }}
                                    autoFocus
                                    placeholder="Enter edit password"
                                    className="pr-10 rounded-xl"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                >
                                    {showPasswordInModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {passwordError && (
                                <p className="text-rose-500 text-xs mt-1.5 font-medium">{passwordError}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2.5 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="rounded-xl text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isVerifyingPassword}
                                className="rounded-xl bg-charcoal text-white hover:bg-zinc-800 dark:bg-lavender dark:text-charcoal text-xs font-bold"
                            >
                                {isVerifyingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                                Verify &amp; Unlock
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Bilty Details Dialog on Row View Click */}
            <BiltyDetailDialog
                shipmentId={selectedViewShipmentId}
                open={Boolean(selectedViewShipmentId)}
                onOpenChange={(open) => {
                    if (!open) setSelectedViewShipmentId(null);
                }}
            />
        </div>
    );
}
