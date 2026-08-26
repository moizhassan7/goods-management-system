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
import { Users, ArrowLeft, Loader2, Check } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Party name must be at least 2 characters.',
  }).max(100),
  contactInfo: z.string().max(200).optional(),
  openingBalance: z.string().regex(/^-?\d+(\.\d{1,2})?$/, {
    message: 'Must be a valid decimal number (e.g. 100.00 or -50.00).',
  }),
});

type PartyFormValues = z.infer<typeof formSchema>;

export default function AddParty() {
  const router = useRouter();

  const form = useForm<PartyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      contactInfo: '',
      openingBalance: '0.00',
    },
    mode: 'onChange' 
  });

  async function onSubmit(values: PartyFormValues) {
    try {
      const response = await fetch('/api/parties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            name: values.name, 
            contactInfo: values.contactInfo,
            openingBalance: values.openingBalance,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register party.');
      }

      const newParty = await response.json();
      toast.success('Party Registered Successfully', {
        description: `"${newParty.name}" is now available in sender/receiver lists.`
      });

      form.reset({
        name: '',
        contactInfo: '',
        openingBalance: '0.00',
      }); 

      router.push('/parties/view');

    } catch (error: any) {
      console.error('Submission Error:', error);
      toast.error('Error Registering Party', {
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
          onClick={() => router.push('/parties/view')}
          className="rounded-lg text-xs font-medium gap-1 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Directory
        </Button>
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-5">
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center mb-2 border border-purple-200 dark:border-purple-800">
            <Users className="w-5 h-5" />
          </div>
          <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">
            Register Sender / Receiver Party
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Add a new client account to enable bilty party allocation
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Party / Business Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Faisal Traders or John Doe" 
                        {...field} 
                        className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Contact Information / Phone
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. +92 300 1234567, City Market" 
                        {...field} 
                        className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs"
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="openingBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Opening Balance (Rs.) *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="0.00"
                        {...field} 
                        className="rounded-lg h-9 border-slate-200 dark:border-slate-700 text-xs font-mono"
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={isSubmitting || !isValid}
                className="w-full h-10 rounded-lg font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors mt-2 cursor-pointer gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving Party...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save & Register Party
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
