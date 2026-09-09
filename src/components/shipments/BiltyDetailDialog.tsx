'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Truck,
    Package,
    Calendar,
    CheckCircle2,
    Clock,
    X,
    Maximize2,
    Minimize2,
    ExternalLink,
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
} from 'lucide-react';
import { toast } from 'sonner';

export interface BiltyDetailDialogProps {
    shipment?: any | null;
    shipmentId?: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPrint?: (shipment: any) => void;
    onEdit?: (shipment: any) => void;
}

const formatCurrency = (amount: number | string | undefined | null) => {
    return `Rs. ${Number(amount || 0).toLocaleString('en-PK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

export default function BiltyDetailDialog({
    shipment: initialShipment,
    shipmentId,
    open,
    onOpenChange,
    onPrint,
    onEdit,
}: BiltyDetailDialogProps) {
    const router = useRouter();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [shipment, setShipment] = useState<any | null>(initialShipment || null);
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // Sync or fetch shipment data when dialog opens
    useEffect(() => {
        if (!open) {
            setIsFullscreen(false);
            return;
        }

        if (initialShipment) {
            setShipment(initialShipment);
        }

        const idToFetch = shipmentId || initialShipment?.register_number || initialShipment?.bility_number;
        
        // If we only have an ID or if initialShipment lacks deep relations, fetch full record
        if (idToFetch && (!initialShipment || !initialShipment.goodsDetails || initialShipment.goodsDetails.length === 0 || initialShipment.station_expense === undefined)) {
            setIsLoading(true);
            fetch(`/api/shipments/${encodeURIComponent(idToFetch)}`)
                .then(res => {
                    if (!res.ok) throw new Error('Could not fetch shipment details');
                    return res.json();
                })
                .then(data => {
                    setShipment(data);
                })
                .catch(err => {
                    console.error('Error loading bilty details:', err);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [open, initialShipment, shipmentId]);

    if (!shipment && !isLoading) {
        return null;
    }

    const data = shipment || {};
    const createdVal = data.createdAt || data.created_day || data.created_at;

    const isAlreadyPaid =
        data.payment_status === 'ALREADY_PAID' ||
        data.payment_status === 'PAID' ||
        (data.remarks?.includes('PAYMENT_STATUS:ALREADY_PAID') ?? false);

    const isFree =
        data.payment_status === 'FREE' ||
        (data.remarks?.includes('PAYMENT_STATUS:FREE') ?? false);

    const isDelivered = !!data.delivery_date;

    const totalQuantity =
        data.goodsDetails && data.goodsDetails.length > 0
            ? data.goodsDetails.reduce((sum: number, g: any) => sum + (Number(g.quantity) || 0), 0)
            : 0;

    const cleanRemarks = (data.remarks || '').replace(/PAYMENT_STATUS:\w+\s*/g, '').trim();

    const handleCopyDetails = () => {
        const text = `*BILTY DETAILS*\nBilty #: ${data.bility_number}\nReg #: ${data.register_number}\nDate: ${data.bility_date}\nRoute: ${data.departureCity?.name || 'Main Hub'} -> ${data.toCity?.name || 'Local'}\nVehicle: ${data.vehicle?.vehicleNumber || '-'}\nSender: ${data.sender?.name || '-'}\nReceiver: ${data.receiver?.name || '-'}\nQuantity: ${totalQuantity} Items\nBara Karaya: ${isAlreadyPaid ? 'Already Paid' : isFree ? 'Free' : formatCurrency(data.total_charges)}\nChota Karaya: ${formatCurrency(data.total_delivery_charges)}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Bilty details copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenFullPage = () => {
        onOpenChange(false);
        router.push(`/shipments/view/${encodeURIComponent(data.register_number || data.bility_number)}`);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className={`transition-all duration-200 flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl ${
                    isFullscreen
                        ? '!fixed !inset-0 !w-screen !h-screen !max-w-none !rounded-none !m-0 !z-50 !border-0'
                        : 'sm:max-w-4xl max-h-[92vh] sm:rounded-2xl w-[95vw]'
                }`}
            >
                {/* Modal Top Header Bar */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-xs shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                            <Package className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white font-mono">
                                    Bilty #{data.bility_number || '---'}
                                </DialogTitle>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                    Reg #{data.register_number}
                                </span>
                                {isAlreadyPaid ? (
                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] font-bold">
                                        <CheckCircle2 className="w-3 h-3" /> Already Paid
                                    </Badge>
                                ) : isFree ? (
                                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-[11px] font-bold">
                                        Free of Cost
                                    </Badge>
                                ) : (
                                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-[11px] font-bold">
                                        <Clock className="w-3 h-3" /> Payment Pending
                                    </Badge>
                                )}

                                {isDelivered ? (
                                    <Badge variant="outline" className="border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 gap-1 text-[11px] font-bold">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Delivered
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 gap-1 text-[11px] font-bold">
                                        <Truck className="w-3 h-3 text-blue-600" /> In Transit
                                    </Badge>
                                )}
                            </div>
                            <DialogDescription className="text-xs text-slate-500 truncate mt-0.5">
                                Complete freight consignment overview and financial breakdown
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Action Controls in Header */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {/* Copy Details */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyDetails}
                            className="hidden sm:inline-flex h-8 px-2.5 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-700"
                            title="Copy Bilty Summary"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
                        </Button>

                        {/* Full Page View Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenFullPage}
                            className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/50"
                            title="Open in Dedicated Full Page"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Full Page</span>
                        </Button>

                        {/* Fullscreen Modal Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            title={isFullscreen ? 'Minimize Dialog' : 'Maximize to Fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </Button>

                        {/* Close Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Modal Body Content (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                            <p className="text-sm font-semibold">Loading consignment details...</p>
                        </div>
                    ) : (
                        <>
                            {/* 1. Metric Strip Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                        Route
                                    </div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm mt-1 capitalize truncate">
                                        {data.departureCity?.name || 'Main Hub'} <span className="text-slate-400">→</span> {data.toCity?.name || 'Local'}
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                                        <Truck className="w-3.5 h-3.5 text-indigo-600" />
                                        Vehicle
                                    </div>
                                    <p className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-1 uppercase truncate">
                                        {data.vehicle?.vehicleNumber || 'Unassigned'}
                                    </p>
                                </div>
                            </div>

                            {/* 2. Sender & Receiver Party Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Sender */}
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5">
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                                                <User className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                                                Sender (Bhejnay Wala)
                                            </span>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">Origin</Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-extrabold text-slate-900 dark:text-white capitalize">
                                            {data.sender?.name || '-'}
                                        </p>
                                        <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                                            <Phone className="w-3 h-3 text-slate-400" />
                                            <span>{data.sender?.contactInfo || 'No phone recorded'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Receiver */}
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5">
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                                                <User className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                                                Receiver (Wasool Karnay Wala)
                                            </span>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">Destination</Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-extrabold text-slate-900 dark:text-white capitalize">
                                            {data.receiver?.name || '-'}
                                        </p>
                                        <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                                            <Phone className="w-3 h-3 text-slate-400" />
                                            <span>{data.receiver?.contactInfo || 'No phone recorded'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Goods & Cargo Table */}
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                        <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                                            Cargo & Goods Manifest ({data.goodsDetails?.length || 0} Items)
                                        </span>
                                    </div>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                        Total Units: {totalQuantity}
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase bg-slate-50/40 dark:bg-slate-800/20">
                                                <th className="py-2.5 px-4">#</th>
                                                <th className="py-2.5 px-4">Item Description</th>
                                                <th className="py-2.5 px-4 text-center">Quantity</th>
                                                <th className="py-2.5 px-4 text-right">Freight Charges</th>
                                                <th className="py-2.5 px-4 text-right">Delivery Charges</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {data.goodsDetails && data.goodsDetails.length > 0 ? (
                                                data.goodsDetails.map((detail: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                                        <td className="py-2.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                                                        <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white capitalize">
                                                            {detail.itemCatalog?.item_description || 'Freight Item'}
                                                        </td>
                                                        <td className="py-2.5 px-4 text-center font-mono font-bold">
                                                            <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                                                {detail.quantity}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                                                            {detail.charges ? formatCurrency(detail.charges) : '-'}
                                                        </td>
                                                        <td className="py-2.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                                                            {detail.delivery_charges ? formatCurrency(detail.delivery_charges) : '-'}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="py-4 text-center text-slate-400">
                                                        No specific cargo items recorded
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 4. Financial & Operational Expenses Breakdown */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Billing Voucher */}
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <Receipt className="w-4 h-4 text-blue-600" />
                                        <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                                            Billing Summary
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-[11px] flex items-center justify-between">
                                            <span className="text-slate-500 font-semibold">Payment Condition:</span>
                                            <span className="font-bold">
                                                {isAlreadyPaid ? 'Already Paid at Booking' : isFree ? 'Free Freight' : 'To Collect on Delivery'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Operational & Station Expenses */}
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <Building2 className="w-4 h-4 text-purple-600" />
                                        <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                                            Internal Station Expenses
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 font-mono text-[11px]">
                                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                            <span>Station Expense:</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(data.station_expense)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                            <span>Bilty Expense:</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(data.bility_expense)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                            <span>Station Labour:</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(data.station_labour)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                            <span>Cart Labour:</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(data.cart_labour)}
                                            </span>
                                        </div>
                                        <Separator className="my-1" />
                                        <div className="flex justify-between items-center font-bold text-xs">
                                            <span className="text-slate-900 dark:text-white font-sans">Total Operational Exp:</span>
                                            <span className="font-mono text-purple-600 dark:text-purple-400">
                                                {formatCurrency(data.total_expenses)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Dates & Consignment Timeline */}
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5">
                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                                        Consignment Dates & Tracking
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Bilty Date</p>
                                        <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                                            {data.bility_date ? new Date(data.bility_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                                        </p>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">System Entry Date</p>
                                        <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                                            {createdVal ? new Date(createdVal).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                                        </p>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Delivery Status / Date</p>
                                        <p className={`font-bold mt-0.5 ${isDelivered ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                                            {data.delivery_date ? new Date(data.delivery_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Pending Delivery'}
                                        </p>
                                    </div>
                                </div>

                                {cleanRemarks && (
                                    <div className="mt-3 p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2">
                                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <div className="text-xs">
                                            <span className="font-bold text-amber-900 dark:text-amber-300">Remarks: </span>
                                            <span className="text-amber-800 dark:text-amber-400">{cleanRemarks}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Modal Footer Controls */}
                <div className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-xs flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                    <div className="text-xs text-slate-500 font-mono">
                        Zikria Goods Management ERP • Single Consignment View
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        {onPrint && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onPrint(data)}
                                className="rounded-lg text-xs font-semibold gap-1.5 h-8 border-slate-200 dark:border-slate-700"
                            >
                                <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                                Print Receipt
                            </Button>
                        )}

                        {onEdit && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    onOpenChange(false);
                                    onEdit(data);
                                }}
                                className="rounded-lg text-xs font-semibold gap-1.5 h-8 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/40"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit Bilty
                            </Button>
                        )}

                        <Button
                            size="sm"
                            onClick={handleOpenFullPage}
                            className="rounded-lg text-xs font-bold gap-1.5 h-8 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open Full View
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
