// View all parties - Client Component
'use client';
import React, { useState, useEffect } from 'react';

interface Party {
    id: number;
    name: string;
    contactInfo: string;
    openingBalance: string;
}

export default function ViewParties() {
    const [parties, setParties] = useState<Party[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchParties = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/parties');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: Party[] = await response.json();
            setParties(data);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to fetch parties.');
        } finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchParties();
    }, []);
    return (
        <div className="p-6">
            <h2 className='text-2xl font-bold mb-4 text-gray-800'>View All Parties</h2>
            {isLoading && <p className="text-blue-500">Loading parties...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            {!isLoading && !error && (
                <>
                    {parties.length === 0 ? (
                        <p className="text-gray-500 italic">No parties added yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {parties.map((party) => (
                                <li
                                    key={party.id}
                                    className="p-3 border-b border-gray-200 bg-gray-50 rounded-md flex justify-between items-center"
                        
                                >
                                    <span className="text-lg font-medium text-gray-700">{party.name}</span>
                                    <span className="text-sm text-gray-400">ID: {party.id}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}