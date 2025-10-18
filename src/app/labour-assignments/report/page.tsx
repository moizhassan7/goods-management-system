"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Updated interface to match the new API response fields
type LabourAssignmentReport = {
  id: number;
  assigned_date: string;
  status: string;
  labourPerson: { name: string };
  shipment: { register_number: string; bility_number: string };
  
  // NEW FINANCIAL FIELDS FROM API ROUTE:
  shipment_charges: number; // Shipment gross charge
  total_expenses: number; // Total expenses recorded on delivery
  discount_given: number; // Calculated/recorded discount
  total_receivable_pre_discount: number; // Shipment Charges + Expenses
  net_collected: number; // Final amount collected (assignment.collected_amount)
};

export default function LabourAssignmentsReportPage() {
  const [assignments, setAssignments] = useState<LabourAssignmentReport[]>([]);
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
      const data: LabourAssignmentReport[] = await res.json();
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
        totalShipmentCharges: acc.totalShipmentCharges + assignment.shipment_charges,
        totalExpenses: acc.totalExpenses + assignment.total_expenses,
        totalDiscount: acc.totalDiscount + assignment.discount_given,
        totalNetCollected: acc.totalNetCollected + assignment.net_collected,
      };
    }, { 
        totalAssignments: 0, 
        totalShipmentCharges: 0, 
        totalExpenses: 0, 
        totalDiscount: 0, 
        totalNetCollected: 0 
    });
  }, [assignments]);

  return (
    <div className='p-6 max-w-7xl mx-auto'>
      <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>Labour Assignments Report</h2>

      {/* Filter Card */}
      <Card className='shadow-lg mb-8'>
        <CardHeader>
            <CardTitle className='text-xl text-blue-800'>Report Filters</CardTitle>
            <CardDescription>Filter assignments by date and status.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                <div>
                    <div className='grid gap-2'>
                        <Label>Start Date (Assigned)</Label>
                        <Input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                </div>
                <div>
                    <div className='grid gap-2'>
                        <Label>End Date (Assigned)</Label>
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
        </CardContent>
      </Card>


      {!loading && assignments.length > 0 && (
        <div className='space-y-6'>
            {/* Results Table Card */}
            <Card className='shadow-lg'>
                <CardHeader>
                    <CardTitle className='text-xl text-gray-800'>Assignment Details ({assignments.length} Records)</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                    <div className='overflow-x-auto'>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Labour Person</TableHead>
                                    <TableHead>Bilty #</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Assigned Date</TableHead>
                                    
                                    {/* NEW FINANCIAL COLUMNS */}
                                    <TableHead className='text-right text-blue-700'>Shipment Charges</TableHead>
                                    <TableHead className='text-right text-red-700'>Expenses (Total)</TableHead>
                                    <TableHead className='text-right text-purple-700'>Shipment Charges + Expenses</TableHead>
                                    <TableHead className='text-right text-red-700'>Discount Given</TableHead>
                                    <TableHead className='text-right font-bold text-green-700'>Net Collected</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignments.map((assignment) => (
                                    <TableRow key={assignment.id}>
                                        <TableCell>{assignment.labourPerson.name}</TableCell>
                                        <TableCell>{assignment.shipment.bility_number}</TableCell>
                                        <TableCell>{assignment.status}</TableCell>
                                        <TableCell>{new Date(assignment.assigned_date).toLocaleDateString()}</TableCell>
                                        
                                        {/* NEW FINANCIAL COLUMNS DATA */}
                                        <TableCell className='text-right text-blue-700'>${assignment.shipment_charges.toFixed(2)}</TableCell>
                                        <TableCell className='text-right text-red-700'>${assignment.total_expenses.toFixed(2)}</TableCell>
                                        <TableCell className='text-right text-purple-700 font-bold'>${assignment.total_receivable_pre_discount.toFixed(2)}</TableCell>
                                        <TableCell className='text-right text-red-700'>${assignment.discount_given.toFixed(2)}</TableCell>
                                        <TableCell className='text-right font-bold text-green-700'>${assignment.net_collected.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Totals Card */}
            <Card className='bg-green-50/50 border-green-200 shadow-xl'>
                <CardHeader>
                    <CardTitle className='text-lg text-green-800'>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4'>
                        <div><div className='text-gray-500'>Total Assignments</div><div className='font-semibold'>{totals.totalAssignments}</div></div>
                        <div><div className='text-gray-500'>Total Charges</div><div className='font-semibold text-blue-800'>${totals.totalShipmentCharges.toFixed(2)}</div></div>
                        <div><div className='text-gray-500'>Total Expenses</div><div className='font-semibold text-red-700'>${totals.totalExpenses.toFixed(2)}</div></div>
                        <div><div className='text-gray-500'>Total Discount</div><div className='font-semibold text-red-700'>${totals.totalDiscount.toFixed(2)}</div></div>
                        {/* total charges and total expesne */}
                        <div>
<div className='text-gray-500'>Total Receivable (Pre-Discount)</div><div className='font-bold text-purple-700'>${(totals.totalShipmentCharges + totals.totalExpenses).toFixed(2)}</div>
                        </div>
                        <div><div className='text-gray-500'>Total Net Collected</div><div className='font-bold text-green-700'>${totals.totalNetCollected.toFixed(2)}</div></div>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}

      {!loading && assignments.length === 0 && (
        <div className='p-4 text-gray-600'>No labour assignments found for the selected criteria.</div>
      )}
    </div>
  );
}
