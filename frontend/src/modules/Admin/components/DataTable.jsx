import { useState, useMemo } from 'react';
import React from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Button from './Button';

const DataTable = ({
  data = [],
  columns = [],
  pagination = true,
  itemsPerPage = 10,
  sortable = true,
  onRowClick,
  className = '',
  // Server-side pagination props
  currentPage: externalCurrentPage,
  totalPages: externalTotalPages,
  onPageChange: externalOnPageChange,
}) => {
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Use external pagination if provided, otherwise use internal
  const isServerSidePagination = externalCurrentPage !== undefined && externalTotalPages !== undefined;

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortable) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig, sortable]);

  // Determine current page and total pages
  const currentPage = isServerSidePagination ? externalCurrentPage : internalCurrentPage;
  const totalPages = isServerSidePagination ? externalTotalPages : Math.ceil(sortedData.length / itemsPerPage);

  // Pagination
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    // For server-side pagination, data is already paginated
    if (isServerSidePagination) {
      return sortedData;
    }

    // For client-side pagination, slice the data

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, itemsPerPage, pagination, isServerSidePagination]);

  const handleSort = (key) => {
    if (!sortable) return;

    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handlePageChange = (page) => {
    if (isServerSidePagination && externalOnPageChange) {
      externalOnPageChange(Math.max(1, Math.min(page, totalPages)));
    } else {
      setInternalCurrentPage(Math.max(1, Math.min(page, totalPages)));
    }
  };

  // Get primary columns (exclude actions for mobile card view)
  const primaryColumns = columns.filter(col => (col.key || col.accessor) !== 'actions');
  const actionsColumn = columns.find(col => (col.key || col.accessor) === 'actions');

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Mobile Card View - Show on mobile, hide on desktop */}
      <div className="md:hidden">
        {paginatedData.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiChevronDown className="text-gray-300 text-2xl" />
            </div>
            <p className="text-gray-500 font-medium">No records found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedData.map((row, index) => (
              <div
                key={`mobile-row-${row ? (row.id || row._id || index) : index}`}
                onClick={() => onRowClick && onRowClick(row)}
                className={`p-5 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  } transition-colors active:bg-gray-100`}
              >
                <div className="space-y-4">
                  {primaryColumns.map((column) => {
                    const colKey = column.key || column.accessor;
                    const rawValue = row[colKey];
                    const value = column.render || column.cell
                      ? (column.render || column.cell)(rawValue, row)
                      : rawValue;

                    if (!value && value !== 0) return null;

                    let displayValue = value;
                    if (typeof value === 'object' && value !== null && !React.isValidElement(value)) {
                      if (Array.isArray(value)) {
                        displayValue = `${value.length} items`;
                      } else {
                        displayValue = JSON.stringify(value);
                      }
                    }

                    return (
                      <div key={`mobile-col-${colKey || column.label || column.header}-${row.id || row._id || index}`} className="flex flex-col gap-1">
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                          {column.label || column.header}
                        </span>
                        <div className="text-sm font-semibold text-gray-800 break-words">
                          {displayValue}
                        </div>
                      </div>
                    );
                  })}
                  {actionsColumn && (
                    <div className="pt-4 border-t border-gray-50 mt-4 flex justify-end">
                      {actionsColumn.render(null, row)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Table View - Hide on mobile, show on desktop */}
      <div className="hidden md:block overflow-x-auto scrollbar-hide">
        <table className="w-full">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              {columns.map((column) => {
                const colKey = column.key || column.accessor;
                const colLabel = column.label || column.header;
                return (
                  <th
                    key={`header-${colKey || colLabel}`}
                    className={`px-6 py-4 text-left text-[11px] font-extrabold text-gray-500 uppercase tracking-wider ${sortable && column.sortable !== false
                      ? 'cursor-pointer hover:bg-gray-100 transition-colors'
                      : ''
                      }`}
                    onClick={() => column.sortable !== false && handleSort(colKey)}
                  >
                    <div className="flex items-center gap-2">
                      {colLabel}
                      {sortable &&
                        column.sortable !== false &&
                        sortConfig.key === colKey && (
                          <span className="text-blue-500">
                            {sortConfig.direction === 'asc' ? (
                              <FiChevronUp />
                            ) : (
                              <FiChevronDown />
                            )}
                          </span>
                        )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-20 text-center"
                >
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiChevronDown className="text-gray-300 text-2xl" />
                  </div>
                  <p className="text-gray-500 font-medium">No records available at the moment</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={`row-${row ? (row.id || row._id || index) : index}`}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50/80' : ''
                    } transition-colors group`}
                >
                  {columns.map((column) => {
                    const colKey = column.key || column.accessor;
                    const rawValue = row[colKey];
                    let displayValue = column.render || column.cell
                      ? (column.render || column.cell)(rawValue, row)
                      : rawValue;

                    if (typeof displayValue === 'object' && displayValue !== null && !React.isValidElement(displayValue)) {
                      if (Array.isArray(displayValue)) {
                        displayValue = `${displayValue.length} items`;
                      } else {
                        displayValue = JSON.stringify(displayValue);
                      }
                    }

                    const cellKey = column.key || column.accessor || `col-${index}`;
                    return (
                      <td
                        key={`cell-${row.id || row._id || index}-${cellKey}`}
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700"
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="bg-gray-50/30 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {isServerSidePagination ? (
              <>Page {currentPage} of {totalPages}</>
            ) : (
              <>
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, sortedData.length)} of{' '}
                {sortedData.length}
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <FiChevronLeft />
            </button>

            <div className="flex items-center px-4">
              <span className="text-sm font-bold text-blue-600">{currentPage}</span>
              <span className="mx-2 text-gray-300">/</span>
              <span className="text-sm font-bold text-gray-500">{totalPages}</span>
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
