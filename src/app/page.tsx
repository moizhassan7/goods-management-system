// moizhassan7/goods-management-system/goods-management-system-c8ccf18c4f6ffb7e0457c336e1ed1f56cf93b02b/src/app/page.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Truck, Package, Users, Hourglass, CheckCircle2, ChevronRight, Loader2, Factory, Car} from 'lucide-react';

// Recharts components (already in package.json)
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// Custom Chart components from your repo
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// --- Data Interfaces ---
interface KeyMetrics {
    totalShipments: number;
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
    pendingApprovals: 0,
    totalParties: 0,
    totalVehicles: 0,
    totalReturns: 0,
    pendingLabourSettlements: 0,
    totalRevenue: 0,
};

const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function DashboardPage() {
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/dashboard');
            if (!response.ok) throw new Error('Failed to fetch dashboard data.');
            const result: DashboardData = await response.json();
            setData(result);
        } catch (error) {
            console.error("Dashboard fetch error:", error);
            // Optionally set a notification here
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const metrics = data?.keyMetrics || initialMetrics;

    const chartConfig = {
      volume: {
        label: "Shipment Volume",
        color: "hsl(var(--chart-1))",
      },
      date: {
        label: "Date",
      }
    };


    if (isLoading) {
        return (
           <div className='flex justify-center items-center min-h-screen'>
    <div className='text-4xl font-extrabold text-blue-600 flex space-x-1'>
      {/* We apply the bounce animation to each letter, 
        but use arbitrary values for 'animation-delay' to stagger them.
      */}
      <span className="animate-bounce [animation-delay:-0.3s]">Z</span>
      <span className="animate-bounce [animation-delay:-0.15s]">.</span>
      <span className="animate-bounce">G</span>
    </div>
</div>
        );
    }
    
    // Fallback in case API fails
    if (!data) {
        return (
            <div className='p-8 min-h-screen'>
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                <p className="text-center text-red-600 mt-4">Could not load dashboard data. Please check the backend API endpoint.</p>
            </div>
        );
    }

    return (
        <div className='p-8'>
            <h1 className="text-4xl font-extrabold mb-8 text-gray-900">Logistics Overview</h1>

            {/* 1. KEY METRICS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-10">
                
                {/* Total Revenue */}
                <Card className='bg-green-50 border-green-200 shadow-lg transition-transform hover:scale-[1.02] cursor-pointer'>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-800">{formatCurrency(metrics.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">+20% from last month</p>
                    </CardContent>
                </Card>

                {/* Total Shipments */}
                <Card className='shadow-md transition-transform hover:scale-[1.02] cursor-pointer' onClick={() => router.push('/shipments/report')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
                        <Truck className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalShipments}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total count on record</p>
                    </CardContent>
                </Card>

                {/* Pending Deliveries Approval */}
                <Card className='bg-yellow-50 border-yellow-200 shadow-lg transition-transform hover:scale-[1.02] cursor-pointer' onClick={() => router.push('/deliveries/approval')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-700">Pending Approvals</CardTitle>
                        <Hourglass className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-800">{metrics.pendingApprovals}</div>
                        <p className="text-xs text-muted-foreground mt-1">Action Required</p>
                    </CardContent>
                </Card>

                {/* Pending Labour Settlements */}
                <Card className='bg-orange-50 border-orange-200 shadow-lg transition-transform hover:scale-[1.02] cursor-pointer' onClick={() => router.push('/labour-settlements')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-orange-700">Pending Settlements</CardTitle>
                        <DollarSign className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-800">{metrics.pendingLabourSettlements}</div>
                        <p className="text-xs text-muted-foreground mt-1">Collections to be settled</p>
                    </CardContent>
                </Card>

                {/* Total Parties */}
                <Card className='shadow-md transition-transform hover:scale-[1.02] cursor-pointer' onClick={() => router.push('/parties/view')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Parties</CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalParties}</div>
                        <p className="text-xs text-muted-foreground mt-1">Senders & Receivers</p>
                    </CardContent>
                </Card>
                
                {/* Total Vehicles */}
                <Card className='shadow-md transition-transform hover:scale-[1.02] cursor-pointer' onClick={() => router.push('/vehicles/view')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
                        <Car className="h-4 w-4 text-teal-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalVehicles}</div>
                        <p className="text-xs text-muted-foreground mt-1">Available fleet</p>
                    </CardContent>
                </Card>

            </div>

            {/* 2. GRAPHS AND TABLES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Shipment Volume Chart (2/3 width) */}
                <Card className="lg:col-span-2 shadow-xl">
                    <CardHeader>
                        <CardTitle>Shipment Volume Trend (Last 7 Days)</CardTitle>
                        <CardDescription>Daily count of new shipments registered.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="min-h-[300px]">
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={data.volumeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                                    <Tooltip content={({ active, payload }) => <ChartTooltipContent indicator="dot" active={active} payload={payload} nameKey="date" labelKey="volume" />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="volume" 
                                        stroke="hsl(var(--chart-1))" 
                                        fill="hsl(var(--chart-1) / 0.1)" 
                                        strokeWidth={2}
                                        dot={{ fill: "hsl(var(--chart-1))", r: 4 }}
                                        activeDot={{ fill: "hsl(var(--chart-1))", r: 6 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Top Agencies (1/3 width) */}
                <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle>Top Forwarding Agencies</CardTitle>
                        <CardDescription>Agencies ranked by total shipment count.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='w-[100px]'>Rank</TableHead>
                                    <TableHead>Agency Name</TableHead>
                                    <TableHead className='text-right'>Shipments</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.topAgencies.map((agency, index) => (
                                    <TableRow key={agency.name}>
                                        <TableCell className="font-extrabold text-lg text-blue-600">{index + 1}</TableCell>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <Factory className='w-4 h-4 text-gray-500'/>
                                            {agency.name}
                                        </TableCell>
                                        <TableCell className='text-right font-bold'>{agency.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

            </div>

            {/* 3. RECENT ACTIVITY TABLE */}
            <Card className="mt-6 shadow-xl">
                <CardHeader className='flex-row items-center justify-between'>
                    <CardTitle>Recent Shipments</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/shipments/view')}>
                        View All
                        <ChevronRight className='w-4 h-4 ml-1'/>
                    </Button>
                </CardHeader>
                <CardContent className='p-0'>
                    <div className='overflow-x-auto'>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Reg. No</TableHead>
                                    <TableHead>Bilty No.</TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead>To</TableHead>
                                    <TableHead className='text-right'>Charges</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.recentShipments.map((shipment) => (
                                    <TableRow key={shipment.register_number}>
                                        <TableCell className='font-mono text-sm'>{shipment.register_number}</TableCell>
                                        <TableCell>{shipment.bility_number}</TableCell>
                                        <TableCell>{shipment.departureCity.name}</TableCell>
                                        <TableCell>{shipment.toCity?.name || 'Local'}</TableCell>
                                        <TableCell className='text-right font-semibold text-green-700'>
                                            {formatCurrency(Number(shipment.total_charges))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


// ### Instructions for Use

// 1.  **Add API Route:** Ensure you save the code for the **Dashboard API Route** as `src/app/api/dashboard/route.ts`.
// 2.  **Replace Dashboard Page:** Replace the existing content of `src/app/page.tsx` with the **Dashboard Page Component** code provided above.
// 3.  **Run/Preview:** Navigate to your home page (`/`) to see the functional dashboard. You will need to have mock data in your database for the metrics and graphs to display meaningful information.