"use client";

import React, { useState, useEffect } from 'react';
import ShipmentPrintForm, { PrintableShipmentData } from '@/components/forms/ShipmentPrintForm';
import { useRouter } from 'next/navigation';

interface PrintingPageProps {
    shipmentData?: PrintableShipmentData;
}

export default function ShipmentPrintingPage({ shipmentData }: PrintingPageProps) {
    const router = useRouter();
    const [savedData, setSavedData] = useState<PrintableShipmentData | null>(shipmentData || null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Try to get data from sessionStorage first (from AddShipment page)
        const storedData = sessionStorage.getItem('shipmentPrintData');
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                setSavedData(parsedData);
                // Clear the sessionStorage after using it
                sessionStorage.removeItem('shipmentPrintData');
            } catch (error) {
                console.error('Error parsing stored shipment data:', error);
            }
        }
        setIsLoading(false);
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save logic - data is already saved, just show notification
            console.log('Shipment data confirmed:', savedData);
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndPrint = async () => {
        setIsSaving(true);
        try {
            // Data is already saved, just trigger print
            console.log('Printing shipment data:', savedData);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        console.log('Printing shipment data:', savedData);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-2xl font-bold text-gray-800">Loading...</div>
            </div>
        );
    }

    if (!savedData) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">No Data Available</h2>
                    <p className="text-gray-600 mb-6">Please create a shipment first before printing.</p>
                    <button
                        onClick={() => router.push('/shipments/add')}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                        Go to Add Shipment
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Shipment Printing</h1>
                
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <ShipmentPrintForm
                        data={savedData}
                        onSave={handleSave}
                        onSaveAndPrint={handleSaveAndPrint}
                        onPrint={handlePrint}
                    />
                </div>
            </div>
        </div>
    );
}
