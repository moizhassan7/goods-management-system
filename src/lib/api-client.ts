const DEFAULT_TIMEOUT_MS = 25000;

export async function readApiErrorMessage(response: Response, fallback: string) {
    const contentType = response.headers.get('content-type') || '';
    try {
        if (contentType.includes('application/json')) {
            const data = await response.json();
            return data?.message || data?.error || fallback;
        }
        const text = (await response.text()).trim();
        if (!text) return fallback;
        if (text.startsWith('<')) {
            return `${fallback} (server ${response.status}). Please try again.`;
        }
        return text.slice(0, 180);
    } catch {
        return `${fallback} (server ${response.status}). Please try again.`;
    }
}

export function describeNetworkError(error: unknown, action = 'Save') {
    if (error instanceof DOMException && error.name === 'AbortError') {
        return `${action} timed out. Check your internet connection and try again.`;
    }
    if (error instanceof TypeError) {
        return `${action} failed because the connection was lost. Please try again.`;
    }
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return `${action} failed. Please try again.`;
}

export async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const parentSignal = init.signal;

    const onAbort = () => controller.abort();
    if (parentSignal) {
        if (parentSignal.aborted) controller.abort();
        else parentSignal.addEventListener('abort', onAbort, { once: true });
    }

    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
        parentSignal?.removeEventListener('abort', onAbort);
    }
}

export function prismaErrorMessage(error: unknown, fallback: string) {
    if (typeof error === 'object' && error && 'code' in error) {
        const code = String((error as { code?: string }).code);
        if (code === 'P2002') {
            return 'This bilty could not be saved because a duplicate record already exists. Refresh and try again.';
        }
        if (code === 'P2003') {
            return 'Save failed because one selected value (city, vehicle, party, agency, or item) is invalid. Refresh the page and select again.';
        }
        if (code === 'P2024' || code === 'P2028') {
            return 'The database is busy right now. Please wait a moment and try saving again.';
        }
        if (code === 'P1001' || code === 'P1002' || code === 'P1017') {
            return 'Could not connect to the database. Please try again.';
        }
    }
    return fallback;
}
