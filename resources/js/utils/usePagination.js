import { useState, useMemo, useEffect } from 'react';

/**
 * Custom hook to manage client-side table pagination.
 *
 * @param {Array} items - The filtered data array to paginate
 * @param {number} defaultPageSize - Initial page size (default 25)
 * @param {Array} resetDeps - Additional dependencies that should reset page to 1
 */
export function usePagination(items = [], defaultPageSize = 25, resetDeps = []) {
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // Auto-reset to page 1 whenever items length drastically changes or resetDeps change
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, ...resetDeps]);

  const totalItems = items?.length || 0;
  const isAll = pageSize >= 999999;
  const effectivePageSize = isAll ? (totalItems || 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, totalItems);

  const paginatedItems = useMemo(() => {
    if (!items || !items.length) return [];
    if (isAll) return items;
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex, isAll]);

  return {
    currentPage: validCurrentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems
  };
}

