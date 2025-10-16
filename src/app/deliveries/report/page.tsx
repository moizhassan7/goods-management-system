"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Delivery = {
  delivery_id: number;
  shipment_id: string;
  delivery_date: string;
  station_expense: number;
  bility_expense: number;
  station_labour: number;
  cart_labour: number;
  total_expenses: number;
  receiver_name: string;
  receiver_phone: string;
  delivery_notes?: string;
  shipment: {
    bility_number: string;
    sender: { name: string };
    receiver: { name: string };
  };
};

export default function DeliveriesReportPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [shipmentId, setShipmentId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (shipmentId) params.append('shipment_id', shipmentId);
      const res = await fetch(`/api/deliveries/report?${params.toString()}`);
      const data: Delivery[] = await res.json();
      setDeliveries(data);
    } catch (e) {
      console.error('Failed to fetch report', e);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    return deliveries.reduce((acc, delivery) => {
      return {
        totalDeliveries: acc.totalDeliveries + 1,
        totalExpenses: acc.totalExpenses + Number(delivery.total_expenses || 0),
      };
    }, { totalDeliveries: 0, totalExpenses: 0 });
  }, [deliveries]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>Deliveries Report</h2>

      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
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
            <Label>Shipment ID</Label>
            <Input value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className='flex items-end'>
          <Button className='w-full' onClick={fetchReport} disabled={loading}>
            {loading ? 'Loading...' : 'Load Report'}
          </Button>
        </div>
      </div>

      {!loading && deliveries.length > 0 && (
        <div className='space-y-6'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment ID</TableHead>
                <TableHead>Bilty #</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Total Expenses</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.delivery_id}>
                  <TableCell>{delivery.shipment_id}</TableCell>
                  <TableCell>{delivery.shipment.bility_number}</TableCell>
                  <TableCell>{delivery.receiver_name}</TableCell>
                  <TableCell>{new Date(delivery.delivery_date).toLocaleDateString()}</TableCell>
                  <TableCell>{Number(delivery.total_expenses).toFixed(2)}</TableCell>
                  <TableCell>{delivery.delivery_notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded bg-white'>
            <div><div className='text-gray-500'>Total Deliveries</div><div className='font-semibold'>{totals.totalDeliveries}</div></div>
            <div><div className='text-gray-500'>Total Expenses</div><div className='font-semibold'>{totals.totalExpenses.toFixed(2)}</div></div>
          </div>
        </div>
      )}

      {!loading && deliveries.length === 0 && (
        <div className='p-4 text-gray-600'>No deliveries found for the selected criteria.</div>
      )}
    </div>
  );
}
