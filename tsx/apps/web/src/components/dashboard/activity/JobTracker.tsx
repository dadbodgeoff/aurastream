'use client';

import { cn } from '@/lib/utils';
import { SpinnerIcon, CheckIcon, XIcon } from '../icons';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'partial';

export interface JobTrackerItem {
  id: string;
  assetType: string;
  status: JobStatus;
  progress: number;
  createdAt: string | Date;
  error?: string;
}

export interface JobTrackerProps {
  jobs: JobTrackerItem[];
  title?: string;
  maxItems?: number;
  onJobClick?: (jobId: string) => void;
  onViewAll?: () => void;
  className?: string;
}

const statusConfig: Record<JobStatus, { label: string; color: string; icon: React.ReactNode }> = {
  queued: { label: 'Queued', color: 'text-text-muted', icon: null },
  processing: { label: 'Processing', color: 'text-interactive-600', icon: <SpinnerIcon size="sm" /> },
  completed: { label: 'Completed', color: 'text-emerald-500', icon: <CheckIcon size="sm" /> },
  failed: { label: 'Failed', color: 'text-red-500', icon: <XIcon size="sm" /> },
  partial: { label: 'Partial', color: 'text-amber-500', icon: <CheckIcon size="sm" /> },
};

function formatAssetType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function JobTracker({
  jobs,
  title = 'Active Jobs',
  maxItems = 3,
  onJobClick,
  onViewAll,
  className,
}: JobTrackerProps) {
  const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'processing');
  const displayedJobs = activeJobs.slice(0, maxItems);

  if (displayedJobs.length === 0) return null;

  return (
    <div className={cn('bg-background-surface/50 border border-border-subtle rounded-xl', className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <h3 className="font-medium text-text-primary">{title}</h3>
        {activeJobs.length > maxItems && onViewAll && (
          <button onClick={onViewAll} className="text-sm text-interactive-600 hover:text-interactive-500 font-medium">
            View all ({activeJobs.length})
          </button>
        )}
      </div>

      <div className="divide-y divide-border-subtle">
        {displayedJobs.map((job) => {
          const config = statusConfig[job.status];
          return (
            <button
              key={job.id}
              onClick={() => onJobClick?.(job.id)}
              className="flex items-center gap-4 px-5 py-4 w-full text-left hover:bg-background-elevated transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">
                    {formatAssetType(job.assetType)}
                  </p>
                  <span className={cn('flex items-center gap-1 text-xs', config.color)}>
                    {config.icon}
                    {config.label}
                  </span>
                </div>
                {job.status === 'processing' && (
                  <div className="mt-2 w-full bg-background-elevated rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-interactive-600 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="text-xs text-text-muted">{job.progress}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
