'use client';

import { useLoading } from '@/contexts/LoadingContext';
import CustomLoader from '@/components/ui/CustomLoader';
import Sidebar from '@/components/dashboard/Sidebar';
import { Toaster } from "@/components/ui/sonner";
import LanguageSetter from './LanguageSetter'; // <-- ADDED IMPORT

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isLoading } = useLoading();

  return (
    <>
      <LanguageSetter /> {/* <-- ADDED: To dynamically set lang/dir on <html> */}
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-4 overflow-y-auto">
          {children}
        </main>
      </div>
      <Toaster />
      {isLoading && <CustomLoader />}
    </>
  );
}