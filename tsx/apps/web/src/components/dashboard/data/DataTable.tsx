'use client';

import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '../icons';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  sortBy,
  sortDirection,
  onSort,
  emptyMessage = 'No data available',
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-subtle">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider',
                  column.sortable && 'cursor-pointer hover:text-text-secondary',
                  column.width
                )}
                style={column.width ? { width: column.width } : undefined}
                onClick={() => column.sortable && onSort?.(column.key)}
              >
                <div className="flex items-center gap-1">
                  {column.header}
                  {column.sortable && sortBy === column.key && (
                    <ChevronDownIcon
                      size="sm"
                      className={cn(
                        'transition-transform',
                        sortDirection === 'asc' && 'rotate-180'
                      )}
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {data.length > 0 ? (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-background-elevated'
                )}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-text-primary">
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
