'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Trash2,
    RotateCcw,
    Search,
    Calendar,
    RefreshCw,
    ShieldAlert,
    AlertTriangle,
    User,
    Clock,
    FileText,
    ArrowRight,
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { fetchWithTimeout } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TablePagination } from '@/components/ui/TablePagination';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeletedShipment {
    register_number: string;
    bility_number: string;
    bility_date: string;
    total_charges: string;
    total_delivery_charges: string;
    remarks: string | null;
    deleted_at: string | null;
    deleted_by_name: string;
    deleted_by_id: number | null;
    departureCity: string;
    toCity: string;
    sender: string;
    receiver: string;
    vehicleNumber: string;
    agency: string;
    itemsCount: number;
    itemsSummary: string;
}

export default function RecycleBinPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { hasPermission } = usePermission();

    const isSuperAdmin = hasPermission('RECYCLE_BIN_VIEW');

    const [shipments, setShipments] = useState<DeletedShipment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [totalAmount, setTotalAmount] = useState('0');

    // Dialog state for Restore
    const [restoreTarget, setRestoreTarget] = useState<DeletedShipment | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);

    // Dialog state for Permanent Delete
    const [deleteTarget, setDeleteTarget] = useState<DeletedShipment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch Deleted Shipments
    const fetchRecycleBin = useCallback(async () => {
        if (!isSuperAdmin) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm.trim()) params.append('query', searchTerm.trim());
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            params.append('page', currentPage.toString());
            params.append('pageSize', pageSize.toString());

            const res = await fetchWithTimeout(`/api/recycle-bin?${params.toString()}`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'Failed to load recycle bin.');
            }

            const data = await res.json();
            setShipments(data.shipments || []);
            setTotalCount(data.pagination?.total || 0);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotalAmount(data.summary?.totalAmount || '0');
        } catch (error: any) {
            console.error('Recycle Bin fetch error:', error);
            sonnerToast.error('Error', { description: error.message || 'Failed to load recycle bin.' });
        } finally {
            setIsLoading(false);
        }
    }, [isSuperAdmin, searchTerm, startDate, endDate, currentPage, pageSize]);

    useEffect(() => {
        fetchRecycleBin();
    }, [fetchRecycleBin]);

    // Handle Restore Action
    const handleConfirmRestore = async () => {
        if (!restoreTarget) return;
        setIsRestoring(true);
        try {
            const res = await fetchWithTimeout(`/api/recycle-bin/${encodeURIComponent(restoreTarget.register_number)}/restore`, {
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to restore bilty.');
            }
            sonnerToast.success('Bilty Restored', {
                description: `Bilty #${restoreTarget.bility_number} (Reg #${restoreTarget.register_number}) recovered to active directory.`
            });
            setRestoreTarget(null);
            fetchRecycleBin();
        } catch (error: any) {
            sonnerToast.error('Restore Failed', { description: error.message });
        } finally {
            setIsRestoring(false);
        }
    };

    // Handle Permanent Delete Action
    const handleConfirmPermanentDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const res = await fetchWithTimeout(`/api/recycle-bin/${encodeURIComponent(deleteTarget.register_number)}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to permanently delete bilty.');
            }
            sonnerToast.success('Permanently Deleted', {
                description: `Bilty #${deleteTarget.bility_number} permanently removed from database.`
            });
            setDeleteTarget(null);
            fetchRecycleBin();
        } catch (error: any) {
            sonnerToast.error('Delete Failed', { description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDateTime = (isoString: string | null) => {
        if (!isoString) return 'Unknown';
        try {
            const date = new Date(isoString);
            return new Intl.DateTimeFormat('en-PK', {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(date);
        } catch {
            return isoString;
        }
    };

    // Access Denied Screen for Non-SuperAdmin
    if (!isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 shadow-sm">
                    <ShieldAlert className="w-8 h-8 stroke-[2]" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-charcoal dark:text-white mb-2">
                    Super Admin Access Required
                </h1>
                <p className="text-sm text-zinc-500 max-w-md mb-6">
                    The Recycle Bin is strictly restricted to Super Admin. Operators and regular admins do not have permission to view or manage deleted records.
                </p>
                <Button onClick={() => router.push('/')} variant="outline" className="rounded-xl">
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 px-2 sm:px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-hairline dark:border-zinc-800 pb-5">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs">
                            <Trash2 className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-white flex items-center gap-2">
                                Recycle Bin
                                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                    SuperAdmin Only
                                </span>
                            </h1>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                View deleted bilties and vouchers, identify which operator deleted them, recover records or permanently purge them.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/shipments/view')}
                        className="rounded-xl text-xs gap-1.5 h-9"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Active Bilty Directory
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={fetchRecycleBin}
                        disabled={isLoading}
                        className="rounded-xl text-xs gap-1.5 h-9 bg-charcoal hover:bg-zinc-800 text-white dark:bg-lavender dark:text-charcoal dark:hover:bg-lavender/90 font-medium"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="rounded-2xl border-hairline dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Deleted Bilties in Bin</p>
                            <h3 className="text-2xl font-extrabold text-charcoal dark:text-white mt-0.5">
                                {totalCount.toLocaleString('en-PK')}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                            <Trash2 className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-hairline dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Deleted Freight Value</p>
                            <h3 className="text-2xl font-extrabold text-charcoal dark:text-white mt-0.5">
                                Rs. {Number(totalAmount).toLocaleString('en-PK')}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-hairline dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Safety Status</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                100% Data Recoverable
                            </p>
                            <p className="text-[11px] text-zinc-400">Goods and financial records are preserved</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <Card className="rounded-2xl border-hairline dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs p-3">
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <Input
                            placeholder="Search by Bilty #, Reg #, Operator Name, Sender, Receiver..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-9 h-9 text-xs rounded-xl border-hairline dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-hairline dark:border-zinc-800 px-2.5 py-1 rounded-xl text-xs">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-[11px] text-zinc-400">From:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="bg-transparent border-none text-xs focus:outline-hidden text-charcoal dark:text-white"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-hairline dark:border-zinc-800 px-2.5 py-1 rounded-xl text-xs">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-[11px] text-zinc-400">To:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="bg-transparent border-none text-xs focus:outline-hidden text-charcoal dark:text-white"
                            />
                        </div>

                        {(searchTerm || startDate || endDate) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchTerm('');
                                    setStartDate('');
                                    setEndDate('');
                                    setCurrentPage(1);
                                }}
                                className="h-9 px-2 text-xs text-zinc-500 hover:text-charcoal rounded-xl"
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Shipments List */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-900 rounded-2xl border border-hairline dark:border-zinc-800">
                    <RefreshCw className="w-6 h-6 animate-spin text-zinc-400 mb-2" />
                    <p className="text-xs text-zinc-500 font-mono">Loading Recycle Bin records...</p>
                </div>
            ) : shipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-hairline dark:border-zinc-800">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
                        <Trash2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-charcoal dark:text-white">Recycle Bin is Empty</h3>
                    <p className="text-xs text-zinc-500 max-w-sm mt-1">
                        No soft-deleted bilties found matching your search. Any bilty deleted by operators will appear here.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="overflow-x-auto rounded-2xl border border-hairline dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-hairline dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Bilty & Reg #</th>
                                    <th className="py-3 px-3">Date</th>
                                    <th className="py-3 px-3">Route</th>
                                    <th className="py-3 px-3">Parties</th>
                                    <th className="py-3 px-3">Karaya (Freight)</th>
                                    <th className="py-3 px-4 bg-rose-500/5 text-rose-700 dark:text-rose-400 font-bold">
                                        Deleted By (Operator & Time)
                                    </th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-hairline dark:divide-zinc-800">
                                {shipments.map((s) => (
                                    <tr key={s.register_number} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                                        {/* Bilty & Reg # */}
                                        <td className="py-3.5 px-4 font-mono">
                                            <div className="font-bold text-sm text-charcoal dark:text-white">
                                                {s.bility_number}
                                            </div>
                                            <div className="text-[10px] text-zinc-400">
                                                Reg: {s.register_number}
                                            </div>
                                            {s.itemsCount > 0 && (
                                                <div className="text-[10px] text-zinc-500 truncate max-w-[180px] mt-0.5" title={s.itemsSummary}>
                                                    {s.itemsSummary}
                                                </div>
                                            )}
                                        </td>

                                        {/* Date */}
                                        <td className="py-3.5 px-3 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                                            {s.bility_date}
                                        </td>

                                        {/* Route */}
                                        <td className="py-3.5 px-3">
                                            <div className="flex items-center gap-1 font-medium text-charcoal dark:text-white whitespace-nowrap">
                                                <span>{s.departureCity}</span>
                                                <ArrowRight className="w-3 h-3 text-zinc-400" />
                                                <span>{s.toCity}</span>
                                            </div>
                                            <div className="text-[10px] text-zinc-400">
                                                Veh: {s.vehicleNumber}
                                            </div>
                                        </td>

                                        {/* Parties */}
                                        <td className="py-3.5 px-3 max-w-[200px]">
                                            <div className="truncate text-charcoal dark:text-zinc-200">
                                                <span className="text-[10px] text-zinc-400">S: </span>
                                                <span className="font-medium">{s.sender}</span>
                                            </div>
                                            <div className="truncate text-zinc-500">
                                                <span className="text-[10px] text-zinc-400">R: </span>
                                                <span>{s.receiver}</span>
                                            </div>
                                        </td>

                                        {/* Karaya */}
                                        <td className="py-3.5 px-3 whitespace-nowrap font-mono font-bold text-charcoal dark:text-white">
                                            Rs. {Number(s.total_charges).toLocaleString('en-PK')}
                                            {Number(s.total_delivery_charges) > 0 && (
                                                <div className="text-[10px] font-normal text-zinc-400">
                                                    Chota: Rs. {Number(s.total_delivery_charges).toLocaleString('en-PK')}
                                                </div>
                                            )}
                                        </td>

                                        {/* DELETED BY (Audit Information) */}
                                        <td className="py-3.5 px-4 bg-rose-500/5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 font-semibold text-xs">
                                                    <User className="w-3 h-3" />
                                                    {s.deleted_by_name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                                                <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                                                <span>{formatDateTime(s.deleted_at)}</span>
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* Restore Button */}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setRestoreTarget(s)}
                                                    className="h-8 px-2.5 rounded-xl text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                                                    title="Recover / Restore this Bilty to active directory"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">Recover</span>
                                                </Button>

                                                {/* Permanent Delete Button */}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setDeleteTarget(s)}
                                                    className="h-8 px-2.5 rounded-xl text-xs gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/50"
                                                    title="Permanently delete from database (Super Admin only)"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">Purge</span>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pt-2">
                            <TablePagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalCount}
                                pageSize={pageSize}
                                onPageChange={(p) => setCurrentPage(p)}
                                onPageSizeChange={(s) => {
                                    setPageSize(s);
                                    setCurrentPage(1);
                                }}
                                isLoading={isLoading}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* RESTORE CONFIRMATION DIALOG */}
            <AlertDialog open={!!restoreTarget} onOpenChange={(open) => !open && setRestoreTarget(null)}>
                <AlertDialogContent className="rounded-2xl max-w-md">
                    <AlertDialogHeader>
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                            <RotateCcw className="w-5 h-5" />
                        </div>
                        <AlertDialogTitle className="text-base font-bold text-charcoal dark:text-white">
                            Recover Bilty #{restoreTarget?.bility_number}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-zinc-500 space-y-2">
                            <span>
                                This consignment (Reg #{restoreTarget?.register_number}) will be restored to the active Bilty Directory and will reappear in reports, roznamcha, and trip sheets.
                            </span>
                            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-hairline dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-300">
                                <div><strong>Route:</strong> {restoreTarget?.departureCity} &rarr; {restoreTarget?.toCity}</div>
                                <div><strong>Parties:</strong> {restoreTarget?.sender} &rarr; {restoreTarget?.receiver}</div>
                                <div><strong>Amount:</strong> Rs. {Number(restoreTarget?.total_charges || 0).toLocaleString('en-PK')}</div>
                                <div><strong>Originally Deleted By:</strong> {restoreTarget?.deleted_by_name}</div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel disabled={isRestoring} className="rounded-xl text-xs">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmRestore();
                            }}
                            disabled={isRestoring}
                            className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
                        >
                            {isRestoring ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Restoring...
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Confirm Recover
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* PERMANENT DELETE CONFIRMATION DIALOG */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent className="rounded-2xl max-w-md">
                    <AlertDialogHeader>
                        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <AlertDialogTitle className="text-base font-bold text-rose-600 dark:text-rose-400">
                            Permanently Delete Bilty #{deleteTarget?.bility_number}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-zinc-500 space-y-2">
                            <span className="text-rose-600 dark:text-rose-400 font-semibold block">
                                Warning: This action CANNOT be undone!
                            </span>
                            <span>
                                Permanently deleting will completely purge this bilty (Reg #{deleteTarget?.register_number}), all its goods details, return records, and financial transaction links from the database.
                            </span>
                            <div className="bg-rose-50/60 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-[11px] text-zinc-700 dark:text-zinc-300">
                                <div><strong>Bilty Number:</strong> {deleteTarget?.bility_number}</div>
                                <div><strong>Register Number:</strong> {deleteTarget?.register_number}</div>
                                <div><strong>Deleted By:</strong> {deleteTarget?.deleted_by_name} ({formatDateTime(deleteTarget?.deleted_at || null)})</div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel disabled={isDeleting} className="rounded-xl text-xs">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmPermanentDelete();
                            }}
                            disabled={isDeleting}
                            className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium gap-1.5"
                        >
                            {isDeleting ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Deleting Permanently...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Yes, Permanently Delete
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
