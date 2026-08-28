'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
    Users, Plus, Search, Loader2, RefreshCw, 
    Phone, AlertCircle 
} from 'lucide-react';

interface Party {
    id: number;
    name: string;
    contactInfo?: string;
    opening_balance?: string | number;
    openingBalance?: string | number;
}

const formatCurrency = (amount: number | string | undefined) => {
    const num = Number(amount || 0);
    return `Rs. ${num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function ViewParties() {
    const router = useRouter();
    const [parties, setParties] = useState<Party[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fetchParties = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/parties');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data: Party[] = await response.json();
            setParties(data);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load parties directory.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchParties();
    }, []);

    const filteredParties = useMemo(() => {
        if (!searchTerm.trim()) return parties;
        const q = searchTerm.toLowerCase();
        return parties.filter(p => 
            p.name?.toLowerCase().includes(q) || 
            p.contactInfo?.toLowerCase().includes(q) ||
            String(p.id).includes(q)
        );
    }, [parties, searchTerm]);

    return (
        <div className="space-y-5 max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Parties Directory (Senders & Receivers)
                        </h2>
                        <p className="text-xs text-slate-500">
                            Manage client accounts, contact information, and initial ledger balances.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={fetchParties}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs font-semibold gap-1 h-8 border-slate-200 dark:border-slate-700"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => router.push('/parties/add')}
                        size="sm"
                        className="rounded-lg text-xs font-bold gap-1 bg-purple-600 hover:bg-purple-700 text-white h-8 shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add New Party
                    </Button>
                </div>
            </div>

            {/* Main Table Card with Search */}
            <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 py-3 px-4">
                    <div>
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Parties ({filteredParties.length})
                        </CardTitle>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Search by name or contact..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-8 rounded-lg border-slate-200 dark:border-slate-700 text-xs"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-600 mb-1" />
                            <p className="text-xs">Loading parties list...</p>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center text-red-500">
                            <AlertCircle className="w-6 h-6 mx-auto mb-1" />
                            <p className="text-xs font-semibold">{error}</p>
                        </div>
                    ) : filteredParties.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <p className="text-xs font-medium">No parties matching criteria</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-4 w-16">ID</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Party Name</TableHead>
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Contact Details</TableHead>
                                        {/* <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right pr-4">Opening Balance</TableHead> */}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredParties.map((party) => {
                                        const balance = Number(party.opening_balance ?? party.openingBalance ?? 0);

                                        return (
                                            <TableRow key={party.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors">
                                                <TableCell className="pl-4 font-mono font-bold text-slate-400">
                                                    #{party.id}
                                                </TableCell>
                                                <TableCell className="font-bold text-slate-900 dark:text-white">
                                                    {party.name}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-slate-300">
                                                    {party.contactInfo && party.contactInfo !== '00000000000' ? (
                                                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            <span>{party.contactInfo}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">Not provided</span>
                                                    )}
                                                </TableCell>
                                                {/* <TableCell className="text-right pr-4 font-mono font-bold tabular-nums">
                                                    <span className={balance < 0 ? 'text-rose-600' : balance > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>
                                                        {formatCurrency(balance)}
                                                    </span>
                                                </TableCell> */}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}