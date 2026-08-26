"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Truck, UserPlus, Lock, User, Loader2, ArrowRight } from 'lucide-react';

export enum UserRole {
    OPERATOR = 'OPERATOR',
    ADMIN = 'ADMIN',
    SUPERADMIN = 'SUPERADMIN',
}

const SignupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  role: z.nativeEnum(UserRole, {
    message: 'A valid role is required.',
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

      toast.success('Account Created Successfully', {
        description: `User ${values.username} registered with role ${data.user.role}.`,
      });

      router.push('/login');

    } catch (error: unknown) {
      console.error('Signup Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error('Registration Error', {
        description: errorMessage,
      });
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1.5 mb-2">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-sm">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-extrabold text-white tracking-tight">
            Zikria Goods Transports
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Register System Operator
          </p>
        </div>

        {/* Form Card */}
        <Card className="rounded-xl border-slate-800 bg-slate-950 text-white shadow-xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-5 px-5 border-b border-slate-850">
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">
              Create Account
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Fill in credentials to assign ERP system access
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-300">
                        Username
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                          <Input 
                            placeholder="e.g. jdoe" 
                            {...field} 
                            className="pl-9 h-9 rounded-lg bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 text-xs focus-visible:ring-blue-500"
                            autoFocus
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-[11px] text-rose-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-300">
                        Password (min 8 chars)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                            className="pl-9 h-9 rounded-lg bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 text-xs focus-visible:ring-blue-500"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-[11px] text-rose-400" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-300">
                        System Permission Role
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 rounded-lg bg-slate-900 border-slate-700 text-white text-xs">
                            <SelectValue placeholder="Select Role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-lg border-slate-800 bg-slate-900 text-white">
                          {Object.values(UserRole).map((role) => (
                            <SelectItem key={role} value={role} className="text-xs">
                              {role} {role === UserRole.SUPERADMIN && ' (Root Admin)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[11px] text-rose-400" />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-10 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors mt-3 cursor-pointer gap-1.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Register Account
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center text-xs text-slate-400">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-400 hover:underline font-semibold">
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
