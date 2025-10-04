// View all vehicles - Client Component
'use client';
import React, { useState, useEffect } from 'react';
interface Vehicle {
  id: number;
  vehicleNumber: string;
}
export default function ViewVehicles() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetchVehicles = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/vehicles');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: Vehicle[] = await response.json();
            setVehicles(data);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to fetch vehicles.');
        } finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchVehicles();
    }, []);
    return (
        <div className="p-6">
            <h2 className='text-2xl font-bold mb-4 text-gray-800'>View All Vehicles</h2>
            {isLoading && <p className="text-blue-500">Loading vehicles...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            {!isLoading && !error && (
                <>
                    {vehicles.length === 0 ? (
                        <p className="text-gray-500 italic">No vehicles added yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {vehicles.map((vehicle) => (
                                <li
                                    key={vehicle.id}
                                    className="p-3 border-b border-gray-200 bg-gray-50 rounded-md flex justify-between items-center"
                                >
                                    <span className="text-lg font-medium text-gray-700">{vehicle.vehicleNumber}</span>
                                    <span className="text-sm text-gray-400">ID: {vehicle.id}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
