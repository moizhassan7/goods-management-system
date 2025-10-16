"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Item = {
  id: number;
  item_description: string;
  goodsDetails: {
    quantity: number;
    charges: number;
  }[];
};

export default function ItemsReportPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await fetch(`/api/items/report?${params.toString()}`);
      const data: Item[] = await res.json();
      setItems(data);
    } catch (e) {
      console.error('Failed to fetch report', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      const totalQuantity = item.goodsDetails.reduce((sum, gd) => sum + gd.quantity, 0);
      const totalCharges = item.goodsDetails.reduce((sum, gd) => sum + Number(gd.charges || 0), 0);
      return {
        totalItems: acc.totalItems + 1,
        totalQuantity: acc.totalQuantity + totalQuantity,
        totalCharges: acc.totalCharges + totalCharges,
      };
    }, { totalItems: 0, totalQuantity: 0, totalCharges: 0 });
  }, [items]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h2 className='text-3xl font-bold mb-6 text-gray-800 border-b pb-2'>Items Report</h2>

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

      {!loading && items.length > 0 && (
        <div className='space-y-6'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Description</TableHead>
                <TableHead>Total Quantity</TableHead>
                <TableHead>Total Charges</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const totalQuantity = item.goodsDetails.reduce((sum, gd) => sum + gd.quantity, 0);
                const totalCharges = item.goodsDetails.reduce((sum, gd) => sum + Number(gd.charges || 0), 0);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.item_description}</TableCell>
                    <TableCell>{totalQuantity}</TableCell>
                    <TableCell>{totalCharges.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded bg-white'>
            <div><div className='text-gray-500'>Total Items</div><div className='font-semibold'>{totals.totalItems}</div></div>
            <div><div className='text-gray-500'>Total Quantity</div><div className='font-semibold'>{totals.totalQuantity}</div></div>
            <div><div className='text-gray-500'>Total Charges</div><div className='font-semibold'>{totals.totalCharges.toFixed(2)}</div></div>
          </div>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className='p-4 text-gray-600'>No items found for the selected criteria.</div>
      )}
    </div>
  );
}
