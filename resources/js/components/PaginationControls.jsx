import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function PaginationControls({
  currentPage = 1,
  pageSize = 25,
  totalItems = 0,
  onPageChange = () => { },
  onPageSizeChange = () => { },
  pageSizeOptions = [10, 25, 50, 100, 999999],
  className = ''
}) {
  if (totalItems <= 0) return null;

  const isAll = pageSize >= 999999;
  const effectivePageSize = isAll ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, totalItems);

  return (
    <div className={`bg-white border border-slate-200/90 p-3.5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 ${className}`}>
      {/* Showing X to Y of Z items & Items per page */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium text-slate-600">
          Showing <span className="font-black text-slate-900">{totalItems === 0 ? 0 : startIndex + 1}</span> to{' '}
          <span className="font-black text-slate-900">{endIndex}</span> of{' '}
          <span className="font-black text-slate-900">{totalItems}</span> items
        </span>

        <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:bg-white cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt >= 999999 ? 'All' : opt}
              </option>
            ))}
          </select>
          <span className="text-slate-500 font-medium">per page</span>
        </div>
      </div>

      {/* Page Buttons (shown when not "All" and totalPages > 1) */}
      {!isAll && totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={validCurrentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-600"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Prev Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, validCurrentPage - 1))}
            disabled={validCurrentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-600"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => {
              if (totalPages <= 7) return true;
              if (p === 1 || p === totalPages) return true;
              return Math.abs(p - validCurrentPage) <= 1;
            })
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) {
                acc.push('ellipsis-' + p);
              }
              acc.push(p);
              return acc;
            }, [])
            .map((item) => {
              if (typeof item === 'string') {
                return (
                  <span key={item} className="px-1.5 text-slate-400 font-mono">
                    ...
                  </span>
                );
              }
              const isCurrent = item === validCurrentPage;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  className={`min-w-8 h-8 px-2 rounded-lg font-bold text-xs cursor-pointer transition-all ${isCurrent
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  {item}
                </button>
              );
            })}

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, validCurrentPage + 1))}
            disabled={validCurrentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-600"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={validCurrentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-600"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

