export function parsePagination(
    searchParams: URLSearchParams,
    defaults: { page?: number; pageSize?: number } = {},
) {
    const defaultPage = defaults.page ?? 1;
    const defaultPageSize = defaults.pageSize ?? 25;

    const rawPage = parseInt(searchParams.get('page') || String(defaultPage), 10);
    const rawPageSize = parseInt(searchParams.get('pageSize') || String(defaultPageSize), 10);

    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : defaultPage;
    const pageSize = Math.min(100, Math.max(1, Number.isFinite(rawPageSize) && rawPageSize > 0 ? rawPageSize : defaultPageSize));

    return {
        page,
        pageSize,
        skip: (page - 1) * pageSize,
    };
}

export function paginationMeta(total: number, page: number, pageSize: number) {
    const totalPages = Math.max(1, Math.ceil(Math.max(total, 0) / pageSize));
    const safePage = Math.min(page, totalPages);
    return {
        total,
        page: safePage,
        pageSize,
        totalPages,
    };
}

export function hasPaginationParams(searchParams: URLSearchParams) {
    return searchParams.has('page') || searchParams.has('pageSize');
}
