'use client';

/**
 * Brief Hero Section
 * 
 * Welcome header with greeting, date, and subscribed categories.
 */

import { Clock, RefreshCw } from 'lucide-react';
import type { CategorySubscription } from '@aurastream/api-client';

interface BriefHeroProps {
  displayName: string;
  subscribedCategories: CategorySubscription[];
  lastUpdated: Date;
  nextRefresh?: Date;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export function BriefHero({ 
  displayName, 
  subscribedCategories, 
  lastUpdated,
  nextRefresh 
}: BriefHeroProps) {
  const categoryNames = subscribedCategories.map(c => c.name).slice(0, 3);
  const moreCount = subscribedCategories.length - 3;

  return (
    <div className="bg-gradient-to-r from-interactive-600/10 via-interactive-600/5 to-transparent border border-interactive-600/20 rounded-2xl p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            {getGreeting()}, {displayName}
          </h1>
          <p className="text-text-secondary mt-1">
            {formatDate(new Date())}
          </p>
          <div className="flex items-center gap-2 mt-2 text-sm text-text-tertiary">
            <Clock className="w-4 h-4" />
            <span>Updated {formatTime(lastUpdated)}</span>
            {nextRefresh && (
              <>
                <span>•</span>
                <span>Next: {formatTime(nextRefresh)}</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="text-sm text-text-secondary">
            Your 90-second intel for:
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryNames.map(name => (
              <span 
                key={name}
                className="px-3 py-1 bg-interactive-600/20 text-interactive-400 text-sm font-medium rounded-full"
              >
                {name}
              </span>
            ))}
            {moreCount > 0 && (
              <span className="px-3 py-1 bg-white/5 text-text-tertiary text-sm rounded-full">
                +{moreCount} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
