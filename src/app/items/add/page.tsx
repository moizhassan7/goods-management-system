// components/AddItem.tsx
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Import Shadcn UI components
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
// import { useToast } from '@/components/ui/use-toast'; 

// --- 1. Define the Zod Schema for Validation ---
const formSchema = z.object({
  description: z.string().min(3, {
    message: 'Description must be at least 3 characters.',
  }).max(100, {
    message: 'Description cannot exceed 100 characters.',
  }),
});

// Define the TypeScript type
type ItemFormValues = z.infer<typeof formSchema>;


// --- 2. Define the Component ---
export default function AddItem() {
//   const { toast } = useToast();

  // Initialize React Hook Form
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
  });

  // --- 3. Define the Submission Handler ---
  async function onSubmit(values: ItemFormValues) {
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send data to the API route
        body: JSON.stringify({ description: values.description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add item to catalog.');
      }

      // Item added successfully
      const newItem = await response.json();
      alert(`Item type "${newItem.item_description}" is now available.`);
    //   toast({
    //     title: 'Item Added to Catalog ✅',
    //     description: `Item type "${newItem.item_description}" is now available.`,
    //   });

      // Reset the form after successful submission
      form.reset(); 

    } catch (error: any) {
      console.error('Submission Error:', error);
        alert(`Error: ${error.message}`);
    }
  }

  // Determine button state
  const isSubmitting = form.formState.isSubmitting;
  const isValid = form.formState.isValid;

  return (
    <div className='p-6 max-w-lg mx-auto bg-white min-h-screen'>
      <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>Add New Item Type to Catalog</h2>
      
      {/* Shadcn Form Wrapper */}
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className='space-y-6 p-8 rounded-xl shadow-2xl border border-purple-100 bg-purple-50'
        >
          
          {/* Form Field for Item Description */}
          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='font-semibold text-gray-700'>Item Type Description</FormLabel>
                <FormControl>
                  <Input 
                    placeholder='e.g., Electronics, Heavy Machinery, Textiles' 
                    {...field} 
                    className='focus-visible:ring-purple-500'
                    autoFocus
                  />
                </FormControl>
                {/* Display validation errors */}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button 
            type='submit' 
            variant={'default'}
            className='w-full bg-purple-600 hover:bg-purple-700 transition-colors py-3 text-lg mt-6'
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? 'Adding Item...' : 'Add Item to Catalog'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
