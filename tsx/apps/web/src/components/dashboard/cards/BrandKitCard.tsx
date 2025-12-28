'use client';

import { cn } from '@/lib/utils';
import { CheckIcon, ChevronRightIcon } from '../icons';

export interface BrandKitCardProps {
  id: string;
  name: string;
  isActive: boolean;
  primaryColors: string[];
  accentColors: string[];
  logoUrl?: string | null;
  tone: string;
  onClick?: () => void;
  onActivate?: () => void;
  selected?: boolean;
  compact?: boolean;
  className?: string;
}

export function BrandKitCard({
  id,
  name,
  isActive,
  primaryColors,
  accentColors,
  logoUrl,
  tone,
  onClick,
  onActivate,
  selected = false,
  compact = false,
  className,
}: BrandKitCardProps) {
  const allColors = [...(primaryColors || []), ...(accentColors || [])].slice(0, 5);

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border transition-all w-full text-left',
          selected
            ? 'border-interactive-600 bg-interactive-600/5'
            : 'border-border-subtle hover:border-border-default bg-background-surface/50',
          className
        )}
      >
        {logoUrl ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-background-elevated flex-shrink-0">
            <img src={logoUrl} alt={name} loading="lazy" decoding="async" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-background-elevated flex items-center justify-center flex-shrink-0">
            <div className="flex gap-0.5">
              {allColors.slice(0, 3).map((color, i) => (
                <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{name}</p>
          <p className="text-xs text-text-muted capitalize">{tone}</p>
        </div>
        {isActive && (
          <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-500 rounded-full">
            Active
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'group relative rounded-2xl border overflow-hidden transition-all',
        selected
          ? 'border-interactive-600 ring-2 ring-interactive-600/20'
          : 'border-border-subtle hover:border-border-default',
        className
      )}
    >
      {/* Color Preview Header */}
      <div className="h-16 flex">
        {allColors.map((color, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: color }} />
        ))}
        {allColors.length === 0 && (
          <div className="flex-1 bg-gradient-to-r from-gray-200 to-gray-300" />
        )}
      </div>

      {/* Content */}
      <div className="p-4 bg-background-surface">
        <div className="flex items-start gap-3">
          {logoUrl && (
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-background-elevated flex-shrink-0 -mt-8 border-2 border-background-surface">
              <img src={logoUrl} alt={name} loading="lazy" decoding="async" className="w-full h-full object-contain bg-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text-primary truncate">{name}</h3>
              {isActive && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-500 rounded-full">
                  <CheckIcon size="sm" />
                  Active
                </span>
              )}
            </div>
            <p className="text-sm text-text-muted capitalize mt-0.5">{tone} tone</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-subtle">
          <button
            onClick={onClick}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-elevated rounded-lg transition-colors"
          >
            Edit
            <ChevronRightIcon size="sm" />
          </button>
          {!isActive && onActivate && (
            <button
              onClick={(e) => { e.stopPropagation(); onActivate(); }}
              className="flex-1 px-3 py-2 text-sm font-medium text-interactive-600 hover:bg-interactive-600/10 rounded-lg transition-colors"
            >
              Set Active
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
