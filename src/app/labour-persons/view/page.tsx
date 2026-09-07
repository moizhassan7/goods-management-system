"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast as sonnerToast } from 'sonner';
import { 
    Users, Plus, Search, Loader2, RefreshCw, 
    Phone, AlertCircle, MoreVertical, Pencil, Trash2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

export interface Toast {
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
}

export function useToast() {
    return {
        toast: {
            success: (toast: Omit<Toast, 'id'>) => {
                sonnerToast.success(toast.title, {
                    description: toast.description,
                });
            },
            error: (toast: Omit<Toast, 'id'>) => {
                sonnerToast.error(toast.title, {
                    description: toast.description,
                });
            },
            dismiss: (id: string) => {
                sonnerToast.dismiss(id);
            },
        },
        toasts: [],
    };
}

interface LabourPerson {
    id: number;
    name: string;
    contact_info: string;
    createdAt: string;
    assignments: Array<{
        id: number;
        status: string;
        collected_amount: number;
        shipment: {
            register_number: string;
            bility_number: string;
            total_charges: number;
            receiver: { name: string };
        };
    }>;
}

export default function ViewLabourPersons() {
    const router = useRouter();
    const { toast } = useToast();
    const [labourPersons, setLabourPersons] = useState<LabourPerson[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<LabourPerson | null>(null);
    const [editName, setEditName] = useState('');
    const [editContact, setEditContact] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingPerson, setDeletingPerson] = useState<LabourPerson | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchLabourPersons();
    }, []);

    const fetchLabourPersons = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/labour-persons');
            if (!response.ok) throw new Error('Failed to fetch labour persons');

            const data = await response.json();
            setLabourPersons(data);
        } catch (error: any) {
            toast.error({
                title: 'Error',
                description: 'Failed to load labour persons.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const filteredPersons = useMemo(() => {
        if (!searchTerm.trim()) return labourPersons;
        const q = searchTerm.toLowerCase();
        return labourPersons.filter(p => 
            p.name?.toLowerCase().includes(q) || 
            p.contact_info?.toLowerCase().includes(q) ||
            String(p.id).includes(q)
        );
    }, [labourPersons, searchTerm]);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            ASSIGNED: 'secondary',
            DELIVERED: 'default',
            COLLECTED: 'outline',
            SETTLED: 'default'
        };
        return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
    };

    const handleEditClick = (person: LabourPerson) => {
        setEditingPerson(person);
        setEditName(person.name);
        setEditContact(person.contact_info || '');
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPerson) return;
        if (!editName.trim()) {
            sonnerToast.error('Name cannot be empty');
            return;
        }
        if (!editContact.trim()) {
            sonnerToast.error('Contact info cannot be empty');
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch(`/api/labour-persons/${editingPerson.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName.trim(), contact_info: editContact.trim() }),
            });
            const data = await res.json();
            
            if (res.ok) {
                sonnerToast.success('Labour person updated successfully');
                setIsEditModalOpen(false);
                fetchLabourPersons();
            } else {
                sonnerToast.error(data.error || 'Failed to update labour person');
            }
        } catch (err) {
            sonnerToast.error('Could not update labour person');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (person: LabourPerson) => {
        setDeletingPerson(person);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingPerson) return;
        
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/labour-persons/${deletingPerson.id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            
            if (res.ok) {
                sonnerToast.success('Labour person deleted successfully');
                setIsDeleteModalOpen(false);
                fetchLabourPersons();
            } else {
                sonnerToast.error(data.error || 'Failed to delete labour person');
            }
        } catch (err) {
            sonnerToast.error('Could not delete labour person');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-5 max-w-5xl mx-auto pb-10 pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Labour Persons Directory
                        </h2>
                        <p className="text-xs text-slate-500">
                            Manage labour staff and view their assignments.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={fetchLabourPersons}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs font-semibold gap-1 h-8 border-slate-200 dark:border-slate-700"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => router.push('/labour-persons/add')}
                        size="sm"
                        className="rounded-lg text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white h-8 shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Labour Person
                    </Button>
                </div>
            </div>

            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                        placeholder="Search by name or contact..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-8 rounded-lg border-slate-200 dark:border-slate-700 text-xs"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-1" />
                    <p className="text-xs">Loading labour persons...</p>
                </div>
            ) : filteredPersons.length === 0 ? (
                <Card className='shadow-sm rounded-xl border-slate-200'>
                    <CardContent className='p-12 text-center'>
                        <p className='text-gray-500 text-sm'>No labour persons found.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className='space-y-6'>
                    {filteredPersons.map((person) => (
                        <Card key={person.id} className='shadow-sm rounded-xl border-slate-200'>
                            <CardHeader className="flex flex-row items-start justify-between pb-4 border-b border-slate-100">
                                <div>
                                    <CardTitle className='text-xl text-indigo-800 font-extrabold flex items-center gap-2'>
                                        {person.name}
                                        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">#{person.id}</span>
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-1.5 mt-1 font-mono text-xs">
                                        <Phone className="w-3 h-3 text-slate-400" /> {person.contact_info}
                                    </CardDescription>
                                </div>
                                
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-36 rounded-xl border-slate-200 dark:border-slate-800">
                                        <DropdownMenuItem onClick={() => handleEditClick(person)} className="gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <Pencil className="w-3.5 h-3.5 text-blue-600" /> Edit
                                        </DropdownMenuItem>
                                        {/* <DropdownMenuItem onClick={() => handleDeleteClick(person)} className="gap-2 text-xs font-semibold text-red-600 dark:text-red-400 cursor-pointer focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/50">
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </DropdownMenuItem> */}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className='mb-4'>
                                    <h4 className='text-xs font-bold uppercase tracking-wider text-slate-500 mb-3'>Recent Assignments ({person.assignments.length})</h4>
                                    {person.assignments.length === 0 ? (
                                        <p className='text-slate-400 text-xs italic bg-slate-50 p-3 rounded-lg border border-slate-100'>No assignments yet.</p>
                                    ) : (
                                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-slate-50">
                                                    <TableRow>
                                                        <TableHead className="text-[11px] font-bold uppercase">Bilty No</TableHead>
                                                        <TableHead className="text-[11px] font-bold uppercase">Receiver</TableHead>
                                                        <TableHead className="text-[11px] font-bold uppercase">Amount</TableHead>
                                                        <TableHead className="text-[11px] font-bold uppercase">Collected</TableHead>
                                                        <TableHead className="text-[11px] font-bold uppercase">Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {person.assignments.map((assignment) => (
                                                        <TableRow key={assignment.id} className="text-xs">
                                                            <TableCell className='font-mono font-bold text-blue-700'>
                                                                {assignment.shipment.bility_number}
                                                            </TableCell>
                                                            <TableCell className="font-semibold text-slate-700">{assignment.shipment.receiver.name}</TableCell>
                                                            <TableCell className="font-mono">Rs.{assignment.shipment.total_charges}</TableCell>
                                                            <TableCell className="font-mono text-emerald-600 font-semibold">Rs.{assignment.collected_amount}</TableCell>
                                                            <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    variant='outline'
                                    size="sm"
                                    className="text-xs font-semibold bg-slate-50 hover:bg-slate-100 border-slate-200"
                                    onClick={() => router.push(`/labour-assignments/add?labour_person_id=${person.id}`)}
                                >
                                    Assign Shipments
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Labour Person</DialogTitle>
                        <DialogDescription>Update the name and contact info.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="personName">Name</Label>
                            <Input 
                                id="personName" 
                                value={editName} 
                                onChange={(e) => setEditName(e.target.value)} 
                                autoFocus 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="personContact">Contact Info</Label>
                            <Input 
                                id="personContact" 
                                value={editContact} 
                                onChange={(e) => setEditContact(e.target.value)} 
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Confirm Deletion
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{deletingPerson?.name}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
