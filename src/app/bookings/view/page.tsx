"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Pencil, Plus, Printer, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { BOOKING_PAYMENT_LABELS, formatBookingMoney, type BookingPaymentStatus } from '@/lib/booking';
import { describeNetworkError, fetchWithTimeout, readApiErrorMessage } from '@/lib/api-client';
import { printBookingReceipt, type BookingReceiptData } from '@/components/bookings/BookingReceipt';

interface BookingRow extends BookingReceiptData {
    id: number;
}

interface BookingListResponse {
    bookings: BookingRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

function BookingList() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [date, setDate] = useState('');
    const [payment, setPayment] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [result, setResult] = useState<BookingListResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const load = async () => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams({
                    page: String(page),
                    pageSize: String(pageSize),
                });
                if (query.trim()) params.set('q', query.trim());
                if (date) params.set('date', date);
                if (payment) params.set('payment_status', payment);
                const response = await fetchWithTimeout(`/api/bookings?${params.toString()}`, { signal: controller.signal });
                if (!response.ok) throw new Error(await readApiErrorMessage(response, 'Failed to load bookings.'));
                setResult(await response.json());
            } catch (error) {
                if (controller.signal.aborted) return;
                toast.error(describeNetworkError(error, 'Load'));
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };
        void load();
        return () => controller.abort();
    }, [query, date, payment, page, pageSize]);

    const printRow = (row: BookingRow) => {
        if (!printBookingReceipt(row)) toast.error('Allow pop-ups to print the receipt.');
    };

    return (
        <div className="mx-auto max-w-6xl space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">Bookings</h1>
                    <p className="text-xs text-slate-500">Search, edit, or print a booking receipt.</p>
                </div>
                <Button className="h-9 bg-blue-600 hover:bg-blue-700" onClick={() => router.push('/bookings/add')}>
                    <Plus className="mr-1 h-4 w-4" />
                    New booking
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Search className="h-4 w-4" />
                        Find a booking
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Input
                        value={query}
                        placeholder="Bilty, sender, receiver, or city"
                        onChange={(event) => {
                            setPage(1);
                            setQuery(event.target.value);
                        }}
                    />
                    <Input
                        type="date"
                        value={date}
                        onChange={(event) => {
                            setPage(1);
                            setDate(event.target.value);
                        }}
                    />
                    <select
                        value={payment}
                        onChange={(event) => {
                            setPage(1);
                            setPayment(event.target.value);
                        }}
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                        <option value="">All payments</option>
                        <option value="PAID">Paid</option>
                        <option value="TO_COLLECT">Collected to be</option>
                    </select>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-4">
                    {isLoading ? (
                        <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading bookings...
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bilty</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Route</TableHead>
                                    <TableHead>Sender / Receiver</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(result?.bookings || []).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-8 text-center text-sm text-slate-500">
                                            No bookings yet.
                                        </TableCell>
                                    </TableRow>
                                ) : result?.bookings.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-mono font-semibold">{row.bility_number}</TableCell>
                                        <TableCell>{row.booking_date}</TableCell>
                                        <TableCell>{row.from_city} → {row.to_city}</TableCell>
                                        <TableCell>
                                            <div>{row.sender_name}</div>
                                            <div className="text-xs text-slate-500">{row.receiver_name}</div>
                                        </TableCell>
                                        <TableCell className="max-w-[180px] truncate">
                                            {row.items.map((item) => `${item.item_name} × ${item.quantity}`).join(', ')}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{formatBookingMoney(row.total_amount)}</TableCell>
                                        <TableCell>{BOOKING_PAYMENT_LABELS[row.payment_status as BookingPaymentStatus]}</TableCell>
                                        <TableCell className="space-x-1 text-right">
                                            <Button size="sm" variant="outline" onClick={() => printRow(row)}>
                                                <Printer className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => router.push(`/bookings/add?edit=${row.id}`)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {result && result.total > 0 && (
                        <TablePagination
                            currentPage={result.page}
                            totalPages={result.totalPages}
                            totalItems={result.total}
                            pageSize={result.pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={(size) => {
                                setPage(1);
                                setPageSize(size);
                            }}
                            isLoading={isLoading}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function ViewBookingsPage() {
    return (
        <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading bookings...</div>}>
            <BookingList />
        </Suspense>
    );
}
