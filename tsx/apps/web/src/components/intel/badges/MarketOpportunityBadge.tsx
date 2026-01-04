'use client';

/**
 * Market Opportunity Badge
 * 
 * Header badge showing market opportunity level and active streams.
 * Used in Intel page header for quick competition assessment.
 * 
 * Features:
 * - Responsive design (collapses on mobile)
 * - Loading skeleton state
 * - Tooltip with full reason on hover
 * - Color-coded opportunity levels
 */

import { TrendingUp, TrendingDown, Minus, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketOpportunityData {
  level: 'high' | 'medium' | 'low';
  reason: string;
  activeStreams: number;
  changePercent: number;
  primaryCategory: string;
}

interface MarketOpportunityBadgeProps {
  data: MarketOpportunityData | null | undefined;
  isLoading?: boolean;
  className?: string;
}

export function MarketOpportunityBadge({ data, isLoading, className }: MarketOpportunityBadgeProps) {
  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg animate-pulse",
        className
      )}>
        <div className="w-4 h-4 bg-white/10 rounded" />
        <div className="w-20 sm:w-32 h-4 bg-white/10 rounded" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const levelConfig = {
    high: {
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      label: 'High',
    },
    medium: {
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      label: 'Medium',
    },
    low: {
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/20',
      label: 'Low',
    },
  };

  const config = levelConfig[data.level];
  const ChangeIcon = data.changePercent > 0 
    ? TrendingUp 
    : data.changePercent < 0 
      ? TrendingDown 
      : Minus;

  const formatChange = (percent: number) => {
    if (percent === 0) return '';
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(0)}%`;
  };

  const categoryLabel = data.primaryCategory.charAt(0).toUpperCase() + data.primaryCategory.slice(1);

  return (
    <div 
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg border',
        config.bgColor,
        config.borderColor,
        className
      )}
      title={data.reason}
      role="status"
      aria-label={`Market opportunity: ${config.label}. ${data.activeStreams} active ${categoryLabel} streams.`}
    >
      <Radio className={cn('w-4 h-4 flex-shrink-0', config.color)} />
      
      {/* Mobile: Compact view */}
      <span className="sm:hidden text-sm">
        <span className={cn('font-medium', config.color)}>{config.label}</span>
        <span className="text-text-tertiary"> · </span>
        <span className="text-text-primary font-semibold">{data.activeStreams}</span>
        <span className="text-text-tertiary"> streams</span>
      </span>

      {/* Desktop: Full view */}
      <span className="hidden sm:flex items-center gap-2 text-sm text-text-secondary">
        <span>
          <span className="text-text-tertiary">Market:</span>{' '}
          <span className={cn('font-medium', config.color)}>{config.label}</span>
        </span>
        <span className="text-text-tertiary">|</span>
        <span>
          <span className="font-semibold text-text-primary">{data.activeStreams}</span>
          {' '}Active {categoryLabel} Streams
          {data.changePercent !== 0 && (
            <span className={cn(
              'ml-1 inline-flex items-center gap-0.5',
              data.changePercent > 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              <ChangeIcon className="w-3 h-3" />
              {formatChange(data.changePercent)}
            </span>
          )}
        </span>
      </span>
    </div>
  );
}
