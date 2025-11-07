import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
    Truck, FileText, MapPin, Users, Package,
    ChevronDown, ChevronUp, ArrowRight, Home,
    Building, Car, Box, ListChecks, Package2, DollarSign, UserCog, ClipboardList, CheckCircle, 
    ChevronLeft, ChevronRight, Globe 
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { ToggleGroup } from '@/components/ui/toggle-group'; 
import { ToggleGroupItem } from '@/components/ui/toggle-group'; 

// NEW: Import useAuth and usePermission
import { useAuth } from '@/contexts/AuthContext'; 
import { usePermission } from '@/hooks/use-permission';

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
    // Filter visible links based on roles (added link.isVisible property)
    const visibleLinks = section.links?.filter(link => link.isVisible);
    const visibleSubSections = section.subSections?.filter(subSection => 
        subSection.links.some(link => link.isVisible)
    );

    const toggleOpen = () => setIsOpen(!isOpen);

    // Only render the section if it contains visible links or sub-sections
    if (!visibleLinks?.length && !visibleSubSections?.length) return null;

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
                    {visibleLinks.map((link, index) => (
                        <SidebarLink key={index} link={link} isSubItem={true} isCollapsed={isCollapsed} />
                    ))}

                    {/* Render Nested Sub-Sections */}
                    {visibleSubSections.map((subSection, index) => (
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
    
    const visibleLinks = subSection.links.filter(link => link.isVisible);

    if (isCollapsed || visibleLinks.length === 0) return null;

    const toggleNestedOpen = () => setIsNestedOpen(!isNestedOpen);

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
                    {visibleLinks.map((link, linkIndex) => (
                        <SidebarLink key={linkIndex} link={link} isNestedSubItem={true} isCollapsed={isCollapsed} /> 
                    ))}
                </div>
            )}
        </div>
    );
};


const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
    const { user, isAuthLoading } = useAuth();
    const { hasPermission } = usePermission();

    // Quick escape if authentication is still loading
    if (isAuthLoading) return null;

    const transitionClass = 'transition-all duration-300 ease-in-out';
    const { t, locale, setLocale } = useTranslation();
    const sidebarWidth = isCollapsed ? 'w-20' : 'w-80';
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

    // Use useMemo to calculate the filtered nav sections once per render cycle
    const filteredNavSections = useMemo(() => {
        
        // Define ALL menu items with a 'permissionKey' property if needed
        const rawNavSections = [
            // Dashboard is accessible to all authenticated users
            { name: t('nav_dashboard'), href: '/', icon: Home, translationKey: 'nav_dashboard', permissionKey: 'CORE_OPERATIONS' },
            {
                name: t('nav_shipment_operations'),
                icon: Truck,
                translationKey: 'nav_shipment_operations',
                permissionKey: 'CORE_OPERATIONS',
                links: [ 
                    { name: t('nav_register_new_shipment'), href: '/shipments/add', icon: Package, translationKey: 'nav_register_new_shipment', permissionKey: 'CORE_OPERATIONS' },
                    { name: t('nav_view_search_shipments'), href: '/shipments/view', icon: FileText, translationKey: 'nav_view_search_shipments', permissionKey: 'REPORTS_VIEW' },
                    { name: t('nav_shipments_report'), href: '/shipments/report', icon: FileText, translationKey: 'nav_shipments_report', permissionKey: 'REPORTS_VIEW' },
                ]
            },
            {
                name: t('nav_delivery_management'),
                icon: Package2,
                translationKey: 'nav_delivery_management',
                permissionKey: 'CORE_OPERATIONS',
                links: [
                    { name: t('nav_record_new_delivery'), href: '/deliveries/add', icon: Package2, translationKey: 'nav_record_new_delivery', permissionKey: 'CORE_OPERATIONS' },
                    // MODIFIED: Admin-level approval (Stage 1)
                    { name: t('nav_delivery_approvals'), href: '/deliveries/approval', icon: CheckCircle, translationKey: 'nav_delivery_approvals', permissionKey: 'DELIVERY_APPROVAL_ADMIN' }, 
                    // NEW: SuperAdmin-level approval (Stage 2)
                    { name: 'SuperAdmin Approval', href: '/deliveries/super-approval', icon: CheckCircle, translationKey: 'nav_superadmin_approval', permissionKey: 'DELIVERY_APPROVAL_SUPERADMIN' }, 
                    { name: t('nav_view_delivery_records'), href: '/deliveries/view', icon: FileText, translationKey: 'nav_view_delivery_records', permissionKey: 'REPORTS_VIEW' },
                ]
            },
            {
                name: t('nav_trip_vehicle_logs'),
                icon: Car,
                translationKey: 'nav_trip_vehicle_logs',
                permissionKey: 'CORE_OPERATIONS',
                links: [
                    { name: t('nav_add_trip_log'), href: '/trips/add', icon: Truck, translationKey: 'nav_add_trip_log', permissionKey: 'CORE_OPERATIONS' },
                    { name: t('nav_trip_log_report'), href: '/trips/report', icon: FileText, translationKey: 'nav_trip_log_report', permissionKey: 'REPORTS_VIEW' },
                    { name: t('nav_vehicle_financial_ledgers'), href: '/vehicles/ledgers', icon: DollarSign, translationKey: 'nav_vehicle_financial_ledgers', permissionKey: 'REPORTS_VIEW' }, 
                ]
            },
            {
                name: t('nav_labour_management'),
                icon: UserCog,
                translationKey: 'nav_labour_management',
                permissionKey: 'LABOUR_MANAGEMENT', // Requires ADMIN or SUPERADMIN for Labour Management
                subSections: [
                    {
                        name: t('nav_labour_persons'),
                        icon: Users,
                        translationKey: 'nav_labour_persons',
                        links: [
                            { name: t('nav_add_person'), href: '/labour-persons/add', translationKey: 'nav_add_person', permissionKey: 'LABOUR_MANAGEMENT' },
                            { name: t('nav_view_persons'), href: '/labour-persons/view', translationKey: 'nav_view_persons', permissionKey: 'REPORTS_VIEW' },
                            { name: t('nav_person_report'), href: '/labour-persons/report', translationKey: 'nav_person_report', permissionKey: 'REPORTS_VIEW' },
                        ]
                    },
                    {
                        name: t('nav_assignments'),
                        icon: ClipboardList,
                        translationKey: 'nav_assignments',
                        links: [
                            { name: t('nav_assign_shipments'), href: '/labour-assignments/add', translationKey: 'nav_assign_shipments', permissionKey: 'CORE_OPERATIONS' },
                            { name: t('nav_view_settle_assignments'), href: '/labour-settlements', icon: DollarSign, translationKey: 'nav_view_settle_assignments', permissionKey: 'CORE_OPERATIONS' }, 
                            { name: t('nav_assignments_report'), href: '/labour-assignments/report', translationKey: 'nav_assignments_report', permissionKey: 'REPORTS_VIEW' },
                        ]
                    },
                ]
            },
            {
                name: t('nav_master_data'),
                icon: ListChecks,
                translationKey: 'nav_master_data',
                permissionKey: 'MASTER_DATA_WRITE', // Requires ADMIN or SUPERADMIN for all master data
                subSections: [
                    { 
                        name: t('nav_parties'), 
                        icon: Users, 
                        translationKey: 'nav_parties',
                        links: [
                            { name: t('nav_add_party'), href: '/parties/add', translationKey: 'nav_add_party', permissionKey: 'MASTER_DATA_WRITE' },
                            { name: t('nav_view_parties'), href: '/parties/view', translationKey: 'nav_view_parties', permissionKey: 'MASTER_DATA_WRITE' },
                            { name: t('nav_parties_report'), href: '/parties/report', translationKey: 'nav_parties_report', permissionKey: 'REPORTS_VIEW' },
                        ] 
                    },
                    { 
                        name: t('nav_vehicles'), 
                        icon: Car, 
                        translationKey: 'nav_vehicles',
                        links: [
                            { name: t('nav_add_vehicle'), href: '/vehicles/add', translationKey: 'nav_add_vehicle', permissionKey: 'MASTER_DATA_WRITE' },
                            { name: t('nav_view_vehicles'), href: '/vehicles/view', translationKey: 'nav_view_vehicles', permissionKey: 'MASTER_DATA_WRITE' },
                        ] 
                    },
                    { 
                        name: t('nav_cities'), 
                        icon: MapPin, 
                        translationKey: 'nav_cities',
                        links: [
                            { name: t('nav_add_city'), href: '/cities/add', translationKey: 'nav_add_city', permissionKey: 'MASTER_DATA_WRITE' },
                            { name: t('nav_view_cities'), href: '/cities/view', translationKey: 'nav_view_cities', permissionKey: 'MASTER_DATA_WRITE' },
                        ] 
                    },
                    { 
                        name: t('nav_agencies'), 
                        icon: Building, 
                        translationKey: 'nav_agencies',
                        links: [
                            { name: t('nav_add_agency'), href: '/agency/add', translationKey: 'nav_add_agency', permissionKey: 'MASTER_DATA_WRITE' },
                            { name: t('nav_view_agencies'), href: '/agency/view', translationKey: 'nav_view_agencies', permissionKey: 'MASTER_DATA_WRITE' },
                        ] 
                    },
                    { 
                        name: t('nav_items'), 
                        icon: Box, 
                        translationKey: 'nav_items',
                        links: [
                            { name: t('nav_add_item_type'), href: '/items/add', translationKey: 'nav_add_item_type', permissionKey: 'MASTER_DATA_WRITE' },
                        ] 
                    },
                     {
                        name: t('nav_returns'),
                        icon: Package2,
                        translationKey: 'nav_returns',
                        links: [
                            { name: t('nav_create_return'), href: '/returns', translationKey: 'nav_create_return', permissionKey: 'CORE_OPERATIONS' },
                        ]
                     }
                ]
            }
        ];

        // Function to recursively filter links and sections based on user role
        const filterLinks = (items) => {
            return items
                .map(item => {
                    const hasPerm = item.permissionKey ? hasPermission(item.permissionKey) : true;
                    
                    // Handle links (leaf nodes)
                    if (item.href) {
                        return { ...item, isVisible: hasPerm };
                    }
                    
                    // Handle sections with sub-links/sub-sections
                    let filteredLinks = item.links ? filterLinks(item.links) : [];
                    let filteredSubSections = item.subSections ? filterLinks(item.subSections) : [];
                    
                    // A section or sub-section is visible if it has permission itself OR if any child is visible.
                    const childrenAreVisible = filteredLinks.some(l => l.isVisible) || filteredSubSections.some(s => s.isVisible);
                    
                    return {
                        ...item,
                        links: filteredLinks,
                        subSections: filteredSubSections,
                        isVisible: hasPerm && childrenAreVisible, // Only keep if parent permission allows AND it has visible children
                    };
                })
                .filter(item => item.isVisible);
        };
        
        return filterLinks(rawNavSections);

    }, [hasPermission, t]);

    return (
        <div
            className={`${sidebarWidth} ${transitionClass} ${TEXT_PRIMARY} p-4 min-h-screen border-r border-[#023e8a]/30 shadow-xl ${BG_DEEP} flex flex-col fixed left-0 top-0 h-screen z-20`}
        >
         
            
            {/* Navigation Links */}
            <nav className="space-y-2 flex-grow overflow-y-auto">
                {filteredNavSections.map((section) => {
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
