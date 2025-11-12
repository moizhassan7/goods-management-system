"use client";

import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Save, FileText } from 'lucide-react';

export interface PrintableShipmentData {
    register_number: string;
    bility_number: string;
    bility_date: string;
    departure_city: string;
    forwarding_agency: string;
    vehicle_number: string;
    sender_name: string;
    receiver_name: string;
    destination_city: string;
    item_type: string;
    quantity: number;
    total_delivery_charges: number;
    total_amount: number;
    payment_status: string;
    remarks?: string;
    station_expense: number;
    bility_expense: number;
    station_labour: number;
    cart_labour: number;
    total_expenses: number;
}

interface ShipmentPrintFormProps {
    data: PrintableShipmentData;
    onSave?: () => void;
    onSaveAndPrint?: () => void;
    onPrint?: () => void;
}

const ShipmentPrintForm = ({ data, onSave, onSaveAndPrint, onPrint }: ShipmentPrintFormProps) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (onPrint) {
            onPrint();
        }
        const printWindow = window.open('', '', 'height=auto,width=auto');
        if (printWindow && printRef.current) {
            printWindow.document.write(printRef.current.innerHTML);
            printWindow.document.close();
            printWindow.print();
        }
    };

    const handleSaveAndPrint = async () => {
        if (onSaveAndPrint) {
            await onSaveAndPrint();
        }
        // Give a moment for save to complete
        setTimeout(handlePrint, 500);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="w-full space-y-6">
            {/* Control Buttons */}
            <div className="flex flex-col md:flex-row gap-3 justify-center md:justify-start mb-6">
                <Button
                    onClick={onSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                    size="lg"
                >
                    <Save className="h-5 w-5" />
                    Save
                </Button>
                <Button
                    onClick={handleSaveAndPrint}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    size="lg"
                >
                    <FileText className="h-5 w-5" />
                    Save & Print
                </Button>
                <Button
                    onClick={handlePrint}
                    className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                    size="lg"
                >
                    <Printer className="h-5 w-5" />
                    Print Only
                </Button>
            </div>

            {/* Printable Content */}
            <div
                ref={printRef}
                className="p-8 bg-white border border-gray-300 rounded-lg shadow-lg print:shadow-none"
                style={{ pageBreakAfter: 'always' }}
            >
                {/* Header */}
                <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">SHIPMENT RECEIPT</h1>
                    <p className="text-gray-600 mt-2">Goods Management System</p>
                </div>

                {/* Main Content Grid */}
                <div className="space-y-6">
                    {/* Section 1: Registration & Bility Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-300 p-4 bg-gray-50">
                        <div>
                            <p className="text-xs uppercase font-semibold text-gray-500">Registration Number</p>
                            <p className="text-2xl font-bold text-blue-600">{data.register_number}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase font-semibold text-gray-500">Bility Number</p>
                            <p className="text-2xl font-bold text-blue-600">{data.bility_number}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase font-semibold text-gray-500">Bility Date</p>
                            <p className="text-lg font-semibold text-gray-800">
                                {new Date(data.bility_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase font-semibold text-gray-500">Payment Status</p>
                            <p className={`text-lg font-bold ${
                                data.payment_status === 'PAID' ? 'text-green-600' :
                                data.payment_status === 'FREE' ? 'text-blue-600' :
                                'text-red-600'
                            }`}>
                                {data.payment_status}
                            </p>
                        </div>
                    </div>

                    {/* Section 2: Route Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-300 p-4">
                        <div>
                            <p className="text-xs uppercase font-semibold text-gray-500 mb-2">Departure City</p>
                            <p className="text-lg font-semibold text-gray-800">{data.departure_city}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase font-semibold text-gray-500 mb-2">Destination City</p>
                            <p className="text-lg font-semibold text-gray-800">{data.destination_city || 'Local'}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase font-semibold text-gray-500 mb-2">Agency</p>
                            <p className="text-lg font-semibold text-gray-800">{data.forwarding_agency}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase font-semibold text-gray-500 mb-2">Vehicle</p>
                            <p className="text-lg font-semibold text-gray-800">{data.vehicle_number}</p>
                        </div>
                    </div>

                    {/* Section 3: Parties Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-300 p-4 bg-blue-50">
                        <div>
                            <p className="text-xs uppercase font-semibold text-gray-500 mb-2">Sender Name</p>
                            <p className="text-lg font-semibold text-gray-800">{data.sender_name}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase font-semibold text-gray-500 mb-2">Receiver Name</p>
                            <p className="text-lg font-semibold text-gray-800">{data.receiver_name}</p>
                        </div>
                    </div>

                    {/* Section 4: Goods Details */}
                    <div className="border border-gray-300 p-4">
                        <p className="text-xs uppercase font-semibold text-gray-500 mb-3">Goods Details</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Item Type</p>
                                <p className="text-lg font-semibold text-gray-800">{data.item_type}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Quantity</p>
                                <p className="text-lg font-semibold text-gray-800">{data.quantity}</p>
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Financial Details */}
                    <div className="border border-gray-300 p-4 bg-yellow-50">
                        <p className="text-xs uppercase font-semibold text-gray-500 mb-3">Financial Details</p>
                        <div className="space-y-3">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-700 font-semibold">Total Delivery Charges:</span>
                                <span className="text-gray-900 font-bold text-lg">{formatCurrency(data.total_delivery_charges)}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-700 font-semibold">Total Amount:</span>
                                <span className="text-gray-900 font-bold text-lg">{formatCurrency(data.total_amount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 6: Expense Details */}
                    <div className="border border-gray-300 p-4 bg-orange-50">
                        <p className="text-xs uppercase font-semibold text-gray-500 mb-3">Expense Breakdown</p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-700">Station Expense:</span>
                                <span className="text-gray-900 font-semibold">{formatCurrency(data.station_expense)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-700">Bility Expense:</span>
                                <span className="text-gray-900 font-semibold">{formatCurrency(data.bility_expense)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-700">Station Labour:</span>
                                <span className="text-gray-900 font-semibold">{formatCurrency(data.station_labour)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-700">Cart Labour:</span>
                                <span className="text-gray-900 font-semibold">{formatCurrency(data.cart_labour)}</span>
                            </div>
                            <div className="flex justify-between border-t-2 border-gray-400 pt-2 mt-2">
                                <span className="text-gray-800 font-bold">Total Expenses:</span>
                                <span className="text-gray-900 font-bold text-lg">{formatCurrency(data.total_expenses)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 7: Remarks */}
                    {data.remarks && (
                        <div className="border border-gray-300 p-4">
                            <p className="text-xs uppercase font-semibold text-gray-500 mb-2">Remarks</p>
                            <p className="text-gray-800">{data.remarks}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="border-t-2 border-gray-800 pt-4 mt-6 text-center">
                        <p className="text-xs text-gray-600 mb-2">
                            Printed on {new Date().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                        <p className="text-xs text-gray-500">© Goods Management System. All Rights Reserved.</p>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    .print\\:shadow-none {
                        box-shadow: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default ShipmentPrintForm;
