'use client';

import { cn } from '@/lib/utils';
import { StatCard, StatCardProps } from './StatCard';

export interface MetricsGridProps {
  metrics: StatCardProps[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function MetricsGrid({ metrics, columns = 4, className }: MetricsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {metrics.map((metric, index) => (
        <StatCard key={index} {...metric} />
      ))}
    </div>
  );
}
