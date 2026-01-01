'use client';

import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// =============================================================================
// Types
// =============================================================================

export interface PanelFooterProps {
  lastUpdated?: Date | string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isError?: boolean;
}

// =============================================================================
// Helper
// =============================================================================

function formatLastUpdated(date: Date | string | null | undefined): string {
  if (!date) return 'Just now';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'Just now';
  }
}

// =============================================================================
// Panel Footer Component
// =============================================================================

export function PanelFooter({
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  isError = false,
}: PanelFooterProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-border-subtle/50">
      {/* Last Updated */}
      <span className={cn(
        'text-xs',
        isError ? 'text-error-main' : 'text-text-muted'
      )}>
        {isError ? 'Failed ' : 'Updated '}
        {formatLastUpdated(lastUpdated)}
      </span>
      
      {/* Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            'p-1 rounded-md',
            'text-interactive-400 hover:text-interactive-300',
            'hover:bg-interactive-600/10',
            'transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="Refresh panel"
        >
          <RefreshCw 
            className={cn(
              'w-3.5 h-3.5',
              isRefreshing && 'animate-spin'
            )} 
          />
        </button>
      )}
    </div>
  );
}
