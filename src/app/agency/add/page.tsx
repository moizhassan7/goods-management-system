// components/AddAgency.tsx
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
// import { useToast } from '@/components/ui/use-toast'; // Ensure you have the Toaster setup

// --- 1. Define the Zod Schema for Validation ---
const formSchema = z.object({
  agencyName: z.string().min(2, {
    message: 'Agency name must be at least 2 characters.',
  }).max(100, {
    message: 'Agency name cannot exceed 100 characters.',
  }),
});

// Define the TypeScript type
type AgencyFormValues = z.infer<typeof formSchema>;


// --- 2. Define the Component ---
export default function AddAgency() {
//   const { toast } = useToast();

  // Initialize React Hook Form
  const form = useForm<AgencyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agencyName: '',
    },
  });

  // --- 3. Define the Submission Handler ---
  async function onSubmit(values: AgencyFormValues) {
    try {
      const response = await fetch('/api/agencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send data to the API route
        body: JSON.stringify({ name: values.agencyName }),
      });

      if (!response.ok) {
        // Parse the error message from the API response (e.g., 409 Conflict)
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add agency.');
      }

      // Agency added successfully
      const newAgency = await response.json();
      alert(`Agency "${newAgency.name}" added successfully!`);
    //   toast({
    //     title: 'Agency Added Successfully 🎉',
    //     description: `"${newAgency.name}" has been registered.`,
    //   });

      // Reset the form after successful submission
      form.reset(); 

    } catch (error: any) {
      console.error('Submission Error:', error);
      alert(`Error: ${error.message}`);
    //   toast({
    //     title: 'Error Adding Agency',
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
      <h2 className='text-3xl font-extrabold mb-6 text-gray-900'>Register New Forwarding Agency</h2>
      
      {/* Shadcn Form Wrapper */}
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className='space-y-6 p-8 rounded-xl shadow-2xl border border-blue-100 bg-blue-50'
        >
          
          {/* Form Field for Agency Name */}
          <FormField
            control={form.control}
            name='agencyName'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='font-semibold text-gray-700'>Agency Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder='e.g., Global Express Logistics' 
                    {...field} 
                    className='focus-visible:ring-blue-500'
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
            className='w-full bg-blue-600 hover:bg-blue-700 transition-colors py-3 text-lg'
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? 'Registering...' : 'Register Agency'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
