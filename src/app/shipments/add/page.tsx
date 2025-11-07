// components/AddShipment.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Plus, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import the necessary i18n hook
import { useTranslation } from '@/lib/i18n';


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
    const { toast } = useToast();
    const { t } = useTranslation();
    const [data, setData] = useState<DropdownData | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [shipments, setShipments] = useState<ShipmentData[]>([]);
    const [isLoadingShipments, setIsLoadingShipments] = useState(false);
    const [isFetchingRegNum, setIsFetchingRegNum] = useState(false);

    // --- MODAL STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'city' | 'agency' | 'vehicle' | 'party' | 'item' | null>(null);
    const [modalInput, setModalInput] = useState<any>({});
    const [isModalSubmitting, setIsModalSubmitting] = useState(false);

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

            toast.success({
                title: t('shipment_save_button'),
                description: `Registration #: ${regNum} | Bility No: ${values.bility_number} saved to database.`
            });

            form.reset({ ...generateDefaultValues(), register_number: regNum });
            fetchShipments(today);

        } catch (error: any) {
            console.error('Submission Error:', error);
            toast.error({ title: t('shipment_saving_button'), description: error.message });
        }
    }, [form, paymentStatusToSend, toast, t]);

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
        but use arbitrary values for 'animation-delay' to stagger them.
      */}
      <span className="animate-bounce [animation-delay:-0.3s]">Z</span>
      <span className="animate-bounce [animation-delay:-0.15s]">.</span>
      <span className="animate-bounce">G</span>
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
                            <SearchableCombobox
                                field={field}
                                labelTKey='shipment_departure_city_label'
                                placeholderTKey='shipment_departure_city_placeholder'
                                listName='cities'
                                onAddClick={() => openMasterDataModal('city')}
                                disabled={itemIsLoading}
                            />
                        )} />
                    </div>

                    {/* 2. Forwarding Agency, Vehicle Number, Quantity, Item Type */}
                    <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                        {/* FORWARDING AGENCY */}
                        <FormField control={form.control} name='forwarding_agency_id' render={({ field }) => (
                            <SearchableCombobox
                                field={field}
                                labelTKey='shipment_agency_label'
                                placeholderTKey='shipment_agency_placeholder'
                                listName='agencies'
                                onAddClick={() => openMasterDataModal('agency')}
                                disabled={itemIsLoading}
                            />
                        )} />
                        {/* VEHICLE NUMBER */}
                        <FormField control={form.control} name='vehicle_number_id' render={({ field }) => (
                            <SearchableCombobox
                                field={field}
                                labelTKey='shipment_vehicle_label'
                                placeholderTKey='shipment_vehicle_placeholder'
                                listName='vehicles'
                                onAddClick={() => openMasterDataModal('vehicle')}
                                disabled={itemIsLoading}
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
                            <SearchableCombobox
                                field={field}
                                labelTKey='shipment_item_type_label'
                                placeholderTKey='shipment_item_type_placeholder'
                                listName='items'
                                onAddClick={() => openMasterDataModal('item')}
                                disabled={itemIsLoading}
                            />
                        )} />

                    </div>

                    {/* 4. Sender, Receiver */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        {/* SENDER */}
                        <FormField control={form.control} name='sender_id' render={({ field }) => (
                            <SearchableCombobox
                                field={field}
                                labelTKey='shipment_sender_label'
                                placeholderTKey='shipment_sender_placeholder'
                                listName='parties'
                                onAddClick={() => openMasterDataModal('party')}
                                disabled={itemIsLoading}
                            />
                        )} />
                        {/* RECEIVER */}
                        <FormField control={form.control} name='receiver_id' render={({ field }) => (
                            <SearchableCombobox
                                field={field}
                                labelTKey='shipment_receiver_label'
                                placeholderTKey='shipment_receiver_placeholder'
                                listName='parties'
                                onAddClick={() => openMasterDataModal('party')}
                                disabled={itemIsLoading}
                            />
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
                        {/* DESTINATION CITY */}
                        <FormField control={form.control} name='to_city_id' render={({ field }) => (
                            <SearchableCombobox
                                field={field}
                                labelTKey='shipment_dest_city_label'
                                placeholderTKey='shipment_dest_city_placeholder'
                                listName='cities'
                                onAddClick={() => openMasterDataModal('city')}
                                disabled={itemIsLoading}
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
                                            onCheckedChange={(v) => field.onChange(Boolean(v))}
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
                                            onCheckedChange={(v) => field.onChange(Boolean(v))}
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

            {/* Shipments Table */}
            <div className='mt-12 p-8 rounded-xl shadow-2xl border bg-white'>
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
                                    <TableHead>Current Date</TableHead>
                                    <TableHead>{t('shipment_table_item_type')}</TableHead>
                                    <TableHead>{t('shipment_table_quantity')}</TableHead>
                                    <TableHead className='text-right'>Delivery Charges</TableHead>
                                    <TableHead className='text-right'>Payment Status</TableHead>
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
