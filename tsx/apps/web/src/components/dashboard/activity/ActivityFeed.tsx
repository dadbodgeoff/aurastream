'use client';

import { cn } from '@/lib/utils';
import { ActivityItem, ActivityItemProps } from './ActivityItem';

export interface ActivityFeedProps {
  activities: ActivityItemProps[];
  title?: string;
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  emptyMessage?: string;
  className?: string;
}

export function ActivityFeed({
  activities,
  title = 'Recent Activity',
  maxItems = 5,
  showViewAll = true,
  onViewAll,
  emptyMessage = 'No recent activity',
  className,
}: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <div className={cn('bg-background-surface/50 border border-border-subtle rounded-xl', className)}>
      <div className="flex items-center justify-between px-4 py-4 border-b border-border-subtle">
        <h3 className="font-medium text-text-primary">{title}</h3>
        {showViewAll && activities.length > maxItems && (
          <button
            onClick={onViewAll}
            className="text-sm text-interactive-600 hover:text-interactive-500 font-medium"
          >
            View all
          </button>
        )}
      </div>
      <div className="divide-y divide-border-subtle">
        {displayedActivities.length > 0 ? (
          displayedActivities.map((activity, index) => (
            <ActivityItem key={activity.id || index} {...activity} />
          ))
        ) : (
          <div className="px-4 py-8 text-center text-text-muted text-sm">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
