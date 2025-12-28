'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBreadcrumbs, BreadcrumbItem } from './useBreadcrumbs';

export interface PageHeaderProps {
  /** Page title - if not provided, will be inferred from route */
  title?: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Custom breadcrumb override */
  breadcrumbs?: BreadcrumbItem[];
  /** Show back button (default: true for nested routes) */
  showBack?: boolean;
  /** Custom back URL - if not provided, goes to parent route */
  backUrl?: string;
  /** Right side actions */
  actions?: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Sticky header (default: false) */
  sticky?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs: customBreadcrumbs,
  showBack,
  backUrl,
  actions,
  className,
  sticky = false,
}: PageHeaderProps) {
  const router = useRouter();
  const { breadcrumbs: autoBreadcrumbs, canGoBack, parentUrl, pageTitle } = useBreadcrumbs();
  
  const breadcrumbs = customBreadcrumbs || autoBreadcrumbs;
  const displayTitle = title || pageTitle;
  const shouldShowBack = showBack ?? canGoBack;
  const backHref = backUrl || parentUrl;

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <div
      className={cn(
        'mb-6 md:mb-8',
        sticky && 'sticky top-0 z-20 bg-background-default/95 backdrop-blur-sm py-4 -mx-4 px-4 md:-mx-8 md:px-8',
        className
      )}
    >
      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex items-center gap-1 text-sm text-text-tertiary">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const isFirst = index === 0;
              
              return (
                <li key={crumb.href} className="flex items-center gap-1">
                  {!isFirst && (
                    <ChevronRight className="w-3.5 h-3.5 text-text-tertiary/50" />
                  )}
                  {isLast ? (
                    <span className="text-text-secondary font-medium truncate max-w-[200px]">
                      {crumb.label}
                    </span>
                  ) : (
                    <button
                      onClick={() => router.push(crumb.href)}
                      className={cn(
                        'flex items-center gap-1 hover:text-text-primary transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-accent-primary/50 rounded'
                      )}
                    >
                      {isFirst && <Home className="w-3.5 h-3.5" />}
                      <span className="truncate max-w-[120px]">{crumb.label}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Title Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back Button */}
          {shouldShowBack && (
            <button
              onClick={handleBack}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-lg',
                'bg-background-surface hover:bg-background-elevated',
                'border border-border-subtle hover:border-border-default',
                'text-text-secondary hover:text-text-primary',
                'transition-all duration-150',
                'focus:outline-none focus:ring-2 focus:ring-accent-primary/50',
                'shrink-0'
              )}
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Title & Subtitle */}
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-text-primary truncate">
              {displayTitle}
            </h1>
            {subtitle && (
              <p className="text-sm text-text-tertiary mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
