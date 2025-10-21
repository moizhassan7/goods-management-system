import React, { useState } from 'react';
import Link from 'next/link';
import { 
    Truck, FileText, MapPin, Users, Package,
    ChevronDown, ChevronUp, ArrowRight, Home,
    Building, Car, Box, ListChecks, Package2, DollarSign, UserCog, ClipboardList, CheckCircle, 
    ChevronLeft, ChevronRight, Globe // <-- ADDED: Globe icon
} from 'lucide-react';
// <-- ADDED IMPORTS FOR TRANSLATION AND TOGGLE
import { useTranslation } from '@/lib/i18n';
import { ToggleGroup } from '@/components/ui/toggle-group'; 
import { ToggleGroupItem } from '@/components/ui/toggle-group'; 

// --- Color Palette Variables ---
const BG_DEEP = 'bg-[#03045e]'; // Deep Navy/Indigo
const ACCENT_COLOR = '#023e8a'; // Sapphire Blue
const ACCENT_BG = 'bg-[#023e8a]';
const TEXT_PRIMARY = 'text-white';
const TEXT_SECONDARY = 'text-gray-300';
const HOVER_BG = 'hover:bg-[#023e8a]/30'; 

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
    const { t, locale, setLocale } = useTranslation(); // <-- UPDATED
    
    // Adjusted width to 'w-72' (18rem) for expanded state to fit the company name
    const sidebarWidth = isCollapsed ? 'w-20' : 'w-72'; 
    const ToggleIcon = isCollapsed ? ChevronRight : ChevronLeft;

    // NEW: Language Selector Component
    const LanguageSelector = ({ isCollapsed }) => (
        <div className={`mt-4 pt-4 border-t border-[#023e8a]/30 ${isCollapsed ? 'p-0' : 'p-2'}`}>
            {!isCollapsed && <p className={`text-sm font-semibold mb-2 ${TEXT_PRIMARY} flex items-center gap-2`}>
                <Globe className={`w-4 h-4 shrink-0 text-[${ACCENT_COLOR}]`} />
                {t('language_selector')}
            </p>}
            <ToggleGroup 
                type="single" 
                value={locale} 
                onValueChange={(value) => {
                    if (value) {
                        setLocale(value);
                    }
                }}
                className={isCollapsed ? 'flex justify-center' : 'flex'}
                size={isCollapsed ? 'sm' : 'default'}
                variant='outline'
            >
                <ToggleGroupItem value="en" aria-label="Toggle English" className={`flex-1 ${isCollapsed ? 'px-2 py-0' : ''}`}>
                    {isCollapsed ? 'EN' : t('language_english')}
                </ToggleGroupItem>
                <ToggleGroupItem value="ur" aria-label="Toggle Urdu" className={`flex-1 ${isCollapsed ? 'px-2 py-0' : ''}`}>
                    {isCollapsed ? 'UR' : t('language_urdu')}
                </ToggleGroupItem>
            </ToggleGroup>
        </div>
    );


    // Mapped Nav Sections using Translation Keys
    const sidebarNavSections = [
        { name: t('nav_dashboard'), href: '/', icon: Home, translationKey: 'nav_dashboard' },
        {
            name: t('nav_shipment_operations'),
            icon: Truck,
            translationKey: 'nav_shipment_operations',
            links: [ 
                { name: t('nav_register_new_shipment'), href: '/shipments/add', icon: Package, translationKey: 'nav_register_new_shipment' },
                { name: t('nav_view_search_shipments'), href: '/shipments/view', icon: FileText, translationKey: 'nav_view_search_shipments' },
                { name: t('nav_shipments_report'), href: '/shipments/report', icon: FileText, translationKey: 'nav_shipments_report' },
            ]
        },
        {
            name: t('nav_delivery_management'),
            icon: Package2,
            translationKey: 'nav_delivery_management',
            links: [
                { name: t('nav_record_new_delivery'), href: '/deliveries/add', icon: Package2, translationKey: 'nav_record_new_delivery' },
                { name: t('nav_delivery_approvals'), href: '/deliveries/approval', icon: CheckCircle, translationKey: 'nav_delivery_approvals' }, 
                { name: t('nav_view_delivery_records'), href: '/deliveries/view', icon: FileText, translationKey: 'nav_view_delivery_records' },
                { name: t('nav_delivery_expenses_report'), href: '/deliveries/report', icon: FileText, translationKey: 'nav_delivery_expenses_report' },
                { name: 'Combined Expense Report', href: '/deliveries/expense-report', icon: DollarSign }, 
            ]
        },
        {
            name: t('nav_trip_vehicle_logs'),
            icon: Car,
            translationKey: 'nav_trip_vehicle_logs',
            links: [
                { name: t('nav_add_trip_log'), href: '/trips/add', icon: Truck, translationKey: 'nav_add_trip_log' },
                { name: t('nav_trip_log_report'), href: '/trips/report', icon: FileText, translationKey: 'nav_trip_log_report' },
                { name: t('nav_vehicle_financial_ledgers'), href: '/vehicles/ledgers', icon: DollarSign, translationKey: 'nav_vehicle_financial_ledgers' }, 
            ]
        },
        {
            name: t('nav_labour_management'),
            icon: UserCog,
            translationKey: 'nav_labour_management',
            subSections: [
                {
                    name: t('nav_labour_persons'),
                    icon: Users,
                    translationKey: 'nav_labour_persons',
                    links: [
                        { name: t('nav_add_person'), href: '/labour-persons/add', translationKey: 'nav_add_person' },
                        { name: t('nav_view_persons'), href: '/labour-persons/view', translationKey: 'nav_view_persons' },
                        { name: t('nav_person_report'), href: '/labour-persons/report', translationKey: 'nav_person_report' },
                    ]
                },
                {
                    name: t('nav_assignments'),
                    icon: ClipboardList,
                    translationKey: 'nav_assignments',
                    links: [
                        { name: t('nav_assign_shipments'), href: '/labour-assignments/add', translationKey: 'nav_assign_shipments' },
                        { name: t('nav_view_settle_assignments'), href: '/labour-settlements', icon: DollarSign, translationKey: 'nav_view_settle_assignments' }, 
                        { name: t('nav_assignments_report'), href: '/labour-assignments/report', translationKey: 'nav_assignments_report' },
                    ]
                },
            ]
        },
        {
            name: t('nav_master_data'),
            icon: ListChecks,
            translationKey: 'nav_master_data',
            subSections: [
                { 
                    name: t('nav_parties'), 
                    icon: Users, 
                    translationKey: 'nav_parties',
                    links: [
                        { name: t('nav_add_party'), href: '/parties/add', translationKey: 'nav_add_party' },
                        { name: t('nav_view_parties'), href: '/parties/view', translationKey: 'nav_view_parties' },
                        { name: t('nav_parties_report'), href: '/parties/report', translationKey: 'nav_parties_report' },
                    ] 
                },
                { 
                    name: t('nav_vehicles'), 
                    icon: Car, 
                    translationKey: 'nav_vehicles',
                    links: [
                        { name: t('nav_add_vehicle'), href: '/vehicles/add', translationKey: 'nav_add_vehicle' },
                        { name: t('nav_view_vehicles'), href: '/vehicles/view', translationKey: 'nav_view_vehicles' },
                        { name: t('nav_vehicles_report'), href: '/vehicles/report', translationKey: 'nav_vehicles_report' },
                    ] 
                },
                { 
                    name: t('nav_cities'), 
                    icon: MapPin, 
                    translationKey: 'nav_cities',
                    links: [
                        { name: t('nav_add_city'), href: '/cities/add', translationKey: 'nav_add_city' },
                        { name: t('nav_view_cities'), href: '/cities/view', translationKey: 'nav_view_cities' },
                        { name: t('nav_cities_report'), href: '/cities/report', translationKey: 'nav_cities_report' },
                    ] 
                },
                { 
                    name: t('nav_agencies'), 
                    icon: Building, 
                    translationKey: 'nav_agencies',
                    links: [
                        { name: t('nav_add_agency'), href: '/agency/add', translationKey: 'nav_add_agency' },
                        { name: t('nav_view_agencies'), href: '/agency/view', translationKey: 'nav_view_agencies' },
                        { name: t('nav_agency_report'), href: '/agency/report', translationKey: 'nav_agency_report' },
                    ] 
                },
                { 
                    name: t('nav_items'), 
                    icon: Box, 
                    translationKey: 'nav_items',
                    links: [
                        { name: t('nav_add_item_type'), href: '/items/add', translationKey: 'nav_add_item_type' },
                        { name: t('nav_items_report'), href: '/items/report', translationKey: 'nav_items_report' },
                    ] 
                },
                 {
                    name: t('nav_returns'),
                    icon: Package2,
                    translationKey: 'nav_returns',
                    links: [
                        { name: t('nav_create_return'), href: '/returns', translationKey: 'nav_create_return' },
                        { name: t('nav_returns_report'), href: '/returns/report', translationKey: 'nav_returns_report' },
                    ]
                 }
            ]
        }
    ];

    return (
        <div 
            className={`${sidebarWidth} ${transitionClass} ${TEXT_PRIMARY} p-4 min-h-screen border-r border-[#023e8a]/30 shadow-xl ${BG_DEEP} flex flex-col relative z-20`}
        >
            {/* Header/Logo Section */}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} mb-6 p-2 pb-4 border-b border-[#023e8a]/30`}>
                
                {!isCollapsed && (
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
                            <SidebarLink key={section.href} link={section} isCollapsed={isCollapsed} />
                        );
                    }
                    return (
                        <SidebarCollapsibleSection key={section.name} section={section} isCollapsed={isCollapsed} />
                    );
                })}
            </nav>

            {/* Language Selector and Toggle Button */}
            <LanguageSelector isCollapsed={isCollapsed} />
            
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