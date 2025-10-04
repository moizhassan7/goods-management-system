'use client'; // Required for client-side components in Next.js App Router

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
// import { useToast } from '@/components/ui/use-toast'; // Used for notifications

// --- 1. Define the Zod Schema for Validation ---
const formSchema = z.object({
  cityName: z.string().min(2, {
    message: 'City name must be at least 2 characters.',
  }).max(50, {
    message: 'City name cannot exceed 50 characters.',
  }),
});

// Define the TypeScript type based on the Zod schema
type CityFormValues = z.infer<typeof formSchema>;


// --- 2. Define the Component ---
export default function AddCity() {
//   const { toast } = useToast();

  // Initialize React Hook Form
  const form = useForm<CityFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cityName: '',
    },
  });

  // --- 3. Define the Submission Handler ---
  async function onSubmit(values: CityFormValues) {
    // console.log(values); // Log form values

    try {
      const response = await fetch('/api/cities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send data to the API route
        body: JSON.stringify({ name: values.cityName }),
      });

      if (!response.ok) {
        // Parse the error message from the API response
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add city.');
      }

      // City added successfully
      const newCity = await response.json();
      alert(`City "${newCity.name}" added successfully!`);
      console.log('City Added:', newCity);
    //   toast({
    //     title: 'City Added Successfully 🎉',
    //     description: `"${newCity.name}" has been added to the database.`,
    //   });

      // Reset the form after successful submission
      form.reset(); 

    } catch (error: any) {
      console.error('Submission Error:', error);
      alert(`Error: ${error.message}`);

    //   toast({
    //     title: 'Error Adding City',
    //     description: error.message,
    //     variant: 'destructive',
    //   });
    }
  }

  return (
    <div className='p-6 max-w-lg mx-auto'>
      <h2 className='text-2xl font-bold mb-4'>Add New City</h2>
      
      {/* Shadcn Form Wrapper */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6 bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200'>
          
          {/* Form Field for City Name */}
          <FormField
            control={form.control}
            name='cityName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>City Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder='e.g., London, New York' 
                    {...field} 
                    // Automatically focus on the input when component mounts
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
            // Disable button while submitting or if form data is invalid
            disabled={form.formState.isSubmitting || !form.formState.isValid}
          >
            {form.formState.isSubmitting ? 'Adding City...' : 'Add City'}
          </Button>
        </form>
      </Form>
    </div>
  );
}

