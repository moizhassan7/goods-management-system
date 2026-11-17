"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithTimeout } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
    Package, Users, Hourglass,
    Loader2, Car, AlertCircle, ArrowUpRight, Plus, RefreshCw,
    RotateCcw, Search, X
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import BiltyDetailDialog from '@/components/shipments/BiltyDetailDialog';
import { toast } from 'sonner';

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
    total_delivery_charges?: number;
    bility_date?: string;
    departureCity: { name: string };
    toCity?: { name: string } | null;
    agency?: string;
}

interface VolumeData {
    date: string;
    volume: number;
    freight?: number;
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

const formatShortCurrency = (amount: number) => {
    const num = Number(amount || 0);
    if (num >= 1_000_000) {
        return `Rs. ${(num / 1_000_000).toFixed(2)}M`;
    }
    if (num >= 1_000) {
        return `Rs. ${(num / 1_000).toFixed(1)}k`;
    }
    return `Rs. ${num.toLocaleString('en-PK')}`;
};

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useAuth();

    // Time-based greeting with username
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        let timeGreeting = 'Good day';
        if (hour >= 5 && hour < 12) {
            timeGreeting = 'Good morning';
        } else if (hour >= 12 && hour < 17) {
            timeGreeting = 'Good afternoon';
        } else {
            timeGreeting = 'Good evening';
        }
        const username = user?.username ? (user.username.charAt(0).toUpperCase() + user.username.slice(1)) : '';
        return username ? `${timeGreeting}, ${username}` : timeGreeting;
    }, [user?.username]);
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSubTab, setActiveSubTab] = useState<'SUMMARY' | 'STATISTIC' | 'LEDGER' | 'FLEET'>('SUMMARY');
    const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

    const fetchDashboardData = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const response = await fetchWithTimeout('/api/dashboard');
            if (!response.ok) throw new Error('Failed to fetch dashboard data.');
            const result: DashboardData = await response.json();
            setData(result);
        } catch (error) {
            console.error("Dashboard fetch error:", error);
            toast.error('Sync Error', { description: 'Failed to retrieve latest operational telemetry.' });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const metrics = data?.keyMetrics || initialMetrics;

    const totalBara = Number(metrics.totalBaraKaraya ?? metrics.totalRevenue ?? 0);
    const totalChota = Number(metrics.totalChotaKaraya ?? 0);
    const stationExpenses = Math.max(0, totalBara - totalChota);

    // Total Karaya is Bara Karaya (since Bara Karaya already includes Chota Karaya + station expenses)
    const totalKaraya = totalBara > 0 ? totalBara : totalChota;
    const chotaPercentOfBara = totalKaraya > 0 ? Math.min(100, (totalChota / totalKaraya) * 100) : 0;
    const stationExpensePercent = totalKaraya > 0 ? Math.max(0, 100 - chotaPercentOfBara) : 0;

    // SVG Donut geometry: r=62, circumference ≈ 389.56
    const circumference = 389.56;
    const chotaDash = (chotaPercentOfBara / 100) * circumference;
    const expenseDash = (stationExpensePercent / 100) * circumference;

    // Filter recent shipments
    const filteredShipments = useMemo(() => {
        if (!data?.recentShipments) return [];
        const query = searchQuery.toLowerCase().trim();
        if (!query) return data.recentShipments;

        return data.recentShipments.filter(item =>
            item.bility_number?.toLowerCase().includes(query) ||
            item.register_number?.toLowerCase().includes(query) ||
            item.departureCity?.name?.toLowerCase().includes(query) ||
            item.toCity?.name?.toLowerCase().includes(query) ||
            item.agency?.toLowerCase().includes(query)
        );
    }, [data?.recentShipments, searchQuery]);

    const handleSubTabClick = (tab: 'SUMMARY' | 'STATISTIC' | 'LEDGER' | 'FLEET') => {
        setActiveSubTab(tab);
        if (tab === 'SUMMARY') {
            document.getElementById('section-summary')?.scrollIntoView({ behavior: 'smooth' });
        } else if (tab === 'STATISTIC') {
            document.getElementById('section-statistic')?.scrollIntoView({ behavior: 'smooth' });
        } else if (tab === 'LEDGER') {
            document.getElementById('section-log')?.scrollIntoView({ behavior: 'smooth' });
        } else if (tab === 'FLEET') {
            router.push('/vehicles/view');
        }
    };

    const handleAgencyFilter = (agencyName: string) => {
        setSearchQuery(agencyName);
        document.getElementById('section-log')?.scrollIntoView({ behavior: 'smooth' });
        toast.info(`Filtered log by "${agencyName}"`);
    };

    // Current formatted date string
    const todayFormatted = useMemo(() => {
        return new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-charcoal dark:text-lavender animate-spin mb-3" />
                <p className="text-xs font-semibold text-zinc-500 font-mono tracking-wider uppercase">
                    Loading Operations Dashboard...
                </p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-8 max-w-md mx-auto text-center bg-white dark:bg-zinc-900 rounded-2xl border border-hairline dark:border-zinc-800 shadow-sm">
                <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-charcoal dark:text-white mb-1">Operational Data Unavailable</h3>
                <p className="text-xs text-zinc-500 mb-4">
                    Unable to connect to the central dispatch database.
                </p>
                <Button onClick={() => fetchDashboardData()} size="sm" className="gap-1.5 text-xs font-semibold rounded-full bg-charcoal text-white hover:bg-zinc-800 dark:bg-lavender dark:text-charcoal">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Sync
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full space-y-7 pb-10">

            {/* TOP HEADER BAR: Title + Underline Tabs on Left, Bordered Search & Actions on Right */}
            <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-baseline gap-3">
                        
                        <h1 className="text-2xl sm:text-[32px] font-normal tracking-tight text-charcoal dark:text-white leading-none">
                            {greeting}
                        </h1>
                        
                        <span className="text-[11px] font-medium tracking-[0.05em] uppercase text-zinc-400 font-mono">
                            {todayFormatted}
                        </span>
                    </div>

                    {/* Minimalist Underline Sub-Navigation Tabs */}
                    <div className="flex items-center gap-6 mt-4 border-b border-hairline dark:border-zinc-800 pb-1">
                        <button
                            type="button"
                            onClick={() => handleSubTabClick('SUMMARY')}
                            className={`pb-1.5 text-[10px] font-bold tracking-[0.08em] uppercase transition-colors ${
                                activeSubTab === 'SUMMARY'
                                    ? 'text-charcoal dark:text-white border-b-2 border-charcoal dark:border-lavender'
                                    : 'text-zinc-400 hover:text-charcoal dark:hover:text-zinc-200 border-b-2 border-transparent'
                            }`}
                        >
                            SUMMARY
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSubTabClick('STATISTIC')}
                            className={`pb-1.5 text-[10px] font-bold tracking-[0.08em] uppercase transition-colors ${
                                activeSubTab === 'STATISTIC'
                                    ? 'text-charcoal dark:text-white border-b-2 border-charcoal dark:border-lavender'
                                    : 'text-zinc-400 hover:text-charcoal dark:hover:text-zinc-200 border-b-2 border-transparent'
                            }`}
                        >
                            STATISTIC
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSubTabClick('LEDGER')}
                            className={`pb-1.5 text-[10px] font-bold tracking-[0.08em] uppercase transition-colors ${
                                activeSubTab === 'LEDGER'
                                    ? 'text-charcoal dark:text-white border-b-2 border-charcoal dark:border-lavender'
                                    : 'text-zinc-400 hover:text-charcoal dark:hover:text-zinc-200 border-b-2 border-transparent'
                            }`}
                        >
                            LEDGER
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSubTabClick('FLEET')}
                            className={`pb-1.5 text-[10px] font-bold tracking-[0.08em] uppercase transition-colors ${
                                activeSubTab === 'FLEET'
                                    ? 'text-charcoal dark:text-white border-b-2 border-charcoal dark:border-lavender'
                                    : 'text-zinc-400 hover:text-charcoal dark:hover:text-zinc-200 border-b-2 border-transparent'
                            }`}
                        >
                            FLEET
                        </button>
                    </div>
                </div>

                {/* Right Controls: Search Input + Sync + Register Bilty Pill Button */}
                <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-start">
                    <div className="relative flex-1 md:w-[260px]">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search bilty no, city, agency..."
                            className="w-full pl-3.5 pr-9 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-[#E2E2E6] dark:border-zinc-700 text-xs text-charcoal dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-charcoal dark:focus:border-lavender transition-colors"
                        />
                        <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => fetchDashboardData(true)}
                        disabled={isRefreshing}
                        className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-[#E2E2E6] dark:border-zinc-700 text-charcoal dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
                        title="Sync Live Telemetry"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push('/shipments/add')}
                        className="px-4 py-2 rounded-full bg-lavender hover:bg-lavenderhover active:scale-[0.98] text-charcoal text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Register Bilty</span>
                    </button>
                </div>
            </header>

            {/* TOP ROW GRID: Left 2x2 Metric Matrix (8 cols) + Right 'Top Agencies' Panel (4 cols) */}
            <section id="section-summary" className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-stretch">

                {/* LEFT 2x2 METRIC MATRIX (Clean flat cards with hairline separation) */}
                <div className="xl:col-span-8 flex flex-col space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 border border-hairline dark:border-zinc-800 bg-cardgray dark:bg-zinc-900/80 rounded-2xl overflow-hidden shadow-2xs">
                        
                        {/* 1. Top-Left Featured Dark Card (#202022) — BARA KARAYA */}
                        <div className="bg-charcoal text-white p-6 sm:p-7 flex flex-col justify-between min-h-[168px] border-b sm:border-r border-zinc-800">
                            <div>
                                <div className="text-[10px] font-semibold tracking-[0.07em] uppercase text-zinc-300">
                                    BARA KARAYA
                                </div>
                                <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
                                    <span className="text-lavender text-[9px]">▲</span>
                                    <span>Total Consolidated Freight</span>
                                </div>
                            </div>

                            <div className="mt-6 flex items-end justify-between gap-2">
                                <div className="text-2xl sm:text-[30px] font-light tracking-tight tabular-nums leading-none">
                                    {formatCurrency(totalBara)}
                                </div>
                                <button
                                    onClick={() => router.push('/shipments/report')}
                                    title="View Freight Audits"
                                    className="text-zinc-300 hover:text-lavender transition-colors p-1"
                                >
                                    <ArrowUpRight className="w-5 h-5 stroke-[1.5]" />
                                </button>
                            </div>
                        </div>

                        {/* 2. Top-Right Soft Gray Card (#F6F6F8) — CHOTA KARAYA */}
                        <div className="bg-cardgray dark:bg-zinc-900/70 p-6 sm:p-7 flex flex-col justify-between min-h-[168px] border-b border-hairline dark:border-zinc-800">
                            <div>
                                <div className="text-[10px] font-semibold tracking-[0.07em] uppercase text-charcoal dark:text-zinc-300">
                                    CHOTA KARAYA
                                </div>
                                <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                    <span className="text-emerald-600 dark:text-emerald-400 text-[9px]">▲</span>
                                    <span>{chotaPercentOfBara.toFixed(0)}% Base Consignment Fare</span>
                                </div>
                            </div>

                            <div className="mt-6 flex items-end justify-between gap-2">
                                <div className="text-2xl sm:text-[30px] font-light tracking-tight text-charcoal dark:text-white tabular-nums leading-none">
                                    {formatCurrency(totalChota)}
                                </div>
                                <button
                                    onClick={() => router.push('/shipments/report')}
                                    title="View Delivery Charges"
                                    className="text-charcoal dark:text-zinc-300 hover:opacity-70 transition-opacity p-1"
                                >
                                    <ArrowUpRight className="w-5 h-5 stroke-[1.5]" />
                                </button>
                            </div>
                        </div>

                        {/* 3. Bottom-Left Soft Gray Card (#F6F6F8) — TOTAL BILTIES */}
                        <div className="bg-cardgray dark:bg-zinc-900/70 p-6 sm:p-7 flex flex-col justify-between min-h-[168px] border-b sm:border-b-0 sm:border-r border-hairline dark:border-zinc-800">
                            <div>
                                <div className="text-[10px] font-semibold tracking-[0.07em] uppercase text-charcoal dark:text-zinc-300">
                                    TOTAL BILTIES
                                </div>
                                <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-charcoal dark:bg-lavender"></span>
                                    <span>{metrics.totalShipments.toLocaleString()} records logged</span>
                                </div>
                            </div>

                            <div className="mt-6 flex items-end justify-between gap-2">
                                <div className="text-3xl sm:text-[34px] font-light tracking-tight text-charcoal dark:text-white tabular-nums leading-none">
                                    {metrics.totalShipments.toLocaleString()}
                                </div>
                                <button
                                    onClick={() => router.push('/shipments/view')}
                                    title="View Bilty Directory"
                                    className="text-charcoal dark:text-zinc-300 hover:opacity-70 transition-opacity p-1"
                                >
                                    <ArrowUpRight className="w-5 h-5 stroke-[1.5]" />
                                </button>
                            </div>
                        </div>

                        {/* 4. Bottom-Right Soft Gray Card (#F6F6F8) — TODAY'S BILTIES */}
                        <div
                            onClick={() => router.push('/shipments/add')}
                            className="bg-cardgray dark:bg-zinc-900/70 hover:bg-[#EFEFF3] dark:hover:bg-zinc-800/80 cursor-pointer p-6 sm:p-7 flex flex-col justify-between min-h-[168px] transition-colors group"
                        >
                            <div>
                                <div className="text-[10px] font-semibold tracking-[0.07em] uppercase text-charcoal dark:text-zinc-300">
                                    TODAY&apos;S BILTIES
                                </div>
                                <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-lavender"></span>
                                    <span>Today • Click to register</span>
                                </div>
                            </div>

                            <div className="mt-6 flex items-end justify-between gap-2">
                                <div className="text-3xl sm:text-[34px] font-light tracking-tight text-charcoal dark:text-white tabular-nums leading-none">
                                    {(metrics.todayShipments ?? 0).toLocaleString()}
                                </div>
                                <span className="text-charcoal dark:text-zinc-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform p-1">
                                    <ArrowUpRight className="w-5 h-5 stroke-[1.5]" />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Operational Secondary Metrics Strip (Preserving all logistics indicators) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div
                            onClick={() => router.push('/parties/view')}
                            className="p-3 rounded-xl bg-cardgray dark:bg-zinc-900/60 border border-hairline dark:border-zinc-800 flex items-center justify-between cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                        >
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Parties</div>
                                <div className="text-sm font-bold text-charcoal dark:text-white tabular-nums mt-0.5">{metrics.totalParties}</div>
                            </div>
                            <Users className="w-4 h-4 text-zinc-400" />
                        </div>

                        <div
                            onClick={() => router.push('/vehicles/view')}
                            className="p-3 rounded-xl bg-cardgray dark:bg-zinc-900/60 border border-hairline dark:border-zinc-800 flex items-center justify-between cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                        >
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Fleet Units</div>
                                <div className="text-sm font-bold text-charcoal dark:text-white tabular-nums mt-0.5">{metrics.totalVehicles}</div>
                            </div>
                            <Car className="w-4 h-4 text-zinc-400" />
                        </div>

                        <div
                            onClick={() => router.push('/deliveries/admin-approved-pending')}
                            className="p-3 rounded-xl bg-cardgray dark:bg-zinc-900/60 border border-hairline dark:border-zinc-800 flex items-center justify-between cursor-pointer hover:border-amber-400/60 transition-colors"
                        >
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Deliveries</div>
                                <div className="text-sm font-bold text-amber-700 dark:text-amber-300 tabular-nums mt-0.5">{metrics.pendingApprovals}</div>
                            </div>
                            <Hourglass className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>

                        <div
                            onClick={() => router.push('/returns')}
                            className="p-3 rounded-xl bg-cardgray dark:bg-zinc-900/60 border border-hairline dark:border-zinc-800 flex items-center justify-between cursor-pointer hover:border-rose-400/60 transition-colors"
                        >
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Returns</div>
                                <div className="text-sm font-bold text-charcoal dark:text-white tabular-nums mt-0.5">{metrics.totalReturns}</div>
                            </div>
                            <RotateCcw className="w-4 h-4 text-zinc-400" />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: 'Top Agencies' Panel */}
                <div className="xl:col-span-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[17px] font-normal text-charcoal dark:text-white">
                            Top Agencies
                        </h2>
                        <Link
                            href="/agency/view"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold tracking-wider text-zinc-400 hover:text-charcoal dark:hover:text-white uppercase transition-colors"
                        >
                            View All →
                        </Link>
                    </div>

                    <div className="flex-1 bg-cardgray dark:bg-zinc-900/70 border border-hairline dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
                        <div className="space-y-3.5">
                            {data.topAgencies.length === 0 ? (
                                <div className="py-8 text-center text-xs text-zinc-400">
                                    No agency dispatches recorded yet.
                                </div>
                            ) : (
                                data.topAgencies.map((agency, index) => {
                                    // Generate initials
                                    const words = agency.name.split(' ');
                                    const initials = words.length > 1
                                        ? `${words[0][0]}${words[1][0]}`.toUpperCase()
                                        : agency.name.substring(0, 2).toUpperCase();

                                    const isTop = index === 0;
                                    const isSecond = index === 1;

                                    return (
                                        <div
                                            key={agency.name}
                                            onClick={() => handleAgencyFilter(agency.name)}
                                            className="flex items-center gap-3 group cursor-pointer p-1 rounded-xl hover:bg-white dark:hover:bg-zinc-800/60 transition-colors"
                                        >
                                            <div className={`w-9 h-9 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 ${
                                                isTop
                                                    ? 'bg-charcoal text-white dark:bg-white dark:text-charcoal'
                                                    : isSecond
                                                    ? 'bg-lavender text-charcoal font-bold'
                                                    : 'bg-white dark:bg-zinc-800 border border-hairline dark:border-zinc-700 text-charcoal dark:text-zinc-200'
                                            }`}>
                                                {initials}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[13px] font-medium text-charcoal dark:text-zinc-100 truncate group-hover:underline">
                                                    {agency.name}
                                                </div>
                                                <div className="text-[9px] font-semibold tracking-[0.06em] uppercase text-zinc-400 mt-0.5">
                                                    {agency.count} BILTIES • RANK #{index + 1}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Full-width Rounded Pill CTA Button in Soft Lavender (#D9CDFF) */}
                        <button
                            type="button"
                            onClick={() => router.push('/shipments/add')}
                            className="mt-5 w-full py-2.5 px-4 rounded-full bg-lavender hover:bg-lavenderhover active:scale-[0.99] text-charcoal text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                            <span>+ Register Bilty</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* MIDDLE ROW GRID: Left 'Bilty Volume' Chart (8 cols) + Right 'Total Karaya' Donut Card (4 cols) */}
            <section id="section-statistic" className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-stretch">

                {/* LEFT: 'Bilty Volume' Area/Line Chart */}
                <div className="xl:col-span-8 flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h2 className="text-[17px] font-normal text-charcoal dark:text-white">
                            Bilty Volume
                        </h2>

                        {/* Legend Dots */}
                        <div className="flex items-center gap-5 text-[9px] font-semibold tracking-[0.07em] uppercase text-charcoal dark:text-zinc-300">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-charcoal dark:bg-white"></span>
                                DAILY DISPATCH
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-lavender"></span>
                                FREIGHT TREND
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 bg-cardgray dark:bg-zinc-900/70 border border-hairline dark:border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative shadow-2xs">
                        {data.volumeData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[230px] text-zinc-400">
                                <Package className="w-6 h-6 mb-1 opacity-40" />
                                <p className="text-xs font-medium">No shipment records logged in the past 7 days</p>
                            </div>
                        ) : (
                            <div className="w-full h-[230px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.volumeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="lavenderWaveGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#D9CDFF" stopOpacity={0.85} />
                                                <stop offset="100%" stopColor="#D9CDFF" stopOpacity={0.06} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#a1a1aa"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#a1a1aa"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    const biltiesVal = payload[0].value;
                                                    const freightVal = (payload[0].payload as VolumeData)?.freight;
                                                    return (
                                                        <div className="bg-charcoal text-white p-3 rounded-xl shadow-xl text-xs border border-zinc-700">
                                                            <p className="text-zinc-400 font-mono text-[10px] uppercase">{label}</p>
                                                            <p className="text-sm font-bold text-lavender mt-0.5">
                                                                {biltiesVal} Bilties Dispatched
                                                            </p>
                                                            {freightVal ? (
                                                                <p className="text-[11px] text-zinc-300 font-mono mt-0.5">
                                                                    {formatCurrency(freightVal)}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="volume"
                                            stroke="#202022"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#lavenderWaveGrad)"
                                            dot={{ fill: "#202022", r: 3.5 }}
                                            activeDot={{ fill: "#D9CDFF", stroke: "#202022", strokeWidth: 2, r: 6 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: 'Total Karaya' Donut Card */}
                <div className="xl:col-span-4 flex flex-col">
                    <h2 className="text-[17px] font-normal text-charcoal dark:text-white mb-3">
                        Total Karaya
                    </h2>

                    <div className="flex-1 bg-cardgray dark:bg-zinc-900/70 border border-hairline dark:border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative shadow-2xs">
                        {/* Top-right circular '+' quick-add button */}
                        <button
                            type="button"
                            onClick={() => router.push('/shipments/add')}
                            title="Add Freight Bilty"
                            className="self-end w-7 h-7 rounded-full border border-charcoal dark:border-zinc-400 text-charcoal dark:text-zinc-200 hover:bg-charcoal hover:text-white dark:hover:bg-lavender dark:hover:text-charcoal flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5 stroke-[2]" />
                        </button>

                        {/* Thick Minimalist Segmented SVG Donut Ring */}
                        <div className="relative w-[164px] h-[164px] mx-auto my-2 flex items-center justify-center">
                            <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                                {/* Subtle Light Track */}
                                <circle cx="80" cy="80" r="62" fill="none" className="stroke-[#E3E3E7] dark:stroke-zinc-800" strokeWidth="14" />
                                {/* Soft Lavender Segment (Chota Karaya - Base Freight) */}
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="62"
                                    fill="none"
                                    stroke="#D9CDFF"
                                    strokeWidth="14"
                                    strokeDasharray={`${chotaDash} ${circumference}`}
                                    strokeDashoffset="0"
                                    className="donut-segment"
                                />
                                {/* Dark Charcoal Segment (Station Expenses & Charges) */}
                                {stationExpensePercent > 0 && (
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="62"
                                        fill="none"
                                        className="stroke-charcoal dark:stroke-white donut-segment"
                                        strokeWidth="14"
                                        strokeDasharray={`${expenseDash} ${circumference}`}
                                        strokeDashoffset={`-${chotaDash}`}
                                    />
                                )}
                            </svg>

                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                <span className="text-[22px] font-normal tracking-tight text-charcoal dark:text-white tabular-nums leading-none">
                                    {formatShortCurrency(totalKaraya)}
                                </span>
                                <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 mt-1.5">
                                    Total Freight
                                </span>
                            </div>
                        </div>

                        {/* Bottom Breakdown with Ring Dots */}
                        <div className="grid grid-cols-2 gap-3 pt-3 mt-1 border-t border-hairline dark:border-zinc-800">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full border-[2.5px] border-charcoal dark:border-white shrink-0"></span>
                                    <span className="text-xs font-semibold text-charcoal dark:text-zinc-100 tabular-nums truncate">
                                        {formatCurrency(totalBara)}
                                    </span>
                                </div>
                                <div className="pl-4 text-[9px] font-semibold tracking-[0.06em] uppercase text-zinc-400 mt-0.5">
                                    BARA KARAYA (TOTAL)
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full border-[2.5px] border-lavender shrink-0"></span>
                                    <span className="text-xs font-semibold text-charcoal dark:text-zinc-100 tabular-nums truncate">
                                        {formatCurrency(totalChota)}
                                    </span>
                                </div>
                                <div className="pl-4 text-[9px] font-semibold tracking-[0.06em] uppercase text-zinc-400 mt-0.5">
                                    CHOTA KARAYA ({chotaPercentOfBara.toFixed(0)}% BASE)
                                </div>
                            </div>
                        </div>

                        {stationExpenses > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-hairline/60 dark:border-zinc-800/60 text-center text-[10px] text-zinc-500 dark:text-zinc-400">
                                Station Expenses & Labour: <span className="font-semibold text-charcoal dark:text-zinc-200">{formatCurrency(stationExpenses)}</span> ({stationExpensePercent.toFixed(0)}%)
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* BOTTOM SECTION: 'Recent Bilty Activity Log' Minimalist Table */}
            <section id="section-log" className="pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[17px] font-normal text-charcoal dark:text-white">
                            Recent Bilty Activity Log
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-cardgray dark:bg-zinc-800 border border-hairline dark:border-zinc-700 text-[10px] font-semibold tracking-[0.05em] uppercase text-zinc-500 dark:text-zinc-400">
                            {metrics.totalParties} Parties • {metrics.totalVehicles} Carriers
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
                            >
                                Clear filter
                            </button>
                        )}
                        <button
                            onClick={() => router.push('/shipments/view')}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.05em] uppercase text-charcoal dark:text-lavender hover:opacity-75 transition-opacity"
                        >
                            <span>Full Log</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="bg-cardgray dark:bg-zinc-900/70 border border-hairline dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-hairline dark:border-zinc-800 text-[10px] font-semibold tracking-[0.07em] uppercase text-zinc-400 bg-white/50 dark:bg-zinc-900/50">
                                    <th className="py-3.5 px-5">Bilty No. / Reference</th>
                                    <th className="py-3.5 px-4">Route (From &rarr; To)</th>
                                    <th className="py-3.5 px-4">Agency</th>
                                    <th className="py-3.5 px-4">Category</th>
                                    <th className="py-3.5 px-5 text-right">Freight Charges</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-hairline dark:divide-zinc-800 text-[13px]">
                                {filteredShipments.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-xs text-zinc-400">
                                            No bilty records match your search query.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredShipments.map((shipment) => {
                                        const chota = Number(shipment.total_delivery_charges || 0);
                                        const bara = Number(shipment.total_charges || 0);
                                        const categoryLabel = chota > 0 && bara > 0
                                            ? 'Both'
                                            : chota > 0
                                            ? 'Chota Karaya'
                                            : 'Bara Karaya';

                                        return (
                                            <tr
                                                key={shipment.register_number}
                                                onClick={() => setSelectedShipmentId(shipment.register_number)}
                                                className="hover:bg-white dark:hover:bg-zinc-800/60 transition-colors cursor-pointer group"
                                            >
                                                <td className="py-3.5 px-5 whitespace-nowrap tabular-nums">
                                                    <span className="font-semibold text-charcoal dark:text-white group-hover:text-blue-600 dark:group-hover:text-lavender transition-colors">
                                                        {shipment.bility_number}
                                                    </span>
                                                    <span className="text-xs text-zinc-400 ml-1.5 font-mono">
                                                        #{shipment.register_number}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap text-charcoal dark:text-zinc-200">
                                                    <span>{shipment.departureCity?.name || 'Local'}</span>
                                                    <span className="text-zinc-400 mx-1.5">&rarr;</span>
                                                    <span className="font-medium">{shipment.toCity?.name || 'Destination'}</span>
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-hairline dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                                                        {shipment.agency || 'Zikria Goods'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className={`text-[10px] font-semibold tracking-[0.05em] uppercase ${
                                                        categoryLabel === 'Bara Karaya'
                                                            ? 'text-charcoal dark:text-lavender'
                                                            : 'text-zinc-400'
                                                    }`}>
                                                        {categoryLabel}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5 whitespace-nowrap text-right font-medium text-charcoal dark:text-white tabular-nums">
                                                    {formatCurrency(bara > 0 ? bara : chota)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Bilty Details Dialog on Row Click */}
            <BiltyDetailDialog
                shipmentId={selectedShipmentId}
                open={Boolean(selectedShipmentId)}
                onOpenChange={(open) => {
                    if (!open) setSelectedShipmentId(null);
                }}
            />
        </div>
    );
}
