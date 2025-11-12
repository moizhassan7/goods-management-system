"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast as sonnerToast } from 'sonner';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

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

// --- Zod Schema ---
const LabourPersonSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    contact_info: z.string().optional(),
});

type LabourPersonFormValues = z.infer<typeof LabourPersonSchema>;

export default function AddLabourPerson() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<LabourPersonFormValues>({
        resolver: zodResolver(LabourPersonSchema),
        defaultValues: {
            name: '',
            contact_info: '',
        },
    });

    const handleSubmit = async (values: LabourPersonFormValues) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/labour-persons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add labour person.');
            }

            const result = await response.json();
            toast.success({
                title: 'Labour Person Added Successfully 🚀',
                description: `${values.name} has been added as a labour person.`
            });

            form.reset();

        } catch (error: any) {
            console.error('Submission Error:', error);
            toast.error({
                title: 'Error Adding Labour Person ⚠️',
                description: error.message
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className='p-6 max-w-2xl mx-auto bg-gray-50 min-h-screen'>
            <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>Add Labour Person</h2>

            <Card className='shadow-lg'>
                <CardHeader>
                    <CardTitle className='text-xl text-blue-800'>Labour Person Details</CardTitle>
                    <CardDescription>Add a new delivery agent to the system</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>

                            <FormField
                                control={form.control}
                                name='name'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder='Enter full name' {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name='contact_info'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Information</FormLabel>
                                        <FormControl>
                                            <Input placeholder='Phone number or address' {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type='submit'
                                className='w-full bg-green-700 hover:bg-green-800 py-3 text-lg font-bold'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Adding Labour Person...' : 'Add Labour Person'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
