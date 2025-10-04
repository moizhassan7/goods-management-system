// View all Agecncy entries
'use client'; // This is a client-side component
import React, { useState, useEffect } from 'react';

interface Agency {
    id: number;
    name: string;
}
export default function ViewAgencies() {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAgencies = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/agencies');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: Agency[] = await response.json();
            setAgencies(data);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to fetch agencies.');
        } finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchAgencies();
    }, []);
    return (
        <div className="p-6">
            <h2 className='text-2xl font-bold mb-4 text-gray-800'>View All Agencies</h2>
            {isLoading && <p className="text-blue-500">Loading agencies...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            {!isLoading && !error && (
                <>
                    {agencies.length === 0 ? (
                        <p className="text-gray-500 italic">No agencies added yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {agencies.map((agency) => (
                                <li
                                    key={agency.id}
                                    className="p-3 border-b border-gray-200 bg-gray-50 rounded-md flex justify-between items-center"
                                >
                                    <span className="text-lg font-medium text-gray-700">{agency.name}</span>
                                    <span className="text-sm text-gray-400">ID: {agency.id}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
