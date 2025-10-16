"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Party = {
  id: number;
  name: string;
  contactInfo: string;
  opening_balance: number;
  sentShipments: { id: string; total_charges: number }[];
  receivedShipments: { id: string; total_charges: number }[];
  transactions: {
    credit_amount: number;
    debit_amount: number;
  }[];
};

export default function PartiesReportPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await fetch(`/api/parties/report?${params.toString()}`);
      const data: Party[] = await res.json();
      setParties(data);
    } catch (e) {
      console.error('Failed to fetch report', e);
      setParties([]);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    return parties.reduce((acc, party) => {
      const sentCount = party.sentShipments.length;
      const receivedCount = party.receivedShipments.length;
      const totalCharges = party.sentShipments.reduce((sum, s) => sum + Number(s.total_charges || 0), 0) +
                          party.receivedShipments.reduce((sum, s) => sum + Number(s.total_charges || 0), 0);
      const totalCredits = party.transactions.reduce((sum, t) => sum + Number(t.credit_amount || 0), 0);
      const totalDebits = party.transactions.reduce((sum, t) => sum + Number(t.debit_amount || 0), 0);
      return {
        totalParties: acc.totalParties + 1,
        totalSent: acc.totalSent + sentCount,
        totalReceived: acc.totalReceived + receivedCount,
        totalCharges: acc.totalCharges + totalCharges,
        totalCredits: acc.totalCredits + totalCredits,
        totalDebits: acc.totalDebits + totalDebits,
      };
    }, { totalParties: 0, totalSent: 0, totalReceived: 0, totalCharges: 0, totalCredits: 0, totalDebits: 0 });
  }, [parties]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>Parties Report</h2>

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

      {!loading && parties.length > 0 && (
        <div className='space-y-6'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Party Name</TableHead>
                <TableHead>Sent Shipments</TableHead>
                <TableHead>Received Shipments</TableHead>
                <TableHead>Total Charges</TableHead>
                <TableHead>Opening Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parties.map((party) => {
                const sentCount = party.sentShipments.length;
                const receivedCount = party.receivedShipments.length;
                const totalCharges = party.sentShipments.reduce((sum, s) => sum + Number(s.total_charges || 0), 0) +
                                    party.receivedShipments.reduce((sum, s) => sum + Number(s.total_charges || 0), 0);
                return (
                  <TableRow key={party.id}>
                    <TableCell>{party.name}</TableCell>
                    <TableCell>{sentCount}</TableCell>
                    <TableCell>{receivedCount}</TableCell>
                    <TableCell>{totalCharges.toFixed(2)}</TableCell>
                    <TableCell>{Number(party.opening_balance).toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded bg-white'>
            <div><div className='text-gray-500'>Total Parties</div><div className='font-semibold'>{totals.totalParties}</div></div>
            <div><div className='text-gray-500'>Total Sent</div><div className='font-semibold'>{totals.totalSent}</div></div>
            <div><div className='text-gray-500'>Total Received</div><div className='font-semibold'>{totals.totalReceived}</div></div>
          </div>
        </div>
      )}

      {!loading && parties.length === 0 && (
        <div className='p-4 text-gray-600'>No parties found for the selected criteria.</div>
      )}
    </div>
  );
}
