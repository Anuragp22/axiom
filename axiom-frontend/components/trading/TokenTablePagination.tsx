'use client';

import React from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/store';
import { setPagination } from '@/lib/store/slices/tokensSlice';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TokenTablePaginationProps {
  totalItems: number;
}

export const TokenTablePagination: React.FC<TokenTablePaginationProps> = ({ totalItems }) => {
  const dispatch = useAppDispatch();
  const { page, pageSize, hasMore } = useAppSelector(state => state.tokens.pagination);
  
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      dispatch(setPagination({ page: newPage }));
    }
  };

  const handlePageSizeChange = (newPageSize: string) => {
    const size = parseInt(newPageSize);
    dispatch(setPagination({ 
      pageSize: size, 
      page: 1, // Reset to first page when changing page size
      cursor: undefined // Clear cursor when changing page size
    }));
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    if (totalPages <= 1) return [1];
    
    const delta = 2; // Number of pages to show around current page
    const range = [];
    const rangeWithDots = [];

    // Always show first page
    rangeWithDots.push(1);

    // Calculate the range around current page
    const start = Math.max(2, page - delta);
    const end = Math.min(totalPages - 1, page + delta);

    // Add ellipsis after first page if needed
    if (start > 2) {
      rangeWithDots.push('...');
    }

    // Add pages around current page
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        rangeWithDots.push(i);
      }
    }

    // Add ellipsis before last page if needed
    if (end < totalPages - 1) {
      rangeWithDots.push('...');
    }

    // Always show last page (if different from first)
    if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  // Show pagination even for single page to display page size selector
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 bg-backgroundSecondary border-t border-primaryStroke/50">
      {/* Results info */}
      <div className="text-sm text-textSecondary">
        Showing {startItem} to {endItem} of {totalItems} tokens
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-4">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-textSecondary whitespace-nowrap">Rows per page:</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-20 h-8 bg-backgroundPrimary border-primaryStroke/50 text-textPrimary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-backgroundSecondary border-primaryStroke/50">
              <SelectItem value="6" className="text-textPrimary hover:bg-primaryStroke/30">6</SelectItem>
              <SelectItem value="15" className="text-textPrimary hover:bg-primaryStroke/30">15</SelectItem>
              <SelectItem value="25" className="text-textPrimary hover:bg-primaryStroke/30">25</SelectItem>
              <SelectItem value="50" className="text-textPrimary hover:bg-primaryStroke/30">50</SelectItem>
              <SelectItem value="100" className="text-textPrimary hover:bg-primaryStroke/30">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Full pagination with page numbers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 text-sm bg-primaryStroke text-textPrimary rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primaryStroke/80 transition-colors"
          >
            Previous
          </button>
          
          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((pageNum, index) => (
              <React.Fragment key={index}>
                {pageNum === '...' ? (
                  <span className="px-2 py-1 text-sm text-textSecondary">...</span>
                ) : (
                  <button
                    onClick={() => handlePageChange(pageNum as number)}
                    className={cn(
                      "px-3 py-1 text-sm rounded transition-colors",
                      page === pageNum
                        ? "bg-primaryBlue text-white"
                        : "bg-primaryStroke text-textPrimary hover:bg-primaryStroke/80"
                    )}
                  >
                    {pageNum}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>
          
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm bg-primaryStroke text-textPrimary rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primaryStroke/80 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

// Compact mobile pagination
export const MobilePagination: React.FC<TokenTablePaginationProps> = ({ totalItems }) => {
  const dispatch = useAppDispatch();
  const { page, pageSize } = useAppSelector(state => state.tokens.pagination);
  
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      dispatch(setPagination({ page: newPage }));
    }
  };

  // Show mobile pagination even for single page 
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4 bg-backgroundSecondary border-t border-primaryStroke/50 sm:hidden">
      {/* Results info */}
      <div className="text-sm text-textSecondary text-center">
        Page {page} of {totalPages} • {totalItems} tokens
      </div>

      {/* Simple navigation */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 text-sm bg-primaryStroke text-textPrimary rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primaryStroke/80 transition-colors"
        >
          Previous
        </button>
        
        <span className="px-3 py-1 text-sm text-textPrimary">
          {page} / {totalPages}
        </span>
        
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1 text-sm bg-primaryStroke text-textPrimary rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primaryStroke/80 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}; 