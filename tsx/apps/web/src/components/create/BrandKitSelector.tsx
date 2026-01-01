/**
 * Brand kit selection component - Clean dropdown style.
 * @module create/BrandKitSelector
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CheckIcon, ArrowRightIcon } from './icons';
import type { BrandKitOption } from './types';

interface BrandKitSelectorProps {
  brandKits: BrandKitOption[];
  selected: string;
  onChange: (id: string) => void;
  isLoading: boolean;
}

// Default teal gradient when no colors
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #21808D 0%, #32B8C6 100%)';

export function BrandKitSelector({ 
  brandKits, 
  selected, 
  onChange,
  isLoading 
}: BrandKitSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  if (isLoading) {
    return (
      <div className="h-12 bg-background-surface/50 border border-border-subtle rounded-xl flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-interactive-600/30 border-t-interactive-600 rounded-full animate-spin" />
      </div>
    );
  }

  const selectedKit = brandKits.find(k => k.id === selected);
  const selectedColors = selectedKit 
    ? [...(selectedKit.primary_colors || []), ...(selectedKit.accent_colors || [])]
    : [];

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-12 px-4 rounded-xl border-2 text-left transition-all duration-200",
          "flex items-center gap-3",
          "bg-background-surface/50 hover:bg-background-surface",
          isOpen 
            ? "border-interactive-600 ring-2 ring-interactive-600/20" 
            : "border-border-subtle hover:border-border-default"
        )}
      >
        {/* Color indicator */}
        {selected && selectedKit ? (
          <div 
            className="w-6 h-6 rounded-md flex-shrink-0"
            style={{ 
              background: selectedColors.length > 0 
                ? `linear-gradient(135deg, ${selectedColors[0]} 0%, ${selectedColors[1] || selectedColors[0]} 100%)`
                : DEFAULT_GRADIENT 
            }}
          />
        ) : (
          <div className="w-6 h-6 rounded-md bg-background-elevated flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        )}
        
        {/* Label */}
        <div className="flex-1 min-w-0">
          <span className={cn(
            "font-medium truncate block",
            selected ? "text-text-primary" : "text-text-secondary"
          )}>
            {selectedKit?.name || 'No brand kit'}
          </span>
        </div>

        {/* Active badge */}
        {selectedKit?.is_active && (
          <span className="px-1.5 py-0.5 text-micro font-semibold bg-emerald-500/10 text-emerald-500 rounded uppercase flex-shrink-0">
            Active
          </span>
        )}
        
        {/* Chevron */}
        <svg 
          className={cn(
            "w-4 h-4 text-text-muted transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-180"
          )} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={cn(
          "absolute z-50 w-full mt-2 py-1 rounded-xl border border-border-subtle",
          "bg-background-surface shadow-xl shadow-black/20",
          "animate-fade-in max-h-64 overflow-y-auto"
        )}>
          {/* None option */}
          <button
            onClick={() => { onChange(''); setIsOpen(false); }}
            className={cn(
              "w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors",
              "hover:bg-background-elevated",
              !selected && "bg-interactive-600/5"
            )}
          >
            <div className="w-6 h-6 rounded-md bg-background-elevated flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <span className={cn(
              "flex-1 text-sm font-medium",
              !selected ? "text-interactive-600" : "text-text-primary"
            )}>
              No brand kit
            </span>
            {!selected && (
              <CheckIcon />
            )}
          </button>

          {/* Divider */}
          {brandKits.length > 0 && (
            <div className="h-px bg-border-subtle mx-3 my-1" />
          )}

          {/* Brand kit options */}
          {brandKits.map((kit) => {
            const colors = [...(kit.primary_colors || []), ...(kit.accent_colors || [])];
            const hasColors = colors.length > 0;
            const isSelected = selected === kit.id;
            
            return (
              <button
                key={kit.id}
                onClick={() => { onChange(kit.id); setIsOpen(false); }}
                className={cn(
                  "w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors",
                  "hover:bg-background-elevated",
                  isSelected && "bg-interactive-600/5"
                )}
              >
                <div 
                  className="w-6 h-6 rounded-md flex-shrink-0"
                  style={{ 
                    background: hasColors 
                      ? `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1] || colors[0]} 100%)`
                      : DEFAULT_GRADIENT 
                  }}
                />
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-sm font-medium truncate block",
                    isSelected ? "text-interactive-600" : "text-text-primary"
                  )}>
                    {kit.name}
                  </span>
                </div>
                {kit.is_active && (
                  <span className="px-1.5 py-0.5 text-micro font-semibold bg-emerald-500/10 text-emerald-500 rounded uppercase flex-shrink-0">
                    Active
                  </span>
                )}
                {isSelected && (
                  <CheckIcon />
                )}
              </button>
            );
          })}

          {/* Create new link */}
          {brandKits.length === 0 && (
            <div className="px-4 py-3 border-t border-border-subtle">
              <Link
                href="/dashboard/brand-kits"
                className="inline-flex items-center gap-2 text-sm text-interactive-600 hover:text-interactive-500 font-medium"
                onClick={() => setIsOpen(false)}
              >
                Create a brand kit
                <ArrowRightIcon />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
