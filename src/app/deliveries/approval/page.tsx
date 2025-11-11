'use client';

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

export default function DeliveryApprovalPage() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [approvedDeliveries, setApprovedDeliveries] = useState<Delivery[]>([]);
    
    // Using local states exclusively
    const [isPendingLoading, setIsPendingLoading] = useState(true); 
    const [isReportLoading, setIsReportLoading] = useState(false); 
    
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
    
    // Calculate total sums for the approved table report
    const approvedTotals = useMemo(() => {
        return approvedDeliveries.reduce((acc, delivery) => {
            acc.totalExpenses += Number(delivery.total_expenses || 0);
            acc.totalCharges += Number(delivery.total_delivery_charges || 0);
            acc.grandTotal += calculateTotal(delivery);
            return acc;
        }, { totalExpenses: 0, totalCharges: 0, grandTotal: 0 });
    }, [approvedDeliveries]);

    const totalPendingCount = useMemo(() => deliveries.length, [deliveries]);

    // --- Notification Logic ---
    const showNotification = (type: NotificationType, title: string, message: string) => {
        setNotification({ type, title, message });
        setTimeout(() => setNotification(null), 7000); 
    };

    // --- Data Fetching: Pending Approvals (for the top table) ---
    const fetchPendingApprovals = useCallback(async () => {
        setIsPendingLoading(true); // START LOCAL LOADING
        setNotification(null);
        try {
            // Fetching ONLY PENDING deliveries for the Admin's first stage approval
            const response = await fetch('/api/deliveries/pending-approvals'); 
            if (response.ok) {
                const data = await response.json();
                setDeliveries(data);
                if (data.length > 0) {
                    showNotification('info', 'Data Loaded', `${data.length} deliveries require your Admin approval.`); 
                }
            } else {
                const errorData = await response.json();
                showNotification('error', 'Fetching Failed', errorData.error || 'Server error while fetching pending deliveries.');
            }
        } catch (error) {
            console.error('Error fetching pending approvals:', error);
            showNotification('error', 'Network Error', 'A network connection issue occurred while fetching pending deliveries.');
        } finally {
            setIsPendingLoading(false); // END LOCAL LOADING
        }
    }, []);

    // --- Data Fetching: Approved Deliveries by Date (for the bottom table) ---
    // NOTE: This function fetches FINALLY APPROVED deliveries only (ApprovalStatus: APPROVED)
    const fetchApprovedByDate = useCallback(async (date: string) => {
        setIsReportLoading(true); 
        setApprovedDeliveries([]); 
        try {
            const response = await fetch(`/api/deliveries/approved?date=${date}`);
            if (response.ok) {
                const data = await response.json();
                setApprovedDeliveries(data);
            } else {
                const errorData = await response.json();
                showNotification('error', 'Report Error', errorData.error || 'Failed to fetch approved deliveries for the selected date.');
            }
        } catch (error) {
            console.error('Error fetching approved deliveries:', error);
            showNotification('error', 'Network Error', 'A network error occurred while generating the report.');
        } finally {
            setIsReportLoading(false); 
        }
    }, []);

    // --- Effects ---
    useEffect(() => {
        fetchPendingApprovals();
    }, [fetchPendingApprovals]);

    useEffect(() => {
        fetchApprovedByDate(selectedDate);
    }, [selectedDate, fetchApprovedByDate]); 

    // --- Approval Action Handler ---
    const handleApproval = async (deliveryId: number, action: 'APPROVED' | 'REJECTED') => {
        setActionLoading(deliveryId);
        setNotification(null); 
        
        const processedDelivery = deliveries.find(d => d.delivery_id === deliveryId);

        // Determine the NEXT status: APPROVED_BY_ADMIN for success, REJECTED for rejection
        const nextApprovalStatus = action === 'APPROVED' ? 'APPROVED_BY_ADMIN' : 'REJECTED'; 

        try {
            const response = await fetch(`/api/deliveries/${deliveryId}`, { 
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                // Send the determined next status for the API to process
                body: JSON.stringify({ action: nextApprovalStatus, approvedBy: 'Admin User' }), 
            });

            if (response.ok) {
                const result = await response.json();

                // Update UI for Pending table (filter out the processed delivery)
                setDeliveries(prev => prev.filter(d => d.delivery_id !== deliveryId));
                
                // If approved, update the Approved table/report instantly (if dates match) - although this will typically be empty now unless the Admin is also the SuperAdmin.
                if (action === 'APPROVED' && processedDelivery && processedDelivery.delivery_date.startsWith(selectedDate)) {
                    setApprovedDeliveries(prev => [...prev, {
                        ...processedDelivery, 
                        // Use the correct updated status
                        approval_status: 'APPROVED_BY_ADMIN', 
                        approved_by: 'Admin User',
                        approved_at: new Date().toISOString()
                    } as Delivery]);
                }

                showNotification(
                    'success', 
                    `${action === 'APPROVED' ? 'Admin Approval' : 'Rejection'} Successful`,
                    `Shipment ID ${result.delivery.shipment_id} has been successfully moved to ${nextApprovalStatus} queue.`
                );
            } else {
                const errorData = await response.json();
                showNotification('error', 'Action Failed', errorData.error || `Failed to ${action.toLowerCase()} delivery status.`);
            }
        } catch (error) {
            console.error('Network Error during approval:', error);
            showNotification('error', 'Network Error', `A network issue prevented the ${action.toLowerCase()} action from completing.`);
        } finally {
            setActionLoading(null);
        }
    };
    
    // --- Loading UI (Conditional Early Return) ---
    if (isPendingLoading) {
        return (
            <div className='flex justify-center items-center min-h-screen'>
    <div className='text-4xl font-extrabold text-blue-600 flex space-x-1'>
        {/* We apply the bounce animation to each letter, 
            using arbitrary values for 'animation-delay' to stagger them.
        */}
        <span className="animate-bounce [animation-delay:-0.45s]">Z</span>
        <span className="animate-bounce [animation-delay:-0.30s]">G</span>
        <span className="animate-bounce [animation-delay:-0.15s]">T</span>
        <span className="animate-bounce">C</span>
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
                {/* 1. PENDING APPROVALS TABLE - NOW FOR ADMIN (PENDING -> APPROVED_BY_ADMIN) */}
                {/* ======================================================= */}
                <Card className="shadow-2xl border-0 mb-8">
                    <CardHeader className="bg-white border-b border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-3xl font-bold text-gray-800">
                                Admin Delivery Approvals (Stage 1)
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
                                <h3 className="text-2xl font-bold text-gray-700 mb-2">All Caught Up - No Deliveries Pending Admin Approval</h3>
                                <p className="text-gray-500 text-lg">No pending deliveries requiring initial financial approval at this time.</p>
                                <Button onClick={fetchPendingApprovals} variant="outline" className="mt-6 text-gray-600 hover:bg-gray-100 border-gray-300">
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
                                            <TableHead className="font-bold text-right py-3 px-6 text-blue-700">Fare</TableHead>
                                            <TableHead className="font-bold text-right py-3 px-6">Total Fare</TableHead>
                                            <TableHead className="font-bold text-right py-3 px-6">Total Expenses</TableHead>
                                            <TableHead className="font-bold text-right py-3 px-6 text-blue-700">Total Payable</TableHead>
                                            <TableHead className="font-bold text-center py-3 px-6">Status</TableHead>
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
                                                <TableCell className="text-right font-medium text-green-600 py-4 px-6">{formatCurrency(delivery.total_delivery_charges)}</TableCell>
                                                <TableCell className="text-right font-extrabold text-blue-700 py-4 px-6">{formatCurrency(calculateTotal(delivery))}</TableCell>
                                                <TableCell className="text-center py-4 px-6">
                                                    <Badge className='bg-yellow-500 text-white font-semibold hover:bg-yellow-600'>PENDING</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-3 justify-center">
                                                        {/* Approve Dialog */}
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
                                                                        'Admin Approve'
                                                                    )}
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="text-xl font-bold text-green-700">Confirm Admin Approval (Stage 1)</AlertDialogTitle>
                                                                    <AlertDialogDescription className='text-gray-600'>
                                                                        Are you absolutely sure you want to give **Admin Approval** for Shipment **{delivery.shipment_id}**?
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
                                                                            This action moves the item to **SuperAdmin** approval queue.
                                                                        </p>
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction 
                                                                        onClick={() => handleApproval(delivery.delivery_id, 'APPROVED')}
                                                                        className="bg-green-600 hover:bg-green-700 font-semibold"
                                                                    >
                                                                        Confirm Admin Approval
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>

                                                        {/* Reject Dialog */}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                               
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
                                                                            Rejection will flag this item for further review by the delivery team.
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
                                Daily Approved Deliveries Report
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
                                <h3 className="text-xl font-bold text-gray-700 mb-2">No Approvals Found</h3>
                                <p className="text-gray-500">
                                    No deliveries were approved on **{new Date(selectedDate).toLocaleDateString()}**.
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