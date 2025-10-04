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
  name: z.string().min(3, {
    message: 'Party name must be at least 3 characters.',
  }).max(100),
  
  contactInfo: z.string().min(10, {
    message: 'Contact Info (e.g., phone or address) is required.',
  }).max(100),
  
  // Validate that the balance is a string that looks like a decimal number (positive or negative)
  openingBalance: z.string().regex(/^-?\d+(\.\d{1,2})?$/, {
    message: 'Must be a valid currency format (e.g., 100.00 or -50.50).',
  }),
});

// Define the TypeScript type
type PartyFormValues = z.infer<typeof formSchema>;


// --- 2. Define the Component ---
export default function AddParty() {
//   const { toast } = useToast();

  // Initialize React Hook Form
  const form = useForm<PartyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      contactInfo: '',
      openingBalance: '0.00',
    },
    // Set validation mode to onChange for real-time feedback
    mode: 'onChange' 
  });

  // --- 3. Define the Submission Handler ---
  async function onSubmit(values: PartyFormValues) {
    try {
      const response = await fetch('/api/parties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send data to the API route, matching the expected server payload
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

      // Party added successfully
      const newParty = await response.json();
      alert(`Party "${newParty.name}" registered successfully!`);
    //   toast({
    //     title: 'Party Registered Successfully 👥',
    //     description: `"${newParty.name}" is now available as a sender/receiver.`,
    //   });

      // Reset the form after successful submission
      form.reset({
        name: '',
        contactInfo: '',
        openingBalance: '0.00', // Reset balance to default
      }); 

    } catch (error: any) {
      console.error('Submission Error:', error);
      alert(`Error: ${error.message}`);
    //   toast({
    //     title: 'Error Registering Party',
    //     description: error.message,
    //     variant: 'destructive',
    //   });
    }
  }

  // Determine button state
  const isSubmitting = form.formState.isSubmitting;
  const isValid = form.formState.isValid;

  return (
    <div className='p-6 max-w-lg mx-auto bg-white min-h-screen'>
      <h2 className='text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2'>Register Sender/Receiver Party</h2>
      
      {/* Shadcn Form Wrapper */}
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className='space-y-6 p-8 rounded-xl shadow-2xl border border-indigo-100 bg-indigo-50'
        >
          
          {/* Party Name */}
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='font-semibold text-gray-700'>Party Name (Company/Individual)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder='e.g., Acme Corp or John Doe' 
                    {...field} 
                    className='focus-visible:ring-indigo-500'
                    autoFocus
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Contact Info */}
          <FormField
            control={form.control}
            name='contactInfo'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='font-semibold text-gray-700'>Contact Info (Address / Phone)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder='e.g., 123 Main St, or 555-123-4567' 
                    {...field} 
                    className='focus-visible:ring-indigo-500'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Opening Balance */}
          <FormField
            control={form.control}
            name='openingBalance'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='font-semibold text-gray-700'>Opening Balance (e.g., -50.00 or 120.00)</FormLabel>
                <FormControl>
                  <Input 
                    type='text' // Use type text to control decimal input with regex validation
                    placeholder='0.00'
                    {...field} 
                    className='focus-visible:ring-indigo-500'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button 
            type='submit' 
            variant={'default'}
            className='w-full bg-indigo-600 hover:bg-indigo-700 transition-colors py-3 text-lg mt-6'
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? 'Registering...' : 'Register Party'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
