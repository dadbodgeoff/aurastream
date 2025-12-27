'use client';

import { cn } from '@/lib/utils';
import { RefreshIcon, XIcon } from '../icons';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-6 text-center',
      className
    )}>
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
        <XIcon size="lg" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-muted max-w-sm mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-background-elevated hover:bg-background-surface text-text-primary text-sm font-medium rounded-lg border border-border-subtle transition-colors"
        >
          <RefreshIcon size="sm" />
          Try Again
        </button>
      )}
    </div>
  );
}
