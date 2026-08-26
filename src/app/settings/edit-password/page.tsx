"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { 
  ShieldCheck, Lock, Eye, EyeOff, KeyRound, 
  CheckCircle2, ArrowLeft, Loader2, Save 
} from 'lucide-react';

const formSchema = z.object({
  password: z.string().min(3, {
    message: 'Password must be at least 3 characters.',
  }).max(50, {
    message: 'Password cannot exceed 50 characters.',
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

export default function EditPasswordSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const fetchPasswordSetting = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings/edit-password');
      if (res.ok) {
        const data = await res.json();
        setCurrentPassword(data.password || '1234');
      }
    } catch (err) {
      console.error('Failed to load edit password setting:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPasswordSetting();
  }, []);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/settings/edit-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: values.password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update password.');
      }

      toast.success('Edit Password Updated', {
        description: 'New security password has been saved successfully.',
      });

      setCurrentPassword(values.password);
      form.reset({ password: '', confirmPassword: '' });
    } catch (err: any) {
      console.error('Update error:', err);
      toast.error('Update Failed', {
        description: err.message || 'Could not update edit password.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white">
              Bilty Edit Security Password
            </h1>
            <p className="text-xs text-slate-500">
              بلٹی میں تبدیلی / ایڈٹ کرنے کا سیکیورٹی پاس ورڈ
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="rounded-lg text-xs font-semibold gap-1.5 h-8 border-slate-200 dark:border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Button>
      </div>

      {/* Current Active Password Overview */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                Active Edit Password Status
              </CardTitle>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3" />
              PROTECTION ACTIVE
            </span>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Whenever any operator attempts to edit a saved bilty, this password will be requested.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Current Password
              </p>
              <p className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5 tracking-wider">
                {isLoading ? (
                  <span className="text-slate-400 text-xs font-normal">Loading...</span>
                ) : showCurrentPassword ? (
                  currentPassword
                ) : (
                  '••••••••'
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="rounded-lg text-xs font-medium h-8 border-slate-200 dark:border-slate-700 gap-1.5"
            >
              {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showCurrentPassword ? 'Hide Password' : 'Show Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Set New Password Form */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
              Set New Edit Password
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Enter a new password to secure consignment edits across the ERP.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      New Password *
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Enter new edit password"
                          className="h-10 rounded-lg text-xs pr-10 font-mono"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Confirm New Password *
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter new edit password"
                          className="h-10 rounded-lg text-xs pr-10 font-mono"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Password...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save & Update Edit Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
