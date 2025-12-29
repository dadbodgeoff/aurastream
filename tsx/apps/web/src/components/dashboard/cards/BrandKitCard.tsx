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

// Default teal gradient when no colors are set
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #21808D 0%, #32B8C6 50%, #1A7373 100%)';

// Tone-specific accent colors for visual variety
const TONE_ACCENTS: Record<string, string> = {
  professional: '#21808D',
  playful: '#F59E0B',
  bold: '#EF4444',
  minimal: '#6B7280',
  comedic: '#8B5CF6',
  competitive: '#10B981',
  default: '#21808D',
};

function formatTone(tone: string | undefined | null): string {
  if (!tone) return 'Professional';
  return tone.charAt(0).toUpperCase() + tone.slice(1).toLowerCase();
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
  const hasColors = allColors.length > 0;
  const toneAccent = TONE_ACCENTS[tone?.toLowerCase() || 'default'] || TONE_ACCENTS.default;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 w-full text-left',
          'hover:scale-[1.01] active:scale-[0.99]',
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
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ 
              background: hasColors 
                ? `linear-gradient(135deg, ${allColors[0]} 0%, ${allColors[1] || allColors[0]} 100%)`
                : DEFAULT_GRADIENT 
            }}
          >
            {!hasColors && (
              <span className="text-white font-bold text-sm">{name.charAt(0).toUpperCase()}</span>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
          <p className="text-xs text-text-muted">{formatTone(tone)} Tone</p>
        </div>
        {isActive && (
          <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-500 rounded-full">
            Active
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'group relative rounded-2xl border overflow-hidden transition-all duration-200',
        'shadow-sm hover:shadow-md hover:scale-[1.01]',
        selected
          ? 'border-interactive-600 ring-2 ring-interactive-600/20'
          : 'border-border-subtle hover:border-border-default',
        className
      )}
    >
      {/* Color Preview Header */}
      <div className="h-20 relative overflow-hidden">
        {hasColors ? (
          <div className="h-full flex">
            {allColors.map((color, i) => (
              <div key={i} className="flex-1 transition-transform duration-300 group-hover:scale-105" style={{ backgroundColor: color }} />
            ))}
          </div>
        ) : (
          <div 
            className="h-full w-full transition-transform duration-300 group-hover:scale-105"
            style={{ background: DEFAULT_GRADIENT }}
          />
        )}
        {/* Subtle overlay gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4 bg-background-surface">
        <div className="flex items-start gap-3">
          {logoUrl && (
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex-shrink-0 -mt-10 border-2 border-background-surface shadow-md">
              <img src={logoUrl} alt={name} loading="lazy" decoding="async" className="w-full h-full object-contain p-1" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text-primary truncate">{name}</h3>
              {isActive && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 rounded-full uppercase tracking-wide">
                  <CheckIcon size="sm" />
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: toneAccent }}
              />
              <p className="text-sm text-text-secondary">{formatTone(tone)} Tone</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-subtle">
          <button
            onClick={onClick}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-elevated rounded-lg transition-colors active:scale-[0.98]"
          >
            Edit
            <ChevronRightIcon size="sm" />
          </button>
          {!isActive && onActivate && (
            <button
              onClick={(e) => { e.stopPropagation(); onActivate(); }}
              className="flex-1 px-3 py-2.5 text-sm font-semibold text-interactive-600 hover:bg-interactive-600/10 rounded-lg transition-colors active:scale-[0.98]"
            >
              Set Active
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
