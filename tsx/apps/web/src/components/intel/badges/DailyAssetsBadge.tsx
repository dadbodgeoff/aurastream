'use client';

/**
 * Daily Assets Badge
 * 
 * Header badge showing daily asset creation stats.
 * Used in Intel page header for quick productivity overview.
 * 
 * Features:
 * - Responsive design (collapses on mobile)
 * - Loading skeleton state
 * - Links to assets page
 * - Shows pending review count with warning color
 */

import { Zap, Clock } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DailyAssetsData {
  createdToday: number;
  pendingReview: number;
}

interface DailyAssetsBadgeProps {
  data: DailyAssetsData | null | undefined;
  isLoading?: boolean;
  className?: string;
}

export function DailyAssetsBadge({ data, isLoading, className }: DailyAssetsBadgeProps) {
  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg animate-pulse",
        className
      )}>
        <div className="w-4 h-4 bg-white/10 rounded" />
        <div className="w-16 sm:w-28 h-4 bg-white/10 rounded" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Link
      href="/assets"
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg border',
        'bg-interactive-500/10 border-interactive-500/20',
        'hover:bg-interactive-500/15 focus:outline-none focus:ring-2 focus:ring-interactive-500/50',
        'transition-colors',
        className
      )}
      aria-label={`Daily assets: ${data.createdToday} created today${data.pendingReview > 0 ? `, ${data.pendingReview} pending review` : ''}. Click to view assets.`}
    >
      <Zap className="w-4 h-4 text-interactive-400 flex-shrink-0" />
      
      {/* Mobile: Compact view */}
      <span className="sm:hidden text-sm">
        <span className="font-semibold text-text-primary">{data.createdToday}</span>
        <span className="text-text-tertiary"> today</span>
        {data.pendingReview > 0 && (
          <span className="text-amber-400"> · {data.pendingReview} pending</span>
        )}
      </span>

      {/* Desktop: Full view */}
      <span className="hidden sm:flex items-center gap-2 text-sm text-text-secondary">
        <span>
          <span className="text-text-tertiary">Assets Today:</span>{' '}
          <span className="font-semibold text-text-primary">{data.createdToday}</span>
        </span>
        {data.pendingReview > 0 && (
          <>
            <span className="text-text-tertiary">|</span>
            <span className="flex items-center gap-1 text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{data.pendingReview} Pending</span>
            </span>
          </>
        )}
      </span>
    </Link>
  );
}
