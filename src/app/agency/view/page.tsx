'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
    Building, Plus, Search, Loader2, RefreshCw, 
    Factory, AlertCircle 
} from 'lucide-react';

interface Agency {
    id: number;
    name: string;
}

export default function ViewAgencies() {
    const router = useRouter();
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fetchAgencies = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/agencies');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data: Agency[] = await response.json();
            setAgencies(data);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load forwarding agencies.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAgencies();
    }, []);

    const filteredAgencies = useMemo(() => {
        if (!searchTerm.trim()) return agencies;
        const q = searchTerm.toLowerCase();
        return agencies.filter(a => a.name.toLowerCase().includes(q) || String(a.id).includes(q));
    }, [agencies, searchTerm]);

    return (
        <div className="space-y-5 max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                      Forwarding Logistics Partner Agencies
                    </h2>
                    <p className="text-xs text-slate-500">
                      Partner freight forwarding agencies handling multi-hub transit distribution.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={fetchAgencies}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs font-semibold gap-1 h-8 border-slate-200 dark:border-slate-700"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => router.push('/agency/add')}
                        size="sm"
                        className="rounded-lg text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white h-8 shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add New Agency
                    </Button>
                </div>
            </div>

            {/* Main Table Card */}
            <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 py-3 px-4">
                    <div>
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Partner Agencies Directory ({filteredAgencies.length})
                        </CardTitle>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Search by agency name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-8 rounded-lg border-slate-200 dark:border-slate-700 text-xs"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-1" />
                            <p className="text-xs">Loading agencies...</p>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center text-red-500">
                            <AlertCircle className="w-6 h-6 mx-auto mb-1" />
                            <p className="text-xs font-semibold">{error}</p>
                        </div>
                    ) : filteredAgencies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <p className="text-xs font-medium">No agencies registered</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-4 w-20">ID</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Agency Name</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right pr-4">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAgencies.map((agency) => (
                                        <TableRow key={agency.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors">
                                            <TableCell className="pl-4 font-mono font-bold text-slate-400">
                                                #{agency.id}
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-900 dark:text-white">
                                                {agency.name}
                                            </TableCell>
                                            <TableCell className="text-right pr-4">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Active Partner
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
