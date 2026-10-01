'use client';

import { useEffect, useState } from 'react';

export function recordRowId(id: string | number) {
    return `record-${id}`;
}

export function recordRowClass(active: boolean, baseClass: string) {
    if (!active) return baseClass;
    return `${baseClass} bg-amber-100 dark:bg-amber-950/40 outline outline-2 -outline-offset-2 outline-amber-400`;
}

export function useScrollToRecord(recordKey: string, active: boolean) {
    useEffect(() => {
        if (!active || !recordKey) return;
        const timer = window.setTimeout(() => {
            document.getElementById(recordRowId(recordKey))?.scrollIntoView({
                block: 'center',
                behavior: 'smooth',
            });
        }, 120);
        return () => window.clearTimeout(timer);
    }, [recordKey, active]);
}

/** Reads ?id= and ?search= and fills the directory search box. */
export function useDirectoryQuery(setSearchTerm: (value: string) => void) {
    const [highlightId, setHighlightId] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id')?.trim() || '';
        const search = params.get('search')?.trim() || '';
        setHighlightId(id);
        if (search) setSearchTerm(search);
        else if (id) setSearchTerm(id);
    }, [setSearchTerm]);

    return highlightId;
}
