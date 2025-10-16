"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type LabourAssignment = {
  id: number;
  assigned_date: string;
  due_date?: string;
  status: string;
  collected_amount?: number;
  settled_date?: string;
  labourPerson: { name: string };
  shipment: { register_number: string; bility_number: string };
};

export default function LabourAssignmentsReportPage() {
  const [assignments, setAssignments] = useState<LabourAssignment[]>([]);
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
      const res = await fetch(`/api/labour-assignments/report?${params.toString()}`);
      const data: LabourAssignment[] = await res.json();
      setAssignments(data);
    } catch (e) {
      console.error('Failed to fetch report', e);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    return assignments.reduce((acc, assignment) => {
      return {
        totalAssignments: acc.totalAssignments + 1,
        totalCollected: acc.totalCollected + Number(assignment.collected_amount || 0),
      };
    }, { totalAssignments: 0, totalCollected: 0 });
  }, [assignments]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>Labour Assignments Report</h2>

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
                <SelectItem value='ASSIGNED'>Assigned</SelectItem>
                <SelectItem value='DELIVERED'>Delivered</SelectItem>
                <SelectItem value='COLLECTED'>Collected</SelectItem>
                <SelectItem value='SETTLED'>Settled</SelectItem>
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

      {!loading && assignments.length > 0 && (
        <div className='space-y-6'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Labour Person</TableHead>
                <TableHead>Shipment ID</TableHead>
                <TableHead>Bilty #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead>Collected Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>{assignment.labourPerson.name}</TableCell>
                  <TableCell>{assignment.shipment.register_number}</TableCell>
                  <TableCell>{assignment.shipment.bility_number}</TableCell>
                  <TableCell>{assignment.status}</TableCell>
                  <TableCell>{new Date(assignment.assigned_date).toLocaleDateString()}</TableCell>
                  <TableCell>{assignment.collected_amount ? Number(assignment.collected_amount).toFixed(2) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded bg-white'>
            <div><div className='text-gray-500'>Total Assignments</div><div className='font-semibold'>{totals.totalAssignments}</div></div>
            <div><div className='text-gray-500'>Total Collected</div><div className='font-semibold'>{totals.totalCollected.toFixed(2)}</div></div>
          </div>
        </div>
      )}

      {!loading && assignments.length === 0 && (
        <div className='p-4 text-gray-600'>No labour assignments found for the selected criteria.</div>
      )}
    </div>
  );
}
