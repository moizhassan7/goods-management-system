import React, { useState } from 'react';
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
        href: '/dashboard?view=add-trip',
        icon: Home,
        isAccordion: false,
    },
    {
        name: 'Shipment Operations',
        href: '', // Group header doesn't link to a page
        icon: Truck,
        isAccordion: false,
        items: [
            { name: 'Register New Shipment', href: '/dashboard?view=add-shipment', icon: Package },
            { name: 'View All Shipments', href: '/dashboard?view=view-shipments', icon: FileText },
        ],
    },
    {
        name: 'Delivery Operations',
        href: '', // Group header doesn't link to a page
        icon: Package2,
        isAccordion: false,
        items: [
            { name: 'Record Delivery', href: '/dashboard?view=add-delivery', icon: Package2 },
            { name: 'View Deliveries', href: '/dashboard?view=view-deliveries', icon: FileText },
        ],
    },
    {
        name: 'Trip Operations',
        href: '', // Group header doesn't link to a page
        icon: Truck,
        isAccordion: false,
        items: [
            { name: 'Add Trip', href: '/dashboard?view=add-trip', icon: Truck },
            { name: 'Trip Report', href: '/dashboard?view=trip-report', icon: FileText },
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
                    { name: 'Add City', href: '/dashboard?view=add-city' },
                    { name: 'View Cities', href: '/dashboard?view=view-cities' },
                ] 
            },
            { 
                name: 'Agencies', 
                icon: Building, 
                items: [
                    { name: 'Add Agency', href: '/dashboard?view=add-agency' },
                    { name: 'View Agencies', href: '/dashboard?view=view-agencies' },
                ] 
            },
            { 
                name: 'Vehicles', 
                icon: Car, 
                items: [
                    { name: 'Add Vehicle', href: '/dashboard?view=add-vehicle' },
                    { name: 'View Vehicles', href: '/dashboard?view=view-vehicles' },
                ] 
            },
            { 
                name: 'Parties', 
                icon: Users, 
                items: [
                    { name: 'Add Party', href: '/dashboard?view=add-party' },
                    { name: 'View Parties', href: '/dashboard?view=view-parties' },
                ] 
            },
            { 
                name: 'Items', 
                icon: Box, 
                items: [
                    { name: 'Add Item Type', href: '/dashboard?view=add-item' },
                    // Note: 'View Items' not implemented; keeping only add flow for now
                ] 
            },
        ],
    },
];

const Sidebar = ({ currentView, setView }) => {
    const [isExpanded, setIsExpanded] = useState(false); 
    // State to manage which master data accordion is open
    const [openAccordion, setOpenAccordion] = useState(null); 
    
    const transitionClass = 'transition-all duration-300 ease-in-out';
    const toggleSidebar = () => {
        setIsExpanded(!isExpanded);
        // Collapse all accordions when the sidebar itself collapses
        if (isExpanded) {
            setOpenAccordion(null); 
        }
    };
    
    const sidebarWidthClass = isExpanded ? 'w-64' : 'w-20'; 

    const isActiveView = (viewName) => currentView === viewName;

    // --- Helper function to render a basic link button ---
    const renderNavButton = (link, isSubItem = false) => {
        const viewName = link.href.split('=')[1];
        const isActive = isActiveView(viewName);
        const Icon = link.icon;

        return (
            <Button
                key={link.name}
                variant="ghost" 
                onClick={() => {
                    setView(viewName);
                }}
                className={`
                    w-full justify-start text-left py-2 h-auto transition-all duration-200
                    rounded-lg
                    ${isActive 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 font-bold' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white font-medium'
                    }
                    ${isExpanded ? 'px-4' : 'justify-center p-0 w-12 h-12 mx-auto'}
                    ${isSubItem && isExpanded ? 'pl-8' : ''} 
                `}
            >
                {/* Visual marker for sub-items in expanded mode */}
                {isExpanded && isSubItem && <ArrowRight className="w-4 h-4 mr-1 text-slate-400 shrink-0" />}

                {/* Main Icon (only for top-level links or when collapsed) */}
                {Icon && 
                    <Icon className={`w-5 h-5 ${isExpanded && !isSubItem ? 'mr-3' : isExpanded ? 'mr-2' : ''} shrink-0`} />
                }
                
                {/* Text Label */}
                {isExpanded && (
                    <span className="whitespace-nowrap overflow-hidden">
                        {link.name}
                    </span>
                )}
            </Button>
        );
    };

    // --- Helper function to render the Accordion (e.g., Cities menu) ---
    const renderAccordionItem = (entity) => {
        const Icon = entity.icon;
        const isOpen = openAccordion === entity.name;
        
        // Check if any sub-item is the current active view
        const isAnySubItemActive = entity.items.some(item => isActiveView(item.href.split('=')[1]));
        const highlightClass = isAnySubItemActive ? 'text-blue-400 font-semibold' : 'text-slate-300';
        
        return (
            <div key={entity.name} className="w-full">
                {/* Accordion Header Button */}
                <Button
                    variant="ghost" 
                    onClick={() => setOpenAccordion(isOpen ? null : entity.name)}
                    className={`
                        w-full justify-start text-left px-4 py-2 h-auto transition-all duration-200 rounded-lg
                        hover:bg-slate-700
                        ${isExpanded ? '' : 'justify-center p-0 w-12 h-12 mx-auto'}
                        ${highlightClass}
                    `}
                    title={entity.name}
                >
                    <Icon className={`w-5 h-5 ${isExpanded ? 'mr-3' : ''} shrink-0`} />
                    
                    {isExpanded && (
                        <>
                            <span className="whitespace-nowrap flex-grow text-left">
                                {entity.name}
                            </span>
                            {/* Toggle Indicator */}
                            {isOpen ? 
                                <ChevronUp className="w-4 h-4 shrink-0" /> : 
                                <ChevronDown className="w-4 h-4 shrink-0" />
                            }
                        </>
                    )}
                </Button>

                {/* Accordion Content (Sub-Items) */}
                {isExpanded && isOpen && (
                    <div className="space-y-1 mt-1 pb-2">
                        {entity.items.map(item => renderNavButton(item, true))}
                    </div>
                )}
                
                {/* Collapsed Accordion View (Icon only, no dropdown) */}
                {!isExpanded && (
                    // When collapsed, clicking the icon should still allow setting the view,
                    // but since the sub-items aren't visible, we can't link to them easily.
                    // For this simple accordion, we'll keep it icon-only and rely on the
                    // user expanding the menu to access sub-items.
                    // However, we can highlight the parent icon if a child is active.
                    <div className={`
                        absolute left-full top-0 ml-1 mt-1 w-48 bg-slate-800 rounded-md shadow-2xl z-40
                        ${isOpen && !isExpanded ? 'block' : 'hidden'} 
                    `}>
                        {/* If you wanted a flyout, this is where it would be. 
                            For simplicity, we'll keep the sub-items hidden when sidebar is collapsed.
                        */}
                    </div>
                )}
            </div>
        );
    }
    // --- End Accordion Helper ---

    return (
        <div 
            className={`
                ${sidebarWidthClass} 
                ${transitionClass}
                bg-slate-800 text-white p-4 min-h-screen border-r border-slate-700 shadow-xl
                bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col relative z-20
            `}
        >
            
            {/* Toggle Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className={`
                    absolute top-4 right-0 -translate-x-1/2 
                    bg-slate-700/50 hover:bg-slate-600/70 text-white rounded-full 
                    w-8 h-8 p-1 z-30 ${transitionClass}
                `}
                title={isExpanded ? 'Collapse Menu' : 'Expand Menu'}
            >
                {isExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </Button>

            {/* Header/Logo Section */}
            <div className={`flex items-center gap-3 mb-6 p-2 pb-4 ${isExpanded ? 'border-b border-slate-700' : 'justify-center'}`}>
                <div className='bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-lg shrink-0'>
                    <Truck className='w-6 h-6 text-white' />
                </div>
                {isExpanded && (
                    <h2 className={`text-xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300 ${transitionClass} whitespace-nowrap overflow-hidden`}>
                        Logistics App
                    </h2>
                )}
            </div>
            {/* --- */}


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
                    
                    // 2. Render simple group (Shipment Operations)
                    if (!section.isAccordion && section.items?.length > 0) {
                        const SectionIcon = section.icon;
                        return (
                            <div key={section.name}>
                                <div className={`flex items-center mb-1 ${isExpanded ? 'px-2' : 'justify-center'}`}>
                                    <SectionIcon className={`w-5 h-5 text-slate-400 ${isExpanded ? 'mr-3' : ''}`} />
                                    {isExpanded && (
                                        <h3 className='text-xs uppercase text-slate-400 font-semibold tracking-wider'>
                                            {section.name}
                                        </h3>
                                    )}
                                </div>
                                <div className={`space-y-1 ${isExpanded ? 'pl-2' : ''}`}>
                                    {section.items.map(link => renderNavButton(link, true))}
                                </div>
                            </div>
                        );
                    }

                    // 3. Render Master Data Accordion Group
                    if (section.isAccordion && section.entities) {
                        return (
                            <div key={section.name} className="space-y-1">
                                <div className={`flex items-center mb-1 ${isExpanded ? 'px-2' : 'justify-center'}`}>
                                    <ListChecks className={`w-5 h-5 text-slate-400 ${isExpanded ? 'mr-3' : ''}`} />
                                    {isExpanded && (
                                        <h3 className='text-xs uppercase text-slate-400 font-semibold tracking-wider'>
                                            {section.name}
                                        </h3>
                                    )}
                                </div>
                                <div className='space-y-1'>
                                    {section.entities.map(entity => renderAccordionItem(entity))}
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