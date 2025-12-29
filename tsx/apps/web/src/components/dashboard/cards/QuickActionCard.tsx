'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRightIcon } from '../icons';

export interface QuickActionCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  variant?: 'default' | 'primary' | 'gradient';
  badge?: string;
  disabled?: boolean;
  className?: string;
}

export function QuickActionCard({
  href,
  icon,
  title,
  description,
  variant = 'default',
  badge,
  disabled = false,
  className,
}: QuickActionCardProps) {
  const variantStyles = {
    default: 'bg-background-surface/50 border-border-subtle hover:border-border-default',
    primary: 'bg-gradient-to-br from-interactive-600/10 to-interactive-600/5 border-interactive-600/20 hover:border-interactive-600/40',
    gradient: 'bg-gradient-to-br from-interactive-600 to-interactive-700 border-transparent text-white',
  };

  const iconStyles = {
    default: 'bg-background-elevated text-text-secondary',
    primary: 'bg-interactive-600 text-white shadow-lg shadow-interactive-600/20',
    gradient: 'bg-white/20 text-white',
  };

  const content = (
    <>
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105',
          iconStyles[variant]
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              'font-semibold text-sm',
              variant === 'gradient' ? 'text-white' : 'text-text-primary'
            )}>
              {title}
            </h3>
            {badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-interactive-600 text-white rounded-full">
                {badge}
              </span>
            )}
          </div>
          <p className={cn(
            'text-xs mt-0.5',
            variant === 'gradient' ? 'text-white/80' : 'text-text-tertiary'
          )}>
            {description}
          </p>
        </div>
      </div>
      <div className={cn(
        'absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity',
        variant === 'gradient' ? 'text-white' : variant === 'primary' ? 'text-interactive-600' : 'text-text-tertiary'
      )}>
        <ArrowRightIcon size="sm" />
      </div>
    </>
  );

  if (disabled) {
    return (
      <div className={cn(
        'group relative p-4 rounded-xl border opacity-50 cursor-not-allowed',
        variantStyles.default,
        className
      )}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'group relative p-4 rounded-xl border transition-all duration-200',
        'shadow-sm hover:shadow-md',
        'active:scale-[0.99]',
        'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2',
        variantStyles[variant],
        className
      )}
    >
      {content}
    </Link>
  );
}
