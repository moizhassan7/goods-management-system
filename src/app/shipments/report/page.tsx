"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; 
import { FileText, Printer, Filter, Loader2, ArrowRight, Package, DollarSign, BarChart3 } from 'lucide-react';

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
  payment_status?: string | null;
};

const formatCurrency = (amount: number) => {
    return `Rs. ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      const totalQuantity = shipment.goodsDetails ? shipment.goodsDetails.reduce((sum, gd) => sum + gd.quantity, 0) : 0;
      const chargeAmount = (shipment.payment_status === 'PENDING' || !shipment.payment_status) 
        ? Number(shipment.total_charges || 0) : 0;

      return {
        totalShipments: acc.totalShipments + 1,
        totalCharges: acc.totalCharges + chargeAmount,
        totalQuantity: acc.totalQuantity + totalQuantity,
      };
    }, { totalShipments: 0, totalCharges: 0, totalQuantity: 0 });
  }, [shipments]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              Bilty Consignments Audit Report
            </h2>
            <p className="text-xs text-slate-500">
              Filtered financial audit summaries, freight totals, and consignment quantities
            </p>
          </div>
        </div>

        {shipments.length > 0 && (
          <Button
            onClick={() => window.print()}
            variant="outline"
            size="sm"
            className="rounded-lg text-xs font-semibold gap-1.5 h-8 border-slate-200 dark:border-slate-700"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print Report Sheet
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 py-2.5 px-4">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            Report Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
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

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Departure City</Label>
              <Select value={departureCityId ? String(departureCityId) : 'all'} onValueChange={(v) => setDepartureCityId(v === 'all' ? 0 : parseInt(v))}>
                <SelectTrigger className="h-9 rounded-lg border-slate-200 dark:border-slate-700 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Destination City</Label>
              <Select value={toCityId ? String(toCityId) : 'all'} onValueChange={(v) => setToCityId(v === 'all' ? 0 : parseInt(v))}>
                <SelectTrigger className="h-9 rounded-lg border-slate-200 dark:border-slate-700 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Fleet Truck</Label>
              <Select value={vehicleId ? String(vehicleId) : 'all'} onValueChange={(v) => setVehicleId(v === 'all' ? 0 : parseInt(v))}>
                <SelectTrigger className="h-9 rounded-lg border-slate-200 dark:border-slate-700 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.vehicleNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={fetchReport} 
              disabled={loading}
              className="h-9 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-700 shadow-xs"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Run Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {!loading && shipments.length > 0 && (
        <div className="space-y-4">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Bilties</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">{totals.totalShipments}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Bara Karaya</span>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono tabular-nums">{formatCurrency(totals.totalCharges)}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Cargo Quantity</span>
              <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-0.5 font-mono tabular-nums">{totals.totalQuantity} Units</div>
            </div>
          </div>

          {/* Results Table */}
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Report Breakdown ({shipments.length} Records)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-4">Bilty #</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Sender Party</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Receiver Party</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Transit Route</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Vehicle</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right pr-4">Status / Freight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map((shipment) => (
                      <TableRow key={shipment.register_number} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                        <TableCell className="pl-4 font-bold text-slate-900 dark:text-white">
                          <span className="font-mono text-blue-700 dark:text-blue-400">{shipment.bility_number}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">#{shipment.register_number}</span>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{shipment.sender.name}</TableCell>
                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{shipment.receiver.name}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1">
                            <span>{shipment.departureCity.name}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-slate-900 dark:text-white">{shipment.toCity?.name || 'Local'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {shipment.vehicle.vehicleNumber}
                        </TableCell>
                        <TableCell className="text-right pr-4 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          {shipment.payment_status === 'ALREADY_PAID' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                              PAID
                            </span>
                          ) : shipment.payment_status === 'FREE' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800">
                              FREE
                            </span>
                          ) : (
                            formatCurrency(shipment.total_charges)
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && shipments.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
          <p className="text-xs">No report data compiled. Select parameters above and click &quot;Run Report&quot;.</p>
        </div>
      )}
    </div>
  );
}