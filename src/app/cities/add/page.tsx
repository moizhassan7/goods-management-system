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
import { MapPin, ArrowLeft, Loader2, Check } from 'lucide-react';

const formSchema = z.object({
  cityName: z.string().min(2, {
    message: 'City name must be at least 2 characters.',
  }).max(50, {
    message: 'City name cannot exceed 50 characters.',
  }),
});

type CityFormValues = z.infer<typeof formSchema>;

export default function AddCity() {
  const router = useRouter();

  const form = useForm<CityFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cityName: '',
    },
    mode: 'onChange'
  });

  async function onSubmit(values: CityFormValues) {
    try {
      const response = await fetch('/api/cities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: values.cityName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add city.');
      }

      const newCity = await response.json();
      toast.success('City Added Successfully', {
        description: `"${newCity.name}" is now available as a transit hub.`
      });

      form.reset(); 
      router.push('/cities/view');

    } catch (error: any) {
      console.error('Submission Error:', error);
      toast.error('Error Adding City', {
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
          onClick={() => router.push('/cities/view')}
          className="rounded-lg text-xs font-medium gap-1 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Hubs
        </Button>
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-2 border border-blue-200 dark:border-blue-800">
            <MapPin className="w-5 h-5" />
          </div>
          <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">
            Register New Transit City
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Add a departure or destination city to enable bilty route allocations
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="cityName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      City Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Lahore, Karachi, Rawalpindi" 
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
                className="w-full h-10 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors mt-2 cursor-pointer gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Adding City...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save & Register City
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
