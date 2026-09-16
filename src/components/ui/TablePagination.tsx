'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast as sonnerToast } from 'sonner';

interface TablePaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    isLoading?: boolean;
    pageSizeOptions?: number[];
    className?: string;
}

function getPageNumbers(currentPage: number, totalPages: number) {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
        return pages;
    }

    pages.push(1);
    if (currentPage > 3) pages.push('...');

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
}

export function TablePagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    isLoading = false,
    pageSizeOptions = [10, 25, 50, 100],
    className = '',
}: TablePaginationProps) {
    const [jumpPageInput, setJumpPageInput] = useState('');

    if (totalItems <= 0) return null;

    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, totalItems);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage && !isLoading) {
            onPageChange(newPage);
        }
    };

    const handleJumpPageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const pageNum = parseInt(jumpPageInput, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            handlePageChange(pageNum);
            setJumpPageInput('');
        } else {
            sonnerToast.error('Invalid page number', {
                description: `Please enter a page number between 1 and ${totalPages}.`,
            });
        }
    };

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 py-3 px-4 bg-slate-50/50 dark:bg-slate-900/50 ${className}`}>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 order-2 sm:order-1">
                <span>
                    Showing <strong className="font-semibold text-slate-900 dark:text-white">{startIndex}</strong> to{' '}
                    <strong className="font-semibold text-slate-900 dark:text-white">{endIndex}</strong> of{' '}
                    <strong className="font-semibold text-slate-900 dark:text-white">{totalItems}</strong> entries
                </span>
                {onPageSizeChange && (
                    <div className="flex items-center gap-1.5 ml-1">
                        <span className="text-[11px] font-medium hidden sm:inline">Per page:</span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={(val) => onPageSizeChange(Number(val))}
                            disabled={isLoading}
                        >
                            <SelectTrigger className="h-8 w-[72px] text-xs font-mono font-bold rounded-lg border-slate-200 dark:border-slate-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end" className="rounded-lg">
                                {pageSizeOptions.map((size) => (
                                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 order-1 sm:order-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-slate-700"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1 || isLoading}
                    title="First Page"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 rounded-lg text-xs gap-1 border-slate-200 dark:border-slate-700"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                    {getPageNumbers(currentPage, totalPages).map((p, idx) => {
                        if (p === '...') {
                            return (
                                <span key={`ellipsis-${idx}`} className="w-7 text-center text-xs text-slate-400 select-none">
                                    ...
                                </span>
                            );
                        }
                        const isCurrent = p === currentPage;
                        return (
                            <Button
                                key={`page-${p}`}
                                variant={isCurrent ? 'default' : 'outline'}
                                size="sm"
                                className={`h-8 min-w-8 px-2 rounded-lg text-xs font-semibold ${
                                    isCurrent
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                                onClick={() => handlePageChange(p as number)}
                                disabled={isLoading}
                            >
                                {p}
                            </Button>
                        );
                    })}
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 rounded-lg text-xs gap-1 border-slate-200 dark:border-slate-700"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-slate-700"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages || isLoading}
                    title="Last Page"
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>

                {totalPages > 5 && (
                    <form onSubmit={handleJumpPageSubmit} className="hidden md:flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] text-slate-400">Page:</span>
                        <Input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={jumpPageInput}
                            onChange={(e) => setJumpPageInput(e.target.value)}
                            placeholder={`${currentPage}`}
                            className="h-8 w-14 text-center text-xs p-1 font-mono rounded-lg border-slate-200 dark:border-slate-700"
                        />
                        <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs font-medium rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                        >
                            Go
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
