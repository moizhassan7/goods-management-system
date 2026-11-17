"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { fetchWithTimeout } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  Lock,
  User,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Phone,
} from 'lucide-react';

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setSessionUser } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const response = await fetchWithTimeout('/api/auth/login', {
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
      window.location.href = '/';
    } catch (error) {
      console.error('Login Error:', error);
      toast.error('Authentication Error', {
        description: error instanceof Error ? error.message : 'Request failed',
      });
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div
      style={{
        backgroundImage: darkMode
          ? 'radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px)'
          : 'radial-gradient(rgba(32, 32, 34, 0.12) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      className={`min-h-screen w-full flex items-center justify-center p-4 sm:p-6 transition-colors duration-300 ${
        darkMode ? 'bg-[#121214]' : 'bg-[#D8D9DE]'
      }`}
    >
      {/* Main Editorial Fintech Shell */}
      <div
        className={`w-full max-w-5xl rounded-[28px] overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 border transition-colors duration-300 ${
          darkMode
            ? 'bg-[#1B1B1E] border-[#2C2C32]'
            : 'bg-white border-white/80'
        }`}
      >
        {/* Left Panel: Deep Charcoal Showcase with Dotted Grid Pattern */}
        <div
          style={{
            backgroundImage:
              'radial-gradient(rgba(255, 255, 255, 0.09) 1.25px, transparent 1.25px)',
            backgroundSize: '20px 20px',
          }}
          className="lg:col-span-6 bg-[#202022] text-white p-7 sm:p-10 flex flex-col justify-between relative overflow-hidden"
        >
          {/* Ambient Lavender Glow */}
          <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-[#D9CDFF]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-[#D9CDFF]/10 blur-3xl pointer-events-none" />

          {/* Top Bar: Version & Hub Status */}
          <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-mono tracking-[0.18em] text-zinc-400 uppercase">
              ERP WORKSTATION &bull; V4.5
            </span>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sargodha Dispatch Hub &bull; Online
            </span>
          </div>

          {/* Center Editorial Headline */}
          <div className="relative z-10 my-10 space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-white/[0.07] border border-white/10 text-[10px] font-mono tracking-[0.16em] text-zinc-300 uppercase">
              OFFICIAL FLEET PORTAL
            </span>
            <h2 className="text-2xl sm:text-[30px] font-bold tracking-tight leading-[1.15] text-white">
              Sargodha Dispatch &amp;{' '}
              <span className="text-[#D9CDFF]">Freight Workstation</span>
            </h2>
            <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed max-w-md">
              Zikria Goods Transport Company &mdash; Real-time bilty booking,
              carrier allocation &amp; daily roznamcha accounting.
            </p>
          </div>

          {/* Bottom Brand Identity Card (Replaces Telemetry Card) */}
          <div className="relative z-10 space-y-5">
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 backdrop-blur-xs flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl bg-white p-2 shadow-lg ring-2 ring-[#D9CDFF]/30 flex items-center justify-center">
                <img
                  src="/logo.jpeg"
                  alt="Zikria Goods Transport Company"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="min-w-0 space-y-1.5">
                <h3 className="text-sm sm:text-base font-bold tracking-tight text-white leading-snug">
                  Zikria Goods Transport Company
                </h3>
                <a
                  href="tel:0483701451"
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9CDFF] text-[#202022] text-xs font-mono font-bold hover:bg-[#cbbaff] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  048-3701451
                </a>
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
              <span>&copy; 2026 Zikria Goods Transport Company</span>
              <span className="text-[#D9CDFF]">Sargodha, PK</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Clean Minimalist Login Form */}
        <div className="lg:col-span-6 p-7 sm:p-11 flex flex-col justify-between">
          {/* Top Bar: Theme Toggle Pill */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="w-9 h-9 rounded-xl bg-white p-1 border border-zinc-200 flex items-center justify-center">
                <img
                  src="/logo.jpeg"
                  alt="Zikria Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span
                className={`text-xs font-bold ${
                  darkMode ? 'text-white' : 'text-[#202022]'
                }`}
              >
                Zikria ERP
              </span>
            </div>

            <div className="ml-auto">
              <div
                className={`inline-flex items-center p-1 rounded-full border ${
                  darkMode
                    ? 'bg-[#252529] border-[#323238]'
                    : 'bg-[#F6F6F8] border-zinc-200/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setDarkMode(false)}
                  aria-label="Light mode"
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    !darkMode
                      ? 'bg-[#202022] text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDarkMode(true)}
                  aria-label="Dark mode"
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    darkMode
                      ? 'bg-[#D9CDFF] text-[#202022] shadow-xs'
                      : 'text-zinc-500 hover:text-[#202022]'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Form Header & Fields */}
          <div className="my-auto max-w-md w-full mx-auto">
            <div className="mb-7">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[#D9CDFF] text-[#202022] mb-3">
                Workstation Access
              </span>
              <h1
                className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                  darkMode ? 'text-white' : 'text-[#202022]'
                }`}
              >
                Sign In
              </h1>
              <p
                className={`text-xs sm:text-sm mt-1 ${
                  darkMode ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                Enter your credentials to access the dispatch workstation
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className={`text-xs font-semibold ${
                          darkMode ? 'text-zinc-300' : 'text-[#202022]'
                        }`}
                      >
                        Username
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User
                            className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${
                              darkMode ? 'text-zinc-500' : 'text-zinc-400'
                            }`}
                          />
                          <Input
                            placeholder="e.g. admin or operator"
                            {...field}
                            autoFocus
                            className={`pl-10 h-11 rounded-xl text-sm transition-colors ${
                              darkMode
                                ? 'bg-[#252529] border-[#34343B] text-white placeholder:text-zinc-500 focus-visible:ring-[#D9CDFF]'
                                : 'bg-[#F6F6F8] border-zinc-200/90 text-[#202022] placeholder:text-zinc-400 focus-visible:ring-[#202022] focus-visible:bg-white'
                            }`}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-rose-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className={`text-xs font-semibold ${
                          darkMode ? 'text-zinc-300' : 'text-[#202022]'
                        }`}
                      >
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock
                            className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${
                              darkMode ? 'text-zinc-500' : 'text-zinc-400'
                            }`}
                          />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            {...field}
                            className={`pl-10 pr-10 h-11 rounded-xl text-sm transition-colors ${
                              darkMode
                                ? 'bg-[#252529] border-[#34343B] text-white placeholder:text-zinc-500 focus-visible:ring-[#D9CDFF]'
                                : 'bg-[#F6F6F8] border-zinc-200/90 text-[#202022] placeholder:text-zinc-400 focus-visible:ring-[#202022] focus-visible:bg-white'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={
                              showPassword ? 'Hide password' : 'Show password'
                            }
                            className={`absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors ${
                              darkMode
                                ? 'text-zinc-400 hover:text-white'
                                : 'text-zinc-400 hover:text-[#202022]'
                            }`}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-rose-500" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full h-11 rounded-xl font-semibold text-sm transition-all mt-2 cursor-pointer gap-2 shadow-sm ${
                    darkMode
                      ? 'bg-[#D9CDFF] hover:bg-[#cbbaff] text-[#202022]'
                      : 'bg-[#202022] hover:bg-[#323236] text-white'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Sign In to System
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>

          {/* Footer */}
          <div
            className={`mt-8 pt-4 border-t flex items-center justify-between text-[11px] ${
              darkMode
                ? 'border-[#2C2C32] text-zinc-500'
                : 'border-zinc-100 text-zinc-400'
            }`}
          >
            <span>Zikria Goods Transport Company</span>
            <span className="font-mono">v4.5 ERP</span>
          </div>
        </div>
      </div>
    </div>
  );
}