'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
    Car, Plus, Search, Loader2, RefreshCw, 
    Truck, AlertCircle 
} from 'lucide-react';

interface Vehicle {
    id: number;
    vehicleNumber: string;
    createdAt?: string;
}

export default function ViewVehicles() {
    const router = useRouter();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fetchVehicles = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/vehicles');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data: Vehicle[] = await response.json();
            setVehicles(data);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load fleet vehicles directory.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    const filteredVehicles = useMemo(() => {
        if (!searchTerm.trim()) return vehicles;
        const q = searchTerm.toLowerCase();
        return vehicles.filter(v => 
            v.vehicleNumber?.toLowerCase().includes(q) ||
            String(v.id).includes(q)
        );
    }, [vehicles, searchTerm]);

    return (
        <div className="space-y-5 max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                      Active Transport Fleet Vehicles
                    </h2>
                    <p className="text-xs text-slate-500">
                      Manage registered cargo trucks and license plates for consignment dispatch.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={fetchVehicles}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs font-semibold gap-1 h-8 border-slate-200 dark:border-slate-700"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => router.push('/vehicles/add')}
                        size="sm"
                        className="rounded-lg text-xs font-bold gap-1 bg-teal-600 hover:bg-teal-700 text-white h-8 shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add New Vehicle
                    </Button>
                </div>
            </div>

            {/* Main Table Card */}
            <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 py-3 px-4">
                    <div>
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Fleet Records ({filteredVehicles.length})
                        </CardTitle>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Search by license number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-8 rounded-lg border-slate-200 dark:border-slate-700 text-xs font-mono"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-teal-600 mb-1" />
                            <p className="text-xs">Loading fleet...</p>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center text-red-500">
                            <AlertCircle className="w-6 h-6 mx-auto mb-1" />
                            <p className="text-xs font-semibold">{error}</p>
                        </div>
                    ) : filteredVehicles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <p className="text-xs font-medium">No vehicles registered</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-4 w-20">ID</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">License Plate</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right pr-4">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredVehicles.map((vehicle) => (
                                        <TableRow key={vehicle.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors">
                                            <TableCell className="pl-4 font-mono font-bold text-slate-400">
                                                #{vehicle.id}
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-900 dark:text-white">
                                                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                    {vehicle.vehicleNumber}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right pr-4">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Active
                                                </span>
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
