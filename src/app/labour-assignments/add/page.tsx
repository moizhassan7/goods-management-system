"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast as sonnerToast } from 'sonner';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// --- Toast Setup (Keep as is) ---
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

// --- Interfaces (Keep as is) ---
interface LabourPerson {
    id: number;
    name: string;
    contact_info: string;
}

interface Shipment {
    register_number: string;
    bility_number: string;
    total_charges: number;
    receiver: { name: string };
    departureCity: { name: string };
    toCity?: { name: string };
}

// --- Zod Schema (Keep as is) ---
const AssignmentSchema = z.object({
    labour_person_id: z.string().min(1, 'Please select a labour person'),
    shipment_ids: z.array(z.string()).min(1, 'Please select at least one shipment'),
    due_date: z.string().optional(),
    notes: z.string().optional(),
});

type AssignmentFormValues = z.infer<typeof AssignmentSchema>;

// ==============================================================================
// --- AssignShipments Component (Client Side) ---
// ==============================================================================
export default function AssignShipments() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [labourPersons, setLabourPersons] = useState<LabourPerson[]>([]);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [selectedShipments, setSelectedShipments] = useState<string[]>([]); // This state is now redundant but kept for checkbox `checked` prop

    const form = useForm<AssignmentFormValues>({
        resolver: zodResolver(AssignmentSchema),
        defaultValues: {
            labour_person_id: '',
            shipment_ids: [],
            due_date: '',
            notes: '',
        },
    });

    // Destructure setValue from form for the crucial update function
    const { setValue } = form;

    useEffect(() => {
        fetchLabourPersons();
        fetchUndeliveredShipments();
    }, []);

    const fetchLabourPersons = async () => {
        try {
            const response = await fetch('/api/labour-persons');
            if (response.ok) {
                const data = await response.json();
                setLabourPersons(data);
            }
        } catch (error) {
            console.error('Error fetching labour persons:', error);
        }
    };

    const fetchUndeliveredShipments = async () => {
        try {
            // Fetch shipments without delivery_date (undelivered)
            const response = await fetch('/api/shipments?delivered=false');
            if (response.ok) {
                const data = await response.json();
                setShipments(data);
            }
        } catch (error) {
            console.error('Error fetching shipments:', error);
        }
    };

    /**
     * FIX: This function now updates both the local state (for UI/checkbox)
     * AND the react-hook-form state (for validation/submission).
     */
    const handleShipmentSelect = (shipmentId: string, checked: boolean) => {
        setSelectedShipments(prev => {
            const newSelection = checked
                ? [...prev, shipmentId]
                : prev.filter(id => id !== shipmentId);
            
            // CRITICAL FIX: Update react-hook-form's state for validation
            setValue('shipment_ids', newSelection, { shouldValidate: true });

            return newSelection;
        });
    };

    const handleSubmit = async (values: AssignmentFormValues) => {
        setIsSubmitting(true);
        try {
            const payload = {
                labour_person_id: parseInt(values.labour_person_id),
                shipment_ids: values.shipment_ids, // ✅ Use the validated shipment_ids from the form state
                due_date: values.due_date || null,
                notes: values.notes || null,
            };

            const response = await fetch('/api/labour-assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to assign shipments.');
            }

            const result = await response.json();
            toast.success({
                title: 'Assignments Created Successfully 🚀',
                description: result.message
            });

            // Reset form state and local UI state
            form.reset({
                labour_person_id: '',
                shipment_ids: [], // important to reset this field too
                due_date: '',
                notes: '',
            }); 
            setSelectedShipments([]);

        } catch (error: any) {
            console.error('Submission Error:', error);
            toast.error({
                title: 'Error Creating Assignments ⚠️',
                description: error.message
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className='p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen'>
            <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>Assign Shipments to Labour Person</h2>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)}>
                    <Card className='shadow-lg mb-6'>
                        <CardHeader>
                            <CardTitle className='text-xl text-blue-800'>Assignment Details</CardTitle>
                            <CardDescription>Assign undelivered shipments to a labour person for collection</CardDescription>
                        </CardHeader>
                        <CardContent className='space-y-6'>
                            
                            <FormField
                                control={form.control}
                                name='labour_person_id'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Labour Person</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder='Select a labour person' />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {labourPersons.map((person) => (
                                                    <SelectItem key={person.id} value={person.id.toString()}>
                                                        {person.name} - {person.contact_info}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* <FormField
                                control={form.control}
                                name='due_date'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Due Date (Optional)</FormLabel>
                                        <FormControl>
                                            <Input type='date' {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            /> */}

                            <FormField
                                control={form.control}
                                name='notes'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder='Additional notes' {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card className='shadow-lg'>
                        <CardHeader>
                            <CardTitle className='text-xl text-blue-800'>Select Shipments</CardTitle>
                            <CardDescription>Choose undelivered shipments to assign</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {shipments.length === 0 ? (
                                <p className='text-gray-500'>No undelivered shipments available.</p>
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className='w-12'>Select</TableHead>
                                                <TableHead>Bilty Number</TableHead>
                                                <TableHead>Receiver</TableHead>
                                                <TableHead>From</TableHead>
                                                <TableHead>To</TableHead>
                                                <TableHead>Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {shipments.map((shipment) => (
                                                <TableRow key={shipment.register_number}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedShipments.includes(shipment.register_number)}
                                                            onCheckedChange={(checked) =>
                                                                handleShipmentSelect(shipment.register_number, checked as boolean)
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell className='font-medium'>{shipment.bility_number}</TableCell>
                                                    <TableCell>{shipment.receiver.name}</TableCell>
                                                    <TableCell>{shipment.departureCity.name}</TableCell>
                                                    <TableCell>{shipment.toCity?.name || 'N/A'}</TableCell>
                                                    <TableCell>${shipment.total_charges}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    
                                    {/* Display shipment_ids validation error message */}
                                    <FormField
                                        control={form.control}
                                        name='shipment_ids'
                                        render={() => (
                                            <FormItem>
                                                <FormMessage className='mt-4' />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            {(selectedShipments.length > 0 || form.formState.errors.shipment_ids) && (
                                <div className='mt-6'>
                                    <p className='mb-4'>Selected {selectedShipments.length} shipment(s)</p>
                                    <Button
                                        type='submit' // Changed to type='submit' to utilize the form tag
                                        className='w-full bg-green-700 hover:bg-green-800 py-3 text-lg font-bold'
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Assigning Shipments...' : 'Assign Shipments'}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </div>
    );
}