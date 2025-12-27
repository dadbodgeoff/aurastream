'use client';

import { cn } from '@/lib/utils';

export interface PageContainerProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {(title || description || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {title && (
              <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
            )}
            {description && (
              <p className="mt-1 text-text-secondary">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
