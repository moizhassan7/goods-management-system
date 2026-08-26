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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Truck, Lock, User, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setSessionUser } = useAuth();
  
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
        throw new Error(data.message || 'Login credentials incorrect.');
      }
      
      setSessionUser(data.user);

      toast.success('Authentication Successful', {
        description: `Welcome back, ${data.user.username} (${data.user.role}).`,
      });

      // Immediate clean redirect to dashboard on single click
      window.location.href = '/';

    } catch (error: any) {
      console.error('Login Error:', error);
      toast.error('Authentication Error', {
        description: error.message,
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
            Logistics & Freight ERP System
          </p>
        </div>

        {/* Form Card */}
        <Card className="rounded-xl border-slate-800 bg-slate-950 text-white shadow-xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-5 px-5 border-b border-slate-850">
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">
              Operator Sign In
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Enter credentials to access dispatch workstation
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
                            placeholder="e.g. admin or operator" 
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
                        Password
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

                <Button 
                  type="submit" 
                  className="w-full h-10 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors mt-3 cursor-pointer gap-1.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Sign In to System
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-500 font-mono">
          Zikria Goods Transports Company • Station ERP
        </p>
      </div>
    </div>
  );
}
