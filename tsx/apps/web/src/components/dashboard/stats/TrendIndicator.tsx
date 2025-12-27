'use client';

import { cn } from '@/lib/utils';
import { ArrowUpIcon, ArrowDownIcon } from '../icons';

export interface TrendIndicatorProps {
  value: number;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function TrendIndicator({ value, label, size = 'sm', className }: TrendIndicatorProps) {
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'neutral';
  
  const colors = {
    up: 'text-emerald-500 bg-emerald-500/10',
    down: 'text-red-500 bg-red-500/10',
    neutral: 'text-text-tertiary bg-background-elevated',
  };

  const sizes = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 rounded font-medium',
      colors[direction],
      sizes[size],
      className
    )}>
      {direction === 'up' && <ArrowUpIcon size="sm" />}
      {direction === 'down' && <ArrowDownIcon size="sm" />}
      {value > 0 ? '+' : ''}{value}%
      {label && <span className="text-text-muted ml-1">{label}</span>}
    </span>
  );
}
