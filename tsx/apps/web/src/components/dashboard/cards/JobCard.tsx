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

const statusConfig: Record<JobStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode; borderColor: string }> = {
  queued: { 
    label: 'Queued', 
    color: 'text-text-muted', 
    bgColor: 'bg-background-elevated', 
    borderColor: 'border-border-subtle',
    icon: <ClockIcon size="sm" /> 
  },
  processing: { 
    label: 'Processing', 
    color: 'text-interactive-500', 
    bgColor: 'bg-interactive-500/10', 
    borderColor: 'border-interactive-500/30',
    icon: <SpinnerIcon size="sm" /> 
  },
  completed: { 
    label: 'Completed', 
    color: 'text-emerald-500', 
    bgColor: 'bg-emerald-500/10', 
    borderColor: 'border-emerald-500/30',
    icon: <CheckIcon size="sm" /> 
  },
  failed: { 
    label: 'Failed', 
    color: 'text-red-500', 
    bgColor: 'bg-red-500/10', 
    borderColor: 'border-red-500/30',
    icon: <XIcon size="sm" /> 
  },
  partial: { 
    label: 'Partial', 
    color: 'text-amber-500', 
    bgColor: 'bg-amber-500/10', 
    borderColor: 'border-amber-500/30',
    icon: <CheckIcon size="sm" /> 
  },
};

function formatAssetType(type: string | undefined | null): string {
  if (!type) return 'Asset';
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatRelativeTime(date: string | Date | undefined | null): string {
  if (!date) return 'Recently';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Recently';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        'w-full text-left p-4 rounded-xl border bg-background-surface/50',
        'shadow-sm hover:shadow-md transition-all duration-200 ease-standard',
        'hover:scale-[1.01] active:scale-[0.99]',
        config.borderColor,
        'hover:border-border-default',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            config.bgColor, 
            config.color
          )}>
            {config.icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-text-primary truncate">{formatAssetType(assetType)}</h3>
            <p className="text-xs text-text-muted mt-0.5">{formatRelativeTime(createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn(
            'px-2.5 py-1 text-xs font-semibold rounded-full',
            config.bgColor, 
            config.color
          )}>
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
        <div className="mt-3 flex items-center justify-between text-xs">
          {assetsCount !== undefined && (
            <span className="text-text-secondary font-medium">
              {assetsCount} asset{assetsCount !== 1 ? 's' : ''} generated
            </span>
          )}
          {completedAt && (
            <span className="text-text-muted">
              {formatRelativeTime(completedAt)}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
