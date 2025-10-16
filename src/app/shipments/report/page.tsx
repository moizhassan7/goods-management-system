"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type City = { id: number; name: string };
type Vehicle = { id: number; vehicleNumber: string };
type Shipment = {
  register_number: string;
  bility_number: string;
  bility_date: string;
  total_charges: number;
  delivery_date?: string;
  departureCity: { name: string };
  toCity?: { name: string };
  sender: { name: string };
  receiver: { name: string };
  vehicle: { vehicleNumber: string };
  goodsDetails: { quantity: number; charges: number }[];
};

export default function ShipmentsReportPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [departureCityId, setDepartureCityId] = useState<number>(0);
  const [toCityId, setToCityId] = useState<number>(0);
  const [vehicleId, setVehicleId] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadFilters() {
      try {
        const listsRes = await fetch('/api/lists');
        const lists = await listsRes.json();
        setCities(lists.cities || []);
        setVehicles(lists.vehicles || []);
      } catch (e) {
        console.error('Failed to load filters', e);
      }
    }
    loadFilters();
  }, []);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (departureCityId) params.append('departureCityId', String(departureCityId));
      if (toCityId) params.append('toCityId', String(toCityId));
      if (vehicleId) params.append('vehicleId', String(vehicleId));
      const res = await fetch(`/api/shipments/report?${params.toString()}`);
      const data: Shipment[] = await res.json();
      setShipments(data);
    } catch (e) {
      console.error('Failed to fetch report', e);
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    if (!Array.isArray(shipments)) return { totalShipments: 0, totalCharges: 0, totalQuantity: 0 };
    return shipments.reduce((acc, shipment) => {
      const totalQuantity = shipment.goodsDetails.reduce((sum, gd) => sum + gd.quantity, 0);
      return {
        totalShipments: acc.totalShipments + 1,
        totalCharges: acc.totalCharges + Number(shipment.total_charges || 0),
        totalQuantity: acc.totalQuantity + totalQuantity,
      };
    }, { totalShipments: 0, totalCharges: 0, totalQuantity: 0 });
  }, [shipments]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>Shipments Report</h2>

      <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6'>
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
        <div>
          <div className='grid gap-2'>
            <Label>Departure City</Label>
            <Select value={departureCityId ? String(departureCityId) : 'all'} onValueChange={(v) => setDepartureCityId(v === 'all' ? 0 : parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder='All' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                {cities.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <div className='grid gap-2'>
            <Label>To City</Label>
            <Select value={toCityId ? String(toCityId) : 'all'} onValueChange={(v) => setToCityId(v === 'all' ? 0 : parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder='All' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                {cities.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <div className='grid gap-2'>
            <Label>Vehicle</Label>
            <Select value={vehicleId ? String(vehicleId) : 'all'} onValueChange={(v) => setVehicleId(v === 'all' ? 0 : parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder='All' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={String(v.id)}>{v.vehicleNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className='flex items-end'>
          <Button className='w-full' onClick={fetchReport} disabled={loading}>
            {loading ? 'Loading...' : 'Load Report'}
          </Button>
        </div>
      </div>

      {!loading && shipments.length > 0 && (
        <div className='space-y-6'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment ID</TableHead>
                <TableHead>Bilty #</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Total Charges</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.register_number}>
                  <TableCell>{shipment.register_number}</TableCell>
                  <TableCell>{shipment.bility_number}</TableCell>
                  <TableCell>{shipment.sender.name}</TableCell>
                  <TableCell>{shipment.receiver.name}</TableCell>
                  <TableCell>{shipment.departureCity.name}</TableCell>
                  <TableCell>{shipment.toCity?.name || '-'}</TableCell>
                  <TableCell>{shipment.vehicle.vehicleNumber}</TableCell>
                  <TableCell>{Number(shipment.total_charges).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded bg-white'>
            <div><div className='text-gray-500'>Total Shipments</div><div className='font-semibold'>{totals.totalShipments}</div></div>
            <div><div className='text-gray-500'>Total Charges</div><div className='font-semibold'>{totals.totalCharges.toFixed(2)}</div></div>
            <div><div className='text-gray-500'>Total Quantity</div><div className='font-semibold'>{totals.totalQuantity}</div></div>
          </div>
        </div>
      )}

      {!loading && shipments.length === 0 && (
        <div className='p-4 text-gray-600'>No shipments found for the selected criteria.</div>
      )}
    </div>
  );
}
