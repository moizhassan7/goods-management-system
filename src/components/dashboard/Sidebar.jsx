import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
    Truck, FileText, MapPin, Users, Package,
    ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowRight, Home,
    Building, Car, Box, ListChecks, Package2
} from 'lucide-react';

// New hierarchical structure for navigation links
const sidebarNavSections = [
    {
        name: 'Dashboard', 
        href: '/',
        icon: Home,
        isAccordion: false,
    },
    {
        name: 'Shipment Operations',
        href: '', // Group header doesn't link to a page
        icon: Truck,
        isAccordion: false,
        items: [
            { name: 'Register New Shipment', href: '/shipments/add', icon: Package },
            { name: 'View All Shipments', href: '/shipments/view', icon: FileText },
        ],
    },
    {
        name: 'Returns',
        href: '',
        icon: Package2,
        isAccordion: false,
        items: [
            { name: 'Create Return', href: '/returns', icon: Package2 },
            { name: 'View Returns', href: '/returns', icon: FileText },
        ],
    },
    {
        name: 'Delivery Operations',
        href: '', // Group header doesn't link to a page
        icon: Package2,
        isAccordion: false,
        items: [
            { name: 'Record Delivery', href: '/deliveries/add', icon: Package2 },
            { name: 'View Deliveries', href: '/deliveries/view', icon: FileText },
        ],
    },
    {
        name: 'Trip Operations',
        href: '', // Group header doesn't link to a page
        icon: Truck,
        isAccordion: false,
        items: [
            { name: 'Add Trip', href: '/trips/add', icon: Truck },
            { name: 'Trip Report', href: '/trips/report', icon: FileText },
        ],
    },
    {
        name: 'Master Data',
        href: '',
        icon: ListChecks,
        isAccordion: true, // This entire section uses an accordion pattern
        entities: [ // Nested list of accordion items (Cities, Agencies, etc.)
            { 
                name: 'Cities', 
                icon: MapPin, 
                items: [
                    { name: 'Add City', href: '/cities/add' },
                    { name: 'View Cities', href: '/cities/view' },
                ] 
            },
            { 
                name: 'Agencies', 
                icon: Building, 
                items: [
                    { name: 'Add Agency', href: '/agency/add' },
                    { name: 'View Agencies', href: '/agency/view' },
                ] 
            },
            { 
                name: 'Vehicles', 
                icon: Car, 
                items: [
                    { name: 'Add Vehicle', href: '/vehicles/add' },
                    { name: 'View Vehicles', href: '/vehicles/view' },
                ] 
            },
            { 
                name: 'Parties', 
                icon: Users, 
                items: [
                    { name: 'Add Party', href: '/parties/add' },
                    { name: 'View Parties', href: '/parties/view' },
                ] 
            },
            { 
                name: 'Items', 
                icon: Box, 
                items: [
                    { name: 'Add Item Type', href: '/items/add' },
                    { name: 'View Items', href: '/items/view' },
                ] 
            },
        ],
    },
];

const Sidebar = () => {
    // No expand/collapse, always expanded for server component simplicity
    const sidebarWidthClass = 'w-64';
    const transitionClass = 'transition-all duration-300 ease-in-out';
    // Helper function to render a basic link button
    const renderNavButton = (link, isSubItem = false) => {
        const Icon = link.icon;
        return (
            <Link 
                href={link.href} 
                key={link.name}
                className={`w-full flex items-center text-left py-2 h-auto transition-all duration-200 rounded-lg px-4
                    text-slate-300 hover:bg-slate-700 hover:text-white font-medium
                    ${isSubItem ? 'pl-8' : ''}`}
            >
                {isSubItem && <ArrowRight className="w-4 h-4 mr-1 text-slate-400 shrink-0" />}
                {Icon && <Icon className="w-5 h-5 mr-3 shrink-0" />}
                <span className="whitespace-nowrap overflow-hidden">{link.name}</span>
            </Link>
        );
    };

    // Helper for master data section (no accordion, just a group)
    const renderEntityGroup = (entity) => {
        const Icon = entity.icon;
        return (
            <div key={entity.name} className="w-full">
                <div className="flex items-center mb-1 px-2">
                    <Icon className="w-5 h-5 text-slate-400 mr-3" />
                    <h3 className='text-xs uppercase text-slate-400 font-semibold tracking-wider'>{entity.name}</h3>
                </div>
                <div className="space-y-1 pl-2">
                    {entity.items.map(item => renderNavButton(item, true))}
                </div>
            </div>
        );
    };

    return (
        <div 
            className={`w-64 ${transitionClass} bg-slate-800 text-white p-4 min-h-screen border-r border-slate-700 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col relative z-20`}
        >
            {/* Header/Logo Section */}
            <div className="flex items-center gap-3 mb-6 p-2 pb-4 border-b border-slate-700">
                <div className='bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-lg shrink-0'>
                    <Truck className='w-6 h-6 text-white' />
                </div>
                <h2 className="text-xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300 whitespace-nowrap overflow-hidden">
                    Logistics App
                </h2>
            </div>
            {/* Navigation Links */}
            <nav className="space-y-6 flex-grow overflow-y-auto">
                {sidebarNavSections.map((section) => {
                    // 1. Render simple link (Dashboard)
                    if (!section.isAccordion && section.items?.length === 0) {
                        return (
                            <div key={section.name}>
                                {renderNavButton(section)}
                            </div>
                        );
                    }
                    // 2. Render simple group (Shipment Operations, etc.)
                    if (!section.isAccordion && section.items?.length > 0) {
                        const SectionIcon = section.icon;
                        return (
                            <div key={section.name}>
                                <div className="flex items-center mb-1 px-2">
                                    <SectionIcon className="w-5 h-5 text-slate-400 mr-3" />
                                    <h3 className='text-xs uppercase text-slate-400 font-semibold tracking-wider'>
                                        {section.name}
                                    </h3>
                                </div>
                                <div className="space-y-1 pl-2">
                                    {section.items.map(link => renderNavButton(link, true))}
                                </div>
                            </div>
                        );
                    }
                    // 3. Render Master Data Group
                    if (section.isAccordion && section.entities) {
                        return (
                            <div key={section.name} className="space-y-1">
                                <div className="flex items-center mb-1 px-2">
                                    <ListChecks className="w-5 h-5 text-slate-400 mr-3" />
                                    <h3 className='text-xs uppercase text-slate-400 font-semibold tracking-wider'>
                                        {section.name}
                                    </h3>
                                </div>
                                <div className='space-y-1'>
                                    {section.entities.map(entity => renderEntityGroup(entity))}
                                </div>
                            </div>
                        );
                    }
                    return null;
                })}
            </nav>
        </div>
    );
};

export default Sidebar;