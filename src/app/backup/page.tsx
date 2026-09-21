"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Database,
    Download,
    FileJson,
    Loader2,
    ShieldAlert,
    Upload,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { describeNetworkError, fetchWithTimeout, readApiErrorMessage } from '@/lib/api-client';
import { clearMasterListsClientCache } from '@/lib/master-lists-client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/use-permission';
import { MAX_BACKUP_BYTES, RESTORE_CONFIRMATION } from '@/lib/backup-constants';

type SummaryTable = { key: string; count: number };
type BackupSummary = {
    totalRecords: number;
    tables: SummaryTable[];
};

const TABLE_LABELS: Record<string, string> = {
    User: 'Users',
    SystemSetting: 'Settings',
    City: 'Cities',
    Agency: 'Agencies',
    Vehicle: 'Vehicles',
    Party: 'Parties',
    ItemCatalog: 'Items',
    LabourPerson: 'Labour persons',
    Shipment: 'Bilties',
    GoodsDetails: 'Goods lines',
    Transaction: 'Transactions',
    ReturnShipment: 'Returns',
    ReturnItem: 'Return items',
    TripLog: 'Trip logs',
    TripShipmentLog: 'Trip shipments',
    Delivery: 'Deliveries',
    VehicleTransaction: 'Vehicle ledger',
    LabourAssignment: 'Labour assignments',
    LabourPaymentHistory: 'Labour payments',
};

function formatCount(value: number) {
    return value.toLocaleString('en-PK');
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DatabaseBackupPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { hasPermission } = usePermission();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canDownload = hasPermission('MASTER_DATA_WRITE');
    const canRestore = hasPermission('BACKUP_RESTORE');

    const [summary, setSummary] = useState<BackupSummary | null>(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [confirmation, setConfirmation] = useState('');
    const [hasCurrentBackup, setHasCurrentBackup] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const loadSummary = useCallback(async () => {
        setIsLoadingSummary(true);
        try {
            const response = await fetchWithTimeout('/api/backup?summary=1', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(await readApiErrorMessage(response, 'Failed to load database summary.'));
            }
            const data = (await response.json()) as BackupSummary;
            setSummary(data);
        } catch (error) {
            toast.error('Could not load backup summary', {
                description: describeNetworkError(error, 'Load summary'),
            });
        } finally {
            setIsLoadingSummary(false);
        }
    }, []);

    useEffect(() => {
        if (canDownload) {
            loadSummary();
        } else {
            setIsLoadingSummary(false);
        }
    }, [canDownload, loadSummary]);

    const populatedTables = useMemo(
        () => (summary?.tables || []).filter((table) => table.count > 0),
        [summary],
    );

    async function handleDownload() {
        setIsDownloading(true);
        try {
            const response = await fetchWithTimeout('/api/backup', { cache: 'no-store' }, 180_000);
            if (!response.ok) {
                throw new Error(await readApiErrorMessage(response, 'Failed to download backup.'));
            }

            const blob = await response.blob();
            const headerName = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1];
            const filename = headerName || `zikria-gms-backup-${new Date().toISOString().slice(0, 10)}.json`;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);

            setHasCurrentBackup(true);
            toast.success('Backup downloaded', {
                description: 'Keep this JSON file in a safe place. You can restore it later from this page.',
            });
        } catch (error) {
            toast.error('Backup download failed', {
                description: describeNetworkError(error, 'Download backup'),
            });
        } finally {
            setIsDownloading(false);
        }
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] || null;
        if (!file) {
            setSelectedFile(null);
            return;
        }

        if (!file.name.toLowerCase().endsWith('.json')) {
            toast.error('Invalid file', { description: 'Select a .json backup exported from this system.' });
            event.target.value = '';
            setSelectedFile(null);
            return;
        }

        if (file.size > MAX_BACKUP_BYTES) {
            toast.error('File too large', { description: 'Backup files larger than 80 MB cannot be uploaded.' });
            event.target.value = '';
            setSelectedFile(null);
            return;
        }

        setSelectedFile(file);
    }

    const restoreReady = Boolean(
        canRestore
        && selectedFile
        && hasCurrentBackup
        && confirmation.trim().toUpperCase() === RESTORE_CONFIRMATION,
    );

    async function handleRestore() {
        if (!selectedFile || !restoreReady) return;

        setIsRestoring(true);
        try {
            const form = new FormData();
            form.append('file', selectedFile);
            form.append('confirmation', RESTORE_CONFIRMATION);

            const response = await fetchWithTimeout('/api/backup/restore', {
                method: 'POST',
                body: form,
            }, 180_000);

            if (!response.ok) {
                throw new Error(await readApiErrorMessage(response, 'Failed to restore backup.'));
            }

            const data = await response.json();
            clearMasterListsClientCache();
            setConfirmation('');
            setSelectedFile(null);
            setConfirmOpen(false);
            if (fileInputRef.current) fileInputRef.current.value = '';

            toast.success('Database restored', {
                description: `${formatCount(data.summary?.totalRecords || 0)} records were written back from the backup file.`,
            });

            if (data.sessionValid === false) {
                toast.warning('Please sign in again', {
                    description: 'The restored backup does not include your current user account.',
                });
                window.location.href = '/login';
                return;
            }

            await loadSummary();
        } catch (error) {
            toast.error('Restore failed', {
                description: describeNetworkError(error, 'Restore backup'),
            });
        } finally {
            setIsRestoring(false);
        }
    }

    if (!canDownload) {
        return (
            <div className="max-w-xl mx-auto">
                <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold">Access restricted</CardTitle>
                        <CardDescription className="text-xs">
                            Only Admin and SuperAdmin users can download or restore the database backup.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={() => router.push('/')} className="h-9 text-xs">
                            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                            Back to dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <Database className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-extrabold text-slate-900 dark:text-white">
                            Database Backup
                        </h1>
                        <p className="text-xs text-slate-500">
                            پوری ڈیٹا بیس کا بیک اپ ڈاؤن لوڈ کریں یا بحال کریں
                        </p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.back()}
                    className="rounded-lg text-xs font-semibold gap-1.5 h-8 border-slate-200 dark:border-slate-700"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                </Button>
            </div>

            <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Download className="w-4 h-4 text-blue-600" />
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Download full backup
                            </CardTitle>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            {isLoadingSummary ? 'LOADING' : `${formatCount(summary?.totalRecords || 0)} RECORDS`}
                        </span>
                    </div>
                    <CardDescription className="text-xs text-slate-500">
                        Saves every table as a JSON file: bilties, deliveries, parties, vehicles, users, and settings.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    {isLoadingSummary ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Counting records...
                        </div>
                    ) : populatedTables.length === 0 ? (
                        <p className="text-xs text-slate-500">No records found yet. You can still download an empty backup.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {populatedTables.map((table) => (
                                <div
                                    key={table.key}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2"
                                >
                                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                                        {TABLE_LABELS[table.key] || table.key}
                                    </p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                                        {formatCount(table.count)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    <Button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="w-full sm:w-auto h-10 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-xs"
                    >
                        {isDownloading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Preparing backup...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Download database backup
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4 text-blue-600" />
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Restore from backup
                            </CardTitle>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <ShieldAlert className="w-3 h-3" />
                            REPLACES ALL DATA
                        </span>
                    </div>
                    <CardDescription className="text-xs text-slate-500">
                        Uploading a backup file replaces the live database with that file. SuperAdmin only.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    {!canRestore ? (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 text-xs text-slate-600 dark:text-slate-300">
                            You can download backups as {user?.role || 'Admin'}. Restoring the database is limited to SuperAdmin.
                        </div>
                    ) : (
                        <>
                            <div className="rounded-lg border border-amber-200 dark:border-amber-900/70 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                                    Restore deletes current bilties, deliveries, parties, users, and settings, then writes the backup file in their place. Download a fresh backup first.
                                </p>
                            </div>

                            <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    id="has-current-backup"
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                                    checked={hasCurrentBackup}
                                    onChange={(event) => setHasCurrentBackup(event.target.checked)}
                                />
                                <span>I have a current backup file saved before restoring.</span>
                            </label>

                            <div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Backup file *
                                </p>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 px-4 py-6 text-center hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <FileJson className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                                    {selectedFile ? (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {formatBytes(selectedFile.size)}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500">
                                            Click to choose a `.json` backup file
                                        </p>
                                    )}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/json,.json"
                                    className="sr-only"
                                    tabIndex={-1}
                                    aria-hidden="true"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <div>
                                <label htmlFor="restore-confirm" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Type {RESTORE_CONFIRMATION} to confirm *
                                </label>
                                <Input
                                    id="restore-confirm"
                                    name="restoreConfirmation"
                                    value={confirmation}
                                    onChange={(event) => setConfirmation(event.target.value)}
                                    placeholder={RESTORE_CONFIRMATION}
                                    className="mt-1.5 h-10 rounded-lg text-xs font-mono uppercase"
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    autoCapitalizeWords={false}
                                    spellCheck={false}
                                />
                            </div>

                            <Button
                                type="button"
                                disabled={!restoreReady || isRestoring}
                                onClick={() => setConfirmOpen(true)}
                                className="w-full sm:w-auto h-10 rounded-lg font-bold text-xs bg-red-600 hover:bg-red-700 text-white gap-2 shadow-xs disabled:opacity-50"
                            >
                                {isRestoring ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Restoring database...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Restore database
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold text-red-700">
                            Replace the live database?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
                            This cannot be undone from inside the app. Current records will be deleted, then
                            {selectedFile ? ` "${selectedFile.name}"` : ' the selected backup'} will be written in their place.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="text-xs" disabled={isRestoring}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white text-xs"
                            disabled={isRestoring}
                            onClick={(event) => {
                                event.preventDefault();
                                void handleRestore();
                            }}
                        >
                            {isRestoring ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Restoring...
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Yes, restore now
                                </span>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
