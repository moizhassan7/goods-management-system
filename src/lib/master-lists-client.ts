export type MasterListsPayload = {
    cities: Array<{ id: number; name: string }>;
    agencies: Array<{ id: number; name: string }>;
    vehicles: Array<{ id: number; vehicleNumber: string }>;
    parties: Array<{ id: number; name?: string; contactInfo?: string }>;
    items: Array<{ id: number; item_description?: string }>;
};

const LISTS_CACHE_KEY = 'gms_master_lists_v1';
const LISTS_TTL_MS = 5 * 60 * 1000;

type CachedLists = {
    data: MasterListsPayload;
    ts: number;
};

function readSessionCache(): MasterListsPayload | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(LISTS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedLists;
        if (!parsed?.ts || Date.now() - parsed.ts > LISTS_TTL_MS) {
            sessionStorage.removeItem(LISTS_CACHE_KEY);
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
}

function writeSessionCache(data: MasterListsPayload) {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(LISTS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch {
        // Quota or private mode — skip client cache.
    }
}

export function clearMasterListsClientCache() {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(LISTS_CACHE_KEY);
    } catch {
        // ignore
    }
}

export async function fetchMasterLists(force = false): Promise<MasterListsPayload> {
    if (!force) {
        const cached = readSessionCache();
        if (cached) return cached;
    }

    const response = await fetch('/api/lists');
    if (!response.ok) {
        throw new Error('Failed to fetch lists.');
    }
    const data = await response.json();
    writeSessionCache(data);
    return data;
}
