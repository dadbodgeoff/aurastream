'use client';

import { cn } from '@/lib/utils';
import { ArrowUpIcon, ArrowDownIcon } from '../icons';

export interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles = {
  default: 'bg-background-surface/50 border-border-subtle',
  primary: 'bg-interactive-600/5 border-interactive-600/20',
  success: 'bg-emerald-500/5 border-emerald-500/20',
  warning: 'bg-amber-500/5 border-amber-500/20',
  danger: 'bg-red-500/5 border-red-500/20',
};

const trendColors = {
  up: 'text-emerald-500',
  down: 'text-red-500',
  neutral: 'text-text-tertiary',
};

export function StatCard({
  label,
  value,
  sublabel,
  trend,
  icon,
  variant = 'default',
  size = 'md',
  className,
}: StatCardProps) {
  const sizeStyles = {
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };

  const valueStyles = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className={cn(
      'rounded-xl border transition-colors',
      variantStyles[variant],
      sizeStyles[size],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-text-tertiary mb-1">{label}</p>
          <p className={cn('font-semibold text-text-primary', valueStyles[size])}>
            {value}
          </p>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-background-elevated flex items-center justify-center text-text-secondary">
            {icon}
          </div>
        )}
      </div>

      {(sublabel || trend) && (
        <div className="flex items-center gap-2 mt-2">
          {trend && (
            <span className={cn('flex items-center gap-0.5 text-xs font-medium', trendColors[trend.direction])}>
              {trend.direction === 'up' && <ArrowUpIcon size="sm" />}
              {trend.direction === 'down' && <ArrowDownIcon size="sm" />}
              {trend.value > 0 ? '+' : ''}{trend.value}%
              {trend.label && <span className="text-text-muted ml-1">{trend.label}</span>}
            </span>
          )}
          {sublabel && <p className="text-xs text-text-muted">{sublabel}</p>}
        </div>
      )}
    </div>
  );
}
