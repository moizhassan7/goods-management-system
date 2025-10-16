"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type City = {
  id: number;
  name: string;
  departingShipments: { id: string }[];
  arrivingShipments: { id: string }[];
};

export default function CitiesReportPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchReport();
  }, []);

  async function fetchReport() {
    setLoading(true);
    try {
      const res = await fetch('/api/cities/report');
      const data: City[] = await res.json();
      setCities(data);
    } catch (e) {
      console.error('Failed to fetch report', e);
      setCities([]);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    return cities.reduce((acc, city) => {
      return {
        totalCities: acc.totalCities + 1,
        totalDeparting: acc.totalDeparting + city.departingShipments.length,
        totalArriving: acc.totalArriving + city.arrivingShipments.length,
      };
    }, { totalCities: 0, totalDeparting: 0, totalArriving: 0 });
  }, [cities]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>Cities Report</h2>

      <div className='flex items-end mb-6'>
        <Button onClick={fetchReport} disabled={loading}>
          {loading ? 'Loading...' : 'Load Report'}
        </Button>
      </div>

      {!loading && cities.length > 0 && (
        <div className='space-y-6'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City Name</TableHead>
                <TableHead>Departing Shipments</TableHead>
                <TableHead>Arriving Shipments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cities.map((city) => (
                <TableRow key={city.id}>
                  <TableCell>{city.name}</TableCell>
                  <TableCell>{city.departingShipments.length}</TableCell>
                  <TableCell>{city.arrivingShipments.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded bg-white'>
            <div><div className='text-gray-500'>Total Cities</div><div className='font-semibold'>{totals.totalCities}</div></div>
            <div><div className='text-gray-500'>Total Departing</div><div className='font-semibold'>{totals.totalDeparting}</div></div>
            <div><div className='text-gray-500'>Total Arriving</div><div className='font-semibold'>{totals.totalArriving}</div></div>
          </div>
        </div>
      )}

      {!loading && cities.length === 0 && (
        <div className='p-4 text-gray-600'>No cities found.</div>
      )}
    </div>
  );
}
