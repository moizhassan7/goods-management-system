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
import { Building, ArrowLeft, Loader2, Check } from 'lucide-react';

const formSchema = z.object({
  agencyName: z.string().min(2, {
    message: 'Agency name must be at least 2 characters.',
  }).max(100, {
    message: 'Agency name cannot exceed 100 characters.',
  }),
});

type AgencyFormValues = z.infer<typeof formSchema>;

export default function AddAgency() {
  const router = useRouter();

  const form = useForm<AgencyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agencyName: '',
    },
    mode: 'onChange'
  });

  async function onSubmit(values: AgencyFormValues) {
    try {
      const response = await fetch('/api/agencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: values.agencyName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add agency.');
      }

      const newAgency = await response.json();
      toast.success('Agency Registered Successfully', {
        description: `"${newAgency.name}" is now available in the forwarding agencies list.`
      });

      form.reset(); 
      router.push('/agency/view');

    } catch (error: any) {
      console.error('Submission Error:', error);
      toast.error('Error Registering Agency', {
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
          onClick={() => router.push('/agency/view')}
          className="rounded-lg text-xs font-medium gap-1 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Agencies
        </Button>
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-5">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mb-2 border border-indigo-200 dark:border-indigo-800">
            <Building className="w-5 h-5" />
          </div>
          <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">
            Register Forwarding Agency
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Add a logistics partner agency for freight routing and transit handling
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="agencyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Agency / Company Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Express Cargo Logistics" 
                        {...field} 
                        className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={isSubmitting || !isValid}
                className="w-full h-10 rounded-lg font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors mt-2 cursor-pointer gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Registering Agency...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save & Register Agency
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
