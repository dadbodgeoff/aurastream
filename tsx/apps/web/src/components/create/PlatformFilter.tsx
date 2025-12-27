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
    <div className="flex gap-2 flex-wrap">
      {PLATFORMS.map((platform) => (
        <button
          key={platform.id}
          onClick={() => onChange(platform.id)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            selected === platform.id
              ? "bg-interactive-600 text-white shadow-sm"
              : "bg-background-surface text-text-secondary hover:text-text-primary hover:bg-background-elevated"
          )}
        >
          <span className="mr-2">{platform.icon}</span>
          {platform.label}
        </button>
      ))}
    </div>
  );
}
