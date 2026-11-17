'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';
import { useAuth } from '@/contexts/AuthContext';
import CustomLoader from '@/components/ui/CustomLoader';
import Sidebar from '@/components/dashboard/Sidebar';
import { Toaster } from "@/components/ui/sonner";
import LanguageSetter from './LanguageSetter';
import { LogOut, Truck, Calendar, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const publicPaths = ['/login', '/signup'];

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isLoading: isGlobalLoading } = useLoading();
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentDateString, setCurrentDateString] = useState('');

  useEffect(() => {
    setCurrentDateString(new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }));
  }, []);

  // --- Authentication / Routing Logic ---
  useEffect(() => {
    if (!isAuthLoading) {
      const isPublicPath = publicPaths.includes(pathname || '');

      if (user && isPublicPath) {
        router.push('/');
      } else if (!user && !isPublicPath) {
        router.push('/login');
      }
    }
  }, [user, isAuthLoading, pathname, router]);

  // Show a clean loading screen while auth loads
  if (isAuthLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-charcoal text-white">
        <div className="w-12 h-12 rounded-2xl bg-lavender text-charcoal flex items-center justify-center mb-4 shadow-sm font-bold">
          <Truck className="w-6 h-6 stroke-[2]" />
        </div>
        <div className="text-sm font-bold tracking-tight text-white mb-1">
          Zikria Goods Transport Company
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-lavender animate-pulse" />
          Loading workspace...
        </div>
      </div>
    );
  }

  const isLoginPage = publicPaths.includes(pathname || '');

  if (isLoginPage) {
    return (
      <>
        <LanguageSetter />
        <main className="flex-1 overflow-y-auto bg-charcoal min-h-screen">
          {children}
        </main>
        <Toaster position="top-right" richColors />
        {isGlobalLoading && <CustomLoader />}
      </>
    );
  }

  // Prevent flash of dashboard if unauthenticated on protected route
  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-charcoal text-white">
        <div className="w-12 h-12 rounded-2xl bg-lavender text-charcoal flex items-center justify-center mb-4 shadow-sm font-bold">
          <Truck className="w-6 h-6 stroke-[2]" />
        </div>
        <div className="text-sm font-bold tracking-tight text-white mb-1">
          Zikria Goods Transport Company
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-lavender animate-pulse" />
          Authenticating session...
        </div>
      </div>
    );
  }

  // --- Authenticated Dashboard Layout ---
  return (
    <>
      <LanguageSetter />
      <div className="flex min-h-screen bg-[#F0F0F3] dark:bg-[#0E0E10] text-charcoal dark:text-zinc-100 transition-colors">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${isCollapsed ? 'ml-16' : 'ml-[250px]'}`}>
          {/* Crisp Enterprise Top Header */}
          <header className="sticky top-0 z-20 flex justify-between items-center px-6 py-3 bg-white dark:bg-[#18181B] border-b border-hairline dark:border-zinc-800 shadow-2xs transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-charcoal dark:bg-lavender text-white dark:text-charcoal flex items-center justify-center shrink-0 shadow-2xs">
                <Truck className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <div className="text-xs font-bold tracking-tight text-charcoal dark:text-white flex items-center gap-2">
                  <span>Zikria Goods Transport Company</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Sargodha Dispatch Hub
                </p>
              </div>
            </div>

            {/* Right: Date pill + User Dropdown Menu */}
            {user && (
              <div className="flex items-center gap-3">
                {currentDateString && (
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 bg-cardgray dark:bg-zinc-800/80 px-3 py-1.5 rounded-full border border-hairline dark:border-zinc-700 font-mono text-[11px] shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    {currentDateString}
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-hairline dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer focus:outline-none shadow-2xs group"
                    >
                      <div className="w-7 h-7 rounded-full bg-charcoal dark:bg-lavender text-white dark:text-charcoal flex items-center justify-center text-xs font-bold shrink-0">
                        {(user.username || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left hidden sm:block leading-tight">
                        <p className="text-xs font-bold text-charcoal dark:text-zinc-100">
                          {user.username}
                        </p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-400">
                          {user.role}
                        </p>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-charcoal dark:group-hover:text-white transition-colors" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-2xl bg-white dark:bg-zinc-900 border border-hairline dark:border-zinc-800 shadow-xl">
                    <div className="px-3 py-2">
                      <p className="text-xs font-bold text-charcoal dark:text-zinc-100">
                        {user.username}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-0.5">
                        {user.role}
                      </p>
                    </div>
                    <DropdownMenuSeparator className="my-1 border-hairline dark:border-zinc-800" />
                    <DropdownMenuItem
                      onClick={logout}
                      variant="destructive"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </header>

          {/* Main Workspace Content Area */}
          <main className="flex-1 p-4 sm:p-5 lg:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <Toaster position="top-right" richColors />
      {isGlobalLoading && <CustomLoader />}
    </>
  );
}
