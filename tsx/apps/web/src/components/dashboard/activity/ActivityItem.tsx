'use client';

import { cn } from '@/lib/utils';
import { CheckIcon, ClockIcon, CreateIcon, BrandIcon, LibraryIcon } from '../icons';

export type ActivityType = 'asset_created' | 'brand_kit_created' | 'brand_kit_updated' | 'job_completed' | 'job_failed';

export interface ActivityItemProps {
  id?: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp?: string | Date;
  status?: 'success' | 'pending' | 'error';
  imageUrl?: string;
  onClick?: () => void;
  className?: string;
}

const typeIcons: Record<ActivityType, React.ReactNode> = {
  asset_created: <CreateIcon size="sm" />,
  brand_kit_created: <BrandIcon size="sm" />,
  brand_kit_updated: <BrandIcon size="sm" />,
  job_completed: <CheckIcon size="sm" />,
  job_failed: <ClockIcon size="sm" />,
};

const statusColors = {
  success: 'bg-emerald-500/10 text-emerald-500',
  pending: 'bg-amber-500/10 text-amber-500',
  error: 'bg-red-500/10 text-red-500',
};

function formatTimestamp(timestamp: string | Date | undefined | null): string {
  if (!timestamp) return 'Recently';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return 'Recently';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function ActivityItem({
  type,
  title,
  description,
  timestamp,
  status = 'success',
  imageUrl,
  onClick,
  className,
}: ActivityItemProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 px-4 py-4 w-full text-left transition-colors',
        onClick && 'hover:bg-background-elevated cursor-pointer',
        className
      )}
    >
      {imageUrl ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-background-elevated flex-shrink-0">
          <img src={imageUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          statusColors[status]
        )}>
          {typeIcons[type]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{title}</p>
        {description && (
          <p className="text-xs text-text-muted truncate mt-0.5">{description}</p>
        )}
      </div>
      <span className="text-xs text-text-muted flex-shrink-0">
        {formatTimestamp(timestamp)}
      </span>
    </Component>
  );
}
