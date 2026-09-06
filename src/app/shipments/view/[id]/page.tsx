'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Truck,
    Package,
    Calendar,
    CheckCircle2,
    Clock,
    Printer,
    Pencil,
    Phone,
    User,
    Building2,
    MapPin,
    Receipt,
    Copy,
    Check,
    Loader2,
    Info,
    ArrowLeft,
    Share2,
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (amount: number | string | undefined | null) => {
    return `Rs. ${Number(amount || 0).toLocaleString('en-PK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

export default function SingleBiltyFullViewPage() {
    const params = useParams();
    const router = useRouter();
    const shipmentId = params?.id as string;

    const [shipment, setShipment] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Password Security Modal State for Bilty Edit
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [showPasswordInModal, setShowPasswordInModal] = useState(false);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const fetchShipment = useCallback(async () => {
        if (!shipmentId) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`);
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error(`Consignment not found for ID "${shipmentId}".`);
                }
                throw new Error('Failed to load consignment details.');
            }
            const data = await res.json();
            setShipment(data);
        } catch (err: any) {
            console.error('Error fetching consignment:', err);
            setError(err.message || 'Error fetching consignment.');
        } finally {
            setIsLoading(false);
        }
    }, [shipmentId]);

    useEffect(() => {
        fetchShipment();
    }, [fetchShipment]);

    const handleCopyDetails = () => {
        if (!shipment) return;
        const totalQuantity =
            shipment.goodsDetails && shipment.goodsDetails.length > 0
                ? shipment.goodsDetails.reduce((sum: number, g: any) => sum + (Number(g.quantity) || 0), 0)
                : 0;

        const text = `*BILTY FULL CONSIGNMENT RECORD*\nBilty #: ${shipment.bility_number}\nReg #: ${shipment.register_number}\nDate: ${shipment.bility_date}\nDeparture: ${shipment.departureCity?.name || 'Main Hub'}\nDestination: ${shipment.toCity?.name || 'Local'}\nVehicle: ${shipment.vehicle?.vehicleNumber || 'Unassigned'}\nSender: ${shipment.sender?.name || '-'} (${shipment.sender?.contactInfo || ''})\nReceiver: ${shipment.receiver?.name || '-'} (${shipment.receiver?.contactInfo || ''})\nTotal Quantity: ${totalQuantity} Items\nBara Karaya: ${formatCurrency(shipment.total_charges)}\nChota Karaya: ${formatCurrency(shipment.total_delivery_charges)}\nPayment: ${shipment.payment_status || 'PENDING'}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Bilty details copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => {
        if (!shipment) return;
        try {
            const firstItemDesc =
                shipment.goodsDetails && shipment.goodsDetails.length > 0
                    ? shipment.goodsDetails[0].itemCatalog?.item_description || 'General Freight'
                    : 'General Freight';

            const totalQuantity =
                shipment.goodsDetails && shipment.goodsDetails.length > 0
                    ? shipment.goodsDetails.reduce((s: number, d: any) => s + (Number(d.quantity) || 0), 0)
                    : 1;

            const printHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Shipment Receipt - ${shipment.bility_number}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
                    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
                    .header h1 { margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; }
                    .header p { margin: 2px 0 0; font-size: 12px; color: #475569; }
                    .section { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; }
                    .section-title { font-weight: 700; font-size: 11px; color: #475569; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    td { padding: 4px 0; vertical-align: top; }
                    .financial-box { background-color: #f8fafc; border: 1px dashed #94a3b8; }
                    .total-line { font-size: 14px; font-weight: 800; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 4px; display: flex; justify-content: space-between; }
                    .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 24px; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Zikria Goods Transport Company</h1>
                    <p>Executive Freight Consignment Receipt • Bilty #${shipment.bility_number}</p>
                </div>

                <div class="section">
                    <div class="section-title">Consignment Reference</div>
                    <table>
                        <tr>
                            <td width="50%"><strong>Bilty Number:</strong> ${shipment.bility_number}</td>
                            <td width="50%"><strong>Register #:</strong> ${shipment.register_number}</td>
                        </tr>
                        <tr>
                            <td><strong>Bilty Date:</strong> ${shipment.bility_date ? new Date(shipment.bility_date).toLocaleDateString() : '-'}</td>
                            <td><strong>Vehicle:</strong> ${shipment.vehicle?.vehicleNumber || 'Unassigned'}</td>
                        </tr>
                        <tr>
                            <td><strong>Departure:</strong> ${shipment.departureCity?.name || 'Main Hub'}</td>
                            <td><strong>Destination:</strong> ${shipment.toCity?.name || 'Local'}</td>
                        </tr>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Parties</div>
                    <table>
                        <tr>
                            <td width="50%"><strong>Sender:</strong> ${shipment.sender?.name || '-'} (${shipment.sender?.contactInfo || ''})</td>
                            <td width="50%"><strong>Receiver:</strong> ${shipment.receiver?.name || '-'} (${shipment.receiver?.contactInfo || ''})</td>
                        </tr>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Goods Manifest</div>
                    <table>
                        <tr>
                            <td><strong>Item:</strong> ${firstItemDesc}</td>
                            <td><strong>Total Quantity:</strong> ${totalQuantity} Units</td>
                        </tr>
                    </table>
                </div>

                <div class="section financial-box">
                    <div class="section-title">Billing Breakdown</div>
                    <table>
                        <tr>
                            <td>Chota Karaya (Delivery):</td>
                            <td style="text-align: right;">${formatCurrency(shipment.total_delivery_charges)}</td>
                        </tr>
                        <tr>
                            <td>Bara Karaya (Main Freight):</td>
                            <td style="text-align: right;">${formatCurrency(shipment.total_charges)}</td>
                        </tr>
                    </table>
                    <div class="total-line">
                        <span>Net Total:</span>
                        <span>${formatCurrency(Number(shipment.total_charges || 0) + Number(shipment.total_delivery_charges || 0))}</span>
                    </div>
                </div>

                <div class="footer">
                    <p>Printed on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • Zikria Goods ERP System</p>
                </div>
            </body>
            </html>
            `;

            const printWindow = window.open('', '', 'height=650,width=800');
            if (printWindow) {
                printWindow.document.write(printHtml);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 300);
            }
        } catch (e: any) {
            toast.error(e.message || 'Failed to print receipt.');
        }
    };

    const handleRequestEdit = () => {
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
                if (shipment) {
                    router.push(`/shipments/add?edit=${encodeURIComponent(shipment.register_number)}`);
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

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto py-24 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                    Loading full consignment details...
                </p>
                <p className="text-xs text-slate-400 mt-1">Retrieving record #{shipmentId}</p>
            </div>
        );
    }

    if (error || !shipment) {
        return (
            <div className="max-w-2xl mx-auto py-16 px-4 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Consignment Not Found</h1>
                <p className="text-sm text-slate-500 mt-2 mb-6">
                    {error || `Unable to find any bilty matching "${shipmentId}". It may have been removed or the ID is incorrect.`}
                </p>
                <Button onClick={() => router.push('/shipments/view')} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <ArrowLeft className="w-4 h-4" />
                    Back to All Consignments
                </Button>
            </div>
        );
    }

    const createdVal = shipment.createdAt || shipment.created_day || shipment.created_at;

    const isAlreadyPaid =
        shipment.payment_status === 'ALREADY_PAID' ||
        shipment.payment_status === 'PAID' ||
        (shipment.remarks?.includes('PAYMENT_STATUS:ALREADY_PAID') ?? false);

    const isFree =
        shipment.payment_status === 'FREE' ||
        (shipment.remarks?.includes('PAYMENT_STATUS:FREE') ?? false);

    const isDelivered = !!shipment.delivery_date;

    const totalQuantity =
        shipment.goodsDetails && shipment.goodsDetails.length > 0
            ? shipment.goodsDetails.reduce((sum: number, g: any) => sum + (Number(g.quantity) || 0), 0)
            : 0;

    const cleanRemarks = (shipment.remarks || '').replace(/PAYMENT_STATUS:\w+\s*/g, '').trim();

    return (
        <div className="max-w-6xl mx-auto pb-16 space-y-6">
            {/* Top Navigation & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push('/shipments/view')}
                        className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-800"
                        title="Back to Consignments"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                                Bilty #{shipment.bility_number}
                            </h1>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                Reg #{shipment.register_number}
                            </span>
                            {isAlreadyPaid ? (
                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs font-bold">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Already Paid
                                </Badge>
                            ) : isFree ? (
                                <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs font-bold">
                                    Free Freight
                                </Badge>
                            ) : (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-xs font-bold">
                                    <Clock className="w-3.5 h-3.5" /> Payment Pending
                                </Badge>
                            )}

                            {isDelivered ? (
                                <Badge variant="outline" className="border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 gap-1 text-xs font-bold">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Delivered
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 gap-1 text-xs font-bold">
                                    <Truck className="w-3.5 h-3.5 text-blue-600" /> In Transit
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Detailed consignment manifest, freight billing, and tracking history.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyDetails}
                        className="rounded-xl text-xs font-semibold gap-1.5 h-9 border-slate-200 dark:border-slate-800"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy Summary'}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        className="rounded-xl text-xs font-semibold gap-1.5 h-9 border-slate-200 dark:border-slate-800"
                    >
                        <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        Print Receipt
                    </Button>

                    <Button
                        size="sm"
                        onClick={handleRequestEdit}
                        className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Bilty
                    </Button>
                </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            Transit Route
                        </div>
                        <p className="text-base font-extrabold text-slate-900 dark:text-white capitalize">
                            {shipment.departureCity?.name || 'Main Hub'} <span className="text-slate-400">→</span> {shipment.toCity?.name || 'Local'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <Truck className="w-3.5 h-3.5 text-indigo-600" />
                            Assigned Vehicle
                        </div>
                        <p className="text-base font-mono font-extrabold text-slate-900 dark:text-white uppercase">
                            {shipment.vehicle?.vehicleNumber || 'Unassigned'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                            Bara Karaya
                        </div>
                        <p className="text-base font-mono font-black text-emerald-700 dark:text-emerald-400">
                            {isAlreadyPaid ? 'Already Paid' : isFree ? 'Free' : formatCurrency(shipment.total_charges)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <Receipt className="w-3.5 h-3.5 text-amber-600" />
                            Chota Karaya
                        </div>
                        <p className="text-base font-mono font-bold text-slate-900 dark:text-white">
                            {isAlreadyPaid || isFree ? '0' : formatCurrency(shipment.total_delivery_charges)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Split Layout: Left Details vs Right Voucher & Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (2 Cols) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Parties (Sender & Receiver) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Sender */}
                        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                            Sender (Bhejnay Wala)
                                        </CardTitle>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">Origin Party</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2 text-xs">
                                <p className="text-base font-extrabold text-slate-900 dark:text-white capitalize">
                                    {shipment.sender?.name || '-'}
                                </p>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-mono">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{shipment.sender?.contactInfo || 'No phone number provided'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Receiver */}
                        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                            Receiver (Wasool Wala)
                                        </CardTitle>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">Destination Party</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2 text-xs">
                                <p className="text-base font-extrabold text-slate-900 dark:text-white capitalize">
                                    {shipment.receiver?.name || '-'}
                                </p>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-mono">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{shipment.receiver?.contactInfo || 'No phone number provided'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Goods Table Card */}
                    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-blue-600" />
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                        Cargo Manifest Details ({shipment.goodsDetails?.length || 0} Items)
                                    </CardTitle>
                                </div>
                                <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                                    Total Quantity: {totalQuantity} Units
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase bg-slate-50/40 dark:bg-slate-800/20">
                                            <th className="py-3 px-4">#</th>
                                            <th className="py-3 px-4">Item Name / Description</th>
                                            <th className="py-3 px-4 text-center">Quantity</th>
                                            <th className="py-3 px-4 text-right">Freight Charges</th>
                                            <th className="py-3 px-4 text-right">Delivery Charges</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {shipment.goodsDetails && shipment.goodsDetails.length > 0 ? (
                                            shipment.goodsDetails.map((detail: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                                    <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                                                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white capitalize">
                                                        {detail.itemCatalog?.item_description || 'Cargo Freight Item'}
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-mono font-bold">
                                                        <span className="inline-flex px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200">
                                                            {detail.quantity}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300 font-semibold">
                                                        {detail.charges ? formatCurrency(detail.charges) : '-'}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300 font-semibold">
                                                        {detail.delivery_charges ? formatCurrency(detail.delivery_charges) : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="py-6 text-center text-slate-400">
                                                    No specific cargo items logged for this consignment.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Station & Internal Operational Expenses */}
                    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-purple-600" />
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                    Station & Internal Operational Expenses
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Station Expense</p>
                                    <p className="font-bold text-slate-900 dark:text-white mt-1">
                                        {formatCurrency(shipment.station_expense)}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Bilty Expense</p>
                                    <p className="font-bold text-slate-900 dark:text-white mt-1">
                                        {formatCurrency(shipment.bility_expense)}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Station Labour</p>
                                    <p className="font-bold text-slate-900 dark:text-white mt-1">
                                        {formatCurrency(shipment.station_labour)}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Cart Labour</p>
                                    <p className="font-bold text-slate-900 dark:text-white mt-1">
                                        {formatCurrency(shipment.cart_labour)}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-between items-center p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-xs">
                                <span className="font-bold text-purple-900 dark:text-purple-300">Total Station Operational Expenses:</span>
                                <span className="font-mono font-black text-purple-700 dark:text-purple-400 text-sm">
                                    {formatCurrency(shipment.total_expenses)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column (1 Col): Billing Voucher & Tracking */}
                <div className="space-y-6">
                    {/* Financial Voucher */}
                    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-blue-600" />
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                    Freight Billing Voucher
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3 text-xs">
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                <span>Chota Karaya (Delivery):</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(shipment.total_delivery_charges)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                <span>Bara Karaya (Main Fare):</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(shipment.total_charges)}
                                </span>
                            </div>
                            <Separator className="my-1" />
                            <div className="flex justify-between items-center font-bold text-sm">
                                <span className="text-slate-900 dark:text-white">Total Gross Fare:</span>
                                <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-base">
                                    {formatCurrency(Number(shipment.total_charges || 0) + Number(shipment.total_delivery_charges || 0))}
                                </span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                                <div className="text-slate-500 font-semibold">Payment Status:</div>
                                <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                                    {isAlreadyPaid ? 'Paid in Full (Booking Hub)' : isFree ? 'Free Consignment (No Charges)' : 'To Collect on Delivery / Unpaid'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Timeline & Tracking Information */}
                    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-600" />
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                    Consignment Timeline
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3 text-xs font-mono">
                            <div className="flex items-start gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                                <div>
                                    <p className="font-sans font-bold text-slate-900 dark:text-white">Bilty Date</p>
                                    <p className="text-slate-500 text-[11px]">
                                        {shipment.bility_date ? new Date(shipment.bility_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-400 mt-1 shrink-0" />
                                <div>
                                    <p className="font-sans font-bold text-slate-900 dark:text-white">System Booking Entry</p>
                                    <p className="text-slate-500 text-[11px]">
                                        {createdVal ? new Date(createdVal).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${isDelivered ? 'bg-emerald-600' : 'bg-amber-400'}`} />
                                <div>
                                    <p className="font-sans font-bold text-slate-900 dark:text-white">
                                        {isDelivered ? 'Delivery Date' : 'Delivery Status'}
                                    </p>
                                    <p className={`text-[11px] ${isDelivered ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                                        {shipment.delivery_date ? new Date(shipment.delivery_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending / Consignment In Transit'}
                                    </p>
                                </div>
                            </div>

                            {shipment.latestDelivery && (
                                <div className="mt-3 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] space-y-1">
                                    <p className="font-sans font-bold text-emerald-900 dark:text-emerald-300">Receiver Confirmation:</p>
                                    <p className="text-emerald-800 dark:text-emerald-400">
                                        Received by: {shipment.latestDelivery.receiver_name || '-'} ({shipment.latestDelivery.receiver_phone || ''})
                                    </p>
                                </div>
                            )}

                            {cleanRemarks && (
                                <div className="mt-3 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px]">
                                    <p className="font-sans font-bold text-amber-900 dark:text-amber-300">Remarks:</p>
                                    <p className="text-amber-800 dark:text-amber-400 mt-0.5">{cleanRemarks}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Password Security Modal for Bilty Edit */}
            <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Lock className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                            Authorization Required
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Please enter the authorization password to edit Bilty #{shipment.bility_number}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleVerifyAndProceed} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="fullPageEditPassword" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Enter Edit Password *
                            </Label>
                            <div className="relative">
                                <Input
                                    id="fullPageEditPassword"
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
        </div>
    );
}
