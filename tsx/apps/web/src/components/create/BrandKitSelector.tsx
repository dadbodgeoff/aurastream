/**
 * Brand kit selection component.
 * @module create/BrandKitSelector
 */

'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CheckIcon, ImageIcon, ArrowRightIcon } from './icons';
import type { BrandKitOption } from './types';

interface BrandKitSelectorProps {
  brandKits: BrandKitOption[];
  selected: string;
  onChange: (id: string) => void;
  isLoading: boolean;
}

export function BrandKitSelector({ 
  brandKits, 
  selected, 
  onChange,
  isLoading 
}: BrandKitSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-interactive-600/30 border-t-interactive-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (brandKits.length === 0) {
    return (
      <div className="p-5 bg-background-surface/50 border border-border-subtle rounded-xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-text-primary font-medium mb-1">No brand kits yet</p>
            <p className="text-sm text-text-muted mb-3">
              You can still create assets without a brand kit. Add one later for personalized branding.
            </p>
            <Link
              href="/dashboard/brand-kits"
              className="inline-flex items-center gap-2 text-sm text-interactive-600 hover:text-interactive-500 font-medium"
            >
              Create a brand kit
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {brandKits.map((kit) => (
        <button
          key={kit.id}
          onClick={() => onChange(kit.id)}
          className={cn(
            "p-4 rounded-xl border-2 text-left transition-all",
            selected === kit.id
              ? "border-interactive-600 bg-interactive-600/5"
              : "border-border-subtle hover:border-border-default bg-background-surface/50"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                "font-medium truncate",
                selected === kit.id ? "text-interactive-600" : "text-text-primary"
              )}>
                {kit.name}
              </h4>
              {kit.is_active && (
                <span className="text-xs text-success-light">Active</span>
              )}
            </div>
            {selected === kit.id && (
              <div className="w-5 h-5 bg-interactive-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                <CheckIcon />
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {[...kit.primary_colors, ...kit.accent_colors].slice(0, 4).map((color, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-md border border-white/10"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
