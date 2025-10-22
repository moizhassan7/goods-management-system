"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';

// --- Data Interfaces ---
interface Delivery {
    delivery_id: number;
    shipment_id: string;
    delivery_date: string;
    receiver_name: string;
    delivery_status: string;
    approval_status: string;
    approved_by?: string;
    approved_at?: string;
    total_expenses?: number;
    total_delivery_charges?: number;
}

type NotificationType = 'success' | 'error' | 'info' | null;

interface Notification {
    type: NotificationType;
    message: string;
    title: string;
}

// --- Component ---

export default function SuperAdminDeliveryApprovalPage() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [approvedDeliveries, setApprovedDeliveries] = useState<Delivery[]>([]);
    
    const [isPendingLoading, setIsPendingLoading] = useState(true); 
    const [isReportLoading, setIsReportLoading] = useState(false); 
    
    // Set default date for today
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [notification, setNotification] = useState<Notification | null>(null);


    // --- Utility Functions ---
    const formatCurrency = (amount?: number) => {
        if (amount === undefined || amount === null) return 'Rs. 0.00';
        return `Rs. ${Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const calculateTotal = (delivery: Delivery) => {
        const expenses = delivery.total_expenses || 0;
        const charges = delivery.total_delivery_charges || 0;
        return Number(expenses) + Number(charges);
    };
    
    const approvedTotals = useMemo(() => {
        return approvedDeliveries.reduce((acc, delivery) => {
            acc.totalExpenses += Number(delivery.total_expenses || 0);
            acc.totalCharges += Number(delivery.total_delivery_charges || 0);
            acc.grandTotal += calculateTotal(delivery);
            return acc;
        }, { totalExpenses: 0, totalCharges: 0, grandTotal: 0 });
    }, [approvedDeliveries]);

    const totalPendingCount = useMemo(() => deliveries.length, [deliveries]);

    const showNotification = (type: NotificationType, title: string, message: string) => {
        setNotification({ type, title, message });
        setTimeout(() => setNotification(null), 7000); 
    };

    // --- Data Fetching: Admin-Approved Pending Approvals (for the top table) ---
    const fetchAdminApprovedPending = useCallback(async () => {
        setIsPendingLoading(true);
        setNotification(null);
        try {
            // Fetching deliveries approved by Admin, awaiting SuperAdmin final approval
            const response = await fetch('/api/deliveries/admin-approved-pending');
            if (response.ok) {
                const data = await response.json();
                setDeliveries(data);
                if (data.length > 0) {
                    showNotification('info', 'Data Loaded', `${data.length} deliveries require your **SuperAdmin** final approval.`);
                }
            } else {
                const errorData = await response.json();
                showNotification('error', 'Fetching Failed', errorData.error || 'Server error while fetching Admin-approved deliveries.');
            }
        } catch (error) {
            console.error('Error fetching admin-approved pending approvals:', error);
            showNotification('error', 'Network Error', 'A network connection issue occurred.');
        } finally {
            setIsPendingLoading(false);
        }
    }, []);

    // --- Data Fetching: Approved Deliveries by Date (for the bottom table) ---
    const fetchApprovedByDate = useCallback(async (date: string) => {
        setIsReportLoading(true); 
        setApprovedDeliveries([]); 
        try {
            // This API uses the new filtering logic (by approved_at)
            const response = await fetch(`/api/deliveries/approved?date=${date}`);
            if (!response.ok) throw new Error('Failed to fetch approved deliveries.');
            const data = await response.json();
            setApprovedDeliveries(data);
        } catch (error: any) {
            console.error('Error fetching approved deliveries:', error);
            showNotification('error', 'Report Error', error.message || 'Failed to fetch approved deliveries for the selected date.');
        } finally {
            setIsReportLoading(false); 
        }
    }, []);

    // --- Effects ---
    useEffect(() => {
        fetchAdminApprovedPending(); 
    }, [fetchAdminApprovedPending]);

    useEffect(() => {
        // Trigger report load whenever the selected date changes
        fetchApprovedByDate(selectedDate);
    }, [selectedDate, fetchApprovedByDate]); 

    // --- Approval Action Handler (Final Approval) ---
    const handleApproval = async (deliveryId: number, action: 'APPROVED' | 'REJECTED') => {
        setActionLoading(deliveryId);
        setNotification(null); 
        
        const processedDelivery = deliveries.find(d => d.delivery_id === deliveryId);

        // Final status is 'APPROVED' on success
        const nextApprovalStatus = action === 'APPROVED' ? 'APPROVED' : 'REJECTED'; 

        try {
            const response = await fetch(`/api/deliveries/${deliveryId}`, { 
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                // Send the final status, which is now accepted by the API
                body: JSON.stringify({ action: nextApprovalStatus, approvedBy: 'SuperAdmin User' }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${action.toLowerCase()} delivery status.`);
            }

            const result = await response.json();

            // 1. Update UI for Pending table (filter out the processed delivery)
            setDeliveries(prev => prev.filter(d => d.delivery_id !== deliveryId));
            
            // 2. If APPROVED, immediately refresh the Approved Report for the current date
            if (action === 'APPROVED') {
                 // Check if the approval date matches the currently selected report date (now based on APPROVED_AT)
                const approvalDate = new Date().toISOString().split('T')[0];
                if (approvalDate === selectedDate) {
                    // Only fetch if the date matches to show the latest approval instantly
                    fetchApprovedByDate(selectedDate);
                }

                showNotification(
                    'success', 
                    'SuperAdmin Approval Successful',
                    `Shipment ID ${result.delivery.shipment_id} has been fully APPROVED.`
                );
            } else {
                 showNotification(
                    'success', 
                    'Rejection Successful',
                    `Shipment ID ${result.delivery.shipment_id} has been REJECTED.`
                );
            }

        } catch (error: any) {
            console.error('Error during SuperAdmin approval:', error);
            showNotification('error', 'Action Failed', error.message);
        } finally {
            setActionLoading(null);
        }
    };
    
    // --- Loading UI (Conditional Early Return) ---
    if (isPendingLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-lg font-medium text-gray-700">Loading pending SuperAdmin approvals...</p>
                </div>
            </div>
        );
    }
    
    // --- Main Component UI ---
    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-[1500px] mx-auto">
                
                {/* Notification Area */}
                {notification && (
                    <Alert 
                        className={`mb-6 p-4 rounded-lg shadow-md ${
                            notification.type === 'success' ? 'bg-green-100 border-green-400 text-green-800' :
                            notification.type === 'error' ? 'bg-red-100 border-red-400 text-red-800' :
                            'bg-blue-100 border-blue-400 text-blue-800'
                        }`}
                    >
                        <div className="flex items-center space-x-3">
                            {notification.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />}
                            {notification.type === 'error' && <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
                            {notification.type === 'info' && <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-1" />}
                            <div className='flex flex-col'>
                                <AlertTitle className="font-semibold">{notification.title}</AlertTitle>
                                <AlertDescription className="text-sm flex">
                                    {notification.message}
                                </AlertDescription>
                            </div>
                        </div>
                    </Alert>
                )}

                {/* ======================================================= */}
                {/* 1. PENDING APPROVALS TABLE - NOW FOR SUPERADMIN (APPROVED_BY_ADMIN -> APPROVED) */}
                {/* ======================================================= */}
                <Card className="shadow-2xl border-0 mb-8">
                    <CardHeader className="bg-white border-b border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-3xl font-bold text-gray-800">
                                SuperAdmin Delivery Approvals (Stage 2)
                            </CardTitle>
                            <Badge 
                                className="text-lg font-semibold px-4 py-1.5 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
                            >
                                {totalPendingCount} Deliveries
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {totalPendingCount === 0 ? (
                            <div className="text-center py-20 px-4">
                                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
                                <h3 className="text-2xl font-bold text-gray-700 mb-2">All Caught Up</h3>
                                <p className="text-gray-500 text-lg">No deliveries requiring **SuperAdmin** final approval at this time.</p>
                                <Button onClick={fetchAdminApprovedPending} variant="outline" className="mt-6 text-gray-600 hover:bg-gray-100 border-gray-300">
                                    Refresh List
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="min-w-full divide-y divide-gray-200">
                                    <TableHeader>
                                        <TableRow className="bg-gray-50 text-gray-600 uppercase tracking-wider text-sm">
                                            <TableHead className="font-bold text-left py-3 px-6">ID</TableHead>
                                            <TableHead className="font-bold text-left py-3 px-6">Shipment ID</TableHead>
                                            <TableHead className="font-bold text-left py-3 px-6">Receiver</TableHead>
                                            <TableHead className="font-bold text-left py-3 px-6">Delivery Date</TableHead>
                                            <TableHead className="font-bold text-right py-3 px-6">Total Expenses</TableHead>
                                            <TableHead className="font-bold text-right py-3 px-6">Delivery Charges</TableHead>
                                            <TableHead className="font-bold text-right py-3 px-6 text-blue-700">Total Payable</TableHead>
                                            <TableHead className="font-bold text-center py-3 px-6">Approved By</TableHead>
                                            <TableHead className="font-bold text-center py-3 px-6">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="bg-white divide-y divide-gray-200">
                                        {deliveries.map((delivery) => (
                                            <TableRow key={delivery.delivery_id} className="hover:bg-blue-50 transition-colors">
                                                <TableCell className="font-semibold text-gray-800 py-4 px-6">#{delivery.delivery_id}</TableCell>
                                                <TableCell className="font-mono text-sm text-gray-600 py-4 px-6">{delivery.shipment_id}</TableCell>
                                                <TableCell className="text-gray-700 py-4 px-6">
                                                    {/* Walk-in Customer Logic */}
                                                    {delivery.receiver_name === 'Walk-in Customer' ? (
                                                        <Badge 
                                                            variant="outline" 
                                                            className="bg-purple-100 text-purple-700 border-purple-400 font-semibold px-2 py-1 shadow-sm"
                                                        >
                                                            {delivery.receiver_name}
                                                        </Badge>
                                                    ) : (
                                                        <span className="font-medium text-gray-800">
                                                            {delivery.receiver_name}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-gray-600 py-4 px-6">
                                                    {new Date(delivery.delivery_date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-red-600 py-4 px-6">{formatCurrency(delivery.total_expenses)}</TableCell>
                                                <TableCell className="text-right font-medium text-green-600 py-4 px-6">{formatCurrency(delivery.total_delivery_charges)}</TableCell>
                                                <TableCell className="text-right font-extrabold text-blue-700 py-4 px-6">{formatCurrency(calculateTotal(delivery))}</TableCell>
                                                <TableCell className="text-center py-4 px-6">
                                                    {/* CORRECTED BADGE: Show the status applied by the Admin (APPROVED_BY_ADMIN) */}
                                                    <Badge className='bg-blue-500 text-white font-semibold hover:bg-blue-600'>
                                                        {delivery.approval_status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-3 justify-center">
                                                        {/* Approve Dialog (Final) */}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button 
                                                                    size="sm" 
                                                                    className="bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-50"
                                                                    disabled={actionLoading === delivery.delivery_id}
                                                                >
                                                                    {actionLoading === delivery.delivery_id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                    ) : (
                                                                        'Final Approve'
                                                                    )}
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="text-xl font-bold text-green-700">Confirm Final Approval (SuperAdmin)</AlertDialogTitle>
                                                                    <AlertDialogDescription className='text-gray-600'>
                                                                        Are you absolutely sure you want to grant the **FINAL APPROVAL** for Shipment **{delivery.shipment_id}**?
                                                                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                                                            <h4 className='font-semibold text-green-800 mb-2'>Financial Summary:</h4>
                                                                            <div className="space-y-1 text-sm text-gray-700">
                                                                                <div className="flex justify-between">
                                                                                    <span>Total Expenses:</span>
                                                                                    <span className="font-medium text-red-600">{formatCurrency(delivery.total_expenses)}</span>
                                                                                </div>
                                                                                <div className="flex justify-between">
                                                                                    <span>Delivery Charges:</span>
                                                                                    <span className="font-medium text-green-600">{formatCurrency(delivery.total_delivery_charges)}</span>
                                                                                </div>
                                                                                <div className="flex justify-between pt-1 border-t border-green-200 mt-2">
                                                                                    <span className='font-bold text-base'>Total Payout:</span>
                                                                                    <span className="font-extrabold text-base text-blue-700">{formatCurrency(calculateTotal(delivery))}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <p className="mt-4 font-medium text-sm text-red-500">
                                                                            This action finalizes the financial transaction and cannot be easily reversed. Status will be set to **APPROVED**.
                                                                        </p>
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction 
                                                                        onClick={() => handleApproval(delivery.delivery_id, 'APPROVED')}
                                                                        className="bg-green-600 hover:bg-green-700 font-semibold"
                                                                    >
                                                                        Confirm Final Approval
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>

                                                        {/* Reject Dialog */}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="destructive"
                                                                    className='font-semibold disabled:opacity-50'
                                                                    disabled={actionLoading === delivery.delivery_id}
                                                                >
                                                                    {actionLoading === delivery.delivery_id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                    ) : (
                                                                        'Reject'
                                                                    )}
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="text-xl font-bold text-red-700">Confirm Rejection</AlertDialogTitle>
                                                                    <AlertDialogDescription className='text-gray-600'>
                                                                        Are you certain you wish to **reject** the delivery's financial request for Shipment **{delivery.shipment_id}**?
                                                                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                                                            <h4 className='font-semibold text-red-800 mb-2'>Rejection Summary:</h4>
                                                                            <div className="space-y-1 text-sm text-red-900">
                                                                                <div className="flex justify-between">
                                                                                    <span>Receiver:</span>
                                                                                    <span className="font-medium">{delivery.receiver_name}</span>
                                                                                </div>
                                                                                <div className="flex justify-between pt-1 border-t border-red-200 mt-2">
                                                                                    <span className='font-bold text-base'>Total Payout:</span>
                                                                                    <span className="font-extrabold text-base">{formatCurrency(calculateTotal(delivery))}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <p className="mt-4 font-medium text-sm text-blue-500">
                                                                            Rejection will flag this item for further review by the delivery team. Status will be set to **REJECTED**.
                                                                        </p>
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction 
                                                                        onClick={() => handleApproval(delivery.delivery_id, 'REJECTED')}
                                                                        className="bg-red-600 hover:bg-red-700 font-semibold"
                                                                    >
                                                                        Confirm Rejection
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ======================================================= */}
                {/* 2. DAILY APPROVED DELIVERIES REPORT TABLE */}
                {/* ======================================================= */}
                <Card className="shadow-2xl border-0">
                    <CardHeader className="bg-blue-600 text-white p-6 rounded-t-xl">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <CardTitle className="text-2xl font-bold">
                                Daily Approved Deliveries Report (Final Approved)
                            </CardTitle>
                            <div className="flex items-center space-x-3 mt-3 md:mt-0 bg-white p-2 rounded-lg shadow-inner">
                                <label htmlFor="approved-date" className="text-gray-800 font-medium">
                                    <Calendar className="h-5 w-5 inline mr-2 text-blue-600" />
                                    Select Date:
                                </label>
                                <Input
                                    id="approved-date"
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-[180px] text-gray-800 border-gray-300"
                                    max={new Date().toISOString().split('T')[0]} 
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                         {isReportLoading ? (
                            <div className="text-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
                                <p className="text-gray-600 font-medium">Loading approved transactions for {selectedDate}...</p>
                            </div>
                        ) : approvedDeliveries.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
                                <h3 className="text-xl font-bold text-gray-700 mb-2">No Final Approvals Found</h3>
                                <p className="text-gray-500">
                                    No deliveries were finally approved on **{new Date(selectedDate).toLocaleDateString()}**.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="min-w-full divide-y divide-gray-200">
                                    <TableHeader>
                                        <TableRow className="bg-gray-50 text-gray-600 uppercase tracking-wider text-xs">
                                            <TableHead className="font-bold text-left py-3 px-6">ID</TableHead>
                                            <TableHead className="font-bold text-left py-3 px-6">Shipment ID</TableHead>
                                            <TableHead className="font-bold text-left py-3 px-6">Receiver</TableHead>
                                            <TableHead className="font-bold text-right py-3 px-6">Expenses</TableHead>
                                            <TableHead className="font-bold text-right py-3 px-6">Charges</TableHead>
                                            <TableHead className="font-bold text-right py-3 px-6 text-blue-700">Total Payout</TableHead>
                                            <TableHead className="font-bold text-center py-3 px-6">Approved By</TableHead>
                                            <TableHead className="font-bold text-center py-3 px-6">Approved At</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="bg-white divide-y divide-gray-200">
                                        {approvedDeliveries.map((delivery) => (
                                            <TableRow key={delivery.delivery_id} className="hover:bg-green-50/50 transition-colors">
                                                <TableCell className="font-semibold text-gray-800 py-3 px-6">#{delivery.delivery_id}</TableCell>
                                                <TableCell className="font-mono text-sm text-gray-600 py-3 px-6">{delivery.shipment_id}</TableCell>
                                                <TableCell className="text-gray-700 py-3 px-6">{delivery.receiver_name}</TableCell>
                                                <TableCell className="text-right text-red-600 py-3 px-6">{formatCurrency(delivery.total_expenses)}</TableCell>
                                                <TableCell className="text-right text-green-600 py-3 px-6">{formatCurrency(delivery.total_delivery_charges)}</TableCell>
                                                <TableCell className="text-right font-extrabold text-blue-700 py-3 px-6">{formatCurrency(calculateTotal(delivery))}</TableCell>
                                                <TableCell className="text-center text-gray-600 py-3 px-6">{delivery.approved_by || 'System'}</TableCell>
                                                <TableCell className="text-center text-gray-500 text-sm py-3 px-6">
                                                    {delivery.approved_at ? new Date(delivery.approved_at).toLocaleTimeString() : 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {/* TOTAL ROW */}
                                        <TableRow className="bg-blue-50 border-t-2 border-blue-200">
                                            <TableCell colSpan={3} className="text-right font-extrabold text-lg text-blue-800 py-3 px-6">
                                                DAILY TOTALS:
                                            </TableCell>
                                            <TableCell className="text-right font-extrabold text-lg text-red-700 py-3 px-6">
                                                {formatCurrency(approvedTotals.totalExpenses)}
                                            </TableCell>
                                            <TableCell className="text-right font-extrabold text-lg text-green-700 py-3 px-6">
                                                {formatCurrency(approvedTotals.totalCharges)}
                                            </TableCell>
                                            <TableCell className="text-right font-extrabold text-xl text-blue-900 py-3 px-6">
                                                {formatCurrency(approvedTotals.grandTotal)}
                                            </TableCell>
                                            <TableCell colSpan={2}></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}