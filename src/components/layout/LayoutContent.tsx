'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';
import { useAuth } from '@/contexts/AuthContext';
import CustomLoader from '@/components/ui/CustomLoader';
import Sidebar from '@/components/dashboard/Sidebar';
import { Toaster } from "@/components/ui/sonner";
import LanguageSetter from './LanguageSetter';
import { Button } from '@/components/ui/button';
import { LogOut, User, Truck, Calendar } from 'lucide-react';

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

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-lavender text-charcoal font-bold border-lavender';
      case 'ADMIN':
        return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      default:
        return 'bg-cardgray text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-hairline dark:border-zinc-700';
    }
  };

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

            {/* Right: Date pill + User Pill & Logout */}
            {user && (
              <div className="flex items-center gap-3">
                {currentDateString && (
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 bg-cardgray dark:bg-zinc-800/80 px-3 py-1.5 rounded-full border border-hairline dark:border-zinc-700 font-mono text-[11px] shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    {currentDateString}
                  </div>
                )}

                <div className="flex items-center gap-2.5 pl-3 border-l border-hairline dark:border-zinc-800">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-charcoal dark:text-zinc-200 flex items-center justify-end gap-1">
                      <User className="h-3.5 w-3.5 text-zinc-400" />
                      {user.username}
                    </p>
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full border ${getRoleBadgeStyle(user.role)}`}>
                      {user.role}
                    </span>
                  </div>

                  <Button
                    onClick={logout}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 rounded-full bg-cardgray dark:bg-zinc-800 text-zinc-700 hover:text-rose-700 hover:bg-rose-50 dark:text-zinc-300 dark:hover:bg-rose-950/40 border border-hairline dark:border-zinc-700 transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
                    title="Logout"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1 text-zinc-400" />
                    <span>Exit</span>
                  </Button>
                </div>
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
