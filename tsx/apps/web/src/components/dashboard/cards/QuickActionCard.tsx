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
      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105',
        iconStyles[variant]
      )}>
        {icon}
      </div>
      <div className="flex items-start justify-between">
        <div>
          <h3 className={cn(
            'font-semibold mb-1',
            variant === 'gradient' ? 'text-white' : 'text-text-primary'
          )}>
            {title}
          </h3>
          <p className={cn(
            'text-sm',
            variant === 'gradient' ? 'text-white/80' : 'text-text-tertiary'
          )}>
            {description}
          </p>
        </div>
        {badge && (
          <span className="px-2 py-0.5 text-xs font-medium bg-interactive-600 text-white rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className={cn(
        'absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity',
        variant === 'gradient' ? 'text-white' : variant === 'primary' ? 'text-interactive-600' : 'text-text-tertiary'
      )}>
        <ArrowRightIcon size="sm" />
      </div>
    </>
  );

  if (disabled) {
    return (
      <div className={cn(
        'group relative p-6 rounded-2xl border opacity-50 cursor-not-allowed',
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
        'group relative p-6 rounded-2xl border transition-all duration-200',
        variantStyles[variant],
        className
      )}
    >
      {content}
    </Link>
  );
}
