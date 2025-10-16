"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type LabourPerson = {
  id: number;
  name: string;
  contact_info: string;
  assignments: {
    collected_amount?: number;
  }[];
};

export default function LabourPersonsReportPage() {
  const [labourPersons, setLabourPersons] = useState<LabourPerson[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await fetch(`/api/labour-persons/report?${params.toString()}`);
      const data: LabourPerson[] = await res.json();
      setLabourPersons(data);
    } catch (e) {
      console.error('Failed to fetch report', e);
      setLabourPersons([]);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    return labourPersons.reduce((acc, person) => {
      const assignmentCount = person.assignments.length;
      const totalCollected = person.assignments.reduce((sum, a) => sum + Number(a.collected_amount || 0), 0);
      return {
        totalPersons: acc.totalPersons + 1,
        totalAssignments: acc.totalAssignments + assignmentCount,
        totalCollected: acc.totalCollected + totalCollected,
      };
    }, { totalPersons: 0, totalAssignments: 0, totalCollected: 0 });
  }, [labourPersons]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>Labour Persons Report</h2>

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

      {!loading && labourPersons.length > 0 && (
        <div className='space-y-6'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Assignments Count</TableHead>
                <TableHead>Total Collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labourPersons.map((person) => {
                const assignmentCount = person.assignments.length;
                const totalCollected = person.assignments.reduce((sum, a) => sum + Number(a.collected_amount || 0), 0);
                return (
                  <TableRow key={person.id}>
                    <TableCell>{person.name}</TableCell>
                    <TableCell>{person.contact_info}</TableCell>
                    <TableCell>{assignmentCount}</TableCell>
                    <TableCell>{totalCollected.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded bg-white'>
            <div><div className='text-gray-500'>Total Persons</div><div className='font-semibold'>{totals.totalPersons}</div></div>
            <div><div className='text-gray-500'>Total Assignments</div><div className='font-semibold'>{totals.totalAssignments}</div></div>
            <div><div className='text-gray-500'>Total Collected</div><div className='font-semibold'>{totals.totalCollected.toFixed(2)}</div></div>
          </div>
        </div>
      )}

      {!loading && labourPersons.length === 0 && (
        <div className='p-4 text-gray-600'>No labour persons found for the selected criteria.</div>
      )}
    </div>
  );
}
