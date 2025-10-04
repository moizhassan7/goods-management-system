'use client';

import React, { useState } from 'react';

// Imported UI components (Assuming these are generic for the layout)
import { Button } from '@/components/ui/button'; 
import { Input } from '@/components/ui/input'; 
// Imported Layout component
import Sidebar from '@/components/dashboard/Sidebar'; 

// Imported Project Pages
import AddCity from './cities/add/page';
import ViewCities from './cities/view/page';
import AddAgency from './agency/add/page';
import ViewAgencies from './agency/view/page';
import AddVehicle from './vehicles/add/page';
import ViewVehicles from './vehicles/view/page';
import AddParty from './parties/add/page';
import ViewParties from './parties/view/page';
import AddItem from './items/add/page';
import AddShipment from './shipments/add/page';
import AddDelivery from './deliveries/add/page';
import ViewDeliveries from './deliveries/view/page';

/**
 * A helper function to map the view state to the correct component.
 */
const renderComponent = (currentView: string | null) => {
  switch (currentView) {
    case 'add-city':
      return <AddCity />;
    case 'view-cities':
      return <ViewCities />;
    case 'add-agency':
      return <AddAgency />;
    case 'view-agencies':
      return <ViewAgencies />;
    case 'add-vehicle':
      return <AddVehicle />;
    case 'view-vehicles':
      return <ViewVehicles />;
    case 'add-party':
      return <AddParty />;
    case 'view-parties':
      return <ViewParties />;
    case 'add-item':
      return <AddItem />;
    case 'add-shipment':
      return <AddShipment />;
    case 'add-delivery':
      return <AddDelivery />;
    case 'view-deliveries':
      return <ViewDeliveries />;
    default:
      // A welcome or default dashboard view
      return <div className="p-8">
               <h1 className="text-3xl font-bold mb-4">Welcome to the Logistics Dashboard!</h1>
               <p>Please select an option from the sidebar to manage data.</p>
             </div>;
  }
};

const Page = () => {
  // Use state to keep track of the currently selected view/component
  // Default to a null view, or 'add-shipment', etc.
  const [currentView, setCurrentView] = useState<string | null>(null); 

  return (
    <div className="flex min-h-screen">
      
      {/* 1. Sidebar for Navigation */}
      <Sidebar currentView={currentView} setView={setCurrentView} />

      {/* 2. Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto">
        {/* Render the selected component based on the state */}
        {renderComponent(currentView)}
      </main>
      
    </div>
  );
};

export default Page;