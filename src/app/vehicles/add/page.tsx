// components/AddVehicle.tsx
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
  vehicleNumber: z.string().min(2, {
    message: 'Vehicle number must be at least 2 characters.',
  }).max(20, {
    message: 'Vehicle number cannot exceed 20 characters.',
  }).regex(/^[A-Z0-9-]{2,20}$/, {
    message: 'Must contain only letters, numbers, and hyphens.',
  }),
});

// Define the TypeScript type
type VehicleFormValues = z.infer<typeof formSchema>;


// --- 2. Define the Component ---
export default function AddVehicle() {
//   const { toast } = useToast();

  // Initialize React Hook Form
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleNumber: '',
    },
  });

  // --- 3. Define the Submission Handler ---
  async function onSubmit(values: VehicleFormValues) {
    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send data to the API route
        body: JSON.stringify({ vehicleNumber: values.vehicleNumber }),
      });

      if (!response.ok) {
        // Parse the error message from the API response (e.g., 409 Conflict)
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register vehicle.');
      }

      // Vehicle added successfully
      const newVehicle = await response.json();
      alert(`Vehicle "${newVehicle.vehicleNumber}" registered successfully!`);
    //   toast({
    //     title: 'Vehicle Registered Successfully 🚚',
    //     description: `Vehicle number "${newVehicle.vehicleNumber}" is now available.`,
    //   });

      // Reset the form after successful submission
      form.reset(); 

    } catch (error: any) {
      console.error('Submission Error:', error);
      alert(`Error: ${error.message}`);
    //   toast({
    //     title: 'Error Registering Vehicle',
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
      <h2 className='text-3xl font-extrabold mb-6 text-gray-900'>Add New Vehicle</h2>
      
      {/* Shadcn Form Wrapper */}
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className='space-y-6 p-8 rounded-xl shadow-2xl border border-teal-100 bg-teal-50'
        >
          
          {/* Form Field for Vehicle Number */}
          <FormField
            control={form.control}
            name='vehicleNumber'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='font-semibold text-gray-700'>Vehicle Registration Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder='e.g., ABC-1234, KA-01-M-9999' 
                    {...field} 
                    // Automatically convert input to uppercase
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())} 
                    className='focus-visible:ring-teal-500'
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
            className='w-full bg-teal-600 hover:bg-teal-700 transition-colors py-3 text-lg'
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? 'Registering...' : 'Register Vehicle'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
