'use client'; // This is a client-side component

import React, { useState, useEffect } from 'react';

interface City {
  id: number; 
  name: string;
}

export default function ViewCities() {
  const [cities, setCities] = useState<City[]>([]);
  const [newCityName, setNewCityName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchCities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Assuming the API route is at /api/cities or similar
      const response = await fetch('/api/cities'); 
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: City[] = await response.json();
      setCities(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch cities.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []); 

  return (
    <div className="p-6">      {/* --- City List Display --- */}
      <h2 className='text-2xl font-bold mb-4 text-gray-800'>View All Cities</h2>
      
      {isLoading && <p className="text-blue-500">Loading cities...</p>}
      
      {error && <p className="text-red-500">Error: {error}</p>}
      
      {!isLoading && !error && (
        <>
          {cities.length === 0 ? (
            <p className="text-gray-500 italic">No cities added yet.</p>
          ) : (
            <ul className="space-y-3">
              {cities.map((city) => (
                <li 
                  key={city.id} 
                  className="p-3 border-b border-gray-200 bg-gray-50 rounded-md flex justify-between items-center"
                >
                  <span className="text-lg font-medium text-gray-700">{city.name}</span>
                  <span className="text-sm text-gray-400">ID: {city.id}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}