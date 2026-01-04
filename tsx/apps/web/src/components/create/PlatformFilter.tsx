/**
 * Platform filter component for selecting target platform.
 * @module create/PlatformFilter
 */

'use client';

import { cn } from '@/lib/utils';
import { PLATFORMS } from './constants';
import type { Platform } from './types';

interface PlatformFilterProps {
  selected: Platform;
  onChange: (platform: Platform) => void;
}

export function PlatformFilter({ selected, onChange }: PlatformFilterProps) {
  return (
    <div className="inline-flex gap-1 p-0.5 bg-background-surface/50 rounded-lg border border-border-subtle">
      {PLATFORMS.map((platform) => (
        <button
          key={platform.id}
          onClick={() => onChange(platform.id)}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
            "active:scale-[0.98]",
            selected === platform.id
              ? "bg-interactive-600 text-white shadow-sm shadow-interactive-600/20"
              : "text-text-secondary hover:text-text-primary hover:bg-background-elevated"
          )}
        >
          <span className="mr-1.5">{platform.icon}</span>
          {platform.label}
        </button>
      ))}
    </div>
  );
}
