// src/moizhassan7/goods-management-system/goods-management-system-36a96deb04db0b296f5178c3c6a89a34c19278dd/src/app/signup/page.tsx
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Define roles, mirroring lib/auth.ts (or Prisma schema)
export enum UserRole {
    OPERATOR = 'OPERATOR',
    ADMIN = 'ADMIN',
    SUPERADMIN = 'SUPERADMIN',
}

const SignupSchema = z.object({
  username: z.string().min(3, 'Username is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  // NEW: Role field added to schema
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'A valid role is required.' }),
  }),
});

type SignupFormValues = z.infer<typeof SignupSchema>;

export default function SignupPage() {
  const router = useRouter();
  
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      username: '',
      password: '',
      // Default to Operator if no selection is made
      role: UserRole.OPERATOR, 
    },
  });

  async function onSubmit(values: SignupFormValues) {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed.');
      }

      toast.success('Registration Successful 🎉', {
        description: `User ${values.username} created as ${data.user.role}. Redirecting to login...`,
      });

      // Redirect to login page after successful signup
      router.push('/login');

    } catch (error: any) {
      console.error('Signup Error:', error);
      toast.error('Signup Failed ⚠️', {
        description: error.message,
      });
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100 p-4'>
      <Card className='w-full max-w-md shadow-2xl'>
        <CardHeader className='text-center'>
          <CardTitle className='text-3xl font-extrabold text-blue-700'>Create Account</CardTitle>
          <CardDescription>Register for Zikria Goods Transports System. First user defaults to **SUPERADMIN**.</CardDescription>
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
                      <Input type='password' placeholder='Enter a strong password (min 8 chars)' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* NEW: Role Selection Field */}
              <FormField
                control={form.control}
                name='role'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desired Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select Role' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(UserRole).map((role) => (
                          <SelectItem key={role} value={role}>
                            {role} {role === UserRole.SUPERADMIN && ' (First User Only)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type='submit' 
                className='w-full bg-blue-600 hover:bg-blue-700 py-3 text-lg'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Registering...' : 'Sign Up'}
              </Button>
            </form>
          </Form>

          <div className='mt-6 text-center text-sm'>
            Already have an account?{' '}
            <Link href='/login' className='text-blue-600 hover:underline font-semibold'>
              Log In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
