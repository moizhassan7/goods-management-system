"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Truck, FileText, MapPin, Users, Package, ClipboardList,
    ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
    Home, Building, Car, Box, ListChecks, Package2,
    Database, LayoutGrid, FilePlus2, FolderSearch, BarChart2,
    Settings, Sun, Moon, ShieldCheck
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/use-permission';

// Single Navigation Link Component
const SidebarLink = ({ link, isSubItem = false, isNestedSubItem = false, isCollapsed }) => {
    const Icon = link.icon;
    const pathname = usePathname();

    const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));

    let paddingClass = 'px-3.5 py-2.5';
    if (!isCollapsed) {
        paddingClass = isNestedSubItem ? 'pl-9 pr-3 py-2' : isSubItem ? 'pl-7 pr-3 py-2' : 'px-3.5 py-2.5';
    } else {
        paddingClass = 'p-2.5 justify-center';
    }

    const textSize = isNestedSubItem ? 'text-xs font-normal' : isSubItem ? 'text-xs font-medium' : 'text-[13px]';

    return (
        <Link
            href={link.href}
            title={isCollapsed ? link.name : undefined}
            className={`group relative flex items-center justify-between transition-all duration-150 rounded-xl my-0.5 select-none ${
                isActive
                    ? 'bg-lavender text-charcoal font-bold shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-charcoal dark:hover:text-white hover:bg-cardgray dark:hover:bg-zinc-800/70 font-medium'
            } ${textSize} ${paddingClass} ${isCollapsed ? 'w-10 h-10 mx-auto' : 'w-full'}`}
        >
            <div className="flex items-center gap-3 min-w-0">
                {Icon && (
                    <Icon
                        className={`shrink-0 ${
                            isCollapsed
                                ? 'w-4 h-4'
                                : isNestedSubItem
                                ? 'w-3.5 h-3.5'
                                : isSubItem
                                ? 'w-4 h-4'
                                : 'w-4 h-4'
                        } ${isActive ? 'text-charcoal stroke-[2.2]' : 'text-zinc-400 group-hover:text-charcoal dark:group-hover:text-white stroke-[1.8]'}`}
                    />
                )}

                {!Icon && (isSubItem || isNestedSubItem) && !isCollapsed && (
                    <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                            isActive ? 'bg-charcoal' : 'bg-zinc-400 group-hover:bg-zinc-600 dark:group-hover:bg-zinc-200'
                        }`}
                    />
                )}

                {!isCollapsed && (
                    <span className="truncate tracking-tight">{link.name}</span>
                )}
            </div>

            {!isCollapsed && link.badge && (
                <span
                    className={`ml-2 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold shrink-0 ${
                        isActive
                            ? 'bg-charcoal text-white dark:bg-charcoal dark:text-lavender'
                            : 'bg-lavender text-charcoal'
                    }`}
                >
                    {link.badge}
                </span>
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
                type="button"
                onClick={toggleOpen}
                className={`w-10 h-10 mx-auto flex items-center justify-center transition-colors rounded-xl my-1 ${
                    anyChildActive
                        ? 'bg-lavender text-charcoal shadow-2xs font-bold'
                        : 'text-zinc-500 hover:text-charcoal dark:hover:text-white hover:bg-cardgray dark:hover:bg-zinc-800'
                }`}
                title={section.name}
            >
                <SectionIcon className="w-4 h-4 shrink-0 stroke-[1.8]" />
            </button>
        );
    }

    return (
        <div className="w-full my-0.5">
            <button
                type="button"
                onClick={toggleOpen}
                className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 transition-colors rounded-xl text-xs font-semibold select-none ${
                    anyChildActive
                        ? 'text-charcoal dark:text-white bg-cardgray/80 dark:bg-zinc-800/60'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-charcoal dark:hover:text-white hover:bg-cardgray dark:hover:bg-zinc-800/40'
                }`}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <SectionIcon className={`w-4 h-4 shrink-0 stroke-[1.8] ${anyChildActive ? 'text-charcoal dark:text-lavender' : 'text-zinc-400'}`} />
                    <span className="truncate uppercase tracking-wider text-[11px] font-bold">{section.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {section.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-lavender text-charcoal font-mono text-[10px] font-bold">
                            {section.badge}
                        </span>
                    )}
                    <ToggleIcon className="w-3.5 h-3.5 text-zinc-400" />
                </div>
            </button>

            {isOpen && (
                <div className="space-y-0.5 mt-0.5 pl-2 border-l border-hairline dark:border-zinc-800 ml-4">
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
                type="button"
                onClick={toggleNestedOpen}
                className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 transition-colors rounded-lg text-xs select-none ${
                    anyNestedActive
                        ? 'text-charcoal dark:text-lavender font-bold'
                        : 'text-zinc-500 hover:text-charcoal dark:hover:text-zinc-200 hover:bg-cardgray dark:hover:bg-zinc-800/40'
                }`}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {SubSectionIcon && <SubSectionIcon className={`w-3.5 h-3.5 shrink-0 ${anyNestedActive ? 'text-charcoal dark:text-lavender' : 'text-zinc-400'}`} />}
                    <span className="truncate">{subSection.name}</span>
                </div>
                <ToggleIcon className="w-3 h-3 shrink-0 text-zinc-400" />
            </button>

            {isNestedOpen && (
                <div className="space-y-0.5 mt-0.5">
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
    const { t } = useTranslation();

    // Theme mode state (light / dark)
    const [themeMode, setThemeMode] = useState('light');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
            setThemeMode(isDark ? 'dark' : 'light');
            if (isDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }, []);

    const handleThemeSwitch = (mode) => {
        setThemeMode(mode);
        if (typeof window !== 'undefined') {
            if (mode === 'dark') {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
        }
    };

    const sidebarWidth = isCollapsed ? 'w-16' : 'w-[250px]';

    const filteredNavSections = useMemo(() => {
        const rawNavSections = [
            {
                name: t('nav_dashboard'),
                href: '/',
                icon: LayoutGrid,
                translationKey: 'nav_dashboard',
                permissionKey: 'CORE_OPERATIONS'
            },
            {
                name: t('nav_register_new_shipment') || 'Register Bilty',
                href: '/shipments/add',
                icon: FilePlus2,
                translationKey: 'nav_register_new_shipment',
                permissionKey: 'CORE_OPERATIONS'
            },
            {
                name: t('nav_view_search_shipments') || 'Bilty Directory',
                href: '/shipments/view',
                icon: FolderSearch,
                translationKey: 'nav_view_search_shipments',
                permissionKey: 'REPORTS_VIEW'
            },
            {
                name: t('nav_shipments_report') || 'Bilty Report',
                href: '/shipments/report',
                icon: BarChart2,
                translationKey: 'nav_shipments_report',
                permissionKey: 'REPORTS_VIEW',
                badge: 'Live'
            },
            {
                name: t('nav_parties') || 'Parties Ledger',
                href: '/parties/view',
                icon: Users,
                translationKey: 'nav_parties',
                permissionKey: 'MASTER_DATA_WRITE'
            },
            {
                name: t('nav_vehicles') || 'Freight Carrier',
                href: '/vehicles/view',
                icon: Truck,
                translationKey: 'nav_vehicles',
                permissionKey: 'MASTER_DATA_WRITE'
            },
            {
                name: t('nav_master_data'),
                icon: ListChecks,
                translationKey: 'nav_master_data',
                permissionKey: 'MASTER_DATA_WRITE',
                badge: '08',
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
                            { name: t('nav_view_items') || 'View Items', href: '/items/view', translationKey: 'nav_view_items', permissionKey: 'MASTER_DATA_WRITE' },
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
                        name: t('nav_backup') || 'Backup',
                        icon: Database,
                        translationKey: 'nav_backup',
                        links: [
                            { name: t('nav_database_backup') || 'Database Backup', href: '/backup', translationKey: 'nav_database_backup', permissionKey: 'MASTER_DATA_WRITE' },
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

    if (isAuthLoading) return null;

    // Generate User initials for monogram avatar
    const userInitials = user?.username ? user.username.substring(0, 2).toUpperCase() : 'ZG';

    return (
        <aside
            className={`${sidebarWidth} transition-all duration-200 ease-in-out bg-white dark:bg-[#18181B] text-charcoal dark:text-zinc-100 border-r border-hairline dark:border-zinc-800 flex flex-col justify-between fixed left-0 top-0 h-screen z-30 select-none shadow-[0_20px_50px_rgba(0,0,0,0.03)] p-4 sm:p-5`}
        >
            <div className="flex flex-col min-h-0 overflow-hidden">
                {/* Brand Logo Header (Geometric Mark + 'Zikria Goods' wordmark) */}
                <div className="flex items-center justify-between gap-2.5 pb-5 mb-3 border-b border-hairline dark:border-zinc-800">
                    <Link href="/" className="flex items-center gap-2.5 overflow-hidden group">
                        {/* Minimalist Isometric Cube/Truck Mark */}
                        <div className="w-8 h-8 rounded-xl bg-charcoal dark:bg-lavender text-white dark:text-charcoal flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current" aria-hidden="true">
                                <path d="M16 3L4 9.8v12.4L16 29l12-6.8V9.8L16 3zm0 3.2l8.5 4.8L16 15.8 7.5 11 16 6.2zm-9 7.4l7.5 4.2v7.6L7 21.2v-7.6zm10.5 11.8v-7.6l7.5-4.2v7.6l-7.5 4.2z"/>
                            </svg>
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-[17px] font-bold tracking-tight leading-none text-charcoal dark:text-white truncate">
                                    Zikria Goods
                                </span>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-[9px] font-semibold tracking-[0.08em] uppercase text-zinc-400 truncate">
                                        SARGODHA • ONLINE
                                    </span>
                                </div>
                            </div>
                        )}
                    </Link>

                    {!isCollapsed && (
                        <button
                            type="button"
                            onClick={() => setIsCollapsed(true)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-charcoal dark:hover:text-white hover:bg-cardgray dark:hover:bg-zinc-800 transition-colors"
                            title="Collapse Sidebar"
                        >
                            <ChevronLeft className="w-4 h-4 stroke-[1.8]" />
                        </button>
                    )}
                </div>

                {/* Quick Register Button (when expanded) */}
                {!isCollapsed && (
                    <div className="mb-4">
                        <Link
                            href="/shipments/add"
                            className="w-full py-2 px-3 rounded-xl bg-lavender hover:bg-lavenderhover active:scale-[0.98] text-charcoal text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                            <FilePlus2 className="w-3.5 h-3.5 stroke-[2.2]" />
                            <span>+ Register Bilty</span>
                        </Link>
                    </div>
                )}

                {/* Navigation Menu List */}
                <nav className="space-y-1 flex-grow overflow-y-auto pr-0.5 no-scrollbar">
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
            </div>

            {/* Bottom Centered Profile & Segmented Sun/Moon Theme Switcher */}
            <div className="pt-4 border-t border-hairline dark:border-zinc-800 flex flex-col items-center shrink-0">
                {!isCollapsed ? (
                    <>
                        {/* Circular Avatar Monogram */}
                        <div className="w-11 h-11 rounded-full bg-lavender/60 dark:bg-zinc-800 border border-lavender dark:border-zinc-700 flex items-center justify-center text-charcoal dark:text-lavender font-bold text-xs mb-2 shadow-2xs">
                            {userInitials}
                        </div>
                        <div className="text-[13px] font-bold text-charcoal dark:text-white leading-tight truncate max-w-full">
                            {user?.username || 'Superadmin'}
                        </div>
                        <div className="text-[9px] font-semibold tracking-[0.08em] uppercase text-zinc-400 mt-0.5 mb-3.5 text-center truncate max-w-full">
                            {user?.role || 'SUPERADMIN'} • SARGODHA
                        </div>

                        {/* Segmented Sun / Moon Pill Switcher */}
                        <div className="w-full p-1 rounded-full bg-cardgray dark:bg-zinc-800/90 border border-hairline dark:border-zinc-700 grid grid-cols-2 items-center gap-1 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => handleThemeSwitch('light')}
                                title="Light Mode"
                                className={`py-1.5 rounded-full flex items-center justify-center transition-all ${
                                    themeMode === 'light'
                                        ? 'bg-charcoal text-white shadow-xs'
                                        : 'text-zinc-500 hover:text-charcoal'
                                }`}
                            >
                                <Sun className="w-3.5 h-3.5 stroke-[2]" />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleThemeSwitch('dark')}
                                title="Dark Mode"
                                className={`py-1.5 rounded-full flex items-center justify-center transition-all ${
                                    themeMode === 'dark'
                                        ? 'bg-lavender text-charcoal font-bold shadow-xs'
                                        : 'text-zinc-500 hover:text-charcoal dark:hover:text-white'
                                }`}
                            >
                                <Moon className="w-3.5 h-3.5 stroke-[2]" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        {/* Collapsed Avatar */}
                        <div
                            className="w-9 h-9 rounded-full bg-lavender/60 dark:bg-zinc-800 border border-lavender dark:border-zinc-700 flex items-center justify-center text-charcoal dark:text-lavender font-bold text-xs shadow-2xs"
                            title={user?.username}
                        >
                            {userInitials}
                        </div>
                        {/* Expand Button */}
                        <button
                            type="button"
                            onClick={() => setIsCollapsed(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-cardgray dark:bg-zinc-800 text-zinc-500 hover:text-charcoal dark:hover:text-white transition-colors"
                            title="Expand Sidebar"
                        >
                            <ChevronRight className="w-4 h-4 stroke-[1.8]" />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
