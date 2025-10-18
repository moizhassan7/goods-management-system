import React, { useState } from 'react';
import Link from 'next/link';
import { 
    Truck, FileText, MapPin, Users, Package,
    ChevronDown, ChevronUp, ArrowRight, Home,
    Building, Car, Box, ListChecks, Package2, DollarSign, UserCog, ClipboardList, CheckCircle, 
    ChevronLeft, ChevronRight 
} from 'lucide-react';

// --- Color Palette Variables ---
const BG_DEEP = 'bg-[#03045e]'; // Deep Navy/Indigo
const ACCENT_COLOR = '#023e8a'; // Sapphire Blue
const ACCENT_BG = 'bg-[#023e8a]';
const TEXT_PRIMARY = 'text-white';
const TEXT_SECONDARY = 'text-gray-300';
const HOVER_BG = 'hover:bg-[#023e8a]/30'; 

const sidebarNavSections = [
    { name: 'Dashboard', href: '/', icon: Home, },
    {
        name: 'Shipment Operations',
        icon: Truck,
        links: [ 
            { name: 'Register New Shipment', href: '/shipments/add', icon: Package },
            { name: 'View/Search Shipments', href: '/shipments/view', icon: FileText },
            { name: 'Shipments Report', href: '/shipments/report', icon: FileText },
        ]
    },
    {
        name: 'Delivery Management',
        icon: Package2,
        links: [
            { name: 'Record New Delivery', href: '/deliveries/add', icon: Package2 },
            { name: 'Delivery Approvals', href: '/deliveries/approval', icon: CheckCircle }, 
            { name: 'View Delivery Records', href: '/deliveries/view', icon: FileText },
            { name: 'Delivery Expenses Report', href: '/deliveries/report', icon: FileText },
        ]
    },
    {
        name: 'Trip & Vehicle Logs',
        icon: Car,
        links: [
            { name: 'Add Trip Log', href: '/trips/add', icon: Truck },
            { name: 'Trip Log Report', href: '/trips/report', icon: FileText },
            { name: 'Vehicle Financial Ledgers', href: '/vehicles/ledgers', icon: DollarSign }, 
        ]
    },
    {
        name: 'Labour Management',
        icon: UserCog,
        subSections: [
            {
                name: 'Labour Persons',
                icon: Users,
                links: [
                    { name: 'Add Person', href: '/labour-persons/add' },
                    { name: 'View Persons', href: '/labour-persons/view' },
                    { name: 'Person Report', href: '/labour-persons/report' },
                ]
            },
            {
                name: 'Assignments',
                icon: ClipboardList,
                links: [
                    { name: 'Assign Shipments', href: '/labour-assignments/add' },
                    { name: 'View & Settle Assignments', href: '/labour-settlements', icon: DollarSign }, 
                    { name: 'Assignments Report', href: '/labour-assignments/report' },
                ]
            },
        ]
    },
    {
        name: 'Master Data',
        icon: ListChecks,
        subSections: [
            { 
                name: 'Parties (Sender/Receiver)', 
                icon: Users, 
                links: [
                    { name: 'Add Party', href: '/parties/add' },
                    { name: 'View Parties', href: '/parties/view' },
                    { name: 'Parties Report', href: '/parties/report' },
                ] 
            },
            { 
                name: 'Vehicles', 
                icon: Car, 
                links: [
                    { name: 'Add Vehicle', href: '/vehicles/add' },
                    { name: 'View Vehicles', href: '/vehicles/view' },
                    { name: 'Vehicles Report', href: '/vehicles/report' },
                ] 
            },
            { 
                name: 'Cities', 
                icon: MapPin, 
                links: [
                    { name: 'Add City', href: '/cities/add' },
                    { name: 'View Cities', href: '/cities/view' },
                    { name: 'Cities Report', href: '/cities/report' },
                ] 
            },
            { 
                name: 'Agencies', 
                icon: Building, 
                links: [
                    { name: 'Add Agency', href: '/agency/add' },
                    { name: 'View Agencies', href: '/agency/view' },
                    { name: 'Agency Report', href: '/agency/report' },
                ] 
            },
            { 
                name: 'Items', 
                icon: Box, 
                links: [
                    { name: 'Add Item Type', href: '/items/add' },
                    { name: 'Items Report', href: '/items/report' },
                ] 
            },
             {
                name: 'Returns',
                icon: Package2,
                links: [
                    { name: 'Create Return', href: '/returns' },
                    { name: 'Returns Report', href: '/returns/report' },
                ]
             }
        ]
    }
];

// Single Link Component
const SidebarLink = ({ link, isSubItem = false, isNestedSubItem = false, isCollapsed }) => {
    const Icon = link.icon;
    
    let paddingClass = 'px-4';
    if (!isCollapsed) {
        paddingClass = isNestedSubItem ? 'pl-12' : isSubItem ? 'pl-8' : 'pl-4';
    } else {
        paddingClass = 'p-3 justify-center'; 
    }

    const textSize = isNestedSubItem ? 'text-sm' : 'text-base';
    const textColor = isNestedSubItem ? TEXT_SECONDARY : TEXT_PRIMARY; 

    return (
        <Link 
            href={link.href} 
            key={link.name}
            className={`w-full flex items-center text-left py-2 h-auto transition-all duration-200 rounded-lg pr-4 
                ${textColor} ${HOVER_BG} font-medium ${textSize} ${paddingClass} ${isCollapsed ? 'w-auto' : 'w-full'}`}
        >
            {/* Show nested arrows only when expanded */}
            {(!isCollapsed && (isSubItem || isNestedSubItem)) && <ArrowRight className={`w-4 h-4 mr-1 text-[${ACCENT_COLOR}] shrink-0`} />}
            
            {/* Show main icon, use accent color for main icons */}
            {Icon && !isNestedSubItem && <Icon className={`w-5 h-5 shrink-0 text-[${ACCENT_COLOR}] ${isCollapsed ? '' : 'mr-3'}`} />}

            {/* Show link name only when expanded */}
            {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{link.name}</span>}
        </Link>
    );
};

// Toggle-able Section Component 
const SidebarCollapsibleSection = ({ section, isCollapsed }) => {
    const [isOpen, setIsOpen] = useState(false);
    const SectionIcon = section.icon;
    const ToggleIcon = isOpen ? ChevronUp : ChevronDown;

    const toggleOpen = () => setIsOpen(!isOpen);

    // If collapsed, only show the icon
    if (isCollapsed) {
        return (
            <button
                onClick={toggleOpen}
                className={`w-full flex items-center justify-center p-3 transition-colors rounded-lg ${TEXT_PRIMARY} ${HOVER_BG}`}
                title={section.name}
            >
                <SectionIcon className={`w-5 h-5 shrink-0 text-[${ACCENT_COLOR}]`} />
            </button>
        )
    }

    // Expanded view
    return (
        <div className="w-full">
            <button
                onClick={toggleOpen}
                className={`w-full flex items-center justify-between text-left py-2 pr-4 transition-colors p-2 rounded-lg 
                    ${TEXT_PRIMARY} hover:text-white ${HOVER_BG}`}
            >
                <div className='flex items-center'>
                    <SectionIcon className={`w-5 h-5 mr-3 shrink-0 text-[${ACCENT_COLOR}]`} />
                    <span className="font-semibold">{section.name}</span>
                </div>
                <ToggleIcon className="w-5 h-5 shrink-0" />
            </button>

            {/* Content Area */}
            {isOpen && (
                <div className="space-y-1 py-1 transition-all duration-300 ease-in-out overflow-hidden">
                    {/* Render Direct Links */}
                    {section.links && section.links.map((link, index) => (
                        <SidebarLink key={index} link={link} isSubItem={true} isCollapsed={isCollapsed} />
                    ))}

                    {/* Render Nested Sub-Sections */}
                    {section.subSections && section.subSections.map((subSection, index) => (
                        <div key={index} className='pl-4'>
                            <SidebarNestedList subSection={subSection} isCollapsed={isCollapsed} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Nested List Component (Only visible when expanded)
const SidebarNestedList = ({ subSection, isCollapsed }) => {
    const [isNestedOpen, setIsNestedOpen] = useState(false);
    const SubSectionIcon = subSection.icon;
    const ToggleIcon = isNestedOpen ? ChevronUp : ChevronDown;

    const toggleNestedOpen = () => setIsNestedOpen(!isNestedOpen);
    
    if (isCollapsed) return null;

    return (
        <div className="w-full">
            <button
                onClick={toggleNestedOpen}
                className={`w-full flex items-center justify-between text-left py-2 pr-4 transition-colors rounded-lg 
                    text-sm ${TEXT_SECONDARY} hover:text-white ${HOVER_BG} pl-4`}
            >
                <div className='flex items-center'>
                    <SubSectionIcon className={`w-4 h-4 mr-3 shrink-0 text-[${ACCENT_COLOR}]`} />
                    <span className="font-medium">{subSection.name}</span>
                </div>
                <ToggleIcon className="w-4 h-4 shrink-0" />
            </button>

            {/* Nested Links */}
            {isNestedOpen && (
                <div className='space-y-1 py-1'>
                    {subSection.links.map((link, linkIndex) => (
                        <SidebarLink key={linkIndex} link={link} isNestedSubItem={true} isCollapsed={isCollapsed} /> 
                    ))}
                </div>
            )}
        </div>
    );
};


const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const transitionClass = 'transition-all duration-300 ease-in-out';
    
    // Adjusted width to 'w-72' (18rem) for expanded state to fit the company name
    const sidebarWidth = isCollapsed ? 'w-20' : 'w-72'; 
    const ToggleIcon = isCollapsed ? ChevronRight : ChevronLeft;

    return (
        <div 
            className={`${sidebarWidth} ${transitionClass} ${TEXT_PRIMARY} p-4 min-h-screen border-r border-[#023e8a]/30 shadow-xl ${BG_DEEP} flex flex-col relative z-20`}
        >
            {/* Header/Logo Section */}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} mb-6 p-2 pb-4 border-b border-[#023e8a]/30`}>
                
                {!isCollapsed && (
                    // Slightly reduced text size to 'text-lg' from 'text-xl' to ensure it fits better, 
                    // and removed 'overflow-hidden' as the width is now sufficient.
                    <h2 className={`text-lg font-extrabold tracking-wide whitespace-nowrap text-[${ACCENT_COLOR}] w-full `}>
                        Zikria Goods Transports Company
                    </h2>
                )}
            </div>
            
            {/* Navigation Links */}
            <nav className="space-y-2 flex-grow overflow-y-auto">
                {sidebarNavSections.map((section) => {
                    if (section.href) {
                        return (
                            <SidebarLink key={section.name} link={section} isCollapsed={isCollapsed} />
                        );
                    }
                    return (
                        <SidebarCollapsibleSection key={section.name} section={section} isCollapsed={isCollapsed} />
                    );
                })}
            </nav>

            {/* Footer/Toggle Button */}
            <div className={`mt-4 pt-4 border-t border-[#023e8a]/30 ${isCollapsed ? 'justify-center' : 'justify-end'} flex`}>
                 <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`flex items-center p-2 rounded-full text-[${ACCENT_COLOR}] ${HOVER_BG} transition-colors`}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <ToggleIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
 
export default Sidebar;