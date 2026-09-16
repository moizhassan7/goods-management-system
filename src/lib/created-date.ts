export function parseCreatedDate(dateStr?: string | null) {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

    const [year, month, day] = trimmed.split('-').map(Number);
    if (!year || !month || !day) return null;

    const today = new Date();
    const todayStamp = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const selectedStamp = Date.UTC(year, month - 1, day);
    if (selectedStamp > todayStamp) return null;

    return {
        created_day: new Date(selectedStamp),
        createdAt: new Date(year, month - 1, day, 12, 0, 0, 0),
    };
}

export function toDateInputValue(value?: string | Date | null) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        const raw = String(value);
        return raw.length >= 10 ? raw.substring(0, 10) : '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
