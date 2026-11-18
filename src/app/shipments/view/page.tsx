"use client";
import { fetchWithTimeout } from '@/lib/api-client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
    Search, Loader2, RefreshCw, X,
    MoreVertical, Pencil, Printer, Lock, ShieldCheck, Eye, EyeOff, Trash2,
    ChevronLeft, ChevronRight, Plus,
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import BiltyDetailDialog from '@/components/shipments/BiltyDetailDialog';
import { TablePagination } from '@/components/ui/TablePagination';
import { fetchMasterLists } from '@/lib/master-lists-client';
import { recordRowClass, recordRowId, useScrollToRecord } from '@/lib/record-deep-link';
import { formatAppDate, formatAppDateTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

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
            dismiss: (id: string) => {
                sonnerToast.dismiss(id);
            },
        },
        toasts: [],
    }), []);
}

interface ShipmentData {
    register_number: string;
    bility_number: string;
    bility_date: string;
    createdAt?: string;
    created_day?: string;
    created_at?: string;
    total_charges: number;
    total_delivery_charges: number;
    delivery_date: string | null;
    departureCity: { name: string };
    toCity: { name: string } | null;
    sender: { name: string; contactInfo?: string };
    receiver: { name: string; contactInfo?: string };
    vehicle: { vehicleNumber: string };
    payment_status?: string | null;
    remarks?: string | null;
    forwardingAgency?: { name: string };
    station_expense?: number;
    bility_expense?: number;
    station_labour?: number;
    cart_labour?: number;
    total_expenses?: number;
    goodsDetails?: {
        quantity: number;
        charges?: number;
        delivery_charges?: number;
        itemCatalog?: { item_description?: string } | null;
    }[];
}

interface Vehicle {
    id: number;
    vehicleNumber: string;
}

const formatCurrency = (amount: number) => {
    return `Rs. ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getCurrentMonthDateRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const pad = (n: number) => String(n).padStart(2, '0');
    const formatDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    return {
        startDate: formatDate(startOfMonth),
        endDate: formatDate(endOfMonth),
    };
};

const HighlightText = ({ text, query }: { text?: string | null; query?: string }) => {
    if (!text) return null;
    const trimmed = query?.trim();
    if (!trimmed) return <>{text}</>;

    const words = trimmed
        .split(/\s+/)
        .filter(w => w.length > 0)
        .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (words.length === 0) return <>{text}</>;

    const pattern = new RegExp(`(${words.join('|')})`, 'gi');
    const parts = text.split(pattern);

    return (
        <>
            {parts.map((part, index) => {
                const isMatch = words.some(w => part.toLowerCase() === w.toLowerCase());
                return isMatch ? (
                    <mark
                        key={index}
                        className="bg-lavender/60 text-charcoal dark:bg-lavender/30 dark:text-lavender px-1 rounded-xs font-bold"
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                );
            })}
        </>
    );
};

export default function ViewShipments() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [shipments, setShipments] = useState<ShipmentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [stats, setStats] = useState({
        totalBiltyCount: 0,
        totalBaraKaraya: 0,
        totalChotaKaraya: 0,
    });

    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [vehicleId, setVehicleId] = useState<number | 'all'>('all');
    const [startDate, setStartDate] = useState<string>(getCurrentMonthDateRange().startDate);
    const [endDate, setEndDate] = useState<string>(getCurrentMonthDateRange().endDate);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [linkedRegister, setLinkedRegister] = useState('');
    const [linkedSearch, setLinkedSearch] = useState('');
    const [deepLinkReady, setDeepLinkReady] = useState(false);

    // Pagination & Sorting State
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(25);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [sortBy, setSortBy] = useState<string>('created_at');
    const tableTopRef = useRef<HTMLDivElement>(null);

    const fetchShipments = useCallback(async (
        query = '',
        currentStartDate: string,
        currentEndDate: string,
        currentVehicleId: number | 'all',
        page = 1,
        size = 25,
        currentRegister = '',
        currentSortOrder: 'asc' | 'desc' = 'desc',
        currentSortBy = 'created_at',
    ) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (query) params.append('query', query);
            if (currentRegister) params.append('register', currentRegister);
            if (currentStartDate) params.append('startDate', currentStartDate);
            if (currentEndDate) params.append('endDate', currentEndDate);
            if (currentVehicleId !== 'all') params.append('vehicleId', String(currentVehicleId));
            params.append('page', String(page));
            params.append('pageSize', String(size));
            params.append('sortOrder', currentSortOrder);
            params.append('sortBy', currentSortBy);

            const response = await fetchWithTimeout(`/api/shipments/view-all?${params.toString()}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load shipment records.');
            }

            const payload = await response.json();
            const list = Array.isArray(payload) ? payload : (payload.data || []);
            setShipments(list);
            setTotalItems(Array.isArray(payload) ? payload.length : Number(payload.total || 0));
            setTotalPages(Array.isArray(payload) ? 1 : Number(payload.totalPages || 1));
            if (!Array.isArray(payload) && payload.stats) {
                setStats(payload.stats);
            } else {
                setStats({
                    totalBiltyCount: list.length,
                    totalBaraKaraya: list.reduce((sum: number, s: ShipmentData) => sum + (Number(s.total_charges) || 0), 0),
                    totalChotaKaraya: list.reduce((sum: number, s: ShipmentData) => sum + (Number(s.total_delivery_charges) || 0), 0),
                });
            }
        } catch (error: any) {
            console.error("Shipments fetch error:", error);
            sonnerToast.error('Fetch Error', {
                description: error.message || 'Could not load shipment records.',
            });
            setShipments([]);
            setTotalItems(0);
            setTotalPages(1);
            setStats({ totalBiltyCount: 0, totalBaraKaraya: 0, totalChotaKaraya: 0 });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        async function loadFilters() {
            try {
                const lists = await fetchMasterLists();
                setVehicles(lists.vehicles || []);
            } catch (e) {
                console.error('Failed to load filter lists', e);
            }
        }
        loadFilters();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 400);

        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        const searchStr = typeof window !== 'undefined' ? window.location.search : '';
        const params = new URLSearchParams(searchStr);
        const register = params.get('register')?.trim() || '';
        const search = params.get('search')?.trim() || '';
        const filter = params.get('filter')?.toLowerCase();
        const isToday = filter === 'today' || params.get('today') === 'true';
        const queryStartDate = params.get('startDate')?.trim();
        const queryEndDate = params.get('endDate')?.trim();

        if (register || search) {
            setLinkedRegister(register);
            setLinkedSearch(search);
            setSearchTerm(search || register);
            setDebouncedSearchTerm(search || register);
            setStartDate('');
            setEndDate('');
            setVehicleId('all');
            setCurrentPage(1);
        } else if (isToday || queryStartDate || queryEndDate) {
            const now = new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

            const start = isToday ? todayStr : (queryStartDate || todayStr);
            const end = isToday ? todayStr : (queryEndDate || start);

            setStartDate(start);
            setEndDate(end);
            setCurrentPage(1);
        }
        setDeepLinkReady(true);
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, startDate, endDate, vehicleId, pageSize, sortOrder, sortBy]);

    useEffect(() => {
        if (!deepLinkReady) return;
        fetchShipments(debouncedSearchTerm, startDate, endDate, vehicleId, currentPage, pageSize, linkedRegister, sortOrder, sortBy);
    }, [deepLinkReady, debouncedSearchTerm, fetchShipments, startDate, endDate, vehicleId, currentPage, pageSize, linkedRegister, sortOrder, sortBy]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const handleFilterLoad = () => {
        setCurrentPage(1);
        fetchShipments(debouncedSearchTerm, startDate, endDate, vehicleId, 1, pageSize, linkedRegister, sortOrder, sortBy);
    };

    const handleResetFilters = () => {
        const range = getCurrentMonthDateRange();
        setLinkedRegister('');
        setLinkedSearch('');
        setStartDate(range.startDate);
        setEndDate(range.endDate);
        setVehicleId('all');
        setSearchTerm('');
        setSortOrder('desc');
        setSortBy('created_at');
        setCurrentPage(1);
        fetchShipments('', range.startDate, range.endDate, 'all', 1, pageSize, '', 'desc', 'created_at');
    };

    const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, totalItems);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
            setCurrentPage(newPage);
            tableTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

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
                        <td colspan="3">${formatAppDate(shipmentData.bility_date)}</td>
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
                <p>Printed on ${formatAppDateTime(new Date())} • Zikria Goods Transports ERP</p>
            </div>
        </body>
        </html>
        `;
    };

    const handlePrintShipmentRow = (shipment: ShipmentData) => {
        try {
            const firstItemDesc = shipment.goodsDetails && shipment.goodsDetails.length > 0
                ? (shipment.goodsDetails[0].itemCatalog?.item_description || 'General Freight')
                : 'General Freight';

            const totalQuantity = shipment.goodsDetails && shipment.goodsDetails.length > 0
                ? shipment.goodsDetails.reduce((s, d) => s + (Number(d.quantity) || 0), 0)
                : 1;

            const printableData = {
                register_number: shipment.register_number,
                bility_number: shipment.bility_number,
                bility_date: shipment.bility_date,
                departure_city: shipment.departureCity?.name || 'Main Hub',
                forwarding_agency: shipment.forwardingAgency?.name || 'Direct',
                vehicle_number: shipment.vehicle?.vehicleNumber || 'Unassigned',
                sender_name: shipment.sender?.name || 'Direct Client',
                receiver_name: shipment.receiver?.name || 'Direct Receiver',
                destination_city: shipment.toCity?.name || 'Local',
                item_type: firstItemDesc,
                quantity: totalQuantity,
                total_delivery_charges: shipment.total_delivery_charges ?? 0,
                total_amount: shipment.total_charges ?? 0,
                payment_status: shipment.payment_status === 'FREE' ? 'FREE' : shipment.payment_status === 'ALREADY_PAID' ? 'PAID' : 'PENDING',
            };

            const printWindow = window.open('', '', 'height=650,width=800');
            if (printWindow) {
                const html = createPrintContent(printableData);
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 300);
            }
        } catch (e: any) {
            toast.error({ title: "Print Error", description: e.message || "Failed to generate receipt." });
        }
    };

    // Bilty Detail Modal State
    const [selectedShipmentForDetail, setSelectedShipmentForDetail] = useState<ShipmentData | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const handleOpenDetailModal = (shipment: ShipmentData) => {
        setSelectedShipmentForDetail(shipment);
        setIsDetailModalOpen(true);
    };

    // Password Security Modal State for Bilty Edit
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [authAction, setAuthAction] = useState<'edit' | 'delete'>('edit');
    const [targetShipmentToEdit, setTargetShipmentToEdit] = useState<ShipmentData | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [showPasswordInModal, setShowPasswordInModal] = useState(false);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const handleDeleteShipment = async (shipmentId: string) => {
        try {
            const res = await fetchWithTimeout(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (res.ok) {
                sonnerToast.success('Moved to Recycle Bin', { description: 'Bilty moved to Recycle Bin successfully.' });
                fetchShipments(debouncedSearchTerm, startDate, endDate, vehicleId, currentPage, pageSize, linkedRegister, sortOrder, sortBy);
            } else {
                sonnerToast.error('Error', { description: data.message || 'Failed to delete bilty.' });
            }
        } catch (error: any) {
            sonnerToast.error('Error', { description: 'Could not delete bilty.' });
        }
    };

    const handleRequestEdit = (shipment: ShipmentData) => {
        setAuthAction('edit');
        setTargetShipmentToEdit(shipment);
        setPasswordInput('');
        setPasswordError(null);
        setIsPasswordModalOpen(true);
    };

    const handleRequestDelete = (shipment: ShipmentData) => {
        setAuthAction('delete');
        setTargetShipmentToEdit(shipment);
        setPasswordInput('');
        setPasswordError(null);
        setIsPasswordModalOpen(true);
    };

    const handleVerifyAndProceed = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!passwordInput || passwordInput.trim().length === 0) {
            setPasswordError(`Please enter the ${authAction} password.`);
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
            if (res.ok && data.success) {
                setIsPasswordModalOpen(false);
                setPasswordInput('');
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('bilty_edit_auth', 'true');
                }
                if (authAction === 'edit' && targetShipmentToEdit) {
                    router.push(`/shipments/add?edit=${encodeURIComponent(targetShipmentToEdit.register_number)}`);
                } else if (authAction === 'delete' && targetShipmentToEdit) {
                    handleDeleteShipment(targetShipmentToEdit.register_number);
                }
            } else {
                setPasswordError(data.message || `Incorrect ${authAction} password. Access denied.`);
            }
        } catch (err: any) {
            setPasswordError('Verification failed. Please try again.');
        } finally {
            setIsVerifyingPassword(false);
        }
    };

    const focusRegister = linkedRegister
        || shipments.find((shipment) => shipment.bility_number === linkedSearch || shipment.register_number === linkedSearch)?.register_number
        || '';
    useScrollToRecord(focusRegister, deepLinkReady && !isLoading && focusRegister !== '');

    return (
        <div className="space-y-6 max-w-[1550px] mx-auto pb-12">
            {/* Header with Title, Stats & Primary Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-baseline gap-3">
                        <h1 className="text-2xl sm:text-[28px] font-normal tracking-tight text-charcoal dark:text-white leading-none">
                            Consignment Records
                        </h1>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 border-l border-zinc-300 dark:border-zinc-700 pl-3">
                            Search & Ledger Explorer
                        </span>
                        <span className="text-[11px] font-medium tracking-[0.05em] uppercase text-zinc-400 font-mono">
                            {totalItems.toLocaleString()} Total
                        </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-normal">
                        Track, filter, print receipts, and manage verified freight bilties.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {user?.role === 'SUPERADMIN' && (
                        <button
                            type="button"
                            onClick={() => router.push('/recycle-bin')}
                            className="px-3.5 py-2 rounded-full bg-white dark:bg-zinc-900 border border-hairline dark:border-zinc-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Recycle Bin</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => fetchShipments(debouncedSearchTerm, startDate, endDate, vehicleId, currentPage, pageSize, linkedRegister, sortOrder, sortBy)}
                        disabled={isLoading}
                        className="p-2 rounded-full bg-white dark:bg-zinc-900 border border-hairline dark:border-zinc-800 text-charcoal dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer"
                        title="Refresh Consignment Records"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push('/shipments/add')}
                        className="px-4 py-2 rounded-full bg-lavender hover:bg-lavenderhover active:scale-[0.98] text-charcoal text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Register Bilty</span>
                    </button>
                </div>
            </div>

            {/* Quick KPI Metrics Strip (Editorial Transport Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Featured Dark Card (#202022) — BARA KARAYA */}
                <div className="bg-charcoal text-white p-5 sm:p-6 rounded-2xl flex flex-col justify-between border border-zinc-800 shadow-2xs">
                    <div>
                        <div className="text-[10px] font-semibold tracking-[0.07em] uppercase text-zinc-300">
                            BARA KARAYA (GROSS FREIGHT)
                        </div>
                        <div className="mt-1.5 text-[11px] font-medium text-zinc-300">
                            Total consolidated consignment freight
                        </div>
                    </div>
                    <div className="text-2xl sm:text-[28px] font-light tracking-tight tabular-nums mt-4 leading-none">
                        {formatCurrency(stats.totalBaraKaraya)}
                    </div>
                </div>

                {/* 2. Soft Gray Card (#F6F6F8) — CHOTA KARAYA */}
                <div className="bg-cardgray dark:bg-zinc-900/70 p-5 sm:p-6 rounded-2xl flex flex-col justify-between border border-hairline dark:border-zinc-800 shadow-2xs">
                    <div>
                        <div className="text-[10px] font-semibold tracking-[0.07em] uppercase text-charcoal dark:text-zinc-300">
                            CHOTA KARAYA (BASE)
                        </div>
                        <div className="mt-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                            Primary raw transit fare
                        </div>
                    </div>
                    <div className="text-2xl sm:text-[28px] font-light tracking-tight text-charcoal dark:text-white tabular-nums mt-4 leading-none">
                        {formatCurrency(stats.totalChotaKaraya)}
                    </div>
                </div>

                {/* 3. Soft Gray Card (#F6F6F8) — TOTAL CONSIGNMENTS */}
                <div className="bg-cardgray dark:bg-zinc-900/70 p-5 sm:p-6 rounded-2xl flex flex-col justify-between border border-hairline dark:border-zinc-800 shadow-2xs">
                    <div>
                        <div className="text-[10px] font-semibold tracking-[0.07em] uppercase text-charcoal dark:text-zinc-300">
                            TOTAL CONSIGNMENTS
                        </div>
                        <div className="mt-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                            Active filtered bilty records
                        </div>
                    </div>
                    <div className="text-2xl sm:text-[28px] font-light tracking-tight text-charcoal dark:text-white tabular-nums mt-4 leading-none font-mono">
                        {stats.totalBiltyCount.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Filter Control Box */}
            <div className="bg-cardgray dark:bg-zinc-900/70 border border-hairline dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
                    {/* Search Input */}
                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                        <label className="text-[11px] font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400">
                            Search Consignment
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Bilty #, party, vehicle, agency..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setLinkedRegister('');
                                    setSearchTerm(e.target.value);
                                }}
                                className="w-full pl-9 pr-8 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-hairline dark:border-zinc-700 text-xs text-charcoal dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-charcoal dark:focus:border-lavender transition-colors"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => {
                                        setLinkedRegister('');
                                        setSearchTerm('');
                                    }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Start Date */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400">
                            From Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-hairline dark:border-zinc-700 text-xs font-mono text-charcoal dark:text-zinc-100 focus:outline-none focus:border-charcoal dark:focus:border-lavender transition-colors"
                        />
                    </div>

                    {/* End Date */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400">
                            To Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-hairline dark:border-zinc-700 text-xs font-mono text-charcoal dark:text-zinc-100 focus:outline-none focus:border-charcoal dark:focus:border-lavender transition-colors"
                        />
                    </div>

                    {/* Vehicle Selector */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400">
                            Fleet Vehicle
                        </label>
                        <Select
                            value={String(vehicleId)}
                            onValueChange={(v) => setVehicleId(v === 'all' ? 'all' : parseInt(v))}
                        >
                            <SelectTrigger className="h-9 rounded-xl bg-white dark:bg-zinc-900 border border-hairline dark:border-zinc-700 text-xs text-charcoal dark:text-zinc-100 focus:outline-none">
                                <SelectValue placeholder="All Vehicles" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-hairline dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                <SelectItem value="all">All Vehicles</SelectItem>
                                {vehicles.map((v) => (
                                    <SelectItem key={v.id} value={String(v.id)}>
                                        {v.vehicleNumber}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleFilterLoad}
                            disabled={isLoading}
                            className="flex-1 h-9 rounded-full font-bold text-xs bg-charcoal hover:bg-zinc-800 text-white dark:bg-lavender dark:text-charcoal dark:hover:bg-lavenderhover transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply Filter'}
                        </button>
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="h-9 px-3.5 rounded-full bg-white dark:bg-zinc-900 border border-hairline dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300 transition-colors shadow-2xs cursor-pointer"
                            title="Reset all filters"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Security Verification Dialog for Bilty Edit */}
            <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white dark:bg-zinc-900 border border-hairline dark:border-zinc-800 shadow-xl">
                    <DialogHeader className="pb-3 border-b border-hairline dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-lavender/40 dark:bg-lavender/20 text-charcoal dark:text-lavender flex items-center justify-center font-bold">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-charcoal dark:text-white">
                                    Security Authorization Required
                                </DialogTitle>
                                <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                                    {authAction === 'edit' ? 'بلٹی میں ترمیم کے لیے پاس ورڈ درج کریں' : 'بلٹی کو ری سائیکل بن (Recycle Bin) میں بھیجنے کے لیے پاس ورڈ درج کریں'}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <form onSubmit={handleVerifyAndProceed} className="space-y-4 pt-2">
                        {targetShipmentToEdit && (
                            <div className="p-3 rounded-xl bg-cardgray dark:bg-zinc-800/50 border border-hairline dark:border-zinc-800 flex items-center justify-between text-xs">
                                <div>
                                    <span className="text-zinc-500">{authAction === 'edit' ? 'Editing' : 'Deleting'} Bilty: </span>
                                    <span className="font-mono font-bold text-charcoal dark:text-white">#{targetShipmentToEdit.bility_number}</span>
                                </div>
                                <div className="font-mono text-zinc-500">
                                    Reg: #{targetShipmentToEdit.register_number}
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="viewEditPasswordInput" className="text-xs font-bold text-charcoal dark:text-zinc-200">
                                Enter {authAction === 'edit' ? 'Edit' : 'Delete'} Password *
                            </Label>
                            <div className="relative">
                                <Input
                                    id="viewEditPasswordInput"
                                    type={showPasswordInModal ? "text" : "password"}
                                    placeholder="Enter authorization password"
                                    value={passwordInput}
                                    onChange={(e) => {
                                        setPasswordInput(e.target.value);
                                        setPasswordError(null);
                                    }}
                                    autoFocus
                                    className="h-10 rounded-xl text-xs font-mono pr-10 border border-hairline dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-charcoal dark:hover:text-zinc-200 transition-colors"
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

                        <div className="flex justify-end gap-2 pt-3 border-t border-hairline dark:border-zinc-800">
                            <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="rounded-full text-xs font-semibold px-4 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                type="submit"
                                disabled={isVerifyingPassword}
                                className={`rounded-full text-xs font-bold text-white px-4 h-9 shadow-2xs gap-1.5 ${authAction === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-charcoal hover:bg-zinc-800 dark:bg-lavender dark:text-charcoal dark:hover:bg-lavenderhover'}`}
                            >
                                {isVerifyingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (authAction === 'delete' ? <Trash2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />)}
                                Verify & {authAction === 'edit' ? 'Edit' : 'Move to Bin'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Results Table Card */}
            <div ref={tableTopRef} />
            <Card className="rounded-2xl border border-hairline dark:border-zinc-800 shadow-2xs bg-cardgray dark:bg-zinc-900/70 overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline dark:border-zinc-800 py-3.5 px-5 bg-white dark:bg-zinc-900">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-charcoal dark:text-white">
                                Consignment Records
                            </CardTitle>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-lavender/40 text-charcoal dark:bg-lavender/20 dark:text-lavender border border-lavender/60">
                                {totalItems.toLocaleString()} total
                            </span>
                        </div>
                        <CardDescription className="text-[11px] text-zinc-500 mt-0.5">
                            {totalItems > 0 
                                ? `Showing ${startIndex}-${endIndex} of ${totalItems} consignments ${totalPages > 1 ? `(Page ${currentPage} of ${totalPages})` : ''}`
                                : 'Showing filtered freight consignments'}
                        </CardDescription>
                    </div>

                    {totalItems > 0 && (
                        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <span className="text-[11px] font-medium hidden sm:inline">Group By:</span>
                                <Select
                                    value={sortBy}
                                    onValueChange={(val: string) => {
                                        setSortBy(val);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[140px] text-xs font-semibold rounded-full border border-hairline dark:border-zinc-700 bg-cardgray dark:bg-zinc-800/60 text-charcoal dark:text-zinc-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="end" className="rounded-xl border-hairline dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
                                        <SelectItem value="created_at">Entry Date</SelectItem>
                                        <SelectItem value="date_vehicle">Date & Vehicle</SelectItem>
                                        <SelectItem value="vehicle">Vehicle First</SelectItem>
                                        <SelectItem value="bility_date">Bilty Date</SelectItem>
                                        <SelectItem value="register_number">Register #</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <span className="text-[11px] font-medium hidden sm:inline">Order:</span>
                                <Select
                                    value={sortOrder}
                                    onValueChange={(val: 'asc' | 'desc') => {
                                        setSortOrder(val);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[110px] text-xs font-semibold rounded-full border border-hairline dark:border-zinc-700 bg-cardgray dark:bg-zinc-800/60 text-charcoal dark:text-zinc-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="end" className="rounded-xl border-hairline dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
                                        <SelectItem value="asc">Ascending</SelectItem>
                                        <SelectItem value="desc">Descending</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <span className="text-[11px] font-medium hidden sm:inline">Per page:</span>
                                <Select
                                    value={String(pageSize)}
                                    onValueChange={(val) => {
                                        setPageSize(Number(val));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[76px] text-xs font-mono font-bold rounded-full border border-hairline dark:border-zinc-700 bg-cardgray dark:bg-zinc-800/60 text-charcoal dark:text-zinc-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="end" className="rounded-xl border-hairline dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center gap-1 border-l border-hairline dark:border-zinc-800 pl-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0 rounded-full border-hairline dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1 || isLoading}
                                        title="Previous Page"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xs font-mono font-semibold px-1 text-charcoal dark:text-zinc-300">
                                        {currentPage}/{totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0 rounded-full border-hairline dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages || isLoading}
                                        title="Next Page"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                            <Loader2 className="w-6 h-6 animate-spin text-charcoal dark:text-lavender mb-2" />
                            <p className="text-xs font-medium">Querying database...</p>
                        </div>
                    ) : shipments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                {searchTerm ? 'No matching bilty records found' : 'No bilties yet'}
                            </p>
                            <Button
                                type="button"
                                onClick={() => router.push('/shipments/add')}
                                className="h-9 px-5 rounded-full text-xs font-bold bg-charcoal hover:bg-zinc-800 text-white dark:bg-lavender dark:text-charcoal dark:hover:bg-lavenderhover shadow-2xs"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Add Bilty
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <Table containerClassName="max-h-[calc(100vh-220px)]" className="min-w-[1150px]">
                                <TableHeader className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-hairline dark:border-zinc-800 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-zinc-900">
                                    <TableRow className="hover:bg-transparent border-b border-hairline dark:border-zinc-800">
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 pl-4 w-16 whitespace-nowrap">Serial No.</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 whitespace-nowrap">Bilty #</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 whitespace-nowrap">Bilty Date</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 whitespace-nowrap">Entry Date</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 whitespace-nowrap">Departure</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 whitespace-nowrap">Destination</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 whitespace-nowrap">Vehicle</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 whitespace-nowrap">Agency</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 text-center whitespace-nowrap">Quantity</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 whitespace-nowrap">Item Type</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 whitespace-nowrap">Sender</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 whitespace-nowrap">Receiver</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 text-right whitespace-nowrap">Chota Karaya</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 text-right whitespace-nowrap">Bara Karaya</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400 text-center pr-4 whitespace-nowrap">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shipments.map((shipment, index) => {
                                        const serialNumber = (currentPage - 1) * pageSize + index + 1;
                                        const createdVal = shipment.createdAt || shipment.created_day || shipment.created_at;

                                        const isAlreadyPaid = shipment.payment_status === 'ALREADY_PAID' || shipment.payment_status === 'PAID' || (shipment.remarks?.includes('PAYMENT_STATUS:ALREADY_PAID') ?? false);
                                        const isFree = shipment.payment_status === 'FREE' || (shipment.remarks?.includes('PAYMENT_STATUS:FREE') ?? false);

                                        const totalQuantity = shipment.goodsDetails && shipment.goodsDetails.length > 0
                                            ? shipment.goodsDetails.reduce((sum, g) => sum + (Number(g.quantity) || 0), 0)
                                            : 0;

                                        const itemDescriptions = shipment.goodsDetails
                                            ?.map(g => g.itemCatalog?.item_description)
                                            .filter(Boolean) as string[] || [];
                                        const itemText = itemDescriptions.length > 0
                                            ? itemDescriptions.join(', ')
                                            : 'General Freight';

                                        const goodsTooltip = shipment.goodsDetails && shipment.goodsDetails.length > 0
                                            ? shipment.goodsDetails.map(g => `${g.quantity}x ${g.itemCatalog?.item_description || 'Item'}`).join(' | ')
                                            : '';

                                        return (
                                            <TableRow
                                                key={shipment.register_number}
                                                id={recordRowId(shipment.register_number)}
                                                className={recordRowClass(
                                                    focusRegister !== '' && shipment.register_number === focusRegister,
                                                    'border-b border-hairline dark:border-zinc-800/60 hover:bg-white dark:hover:bg-zinc-800/50 text-xs transition-colors',
                                                )}
                                            >
                                                {/* 0. Serial Number */}
                                                <TableCell className="pl-4 font-mono font-semibold text-zinc-400 dark:text-zinc-500 whitespace-nowrap text-xs">
                                                    {serialNumber}
                                                </TableCell>

                                                {/* 1. Bilty # */}
                                                <TableCell className="whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDetailModal(shipment)}
                                                        className="text-left group cursor-pointer focus:outline-hidden"
                                                        title="Click to view complete bilty details in dialog"
                                                    >
                                                        <span className="font-mono font-bold text-charcoal dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-lavender flex items-center gap-1.5 transition-colors">
                                                            <HighlightText text={shipment.bility_number} query={searchTerm} />
                                                            <Eye className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 text-purple-600 dark:text-lavender transition-all" />
                                                        </span>
                                                        <span className="block text-[10px] text-zinc-400 font-mono">
                                                            #<HighlightText text={shipment.register_number} query={searchTerm} />
                                                        </span>
                                                    </button>
                                                </TableCell>

                                                {/* 2. Bilty Date */}
                                                <TableCell className="font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap text-[11px]">
                                                    {formatAppDate(shipment.bility_date)}
                                                </TableCell>

                                                {/* 3. Entry Date */}
                                                <TableCell className="font-mono text-zinc-400 dark:text-zinc-500 whitespace-nowrap text-[11px]">
                                                    {formatAppDate(createdVal)}
                                                </TableCell>

                                                {/* 4. Departure */}
                                                <TableCell className="capitalize whitespace-nowrap text-zinc-800 dark:text-zinc-200">
                                                    <HighlightText text={shipment.departureCity?.name || 'Main Hub'} query={searchTerm} />
                                                </TableCell>

                                                {/* 5. Destination */}
                                                <TableCell className="capitalize whitespace-nowrap text-zinc-800 dark:text-zinc-200">
                                                    <HighlightText text={shipment.toCity?.name || 'Local'} query={searchTerm} />
                                                </TableCell>

                                                {/* 6. Vehicle */}
                                                <TableCell className="whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-white dark:bg-zinc-800 text-charcoal dark:text-zinc-200 border border-hairline dark:border-zinc-700 uppercase">
                                                        <HighlightText text={shipment.vehicle?.vehicleNumber || '-'} query={searchTerm} />
                                                    </span>
                                                </TableCell>

                                                {/* 6.5 Agency */}
                                                <TableCell className="capitalize whitespace-nowrap font-medium text-zinc-700 dark:text-zinc-300">
                                                    <HighlightText text={shipment.forwardingAgency?.name || '-'} query={searchTerm} />
                                                </TableCell>

                                                {/* 7. Quantity */}
                                                <TableCell className="text-center whitespace-nowrap" title={goodsTooltip || undefined}>
                                                    <span className="inline-flex items-center justify-center min-w-7 px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white dark:bg-zinc-800 text-charcoal dark:text-zinc-200 border border-hairline dark:border-zinc-700">
                                                        {totalQuantity > 0 ? totalQuantity : '-'}
                                                    </span>
                                                </TableCell>

                                                {/* 8. Item Type */}
                                                <TableCell className="max-w-[140px] truncate capitalize font-medium text-zinc-800 dark:text-zinc-200" title={goodsTooltip || itemText}>
                                                    <HighlightText text={itemText} query={searchTerm} />
                                                </TableCell>

                                                {/* 9. Sender */}
                                                <TableCell className="max-w-[120px] truncate capitalize text-zinc-700 dark:text-zinc-300" title={shipment.sender?.name || ''}>
                                                    <HighlightText text={shipment.sender?.name || '-'} query={searchTerm} />
                                                </TableCell>

                                                {/* 10. Receiver */}
                                                <TableCell className="max-w-[120px] truncate capitalize text-zinc-700 dark:text-zinc-300" title={shipment.receiver?.name || ''}>
                                                    <HighlightText text={shipment.receiver?.name || '-'} query={searchTerm} />
                                                </TableCell>

                                                {/* 11. Chota Karaya */}
                                                <TableCell className="text-right font-mono font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                                                    {isAlreadyPaid || isFree ? '0' : formatCurrency(Number(shipment.total_delivery_charges || 0))}
                                                </TableCell>

                                                {/* 12. Bara Karaya */}
                                                <TableCell className="text-right font-mono font-bold whitespace-nowrap">
                                                    {isAlreadyPaid ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                                                            Already Paid
                                                        </span>
                                                    ) : isFree ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                                                            Free
                                                        </span>
                                                    ) : (
                                                        <span className="text-charcoal dark:text-white font-bold">
                                                            {formatCurrency(Number(shipment.total_charges || 0))}
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* 13. Action */}
                                                <TableCell className="text-center pr-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2.5 rounded-full bg-white dark:bg-zinc-800 border border-hairline dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-[11px] font-bold text-charcoal dark:text-zinc-200 gap-1 shadow-2xs"
                                                            onClick={() => router.push(`/shipments/view/${encodeURIComponent(shipment.register_number)}`)}
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-zinc-400" />
                                                            View
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2.5 rounded-full bg-lavender/40 hover:bg-lavenderhover dark:bg-lavender/20 dark:hover:bg-lavender/30 border border-lavender/60 text-[11px] font-bold text-charcoal dark:text-zinc-100 gap-1 shadow-2xs"
                                                            onClick={() => handlePrintShipmentRow(shipment)}
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                            Print
                                                        </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 w-7 p-0 rounded-full text-zinc-400 hover:text-charcoal dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                                title="More actions"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg border border-hairline dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs p-1.5">
                                                            <DropdownMenuItem
                                                                onClick={() => handleRequestEdit(shipment)}
                                                                className="gap-2 cursor-pointer font-semibold rounded-lg text-charcoal dark:text-zinc-200 focus:bg-cardgray dark:focus:bg-zinc-800 py-1.5"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5 text-zinc-500" />
                                                                Edit Bilty
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handlePrintShipmentRow(shipment)}
                                                                className="gap-2 cursor-pointer font-semibold rounded-lg text-charcoal dark:text-zinc-200 focus:bg-cardgray dark:focus:bg-zinc-800 py-1.5"
                                                            >
                                                                <Printer className="w-3.5 h-3.5 text-zinc-500" />
                                                                Print Receipt
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleRequestDelete(shipment)}
                                                                className="gap-2 cursor-pointer font-semibold rounded-lg text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:focus:bg-rose-950/40 dark:focus:text-rose-400 py-1.5"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                                                Delete Bilty
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="p-0 border-t border-hairline dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <TablePagination
                        className="w-full border-t-0"
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setCurrentPage(1);
                        }}
                        isLoading={isLoading}
                    />
                </CardFooter>
            </Card>

            {/* Bilty Detail Interactive Dialog Modal */}
            <BiltyDetailDialog
                shipment={selectedShipmentForDetail}
                open={isDetailModalOpen}
                onOpenChange={setIsDetailModalOpen}
                onPrint={handlePrintShipmentRow}
                onEdit={handleRequestEdit}
            />
        </div>
    );
}