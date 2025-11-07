// src/moizhassan7/goods-management-system/goods-management-system-36a96deb04db0b296f5178c3c6a89a34c19278dd/src/app/login/page.tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';

// Reusing existing UI components
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
import { useAuth } from '@/contexts/AuthContext'; // NEW: Import useAuth

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { refetchSession } = useAuth(); // NEW: Get session refetch function
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed.');
      }
      
      // NEW: Notify the AuthContext to fetch the new session from the server
      await refetchSession(); 

      toast.success('Login Successful 🎉', {
        description: `Welcome, ${data.user.username}. You are logged in as ${data.user.role}.`,
      });

      // Redirection logic is now handled by LayoutContent useEffect, 
      // but we force a final move to '/' just in case.
      router.push('/');
      // Removed router.refresh() as refetchSession handles state update

    } catch (error: any) {
      console.error('Login Error:', error);
      toast.error('Login Failed ⚠️', {
        description: error.message,
      });
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100 p-4'>
      <Card className='w-full max-w-md shadow-2xl'>
        <CardHeader className='text-center'>
          <CardTitle className='text-3xl font-extrabold text-green-700'>Log In</CardTitle>
          <CardDescription>Access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              
              <FormField
                control={form.control}
                name='username'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder='Enter your username' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type='password' placeholder='Enter your password' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type='submit' 
                className='w-full bg-green-600 hover:bg-green-700 py-3 text-lg'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Logging In...' : 'Log In'}
              </Button>
            </form>
          </Form>

          {/* <div className='mt-6 text-center text-sm'>
            Don't have an account?{' '}
            <Link href='/signup' className='text-blue-600 hover:underline font-semibold'>
              Sign Up
            </Link>
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}
