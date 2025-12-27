'use client';

import { cn } from '@/lib/utils';

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ children, className }: SectionCardProps) {
  return (
    <div className={cn(
      "bg-background-surface/50 backdrop-blur-sm border border-border-subtle rounded-2xl p-6",
      "hover:border-border-default transition-colors duration-300",
      className
    )}>
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  optional?: boolean;
}

export function SectionHeader({ icon, title, description, action, optional }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-interactive-600/10 rounded-xl text-interactive-600">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            {optional && (
              <span className="px-2 py-0.5 text-xs font-medium text-text-tertiary bg-background-elevated rounded-full">
                Optional
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-0.5">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
