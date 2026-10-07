"use client";

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFieldArray, useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Check, Loader2, Plus, Printer, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { fetchMasterLists, type MasterListsPayload } from '@/lib/master-lists-client';
import { bookingTotal, formatBookingMoney, type BookingPaymentStatus } from '@/lib/booking';
import { describeNetworkError, fetchWithTimeout, readApiErrorMessage } from '@/lib/api-client';
import { printBookingReceipt, type BookingReceiptData } from '@/components/bookings/BookingReceipt';
import { cn } from '@/lib/utils';

const GoodsRowSchema = z.object({
    id: z.string(),
    item_id: z.number().int().min(1, 'Item is required'),
    quantity: z.number().int().min(1, 'Min quantity is 1'),
});

const BookingFormSchema = z.object({
    bility_number: z.string().trim().min(1, 'Bilty number is required').max(50),
    booking_date: z.string().min(1, 'Date is required'),
    from_city_id: z.number().int().min(1, 'From city is required'),
    to_city_id: z.number().int().min(1, 'To city is required'),
    sender_id: z.number().int().min(1, 'Sender is required'),
    receiver_id: z.number().int().min(1, 'Receiver is required'),
    goods_details: z.array(GoodsRowSchema).min(1, 'Add at least one item'),
    karaya: z.number().min(0, 'Must be 0 or greater'),
    station_rent: z.number().min(0, 'Must be 0 or greater'),
    bility_expense: z.number().min(0, 'Must be 0 or greater'),
    station_labour: z.number().min(0, 'Must be 0 or greater'),
    payment_status: z.enum(['PAID', 'TO_COLLECT']),
});

type BookingFormValues = z.infer<typeof BookingFormSchema>;

const localToday = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

const emptyForm = (): BookingFormValues => ({
    bility_number: '',
    booking_date: localToday(),
    from_city_id: 0,
    to_city_id: 0,
    sender_id: 0,
    receiver_id: 0,
    goods_details: [{ id: uuidv4(), item_id: 0, quantity: 1 }],
    karaya: 0,
    station_rent: 0,
    bility_expense: 0,
    station_labour: 0,
    payment_status: 'TO_COLLECT',
});

function moneyField(value: string) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
}

function BookingForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');
    const [lists, setLists] = useState<MasterListsPayload | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingEdit, setIsLoadingEdit] = useState(Boolean(editId));

    const form = useForm<BookingFormValues>({
        resolver: zodResolver(BookingFormSchema),
        defaultValues: emptyForm(),
    });
    const { fields, append, remove } = useFieldArray({ control: form.control, name: 'goods_details' });

    const karaya = form.watch('karaya');
    const stationRent = form.watch('station_rent');
    const bilityExpense = form.watch('bility_expense');
    const stationLabour = form.watch('station_labour');
    const total = bookingTotal({
        karaya,
        station_rent: stationRent,
        bility_expense: bilityExpense,
        station_labour: stationLabour,
    });

    const loadLists = useCallback(async (force = false) => {
        try {
            setLists(await fetchMasterLists(force));
        } catch (error) {
            toast.error(describeNetworkError(error, 'Master data'));
        }
    }, []);

    const loadNextNumber = useCallback(async () => {
        try {
            const response = await fetchWithTimeout('/api/bookings/next-bility-number');
            if (!response.ok) return;
            const data = await response.json();
            if (data.bility_number) form.setValue('bility_number', String(data.bility_number));
        } catch {
            // The field stays editable if the suggestion cannot be loaded.
        }
    }, [form]);

    useEffect(() => {
        void loadLists();
    }, [loadLists]);

    useEffect(() => {
        if (editId) return;
        void loadNextNumber();
    }, [editId, loadNextNumber]);

    useEffect(() => {
        if (!editId) return;
        let cancelled = false;
        const load = async () => {
            setIsLoadingEdit(true);
            try {
                const response = await fetchWithTimeout(`/api/bookings/${editId}`);
                if (!response.ok) throw new Error(await readApiErrorMessage(response, 'Booking was not found.'));
                const data = await response.json();
                if (cancelled) return;
                const booking = data.booking;
                form.reset({
                    bility_number: booking.bility_number,
                    booking_date: booking.booking_date,
                    from_city_id: booking.from_city_id,
                    to_city_id: booking.to_city_id,
                    sender_id: booking.sender_id,
                    receiver_id: booking.receiver_id,
                    goods_details: booking.items.map((item: { item_name_id: number; quantity: number }) => ({
                        id: uuidv4(),
                        item_id: item.item_name_id,
                        quantity: item.quantity,
                    })),
                    karaya: Number(booking.karaya),
                    station_rent: Number(booking.station_rent),
                    bility_expense: Number(booking.bility_expense),
                    station_labour: Number(booking.station_labour),
                    payment_status: booking.payment_status,
                });
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Failed to load booking.');
                router.push('/bookings/view');
            } finally {
                if (!cancelled) setIsLoadingEdit(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [editId, form, router]);

    const saveBooking = async (values: BookingFormValues, shouldPrint: boolean) => {
        setIsSaving(true);
        try {
            const response = await fetchWithTimeout(editId ? `/api/bookings/${editId}` : '/api/bookings', {
                method: editId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...values,
                    goods_details: values.goods_details.map((row) => ({
                        item_id: row.item_id,
                        quantity: row.quantity,
                    })),
                }),
            });
            if (!response.ok) {
                throw new Error(await readApiErrorMessage(response, 'Failed to save booking.'));
            }
            const data = await response.json();
            const booking = data.booking as BookingReceiptData;
            toast.success(editId ? 'Booking updated.' : 'Booking saved.');
            if (shouldPrint && !printBookingReceipt(booking)) {
                toast.error('Allow pop-ups to print the receipt.');
            }
            if (!editId) {
                form.reset(emptyForm());
                await loadNextNumber();
            }
        } catch (error) {
            toast.error(describeNetworkError(error, 'Save'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-4xl space-y-4">
            <div>
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {editId ? 'Edit Booking' : 'New Booking'}
                </h1>
                <p className="text-xs text-slate-500">Bilty number, route, goods, and charges. This stays separate from Register Bilty.</p>
            </div>

            <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit((values) => saveBooking(values, false))}>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Bilty</CardTitle>
                            <CardDescription className="text-xs">The number is suggested and can be changed before save.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <FormField control={form.control} name="bility_number" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bilty number</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="font-mono font-semibold" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="booking_date" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="from_city_id" render={({ field, fieldState }) => (
                                <SearchableDropdown
                                    label="From city *"
                                    endpoint="/api/cities"
                                    placeholder="Select or add city"
                                    items={lists?.cities}
                                    value={field.value}
                                    onSelectItem={(item) => field.onChange(Number(item.id))}
                                    onNewItemAdded={() => loadLists(true)}
                                    error={fieldState.error?.message}
                                />
                            )} />
                            <FormField control={form.control} name="to_city_id" render={({ field, fieldState }) => (
                                <SearchableDropdown
                                    label="To city *"
                                    endpoint="/api/cities"
                                    placeholder="Select or add city"
                                    items={lists?.cities}
                                    value={field.value}
                                    onSelectItem={(item) => field.onChange(Number(item.id))}
                                    onNewItemAdded={() => loadLists(true)}
                                    error={fieldState.error?.message}
                                />
                            )} />
                            <FormField control={form.control} name="sender_id" render={({ field, fieldState }) => (
                                <SearchableDropdown
                                    label="Sender *"
                                    endpoint="/api/parties"
                                    placeholder="Select or add sender"
                                    items={lists?.parties}
                                    value={field.value}
                                    onSelectItem={(item) => field.onChange(Number(item.id))}
                                    onNewItemAdded={() => loadLists(true)}
                                    error={fieldState.error?.message}
                                />
                            )} />
                            <FormField control={form.control} name="receiver_id" render={({ field, fieldState }) => (
                                <SearchableDropdown
                                    label="Receiver *"
                                    endpoint="/api/parties"
                                    placeholder="Select or add receiver"
                                    items={lists?.parties}
                                    value={field.value}
                                    onSelectItem={(item) => field.onChange(Number(item.id))}
                                    onNewItemAdded={() => loadLists(true)}
                                    error={fieldState.error?.message}
                                />
                            )} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Description</CardTitle>
                            <CardDescription className="text-xs">Item type comes from the item list. A new name can be saved from the dropdown.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {fields.map((row, index) => (
                                <div key={row.id} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_140px_auto]">
                                    <FormField control={form.control} name={`goods_details.${index}.item_id`} render={({ field, fieldState }) => (
                                        <SearchableDropdown
                                            label={index === 0 ? 'Item type *' : 'Item type'}
                                            endpoint="/api/items"
                                            createPropertyName="description"
                                            placeholder="Select or add item"
                                            items={lists?.items}
                                            value={field.value}
                                            onSelectItem={(item) => field.onChange(Number(item.id))}
                                            onNewItemAdded={() => loadLists(true)}
                                            error={fieldState.error?.message}
                                        />
                                    )} />
                                    <FormField control={form.control} name={`goods_details.${index}.quantity`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quantity</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    value={field.value}
                                                    onChange={(event) => field.onChange(moneyField(event.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10"
                                        disabled={fields.length === 1}
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                className="h-9"
                                onClick={() => append({ id: uuidv4(), item_id: 0, quantity: 1 })}
                            >
                                <Plus className="mr-1 h-4 w-4" />
                                Add item
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Charges</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <MoneyInput control={form.control} name="karaya" label="Karaya" hint="کرایہ" />
                                <MoneyInput control={form.control} name="station_rent" label="Adaa Karaya (Station Rent)" hint="اڈا کرایہ" />
                                <MoneyInput control={form.control} name="bility_expense" label="Bility Expense" hint="بلٹی خرچہ" />
                                <MoneyInput control={form.control} name="station_labour" label="Station Labour" hint="اڈا مزدوری" />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
                                <span className="text-sm font-bold">Total</span>
                                <span className="font-mono text-lg font-extrabold text-emerald-800 dark:text-emerald-300">{formatBookingMoney(total)}</span>
                            </div>
                            <FormField control={form.control} name="payment_status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment</FormLabel>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <PaymentChoice
                                            active={field.value === 'PAID'}
                                            title="Paid"
                                            detail="Collected at booking"
                                            onClick={() => field.onChange('PAID' satisfies BookingPaymentStatus)}
                                        />
                                        <PaymentChoice
                                            active={field.value === 'TO_COLLECT'}
                                            title="Collected to be"
                                            detail="Still to be collected"
                                            onClick={() => field.onChange('TO_COLLECT' satisfies BookingPaymentStatus)}
                                        />
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        {editId && (
                            <Button type="button" variant="outline" className="h-10" onClick={() => router.push('/bookings/view')}>
                                <RotateCcw className="mr-1 h-4 w-4" />
                                Back
                            </Button>
                        )}
                        <Button type="submit" disabled={isSaving || isLoadingEdit} className="h-10 flex-1 bg-blue-600 hover:bg-blue-700">
                            {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                            {editId ? 'Update booking' : 'Save booking'}
                        </Button>
                        <Button
                            type="button"
                            disabled={isSaving || isLoadingEdit}
                            className="h-10 flex-1 bg-green-700 hover:bg-green-800"
                            onClick={form.handleSubmit((values) => saveBooking(values, true))}
                        >
                            <Printer className="mr-1 h-4 w-4" />
                            Save and print
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}

function MoneyInput({
    control,
    name,
    label,
    hint,
}: {
    control: Control<BookingFormValues>;
    name: 'karaya' | 'station_rent' | 'bility_expense' | 'station_labour';
    label: string;
    hint: string;
}) {
    return (
        <FormField control={control} name={name} render={({ field }) => (
            <FormItem>
                <FormLabel>{label} <span className="font-normal text-slate-500">{hint}</span></FormLabel>
                <FormControl>
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={field.value}
                        onChange={(event) => field.onChange(moneyField(event.target.value))}
                        onFocus={(event) => event.currentTarget.select()}
                        className="font-mono font-semibold"
                    />
                </FormControl>
                <FormMessage />
            </FormItem>
        )} />
    );
}

function PaymentChoice({
    active,
    title,
    detail,
    onClick,
}: {
    active: boolean;
    title: string;
    detail: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'rounded-lg border p-3 text-left',
                active
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900',
            )}
        >
            <div className="text-sm font-bold">{title}</div>
            <div className="text-[11px] text-slate-500">{detail}</div>
        </button>
    );
}

export default function AddBookingPage() {
    return (
        <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading booking form...</div>}>
            <BookingForm />
        </Suspense>
    );
}
