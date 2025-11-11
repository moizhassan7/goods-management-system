// src/moizhassan7/goods-management-system/goods-management-system-36a96deb04db0b296f5178c3c6a89a34c19278dd/src/components/layout/LayoutContent.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation'; // Added useRouter and usePathname
import { useLoading } from '@/contexts/LoadingContext';
import { useAuth } from '@/contexts/AuthContext'; // NEW
import CustomLoader from '@/components/ui/CustomLoader';
import Sidebar from '@/components/dashboard/Sidebar';
import { Toaster } from "@/components/ui/sonner";
import LanguageSetter from './LanguageSetter';
import { Button } from '@/components/ui/button'; // NEW
import { LogOut, User } from 'lucide-react'; // NEW

const publicPaths = ['/login', '/signup'];

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isLoading: isGlobalLoading } = useLoading();
  const { user, isLoading: isAuthLoading, logout } = useAuth(); // NEW: Use auth context
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // --- Authentication / Routing Logic ---
  useEffect(() => {
    // If auth loading is complete
    if (!isAuthLoading) {
      const isPublicPath = publicPaths.includes(pathname || '');

      if (user && isPublicPath) {
        // User is logged in and trying to access login/signup -> Redirect to Dashboard
        router.push('/');
      } else if (!user && !isPublicPath) {
        // User is NOT logged in and trying to access a protected page -> Redirect to Login
        router.push('/login');
      }
    }
  }, [user, isAuthLoading, pathname, router]);

  // --- Custom Close Confirmation ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Do you want to close this tab?'; // Custom message
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Show a full-screen loading spinner while the initial auth check is running
  if (isAuthLoading) {
    return (
       <div className='flex justify-center items-center min-h-screen'>
    <div className='text-4xl font-extrabold text-blue-600 flex space-x-1'>
        {/* We apply the bounce animation to each letter, 
            using arbitrary values for 'animation-delay' to stagger them.
        */}
        <span className="animate-bounce [animation-delay:-0.45s]">Z</span>
        <span className="animate-bounce [animation-delay:-0.30s]">G</span>
        <span className="animate-bounce [animation-delay:-0.15s]">T</span>
        <span className="animate-bounce">C</span>
    </div>
</div>
        
    );
  }

  const isLoginPage = publicPaths.includes(pathname || '');
  
  // If the user is on login/signup page OR not logged in yet, just render the children (login/signup form)
  if (isLoginPage) {
    return (
      <>
        <LanguageSetter />
        <main className="flex-1 p-4 overflow-y-auto">
            {children}
        </main>
        <Toaster />
        {isGlobalLoading && <CustomLoader />}
      </>
    );
  }

  // --- Authenticated Dashboard Layout ---
  return (
    <>
      <LanguageSetter /> 
      <div className="flex min-h-screen">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-20' : 'ml-72'}`}>
            {/* Header with User Info and Logout */}
            <header className="flex justify-between items-center p-4 bg-white border-b shadow-sm sticky top-0 z-10">
                  <h1 className="text-xl font-bold text-gray-800 pl-8">
                                             Zikria Goods Transports Company

                  </h1>
                
                {/* User Info and Logout Button (Top Right Corner) */}
                {user && (
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="font-semibold text-gray-800 flex items-center gap-1">
                                <User className="h-4 w-4 text-blue-600"/>
                                {user.username}
                            </p>
                            <p className="text-xs text-gray-500">
                                Role: <span className='font-medium text-blue-700'>{user.role}</span>
                            </p>
                        </div>
                        <Button 
                            onClick={logout} 
                            variant="outline" 
                            size="icon" 
                            className="text-red-500 hover:bg-red-50 hover:text-red-600 border-red-300"
                            title="Logout"
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </header>
            
            {/* Main Content Area */}
            <main className="flex-1 p-4 overflow-y-auto">
                {children}
            </main>
        </div>
      </div>
      <Toaster />
      {isGlobalLoading && <CustomLoader />}
    </>
  );
}
