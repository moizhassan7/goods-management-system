"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ReturnShipment = {
  id: number;
  original_shipment_id: string;
  return_date: string;
  reason: string;
  status: string;
  action_taken?: string;
  resolution_date?: string;
  originalShipment: {
    bility_number: string;
    sender: { name: string };
    receiver: { name: string };
  };
};

export default function ReturnsReportPage() {
  const [returns, setReturns] = useState<ReturnShipment[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (status) params.append('status', status);
      const res = await fetch(`/api/returns/report?${params.toString()}`);
      const data: ReturnShipment[] = await res.json();
      setReturns(data);
    } catch (e) {
      console.error('Failed to fetch report', e);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    return returns.reduce((acc, ret) => {
      return {
        totalReturns: acc.totalReturns + 1,
      };
    }, { totalReturns: 0 });
  }, [returns]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>Returns Report</h2>

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
            <Label>Status</Label>
            <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder='All Statuses' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                <SelectItem value='PENDING'>Pending</SelectItem>
                <SelectItem value='IN_TRANSIT'>In Transit</SelectItem>
                <SelectItem value='COMPLETED'>Completed</SelectItem>
                <SelectItem value='CANCELLED'>Cancelled</SelectItem>
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

      {!loading && returns.length > 0 && (
        <div className='space-y-6'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Original Shipment</TableHead>
                <TableHead>Bilty #</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action Taken</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((ret) => (
                <TableRow key={ret.id}>
                  <TableCell>{ret.original_shipment_id}</TableCell>
                  <TableCell>{ret.originalShipment.bility_number}</TableCell>
                  <TableCell>{new Date(ret.return_date).toLocaleDateString()}</TableCell>
                  <TableCell>{ret.reason}</TableCell>
                  <TableCell>{ret.status}</TableCell>
                  <TableCell>{ret.action_taken || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className='grid grid-cols-1 md:grid-cols-1 gap-4 p-4 border rounded bg-white'>
            <div><div className='text-gray-500'>Total Returns</div><div className='font-semibold'>{totals.totalReturns}</div></div>
          </div>
        </div>
      )}

      {!loading && returns.length === 0 && (
        <div className='p-4 text-gray-600'>No returns found for the selected criteria.</div>
      )}
    </div>
  );
}
