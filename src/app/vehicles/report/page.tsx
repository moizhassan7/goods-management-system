"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Vehicle = {
  id: number;
  vehicleNumber: string;
  shipments: { id: string; total_charges: number }[];
  tripLogs: { total_fare_collected: number }[];
  vehicleTransactions: {
    credit_amount: number;
    debit_amount: number;
  }[];
};

export default function VehiclesReportPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await fetch(`/api/vehicles/report?${params.toString()}`);
      const data: Vehicle[] = await res.json();
      setVehicles(data);
    } catch (e) {
      console.error('Failed to fetch report', e);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    return vehicles.reduce((acc, vehicle) => {
      const shipmentCount = vehicle.shipments.length;
      const totalCharges = vehicle.shipments.reduce((sum, s) => sum + Number(s.total_charges || 0), 0);
      const tripCount = vehicle.tripLogs.length;
      const totalFares = vehicle.tripLogs.reduce((sum, t) => sum + Number(t.total_fare_collected || 0), 0);
      const totalCredits = vehicle.vehicleTransactions.reduce((sum, vt) => sum + Number(vt.credit_amount || 0), 0);
      const totalDebits = vehicle.vehicleTransactions.reduce((sum, vt) => sum + Number(vt.debit_amount || 0), 0);
      return {
        totalVehicles: acc.totalVehicles + 1,
        totalShipments: acc.totalShipments + shipmentCount,
        totalCharges: acc.totalCharges + totalCharges,
        totalTrips: acc.totalTrips + tripCount,
        totalFares: acc.totalFares + totalFares,
        totalCredits: acc.totalCredits + totalCredits,
        totalDebits: acc.totalDebits + totalDebits,
      };
    }, { totalVehicles: 0, totalShipments: 0, totalCharges: 0, totalTrips: 0, totalFares: 0, totalCredits: 0, totalDebits: 0 });
  }, [vehicles]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>Vehicles Report</h2>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
        <div>
          <div className='grid gap-2'>
            <Label>Start Date</Label>
            <Input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>
        <div>
          <div className='grid gap-2'>
            <Label>End Date</Label>
            <Input type='date' value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className='flex items-end'>
          <Button className='w-full' onClick={fetchReport} disabled={loading}>
            {loading ? 'Loading...' : 'Load Report'}
          </Button>
        </div>
      </div>

      {!loading && vehicles.length > 0 && (
        <div className='space-y-6'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle Number</TableHead>
                <TableHead>Shipments Count</TableHead>
                <TableHead>Total Charges</TableHead>
                <TableHead>Trips Count</TableHead>
                <TableHead>Total Fares</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => {
                const shipmentCount = vehicle.shipments.length;
                const totalCharges = vehicle.shipments.reduce((sum, s) => sum + Number(s.total_charges || 0), 0);
                const tripCount = vehicle.tripLogs.length;
                const totalFares = vehicle.tripLogs.reduce((sum, t) => sum + Number(t.total_fare_collected || 0), 0);
                return (
                  <TableRow key={vehicle.id}>
                    <TableCell>{vehicle.vehicleNumber}</TableCell>
                    <TableCell>{shipmentCount}</TableCell>
                    <TableCell>{totalCharges.toFixed(2)}</TableCell>
                    <TableCell>{tripCount}</TableCell>
                    <TableCell>{totalFares.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className='grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded bg-white'>
            <div><div className='text-gray-500'>Total Vehicles</div><div className='font-semibold'>{totals.totalVehicles}</div></div>
            <div><div className='text-gray-500'>Total Shipments</div><div className='font-semibold'>{totals.totalShipments}</div></div>
            <div><div className='text-gray-500'>Total Charges</div><div className='font-semibold'>{totals.totalCharges.toFixed(2)}</div></div>
            <div><div className='text-gray-500'>Total Fares</div><div className='font-semibold'>{totals.totalFares.toFixed(2)}</div></div>
          </div>
        </div>
      )}

      {!loading && vehicles.length === 0 && (
        <div className='p-4 text-gray-600'>No vehicles found for the selected criteria.</div>
      )}
    </div>
  );
}
