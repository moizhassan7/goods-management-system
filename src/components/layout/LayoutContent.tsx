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
import { LogOut, User, Truck, ShieldCheck, Calendar } from 'lucide-react';

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
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-900 text-white">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4 shadow-sm">
          <Truck className="w-6 h-6 text-white" />
        </div>
        <div className="text-sm font-bold tracking-tight text-white mb-1">
          Zikria Goods and Transport
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
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
        <main className="flex-1 overflow-y-auto bg-slate-900 min-h-screen">
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
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-900 text-white">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4 shadow-sm">
          <Truck className="w-6 h-6 text-white" />
        </div>
        <div className="text-sm font-bold tracking-tight text-white mb-1">
          Zikria Goods and Transport
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Authenticating session...
        </div>
      </div>
    );
  }

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'ADMIN':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  // --- Authenticated Dashboard Layout ---
  return (
    <>
      <LanguageSetter /> 
      <div className="flex min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
          {/* Crisp Enterprise Top Header */}
          <header className="sticky top-0 z-20 flex justify-between items-center px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Zikria Goods and Transport</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Sargodha, Pakistan
                </p>
              </div>
            </div>
            
            {/* Right: Date pill + User Pill & Logout */}
            {user && (
              <div className="flex items-center gap-3">
                {currentDateString && (
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {currentDateString}
                  </div>
                )}

                <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-end gap-1">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      {user.username}
                    </p>
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(user.role)}`}>
                      {user.role}
                    </span>
                  </div>

                  <Button 
                    onClick={logout} 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2.5 text-slate-700 hover:text-red-700 hover:bg-red-50 dark:text-slate-300 dark:hover:bg-red-950/40 border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-xs font-medium"
                    title="Logout"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1 text-slate-500" />
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
