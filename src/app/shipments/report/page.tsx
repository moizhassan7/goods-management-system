// src/app/shipments/report/page.tsx

"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; 

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
  payment_status?: string | null; // NEW: Payment status field
};

// Helper function for currency formatting (reuse logic)
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 2,
    }).format(amount);
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
      
      // Only include charges if the shipment is PENDING or status is missing
      const chargeAmount = (shipment.payment_status === 'PENDING' || !shipment.payment_status) 
        ? Number(shipment.total_charges || 0) : 0;

      return {
        totalShipments: acc.totalShipments + 1,
        totalCharges: acc.totalCharges + chargeAmount, // Sum only charges for PENDING
        totalQuantity: acc.totalQuantity + totalQuantity,
      };
    }, { totalShipments: 0, totalCharges: 0, totalQuantity: 0 });
  }, [shipments]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>Shipments Report</h2>

      {/* FILTERS CARD - New Structure */}
      <Card className='shadow-lg mb-8'>
        <CardHeader>
            <CardTitle className='text-xl text-blue-800'>Report Filters</CardTitle>
            <CardDescription>Select criteria and load the report data.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4'>
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
        </CardContent>
      </Card>


      {!loading && shipments.length > 0 && (
        <div className='space-y-6'>
          {/* RESULTS TABLE CARD - New Structure */}
          <Card className='shadow-lg'>
            <CardHeader>
                <CardTitle className='text-xl text-gray-800'>Shipment Details ({shipments.length} Records)</CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
                <div className='overflow-x-auto'>
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
                                <TableHead className='text-right'>Payment Status / Charges</TableHead> {/* MODIFIED HEADER */}
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
                                    {/* MODIFIED CELL: Display Status or Charges */}
                                    <TableCell className='text-right font-bold'>
                                        {shipment.payment_status === 'ALREADY_PAID' && <span className='px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700'>PAID</span>}
                                        {shipment.payment_status === 'FREE' && <span className='px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700'>FREE</span>}
                                        {(shipment.payment_status === 'PENDING' || !shipment.payment_status) && <span className='font-bold text-green-700'>{formatCurrency(shipment.total_charges)}</span>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
          </Card>


          {/* TOTALS CARD - New Structure */}
          <Card className='bg-blue-50 border-blue-200 shadow-xl'>
            <CardHeader>
                <CardTitle className='text-lg text-blue-800'>Report Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div>
                        <div className='text-gray-600'>Total Shipments</div>
                        <div className='font-extrabold text-2xl text-blue-900'>{totals.totalShipments}</div>
                    </div>
                    <div>
                        <div className='text-gray-600'>Total Charges (Due/Received)</div>
                        <div className='font-extrabold text-2xl text-green-700'>{formatCurrency(totals.totalCharges)}</div>
                    </div>
                    <div>
                        <div className='text-gray-600'>Total Quantity Shipped</div>
                        <div className='font-extrabold text-2xl text-orange-700'>{totals.totalQuantity}</div>
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && shipments.length === 0 && (
        <div className='p-4 text-gray-600'>No shipments found for the selected criteria.</div>
      )}
    </div>
  );
}