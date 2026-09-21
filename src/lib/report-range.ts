export function reportDateRange(searchParams: URLSearchParams): { gte: Date; lte?: Date } | { gte?: Date; lte: Date } | undefined {
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    const range: { gte?: Date; lte?: Date } = {};

    if (start && !Number.isNaN(Date.parse(start))) {
        range.gte = new Date(`${start}T00:00:00.000Z`);
    }
    if (end && !Number.isNaN(Date.parse(end))) {
        range.lte = new Date(`${end}T23:59:59.999Z`);
    }

    if (!range.gte && !range.lte) return undefined;
    return range as { gte: Date; lte?: Date } | { gte?: Date; lte: Date };
}

export const REPORT_ROW_CAP = 2000;
export const LIST_ROW_CAP = 1000;
