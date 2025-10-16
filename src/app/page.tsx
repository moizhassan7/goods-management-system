'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// Imported Layout component
import Sidebar from '@/components/dashboard/Sidebar';



const Page = () => {
  const router = useRouter();

  return (
    <div className='flex min-h-screen'>
      <Sidebar />
      <main className='flex-1 p-4 overflow-y-auto'>
        <div className="container mx-auto py-10">
          <h1 className="text-3xl font-bold mb-6">Welcome to Goods Management System</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => router.push('/shipments/add')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Register New Shipment
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => router.push('/trips/add')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Add New Trip
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => router.push('/returns')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Manage Returns
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Page;