"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, Check, Truck } from 'lucide-react';

const formSchema = z.object({
  vehicleNumber: z.string().min(2, {
    message: 'Vehicle number must be at least 2 characters.',
  }).max(20, {
    message: 'Vehicle number cannot exceed 20 characters.',
  }).regex(/^[A-Z0-9-]{2,20}$/, {
    message: 'Must contain only letters, numbers, and hyphens.',
  }),
});

type VehicleFormValues = z.infer<typeof formSchema>;

export default function AddVehicle() {
  const router = useRouter();

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleNumber: '',
    },
    mode: 'onChange'
  });

  async function onSubmit(values: VehicleFormValues) {
    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vehicleNumber: values.vehicleNumber }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register vehicle.');
      }

      const newVehicle = await response.json();
      toast.success('Vehicle Registered Successfully', {
        description: `Vehicle "${newVehicle.vehicleNumber}" added to active fleet.`
      });

      form.reset(); 
      router.push('/vehicles/view');

    } catch (error: any) {
      console.error('Submission Error:', error);
      toast.error('Error Registering Vehicle', {
        description: error.message
      });
    }
  }

  const isSubmitting = form.formState.isSubmitting;
  const isValid = form.formState.isValid;

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/vehicles/view')}
          className="rounded-lg text-xs font-medium gap-1 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Fleet Directory
        </Button>
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-5">
          <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center mb-2 border border-teal-200 dark:border-teal-800">
            <Truck className="w-5 h-5" />
          </div>
          <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">
            Register New Fleet Vehicle
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Enter the vehicle registration license plate to enable dispatch allocation
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="vehicleNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Vehicle Registration Number *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. LES-4521 or KHI-9988" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())} 
                        className="rounded-lg h-9 border-slate-200 dark:border-slate-700 font-mono text-xs font-bold uppercase tracking-wider"
                        autoFocus
                      />
                    </FormControl>
                    <p className="text-[10px] text-slate-400">
                      Automatically formatted to uppercase.
                    </p>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={isSubmitting || !isValid}
                className="w-full h-10 rounded-lg font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors mt-2 cursor-pointer gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Registering Vehicle...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save & Register Vehicle
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
