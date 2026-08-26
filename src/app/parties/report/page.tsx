"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Printer, Filter, Loader2, DollarSign, Package } from 'lucide-react';

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

const formatCurrency = (amount: number) => {
  return `Rs. ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    if (!Array.isArray(parties)) return { totalParties: 0, totalSent: 0, totalReceived: 0, totalCharges: 0, totalCredits: 0, totalDebits: 0 };
    return parties.reduce((acc, party) => {
      const sentCount = party.sentShipments?.length || 0;
      const receivedCount = party.receivedShipments?.length || 0;
      const totalCharges = (party.sentShipments?.reduce((sum, s) => sum + Number(s.total_charges || 0), 0) || 0) +
                          (party.receivedShipments?.reduce((sum, s) => sum + Number(s.total_charges || 0), 0) || 0);
      const totalCredits = party.transactions?.reduce((sum, t) => sum + Number(t.credit_amount || 0), 0) || 0;
      const totalDebits = party.transactions?.reduce((sum, t) => sum + Number(t.debit_amount || 0), 0) || 0;
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
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              Parties Financial Ledger & Consignment Report
            </h2>
            <p className="text-xs text-slate-500">
              Audit volume, debit/credit entries, and cumulative freight charges by party.
            </p>
          </div>
        </div>

        {parties.length > 0 && (
          <Button
            onClick={() => window.print()}
            variant="outline"
            size="sm"
            className="rounded-lg text-xs font-semibold gap-1.5 h-8 border-slate-200 dark:border-slate-700"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print Ledger Sheet
          </Button>
        )}
      </div>

      {/* Filter Parameters */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 py-2.5 px-4">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-purple-600" />
            Audit Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Date</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="h-9 rounded-lg border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">End Date</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="h-9 rounded-lg border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
            </div>
            <Button 
              onClick={fetchReport} 
              disabled={loading}
              className="h-9 rounded-lg font-bold text-xs bg-purple-600 hover:bg-purple-700 shadow-xs"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Compile Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {!loading && parties.length > 0 && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Accounts</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">{totals.totalParties}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sent / Received Shipments</span>
              <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-0.5 font-mono tabular-nums">
                {totals.totalSent} / {totals.totalReceived}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Bilty Charges</span>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono tabular-nums">
                {formatCurrency(totals.totalCharges)}
              </div>
            </div>
          </div>

          {/* Results Table */}
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Parties Detailed Records ({parties.length} Parties)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-4">Party Name</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Sent</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Received</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Total Charges</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right pr-4">Opening Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parties.map((party) => {
                      const sentCount = party.sentShipments?.length || 0;
                      const receivedCount = party.receivedShipments?.length || 0;
                      const totalCharges = (party.sentShipments?.reduce((sum, s) => sum + Number(s.total_charges || 0), 0) || 0) +
                                          (party.receivedShipments?.reduce((sum, s) => sum + Number(s.total_charges || 0), 0) || 0);
                      const balance = Number(party.opening_balance || 0);

                      return (
                        <TableRow key={party.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                          <TableCell className="pl-4 font-bold text-slate-900 dark:text-white">
                            {party.name}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-blue-700 dark:text-blue-400">
                            {sentCount}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-purple-700 dark:text-purple-400">
                            {receivedCount}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                            {formatCurrency(totalCharges)}
                          </TableCell>
                          <TableCell className="text-right pr-4 font-mono font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                            {formatCurrency(balance)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && parties.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
          <p className="text-xs">No party report compiled yet.</p>
        </div>
      )}
    </div>
  );
}
