'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    Search, Loader2, RefreshCw, Truck, Package, Calendar, 
    DollarSign, ArrowRight, CheckCircle2, Clock, Filter, X,
    MoreVertical, Pencil, Printer, Lock, ShieldCheck, KeyRound, Eye, EyeOff
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

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
    total_charges: number;
    total_delivery_charges: number;
    delivery_date: string | null;
    departureCity: { name: string };
    toCity: { name: string } | null;
    sender: { name: string };
    receiver: { name: string };
    vehicle: { vehicleNumber: string };
    payment_status?: string | null;
    remarks?: string | null;
    forwardingAgency?: { name: string };
    goodsDetails?: { quantity: number; itemCatalog?: { item_description?: string } | null }[];
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
                        className="bg-yellow-200 text-slate-900 dark:bg-yellow-400/30 dark:text-yellow-200 px-0.5 rounded font-bold"
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
    const [shipments, setShipments] = useState<ShipmentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [vehicleId, setVehicleId] = useState<number | 'all'>('all');
    const [startDate, setStartDate] = useState<string>(getCurrentMonthDateRange().startDate);
    const [endDate, setEndDate] = useState<string>(getCurrentMonthDateRange().endDate);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    const fetchShipments = useCallback(async (query = '', currentStartDate: string, currentEndDate: string, currentVehicleId: number | 'all') => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (query) params.append('query', query);
            if (currentStartDate) params.append('startDate', currentStartDate);
            if (currentEndDate) params.append('endDate', currentEndDate);
            if (currentVehicleId !== 'all') params.append('vehicleId', String(currentVehicleId));

            const response = await fetch(`/api/shipments/view-all?${params.toString()}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load shipment records.');
            }

            const data: ShipmentData[] = await response.json();
            setShipments(data);
        } catch (error: any) {
            console.error("Shipments fetch error:", error);
            sonnerToast.error('Fetch Error', {
                description: error.message || 'Could not load shipment records.',
            });
            setShipments([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        async function loadFilters() {
            try {
                const listsRes = await fetch('/api/lists');
                const lists = await listsRes.json();
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
        fetchShipments(debouncedSearchTerm, startDate, endDate, vehicleId);
    }, [debouncedSearchTerm, fetchShipments, startDate, endDate, vehicleId]);

    const handleFilterLoad = () => {
        fetchShipments(debouncedSearchTerm, startDate, endDate, vehicleId);
    };

    const handleResetFilters = () => {
        const range = getCurrentMonthDateRange();
        setStartDate(range.startDate);
        setEndDate(range.endDate);
        setVehicleId('all');
        setSearchTerm('');
        fetchShipments('', range.startDate, range.endDate, 'all');
    };

    // Calculate Summary Stats
    const stats = useMemo(() => {
        const totalBiltyCount = shipments.length;
        const totalBaraKaraya = shipments.reduce((sum, s) => sum + (Number(s.total_charges) || 0), 0);
        const totalChotaKaraya = shipments.reduce((sum, s) => sum + (Number(s.total_delivery_charges) || 0), 0);
        const deliveredCount = shipments.filter(s => !!s.delivery_date).length;

        return {
            totalBiltyCount,
            totalBaraKaraya,
            totalChotaKaraya,
            deliveredCount,
        };
    }, [shipments]);

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
                        <td colspan="3">${new Date(shipmentData.bility_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
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

    // Password Security Modal State for Bilty Edit
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [targetShipmentToEdit, setTargetShipmentToEdit] = useState<ShipmentData | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [showPasswordInModal, setShowPasswordInModal] = useState(false);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const handleRequestEdit = (shipment: ShipmentData) => {
        setTargetShipmentToEdit(shipment);
        setPasswordInput('');
        setPasswordError(null);
        setIsPasswordModalOpen(true);
    };

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
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('bilty_edit_auth', 'true');
                }
                if (targetShipmentToEdit) {
                    router.push(`/shipments/add?edit=${encodeURIComponent(targetShipmentToEdit.register_number)}`);
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

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-10">
            {/* Header with Title & Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        <Search className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Search & View Bilty Consignments
                        </h1>
                        <p className="text-xs text-slate-500">
                            Search, filter, view details, print receipts, and edit bilties.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => fetchShipments(debouncedSearchTerm, startDate, endDate, vehicleId)}
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        className="rounded-lg text-xs font-semibold gap-1.5 h-8 border-slate-200 dark:border-slate-700 shadow-2xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh List
                    </Button>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Consignments</p>
                    <p className="text-lg font-mono font-extrabold text-slate-900 dark:text-white mt-0.5">{stats.totalBiltyCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Chota Karaya</p>
                    <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300 mt-1">{formatCurrency(stats.totalChotaKaraya)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Bara Karaya</p>
                    <p className="text-sm font-mono font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">{formatCurrency(stats.totalBaraKaraya)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Delivered Status</p>
                    <p className="text-lg font-mono font-extrabold text-blue-700 dark:text-blue-400 mt-0.5">{stats.deliveredCount} / {stats.totalBiltyCount}</p>
                </div>
            </div>

            {/* Filter Control Card */}
            <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
                <CardContent className="p-3.5 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                        {/* Search Input */}
                        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Search Consignment
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <Input
                                    placeholder="Search Bilty #, Sender, Receiver, Vehicle..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9 rounded-lg border-slate-200 dark:border-slate-700 text-xs"
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Start Date */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Entry Start Date
                            </label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-9 rounded-lg border-slate-200 dark:border-slate-700 text-xs font-mono"
                            />
                        </div>

                        {/* End Date */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Entry End Date
                            </label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-9 rounded-lg border-slate-200 dark:border-slate-700 text-xs font-mono"
                            />
                        </div>

                        {/* Vehicle Selector */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Fleet Truck
                            </label>
                            <Select
                                value={String(vehicleId)}
                                onValueChange={(v) => setVehicleId(v === 'all' ? 'all' : parseInt(v))}
                            >
                                <SelectTrigger className="h-9 rounded-lg border-slate-200 dark:border-slate-700 text-xs">
                                    <SelectValue placeholder="All Vehicles" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg">
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
                        <div className="flex gap-1.5">
                            <Button
                                onClick={handleFilterLoad}
                                className="flex-1 h-9 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-700"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                            </Button>
                            <Button
                                onClick={handleResetFilters}
                                variant="outline"
                                className="h-9 px-2.5 rounded-lg text-xs font-medium border-slate-200 dark:border-slate-700"
                                title="Reset filters"
                            >
                                Reset
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
                            <Label htmlFor="viewEditPasswordInput" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Enter Edit Password *
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

            {/* Results Table Card */}
            <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 py-3 px-4">
                    <div>
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Consignment Records ({shipments.length})
                        </CardTitle>
                        <CardDescription className="text-[11px] text-slate-500">
                            Showing filtered freight consignments
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-1" />
                            <p className="text-xs">Querying database...</p>
                        </div>
                    ) : shipments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <p className="text-xs font-medium">No matching bilty records found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-4">Bilty #</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Bilty Date</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Entry Date</TableHead>
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
                                    {shipments.map((shipment) => {
                                        const createdVal = shipment.createdAt || shipment.created_day;

                                        const isAlreadyPaid = shipment.payment_status === 'ALREADY_PAID' || shipment.payment_status === 'PAID' || (shipment.remarks?.includes('PAYMENT_STATUS:ALREADY_PAID') ?? false);
                                        const isFree = shipment.payment_status === 'FREE' || (shipment.remarks?.includes('PAYMENT_STATUS:FREE') ?? false);

                                        return (
                                            <TableRow 
                                                key={shipment.register_number} 
                                                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors"
                                            >
                                                <TableCell className="pl-4 font-mono font-bold text-slate-900 dark:text-white">
                                                    <span>
                                                        <HighlightText text={shipment.bility_number} query={searchTerm} />
                                                    </span>
                                                    <span className="block text-[10px] text-slate-400 font-mono">
                                                        #<HighlightText text={shipment.register_number} query={searchTerm} />
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap text-[11px]">
                                                    {shipment.bility_date ? new Date(shipment.bility_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                                </TableCell>
                                                <TableCell className="font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                                                    {createdVal ? new Date(createdVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <HighlightText text={shipment.departureCity?.name || 'Main Hub'} query={searchTerm} />
                                                </TableCell>
                                                <TableCell>
                                                    <HighlightText text={shipment.toCity?.name || 'Local'} query={searchTerm} />
                                                </TableCell>
                                                <TableCell className="font-mono font-semibold">
                                                    <HighlightText text={shipment.vehicle?.vehicleNumber || '-'} query={searchTerm} />
                                                </TableCell>
                                                <TableCell className="max-w-[110px] truncate" title={shipment.sender?.name || ''}>
                                                    <HighlightText text={shipment.sender?.name || '-'} query={searchTerm} />
                                                </TableCell>
                                                <TableCell className="max-w-[110px] truncate" title={shipment.receiver?.name || ''}>
                                                    <HighlightText text={shipment.receiver?.name || '-'} query={searchTerm} />
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                    {isAlreadyPaid || isFree ? '0' : formatCurrency(Number(shipment.total_delivery_charges || 0))}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold">
                                                    {isAlreadyPaid ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                            Already Paid
                                                        </span>
                                                    ) : isFree ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                                            Free
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-900 dark:text-white">
                                                            {formatCurrency(Number(shipment.total_charges || 0))}
                                                        </span>
                                                    )}
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
                                                                onClick={() => handleRequestEdit(shipment)}
                                                                className="gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-200 focus:bg-blue-50 focus:text-blue-700 dark:focus:bg-blue-950/40 dark:focus:text-blue-300 py-1.5"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5 text-blue-600" />
                                                                Edit Bilty
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handlePrintShipmentRow(shipment)}
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