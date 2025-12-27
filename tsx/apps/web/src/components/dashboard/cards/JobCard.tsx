'use client';

import { cn } from '@/lib/utils';
import { SpinnerIcon, CheckIcon, XIcon, ClockIcon, ChevronRightIcon } from '../icons';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'partial';

export interface JobCardProps {
  id: string;
  assetType: string;
  status: JobStatus;
  progress: number;
  errorMessage?: string | null;
  createdAt: string | Date;
  completedAt?: string | Date | null;
  assetsCount?: number;
  onClick?: () => void;
  className?: string;
}

const statusConfig: Record<JobStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  queued: { label: 'Queued', color: 'text-text-muted', bgColor: 'bg-background-elevated', icon: <ClockIcon size="sm" /> },
  processing: { label: 'Processing', color: 'text-interactive-600', bgColor: 'bg-interactive-600/10', icon: <SpinnerIcon size="sm" /> },
  completed: { label: 'Completed', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', icon: <CheckIcon size="sm" /> },
  failed: { label: 'Failed', color: 'text-red-500', bgColor: 'bg-red-500/10', icon: <XIcon size="sm" /> },
  partial: { label: 'Partial', color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: <CheckIcon size="sm" /> },
};

function formatAssetType(type: string | undefined | null): string {
  if (!type) return 'Asset';
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDate(date: string | Date | undefined | null): string {
  if (!date) return 'Recently';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Recently';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function JobCard({
  id,
  assetType,
  status,
  progress,
  errorMessage,
  createdAt,
  completedAt,
  assetsCount,
  onClick,
  className,
}: JobCardProps) {
  const config = statusConfig[status];

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border border-border-subtle bg-background-surface/50 hover:border-border-default transition-all',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.bgColor, config.color)}>
            {config.icon}
          </div>
          <div>
            <h3 className="font-medium text-text-primary">{formatAssetType(assetType)}</h3>
            <p className="text-sm text-text-muted mt-0.5">{formatDate(createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('px-2 py-1 text-xs font-medium rounded-full', config.bgColor, config.color)}>
            {config.label}
          </span>
          <ChevronRightIcon size="sm" className="text-text-muted" />
        </div>
      </div>

      {/* Progress Bar for Processing */}
      {status === 'processing' && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-background-elevated rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-interactive-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {status === 'failed' && errorMessage && (
        <div className="mt-3 p-2 bg-red-500/5 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-500 line-clamp-2">{errorMessage}</p>
        </div>
      )}

      {/* Completed Info */}
      {status === 'completed' && (
        <div className="mt-3 flex items-center justify-between text-sm">
          {assetsCount !== undefined && (
            <span className="text-text-muted">
              {assetsCount} asset{assetsCount !== 1 ? 's' : ''} generated
            </span>
          )}
          {completedAt && (
            <span className="text-text-muted">
              Completed {formatDate(completedAt)}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
