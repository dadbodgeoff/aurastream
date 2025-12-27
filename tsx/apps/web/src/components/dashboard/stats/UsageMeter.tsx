'use client';

import { cn } from '@/lib/utils';

export interface UsageMeterProps {
  used: number;
  limit: number;
  label: string;
  unit?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UsageMeter({
  used,
  limit,
  label,
  unit = '',
  showPercentage = true,
  variant,
  size = 'md',
  className,
}: UsageMeterProps) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isUnlimited = limit === -1;
  
  // Auto-determine variant based on usage
  const autoVariant = variant ?? (
    percentage >= 90 ? 'danger' :
    percentage >= 75 ? 'warning' : 'default'
  );

  const barColors = {
    default: 'bg-interactive-600',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };

  const sizeStyles = {
    sm: { bar: 'h-1.5', text: 'text-xs' },
    md: { bar: 'h-2', text: 'text-sm' },
    lg: { bar: 'h-3', text: 'text-base' },
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className={cn('text-text-secondary', sizeStyles[size].text)}>{label}</span>
        <span className={cn('font-medium text-text-primary', sizeStyles[size].text)}>
          {isUnlimited ? (
            <span className="text-emerald-500">Unlimited</span>
          ) : (
            <>
              {used.toLocaleString()}{unit} / {limit.toLocaleString()}{unit}
              {showPercentage && (
                <span className="text-text-muted ml-1">({Math.round(percentage)}%)</span>
              )}
            </>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className={cn('w-full bg-background-elevated rounded-full overflow-hidden', sizeStyles[size].bar)}>
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColors[autoVariant])}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
