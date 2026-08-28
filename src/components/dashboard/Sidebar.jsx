"use client";
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Truck, FileText, MapPin, Users, Package,
    ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
    Home, Building, Car, Box, ListChecks, Package2,
    DollarSign, Globe, ShieldCheck
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/use-permission';

// Single Link Component
const SidebarLink = ({ link, isSubItem = false, isNestedSubItem = false, isCollapsed }) => {
    const Icon = link.icon;
    const pathname = usePathname();

    const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));

    let paddingClass = 'px-3 py-2';
    if (!isCollapsed) {
        paddingClass = isNestedSubItem ? 'pl-9 pr-3 py-1.5' : isSubItem ? 'pl-7 pr-3 py-2' : 'px-3 py-2';
    } else {
        paddingClass = 'p-2 justify-center';
    }

    const textSize = isNestedSubItem ? 'text-xs font-normal' : isSubItem ? 'text-xs font-medium' : 'text-xs font-semibold';

    return (
        <Link
            href={link.href}
            key={link.name}
            title={isCollapsed ? link.name : undefined}
            className={`group relative flex items-center transition-colors duration-150 rounded-lg my-0.5 select-none
                ${isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }
                ${textSize} ${paddingClass} ${isCollapsed ? 'w-10 h-10 mx-auto' : 'w-full'}`}
        >
            {/* Icon */}
            {Icon && (
                <Icon className={`shrink-0
                    ${isCollapsed ? 'w-4 h-4' : isNestedSubItem ? 'w-3.5 h-3.5 mr-2.5' : isSubItem ? 'w-3.5 h-3.5 mr-2.5' : 'w-4 h-4 mr-2.5'}
                    ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}
                />
            )}

            {/* Sub-item bullet point if no icon */}
            {!Icon && (isSubItem || isNestedSubItem) && !isCollapsed && (
                <span className={`w-1.5 h-1.5 rounded-full mr-2.5 shrink-0 transition-colors
                    ${isActive ? 'bg-white' : 'bg-slate-600 group-hover:bg-slate-400'}`}
                />
            )}

            {/* Link Text */}
            {!isCollapsed && (
                <span className="truncate tracking-normal">{link.name}</span>
            )}
        </Link>
    );
};

// Collapsible Section Component 
const SidebarCollapsibleSection = ({ section, isCollapsed }) => {
    const pathname = usePathname();
    const visibleLinks = section.links?.filter(link => link.isVisible) || [];
    const visibleSubSections = section.subSections?.filter(subSection =>
        subSection.links?.some(link => link.isVisible)
    ) || [];

    const childrenFlatLinks = [
        ...visibleLinks,
        ...visibleSubSections.flatMap(s => s.links || [])
    ];

    const anyChildActive = childrenFlatLinks.some(link => pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href)));

    const [isOpen, setIsOpen] = useState(Boolean(anyChildActive));
    const SectionIcon = section.icon;
    const ToggleIcon = isOpen ? ChevronUp : ChevronDown;

    const toggleOpen = () => setIsOpen(!isOpen);

    if (!visibleLinks?.length && !visibleSubSections?.length) return null;

    if (isCollapsed) {
        return (
            <button
                onClick={toggleOpen}
                className={`w-10 h-10 mx-auto flex items-center justify-center transition-colors rounded-lg my-1
                    ${anyChildActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                title={section.name}
            >
                <SectionIcon className="w-4 h-4 shrink-0" />
            </button>
        );
    }

    return (
        <div className="w-full my-0.5">
            <button
                onClick={toggleOpen}
                className={`w-full flex items-center justify-between text-left px-3 py-2 transition-colors rounded-lg text-xs font-semibold
                    ${anyChildActive
                        ? 'text-white bg-slate-800/80'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                    }`}
            >
                <div className='flex items-center gap-2.5 min-w-0'>
                    <SectionIcon className={`w-4 h-4 shrink-0 ${anyChildActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate uppercase tracking-wider text-[11px] text-slate-300 font-bold">{section.name}</span>
                </div>
                <ToggleIcon className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'text-blue-400' : 'text-slate-500'}`} />
            </button>

            {isOpen && (
                <div className="space-y-0.5 mt-0.5 pl-2 border-l border-slate-800 ml-3">
                    {visibleLinks.map((link, index) => (
                        <SidebarLink key={index} link={link} isSubItem={true} isCollapsed={isCollapsed} />
                    ))}

                    {visibleSubSections.map((subSection, index) => (
                        <SidebarNestedList key={index} subSection={subSection} isCollapsed={isCollapsed} />
                    ))}
                </div>
            )}
        </div>
    );
};

// Nested List Component (Master Data Sub-sections)
const SidebarNestedList = ({ subSection, isCollapsed }) => {
    const pathname = usePathname();
    const visibleLinks = subSection.links?.filter(link => link.isVisible) || [];
    const anyNestedActive = visibleLinks.some(link => pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href)));
    const [isNestedOpen, setIsNestedOpen] = useState(Boolean(anyNestedActive));
    const SubSectionIcon = subSection.icon;
    const ToggleIcon = isNestedOpen ? ChevronUp : ChevronDown;

    if (isCollapsed || visibleLinks.length === 0) return null;

    const toggleNestedOpen = () => setIsNestedOpen(!isNestedOpen);

    return (
        <div className="w-full my-0.5">
            <button
                onClick={toggleNestedOpen}
                className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 transition-colors rounded-md text-xs
                    ${anyNestedActive
                        ? 'text-blue-300 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                    }`}
            >
                <div className='flex items-center gap-2 min-w-0'>
                    {SubSectionIcon && <SubSectionIcon className={`w-3 h-3 shrink-0 ${anyNestedActive ? 'text-blue-400' : 'text-slate-500'}`} />}
                    <span className="truncate">{subSection.name}</span>
                </div>
                <ToggleIcon className="w-3 h-3 shrink-0 text-slate-500" />
            </button>

            {isNestedOpen && (
                <div className='space-y-0.5 mt-0.5'>
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
    const { t, locale, setLocale } = useTranslation();

    if (isAuthLoading) return null;

    const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';

    const LanguageSelector = ({ isCollapsed }) => (
        <div className={`pt-2 mt-2 border-t border-slate-800 ${isCollapsed ? 'px-1' : 'px-1'}`}>
            {!isCollapsed && (
                <div className="flex items-center justify-between mb-1 px-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-blue-400" />
                        {t('language_selector')}
                    </span>
                    <span className="text-[9px] font-mono uppercase bg-slate-800 text-slate-400 px-1 py-0.5 rounded">
                        {locale}
                    </span>
                </div>
            )}
            <ToggleGroup
                type="single"
                value={locale}
                onValueChange={(value) => {
                    if (value) setLocale(value);
                }}
                className={`bg-slate-900 border border-slate-800 p-0.5 rounded-lg ${isCollapsed ? 'flex justify-center' : 'grid grid-cols-2'}`}
                size="sm"
            >
                <ToggleGroupItem
                    value="en"
                    aria-label="Toggle English"
                    className="text-xs h-7 font-semibold data-[state=on]:bg-blue-600 data-[state=on]:text-white text-slate-400 rounded-md transition-colors"
                >
                    {isCollapsed ? 'EN' : t('language_english')}
                </ToggleGroupItem>
                <ToggleGroupItem
                    value="ur"
                    aria-label="Toggle Urdu"
                    className="text-xs h-7 font-semibold data-[state=on]:bg-blue-600 data-[state=on]:text-white text-slate-400 rounded-md transition-colors"
                >
                    {isCollapsed ? 'UR' : t('language_urdu')}
                </ToggleGroupItem>
            </ToggleGroup>
        </div>
    );

    const filteredNavSections = useMemo(() => {
        const rawNavSections = [
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
                name: t('nav_master_data'),
                icon: ListChecks,
                translationKey: 'nav_master_data',
                permissionKey: 'MASTER_DATA_WRITE',
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
                    },
                    {
                        name: t('nav_edit_security') || 'Edit Password',
                        icon: ShieldCheck,
                        translationKey: 'nav_edit_security',
                        links: [
                            { name: t('nav_set_edit_password') || 'Set Edit Password', href: '/settings/edit-password', translationKey: 'nav_set_edit_password', permissionKey: 'MASTER_DATA_WRITE' },
                        ]
                    }
                ]
            }
        ];

        const filterLinks = (items) => {
            return items
                .map(item => {
                    const hasPerm = item.permissionKey ? hasPermission(item.permissionKey) : true;
                    if (item.href) {
                        return { ...item, isVisible: hasPerm };
                    }
                    let filteredLinks = item.links ? filterLinks(item.links) : [];
                    let filteredSubSections = item.subSections ? filterLinks(item.subSections) : [];
                    const childrenAreVisible = filteredLinks.some(l => l.isVisible) || filteredSubSections.some(s => s.isVisible);

                    return {
                        ...item,
                        links: filteredLinks,
                        subSections: filteredSubSections,
                        isVisible: hasPerm && childrenAreVisible,
                    };
                })
                .filter(item => item.isVisible);
        };

        return filterLinks(rawNavSections);
    }, [hasPermission, t]);

    return (
        <aside
            className={`${sidebarWidth} transition-all duration-200 ease-in-out bg-slate-900 text-slate-200 p-3 min-h-screen border-r border-slate-800 flex flex-col fixed left-0 top-0 h-screen z-30 select-none`}
        >
            {/* Brand Logo Header */}
            <div className="flex items-center justify-between px-1 py-2 mb-2 border-b border-slate-800">
                <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-extrabold text-sm shadow-xs">
                        <Truck className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs tracking-tight text-white uppercase truncate">
                                Zikria Goods Transport Company
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 truncate">
                                Sargodha, Pakistan
                            </span>
                        </div>
                    )}
                </Link>

                {!isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(true)}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Collapse Sidebar"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Navigation Links Area */}
            <nav className="space-y-0.5 flex-grow overflow-y-auto pr-0.5">
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

            {/* Language Selector */}
            <LanguageSelector isCollapsed={isCollapsed} />

            {/* Bottom Collapse Trigger (when collapsed) */}
            {isCollapsed && (
                <div className="mt-2 pt-2 border-t border-slate-800 flex justify-center">
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Expand Sidebar"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
