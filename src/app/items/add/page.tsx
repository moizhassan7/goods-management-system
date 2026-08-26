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
import { Package, ArrowLeft, Loader2, Check } from 'lucide-react';

const formSchema = z.object({
  description: z.string().min(3, {
    message: 'Description must be at least 3 characters.',
  }).max(100, {
    message: 'Description cannot exceed 100 characters.',
  }),
});

type ItemFormValues = z.infer<typeof formSchema>;

export default function AddItem() {
  const router = useRouter();

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
    mode: 'onChange'
  });

  async function onSubmit(values: ItemFormValues) {
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: values.description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add item to catalog.');
      }

      const newItem = await response.json();
      toast.success('Item Catalog Updated', {
        description: `"${newItem.item_description}" is now available in consignment goods lists.`
      });

      form.reset(); 
      router.push('/shipments/add');

    } catch (error: any) {
      console.error('Submission Error:', error);
      toast.error('Error Adding Item', {
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
          onClick={() => router.push('/shipments/add')}
          className="rounded-lg text-xs font-medium gap-1 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Bilty Entry
        </Button>
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-5">
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center mb-2 border border-purple-200 dark:border-purple-800">
            <Package className="w-5 h-5" />
          </div>
          <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">
            Register Item Category
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Add standard goods definitions to speed up bilty cargo entry
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Item Description / Classification *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Textiles, Electrical Appliances, Heavy Machinery" 
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
                className="w-full h-10 rounded-lg font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors mt-2 cursor-pointer gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Adding to Catalog...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save Item Category
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
