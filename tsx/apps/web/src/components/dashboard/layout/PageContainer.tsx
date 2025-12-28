'use client';

import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/navigation';

export interface PageContainerProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Show back button (auto-detected from route by default) */
  showBack?: boolean;
  /** Custom back URL */
  backUrl?: string;
  /** Make header sticky */
  stickyHeader?: boolean;
}

export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
  showBack,
  backUrl,
  stickyHeader = false,
}: PageContainerProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {(title || description || actions) && (
        <PageHeader
          title={title}
          subtitle={description}
          actions={actions}
          showBack={showBack}
          backUrl={backUrl}
          sticky={stickyHeader}
        />
      )}
      {children}
    </div>
  );
}
