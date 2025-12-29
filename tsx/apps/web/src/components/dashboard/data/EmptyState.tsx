'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PlusIcon } from '../icons';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-6 text-center',
      className
    )}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-background-elevated flex items-center justify-center text-text-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-muted max-w-sm mb-6">{description}</p>
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 min-h-[44px]',
              'bg-interactive-600 hover:bg-interactive-500 active:bg-interactive-700',
              'text-white text-sm font-medium rounded-lg',
              'transition-all active:scale-[0.98]',
              'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2'
            )}
          >
            <PlusIcon size="sm" />
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 min-h-[44px]',
              'bg-interactive-600 hover:bg-interactive-500 active:bg-interactive-700',
              'text-white text-sm font-medium rounded-lg',
              'transition-all active:scale-[0.98]',
              'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2'
            )}
          >
            <PlusIcon size="sm" />
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
