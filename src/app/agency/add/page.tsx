// components/AddAgency.tsx
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePermission } from '@/hooks/use-permission'; // NEW: Import hook
import { Loader2, AlertTriangle } from 'lucide-react'; // NEW: Import icons

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

// Define the required permission for this page
const REQUIRED_PERMISSION = 'MASTER_DATA_WRITE';


// --- 2. Define the Component ---
export default function AddAgency() {
  const router = useRouter();
  const { hasPermission, isAuthLoading } = usePermission();
  const allowed = hasPermission(REQUIRED_PERMISSION);

  // --- Client-Side Access Check and Redirection ---
  useEffect(() => {
    if (!isAuthLoading && !allowed) {
        // Redirect unauthorized users to the dashboard (or login if they are not logged in, but LayoutContent handles general auth)
        // alert("Access Denied. You do not have permission to add Master Data.");
        alert("Greeb Insan Jab Permission nii hai tuu qq Pagay lagta h...")
        router.push('/');
    }
  }, [isAuthLoading, allowed, router]);


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
      // NOTE: API route will perform a server-side check as well
      const response = await fetch('/api/agencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send data to the API route
        body: JSON.stringify({ name: values.agencyName }),
      });

      if (!response.ok) {
        // Parse the error message from the API response (e.g., 403 Forbidden)
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add agency.');
      }

      // Agency added successfully
      const newAgency = await response.json();
      alert(`Agency "${newAgency.name}" added successfully!`);
      form.reset(); 

    } catch (error: any) {
      console.error('Submission Error:', error);
      alert(`Error: ${error.message}`);
    }
  }

  // Handle Loading/Unauthorized states for rendering
  if (isAuthLoading) {
      return (
          <div className='flex items-center justify-center min-h-[50vh]'>
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className='text-gray-600 ml-3'>Loading access controls...</p>
          </div>
      );
  }

  // If not allowed, useEffect handles redirection, but we render a message first
  if (!allowed) {
      return (
          <div className='p-6 max-w-lg mx-auto'>
              <Card className="bg-red-50 border-red-300">
                  <CardHeader>
                      <CardTitle className="text-red-700 flex items-center">
                          <AlertTriangle className="h-5 w-5 mr-2" /> Access Denied
                      </CardTitle>
                      <CardDescription className="text-red-600">
                          Your current user role does not have permission for this action.
                      </CardDescription>
                  </CardHeader>
              </Card>
          </div>
      );
  }


  // Determine button state
  const isSubmitting = form.formState.isSubmitting;
  const isValid = form.formState.isValid;

  // --- Main Component Render (only if authorized) ---
  return (
    <div className='p-6 max-w-lg mx-auto bg-white min-h-screen'>
      <h2 className='text-3xl font-extrabold mb-6 text-gray-900'>Register New Forwarding Agency</h2>
      
      {/* Shadcn Form Wrapper */}
      <Card className="shadow-2xl border-0">
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className='space-y-6 p-8 rounded-xl border border-blue-100 bg-blue-50'
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
      </Card>
    </div>
  );
}
