'use client';

import { cn } from '@/lib/utils';
import { useMediaSummary, MEDIA_ASSET_TYPE_LABELS, TOTAL_ASSET_LIMIT } from '@aurastream/api-client';
import { ASSET_TYPE_ICONS, ASSET_TYPE_COLORS } from './constants';
import type { MediaAssetType } from '@aurastream/api-client';

interface MediaLibrarySummaryProps {
  onTypeClick?: (type: MediaAssetType) => void;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-border-subtle bg-background-surface animate-pulse">
          <div className="w-8 h-8 rounded-full bg-background-elevated mb-2" />
          <div className="h-4 bg-background-elevated rounded w-16 mb-1" />
          <div className="h-6 bg-background-elevated rounded w-8" />
        </div>
      ))}
    </div>
  );
}

export function MediaLibrarySummary({ onTypeClick, className }: MediaLibrarySummaryProps) {
  const { data, isLoading } = useMediaSummary();

  if (isLoading) {
    return <SummarySkeleton />;
  }

  if (!data) return null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Stats */}
      <div className="flex items-center gap-6 p-4 rounded-xl bg-gradient-to-r from-interactive-500/10 to-purple-500/10 border border-interactive-500/20">
        <div>
          <p className="text-sm text-text-muted">Total Assets</p>
          <p className="text-2xl font-bold text-text-primary">
            {data.totalAssets} <span className="text-sm font-normal text-text-muted">/ {TOTAL_ASSET_LIMIT}</span>
          </p>
        </div>
        <div className="w-px h-10 bg-border-subtle" />
        <div>
          <p className="text-sm text-text-muted">Storage Used</p>
          <p className="text-2xl font-bold text-text-primary">{formatBytes(data.storageUsedBytes)}</p>
        </div>
        {data.totalAssets >= TOTAL_ASSET_LIMIT - 5 && (
          <>
            <div className="w-px h-10 bg-border-subtle" />
            <div className="text-amber-400 text-sm">
              ⚠️ {TOTAL_ASSET_LIMIT - data.totalAssets} slots remaining
            </div>
          </>
        )}
      </div>

      {/* Type Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {data.summaries.map((summary) => {
          const typeColor = ASSET_TYPE_COLORS[summary.assetType];
          const typeIcon = ASSET_TYPE_ICONS[summary.assetType];
          
          return (
            <button
              key={summary.assetType}
              onClick={() => onTypeClick?.(summary.assetType)}
              className={cn(
                'p-4 rounded-xl border text-left transition-all hover:scale-[1.02]',
                'bg-background-surface hover:bg-background-elevated',
                summary.totalCount > 0 ? 'border-border-subtle' : 'border-border-subtle/50 opacity-60'
              )}
            >
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-lg mb-2', typeColor)}>
                {typeIcon}
              </div>
              <p className="text-xs text-text-muted truncate">{MEDIA_ASSET_TYPE_LABELS[summary.assetType]}</p>
              <p className="text-xl font-bold text-text-primary">{summary.totalCount}</p>
              {summary.favoriteCount > 0 && (
                <p className="text-xs text-rose-400 mt-1">♥ {summary.favoriteCount}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
