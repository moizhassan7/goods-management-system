"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Vehicle = { id: number; vehicleNumber: string };
type TripShipmentLog = {
  id: number;
  bilty_number: string;
  serial_number: number;
  receiver_name: string;
  item_details: string;
  quantity: number;
  delivery_charges: number;
  total_charges: number;
};

type TripLog = {
  id: number;
  vehicle_id: number;
  vehicle?: { vehicleNumber: string };
  driver_name: string;
  driver_mobile: string;
  station_name: string;
  city: string;
  date: string;
  arrival_time: string;
  departure_time: string;
  total_fare_collected: number;
  delivery_cut: number;
  commission: number;
  arrears: number;
  cuts: number;
  munsihna_reward: number;
  distant_charges: number;
  accountant_charges: number;
  received_amount: number;

  note?: string;
  shipmentLogs: TripShipmentLog[];
};

export default function TripReportPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [loading, setLoading] = useState<boolean>(false);
  const [tripLog, setTripLog] = useState<TripLog | null>(null);

  useEffect(() => {
    async function loadVehicles() {
      try {
        const res = await fetch('/api/lists');
        const lists = await res.json();
        setVehicles(lists.vehicles || []);
      } catch (e) {
        console.error('Failed to load vehicles', e);
      }
    }
    loadVehicles();
  }, []);

  async function fetchReport() {
    if (!vehicleId || !date) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ vehicle_id: String(vehicleId), date });
      const res = await fetch(`/api/trips?${params.toString()}`);
      const data: TripLog[] = await res.json();
      setTripLog(data.length > 0 ? data[0] : null);
    } catch (e) {
      console.error('Failed to fetch report', e);
      setTripLog(null);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    if (!tripLog) return { totalFare: 0 };
    return {
      totalFare: tripLog.shipmentLogs.reduce((s, l) => s + Number(l.total_charges || 0), 0),
    };
  }, [tripLog]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>Trip Log Report</h2>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
        <div>
          <div className='grid gap-2'>
            <Label>Vehicle</Label>
            <Select value={vehicleId ? String(vehicleId) : ''} onValueChange={(v) => setVehicleId(parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder='Select Vehicle' />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={String(v.id)}>{v.vehicleNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <div className='grid gap-2'>
            <Label>Date</Label>
            <Input type='date' value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className='flex items-end'>
          <Button className='w-full' onClick={fetchReport} disabled={!vehicleId || !date || loading}>
            {loading ? 'Loading...' : 'Load Report'}
          </Button>
        </div>
      </div>

      {!loading && tripLog && (
        <div className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded bg-white'>
            <div><div className='text-gray-500'>Vehicle</div><div className='font-semibold'>{tripLog.vehicle?.vehicleNumber}</div></div>
            <div><div className='text-gray-500'>Driver</div><div className='font-semibold'>{tripLog.driver_name}</div></div>
            <div><div className='text-gray-500'>City</div><div className='font-semibold'>{tripLog.city}</div></div>
            <div><div className='text-gray-500'>Date</div><div className='font-semibold'>{new Date(tripLog.date).toLocaleDateString()}</div></div>
            <div><div className='text-gray-500'>Arrival</div><div className='font-semibold'>{tripLog.arrival_time}</div></div>
            <div><div className='text-gray-500'>Departure</div><div className='font-semibold'>{tripLog.departure_time}</div></div>
            <div><div className='text-gray-500'>Station</div><div className='font-semibold'>{tripLog.station_name}</div></div>
            <div><div className='text-gray-500'>Note</div><div className='font-semibold'>{tripLog.note || '-'}</div></div>
          </div>

          <div>
            <h3 className='text-lg font-semibold mb-2'>Shipment Logs</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr. #</TableHead>
                  <TableHead>Bilty #</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total Charges</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tripLog.shipmentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.serial_number}</TableCell>
                    <TableCell>{log.bilty_number}</TableCell>
                    <TableCell>{log.receiver_name}</TableCell>
                    <TableCell>{log.item_details}</TableCell>
                    <TableCell>{log.quantity}</TableCell>
                    <TableCell>{Number(log.total_charges).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded bg-white'>
            <div><div className='text-gray-500'>Total Fare</div><div className='font-semibold'>{totals.totalFare.toFixed(2)}</div></div>
            <div><div className='text-gray-500'>Received</div><div className='font-semibold'>{Number(tripLog.received_amount).toFixed(2)}</div></div>
            <div><div className='text-gray-500'>Cuts</div><div className='font-semibold'>{Number(tripLog.cuts).toFixed(2)}</div></div>
            <div><div className='text-gray-500'>Muhshiana</div><div className='font-semibold'>{Number(tripLog.accountant_charges).toFixed(2)}</div></div>
          </div>
        </div>
      )}

      {!loading && !tripLog && (
        <div className='p-4 text-gray-600'>No trip log found for selected vehicle and date.</div>
      )}
    </div>
  );
}


