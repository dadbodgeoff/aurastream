'use client';

import { cn } from '@/lib/utils';
import { SpinnerIcon } from '../icons';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  className,
}: LoadingStateProps) {
  const sizeStyles = {
    sm: { spinner: 'w-5 h-5', text: 'text-sm', padding: 'py-8' },
    md: { spinner: 'w-8 h-8', text: 'text-base', padding: 'py-16' },
    lg: { spinner: 'w-12 h-12', text: 'text-lg', padding: 'py-24' },
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      sizeStyles[size].padding,
      className
    )}>
      <SpinnerIcon className={cn(sizeStyles[size].spinner, 'text-interactive-600 mb-3')} />
      <p className={cn('text-text-muted', sizeStyles[size].text)}>{message}</p>
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-background-elevated rounded', className)} />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border-subtle overflow-hidden">
      <LoadingSkeleton className="aspect-video" />
      <div className="p-4 space-y-2">
        <LoadingSkeleton className="h-4 w-3/4" />
        <LoadingSkeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="p-3 rounded-xl border border-border-subtle">
      <LoadingSkeleton className="h-3 w-20 mb-2" />
      <LoadingSkeleton className="h-6 w-16" />
    </div>
  );
}
