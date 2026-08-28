'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    DollarSign, Truck, Package, Users, Hourglass, CheckCircle2, ChevronRight,
    Loader2, Factory, Car, AlertCircle, ArrowUpRight, Plus, RefreshCw,
    TrendingUp, Shield, BarChart3, Clock, ArrowRight, CornerDownRight,
    RotateCcw, FileText
} from 'lucide-react';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface KeyMetrics {
    totalShipments: number;
    todayShipments?: number;
    totalChotaKaraya?: number;
    totalBaraKaraya?: number;
    pendingApprovals: number;
    totalParties: number;
    totalVehicles: number;
    totalReturns: number;
    pendingLabourSettlements: number;
    totalRevenue: number;
}

interface TopAgency {
    name: string;
    count: number;
}

interface RecentShipment {
    register_number: string;
    bility_number: string;
    total_charges: number;
    departureCity: { name: string };
    toCity?: { name: string };
}

interface VolumeData {
    date: string;
    volume: number;
}

interface DashboardData {
    keyMetrics: KeyMetrics;
    topAgencies: TopAgency[];
    recentShipments: RecentShipment[];
    volumeData: VolumeData[];
}

const initialMetrics: KeyMetrics = {
    totalShipments: 0,
    todayShipments: 0,
    totalChotaKaraya: 0,
    totalBaraKaraya: 0,
    pendingApprovals: 0,
    totalParties: 0,
    totalVehicles: 0,
    totalReturns: 0,
    pendingLabourSettlements: 0,
    totalRevenue: 0,
};

const formatCurrency = (amount: number) => {
    return `Rs. ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function DashboardPage() {
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchDashboardData = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const response = await fetch('/api/dashboard');
            if (!response.ok) throw new Error('Failed to fetch dashboard data.');
            const result: DashboardData = await response.json();
            setData(result);
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const metrics = data?.keyMetrics || initialMetrics;

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[60vh]">
                <Loader2 className="w-7 h-7 text-blue-600 animate-spin mb-2" />
                <p className="text-xs font-semibold text-slate-500 font-mono">
                    Loading logistics telemetry...
                </p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-8 max-w-md mx-auto text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Operational Data Unavailable</h3>
                <p className="text-xs text-slate-500 mb-4">
                    Unable to connect to the central dispatch database.
                </p>
                <Button onClick={() => fetchDashboardData()} size="sm" className="gap-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Sync
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-7xl mx-auto">
            {/* Top Operational Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Operations Overview
                        </h2>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            LIVE FEED
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Daily consignment volume, dispatch trends, fleet readiness, and receivable totals.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchDashboardData(true)}
                        disabled={isRefreshing}
                        className="text-xs font-semibold rounded-lg gap-1.5 h-8 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
                    </Button>
                    <Button
                        onClick={() => router.push('/shipments/add')}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg gap-1.5 h-8 shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Register Bilty
                    </Button>
                </div>
            </div>

            {/* Quick Actions Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                    { label: 'Register Bilty', href: '/shipments/add', icon: Package, count: 'New entry' },
                    { label: 'Bilty Directory', href: '/shipments/view', icon: Truck, count: `${metrics.totalShipments} records` },
                    { label: 'Parties Ledger', href: '/parties/view', icon: Users, count: `${metrics.totalParties} accounts` },
                    { label: 'Freight Carrier', href: '/vehicles/view', icon: Car, count: `${metrics.totalVehicles} units` },
                    // { label: 'Returns Log', href: '/returns', icon: RotateCcw, count: `${metrics.totalReturns} logs` },
                    // { label: 'Reports Audit', href: '/shipments/report', icon: FileText, count: 'Financial' },
                ].map((act, i) => (
                    <button
                        key={i}
                        onClick={() => router.push(act.href)}
                        className="flex items-center gap-3 p-3 text-left rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 hover:bg-blue-50/20 dark:hover:bg-slate-800/60 transition-colors shadow-2xs group cursor-pointer"
                    >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <act.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {act.label}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono truncate">
                                {act.count}
                            </p>
                        </div>
                    </button>
                ))}
            </div>

            {/* 1. KEY METRICS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Chota Karaya */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Chota Karaya</span>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        {formatCurrency(metrics.totalChotaKaraya ?? 0)}
                    </div>
                    {/* <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 inline-block">
                        • Delivery charges
                    </span> */}
                </div>
                {/* Bara Karaya */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Bara Karaya</span>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        {formatCurrency(metrics.totalBaraKaraya ?? metrics.totalRevenue)}
                    </div>
                    {/* <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 inline-block">
                        • Freight charges
                    </span> */}
                </div>
                {/* Total Shipments */}
                <div
                    onClick={() => router.push('/shipments/view')}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-blue-400 cursor-pointer transition-colors"
                >
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Total Bilties</span>
                        <Truck className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        {metrics.totalShipments.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-blue-600 font-semibold mt-0.5 inline-block">
                        View register →
                    </span>
                </div>
                {/* Today's Bilties */}
                <div
                    onClick={() => router.push('/shipments/add')}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-blue-400 cursor-pointer transition-colors"
                >
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Today's Bilties</span>
                        <Truck className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        {(metrics.todayShipments ?? 0).toLocaleString()}
                    </div>
                    <span className="text-[10px] text-blue-600 font-semibold mt-0.5 inline-block">
                        Add shipment →
                    </span>
                </div>

                {/* Total Parties
                <div
                    onClick={() => router.push('/parties/view')}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-purple-400 cursor-pointer transition-colors"
                >
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Parties</span>
                        <Users className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        {metrics.totalParties}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 inline-block">
                        Senders & Receivers
                    </span>
                </div>

                {/* Fleet Vehicles 
                <div
                    onClick={() => router.push('/vehicles/view')}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-teal-400 cursor-pointer transition-colors"
                >
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Fleet</span>
                        <Car className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        {metrics.totalVehicles}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 inline-block">
                        Active units
                    </span>
                </div> */}

                {/* Pending Approvals */}
                {/* <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Pending</span>
                        <Hourglass className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                        {metrics.pendingApprovals}
                    </div>
                    <span className="text-[10px] text-amber-600 mt-0.5 inline-block font-medium">
                        Deliveries pending
                    </span>
                </div>

               
                <div 
                    onClick={() => router.push('/returns')}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-rose-400 cursor-pointer transition-colors"
                >
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Returns</span>
                        <RotateCcw className="h-4 w-4 text-rose-600" />
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        {metrics.totalReturns}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 inline-block">
                        Logged returns
                    </span>
                </div> */}
            </div>

            {/* 2. GRAPHS AND TOP AGENCIES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* 7-Day Volume Chart (2/3 width) */}
                <Card className="lg:col-span-2 rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 py-3.5 px-5">
                        <div>
                            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                7-Day Bilty Registration Volume
                            </CardTitle>
                            <CardDescription className="text-[11px] text-slate-500">
                                Daily dispatch volume trends
                            </CardDescription>
                        </div>
                        <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            Volume telemetry
                        </span>
                    </CardHeader>
                    <CardContent className="pt-4 px-5 pb-2">
                        {data.volumeData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[240px] text-slate-400">
                                <Package className="w-6 h-6 mb-1 opacity-40" />
                                <p className="text-xs font-medium">No shipment data recorded for the past 7 days</p>
                            </div>
                        ) : (
                            <div className="h-[240px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.volumeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#94a3b8"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#94a3b8"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-lg text-xs border border-slate-800">
                                                            <p className="text-slate-400 font-mono text-[10px]">{label}</p>
                                                            <p className="text-sm font-bold text-white mt-0.5">
                                                                {payload[0].value} Bilties
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="volume"
                                            stroke="#2563eb"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#volumeGradient)"
                                            dot={{ fill: "#2563eb", r: 3 }}
                                            activeDot={{ fill: "#1d4ed8", r: 5 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Forwarding Agencies (1/3 width) */}
                <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 py-3.5 px-5">
                        <div>
                            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                Top Agencies
                            </CardTitle>
                            <CardDescription className="text-[11px] text-slate-500">
                                Ranked by total consignment count
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/agency/view')}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 h-7 px-2"
                        >
                            View all
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-3 px-5 pb-4 flex-1">
                        {data.topAgencies.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-6">
                                <Factory className="w-6 h-6 mb-1 opacity-40" />
                                <p className="text-xs font-medium">No agency records found</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {data.topAgencies.map((agency, index) => (
                                    <div
                                        key={agency.name}
                                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                                                {index + 1}
                                            </span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                {agency.name}
                                            </span>
                                        </div>
                                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0 ml-2">
                                            {agency.count} bilties
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 3. RECENT SHIPMENTS ACTIVITY FEED */}
            <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 py-3 px-5">
                    <div>
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Recent Bilty Activity Log
                        </CardTitle>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/shipments/view')}
                        className="rounded-lg text-xs font-semibold gap-1 h-7 border-slate-200 dark:border-slate-700"
                    >
                        <span>Full Log</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {data.recentShipments.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                            <p className="text-xs">No recent bilty records recorded</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-5">Bilty No.</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Route (From → To)</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right pr-5">Freight Charges</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.recentShipments.map((shipment) => (
                                        <TableRow key={shipment.register_number} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors">
                                            <TableCell className="pl-5 font-bold text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{shipment.bility_number}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">#{shipment.register_number}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-300">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-medium">{shipment.departureCity.name}</span>
                                                    <ArrowRight className="w-3 h-3 text-slate-400" />
                                                    <span className="font-bold text-slate-900 dark:text-white">{shipment.toCity?.name || 'Local Destination'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-5 font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                                                {formatCurrency(Number(shipment.total_charges))}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}