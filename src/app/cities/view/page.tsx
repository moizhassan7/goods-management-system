'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
    MapPin, Plus, Search, Loader2, RefreshCw, 
    Navigation, AlertCircle 
} from 'lucide-react';

interface City {
  id: number; 
  name: string;
}

export default function ViewCities() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchCities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cities'); 
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: City[] = await response.json();
      setCities(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load cities.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []); 

  const filteredCities = useMemo(() => {
    if (!searchTerm.trim()) return cities;
    const q = searchTerm.toLowerCase();
    return cities.filter(c => c.name.toLowerCase().includes(q) || String(c.id).includes(q));
  }, [cities, searchTerm]);

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              Transit & Destination Hub Cities
            </h2>
            <p className="text-xs text-slate-500">
              Manage supported departure points and terminal destination cities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchCities}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="rounded-lg text-xs font-semibold gap-1 h-8 border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => router.push('/cities/add')}
            size="sm"
            className="rounded-lg text-xs font-bold gap-1 bg-blue-600 hover:bg-blue-700 text-white h-8 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New City
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 py-3 px-4">
          <div>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Hub Cities Directory ({filteredCities.length})
            </CardTitle>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by city name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 rounded-lg border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-1" />
              <p className="text-xs">Loading cities list...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">
              <AlertCircle className="w-6 h-6 mx-auto mb-1" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          ) : filteredCities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <p className="text-xs font-medium">No cities registered</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-4 w-20">ID</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">City / Station Name</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right pr-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCities.map((city) => (
                    <TableRow key={city.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors">
                      <TableCell className="pl-4 font-mono font-bold text-slate-400">
                        #{city.id}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white">
                        {city.name}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active Station
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