/**
 * PathSelectionCards - Two-path entry point for Brand Studio
 * 
 * Full-sized cards by default for readability.
 * Users can compress to compact view if preferred.
 */

'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Palette, ArrowRight, Zap, Image, Sliders, ChevronUp, ChevronDown, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PathSelectionCardsProps {
  vibeUsage: { remaining: number; limit: number } | null;
  brandKitCount: number;
  maxBrandKits: number;
  onSelectVibe: () => void;
  onSelectManual: () => void;
  isLoading?: boolean;
}

// Persist user preference
const STORAGE_KEY = 'brand-studio-cards-compact';

export function PathSelectionCards({
  vibeUsage,
  brandKitCount,
  maxBrandKits,
  onSelectVibe,
  onSelectManual,
  isLoading = false,
}: PathSelectionCardsProps) {
  const [isCompact, setIsCompact] = useState(false);
  
  // Load preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') setIsCompact(true);
  }, []);
  
  const toggleCompact = () => {
    const newValue = !isCompact;
    setIsCompact(newValue);
    localStorage.setItem(STORAGE_KEY, String(newValue));
  };

  const vibeDisabled = vibeUsage?.remaining === 0;
  const manualDisabled = brandKitCount >= maxBrandKits;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PathCardSkeleton />
          <PathCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Toggle */}
      <div className="flex justify-end">
        <button
          onClick={toggleCompact}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted hover:text-text-primary bg-background-surface hover:bg-background-elevated rounded-lg transition-colors"
        >
          {isCompact ? (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              Expand Cards
            </>
          ) : (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              Compact View
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vibe Branding Card */}
        <button
          onClick={onSelectVibe}
          disabled={vibeDisabled}
          className={cn(
            "group relative rounded-2xl border-2 text-left transition-all duration-300",
            "bg-purple-500/5",
            isCompact ? "p-4" : "p-8",
            vibeDisabled
              ? "border-border-subtle opacity-60 cursor-not-allowed"
              : "border-purple-500/30 hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1"
          )}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative">
            {/* Header */}
            <div className={cn("flex items-start gap-4", isCompact ? "mb-2" : "mb-6")}>
              {/* Icon */}
              <div className={cn(
                "rounded-xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0",
                isCompact ? "w-12 h-12" : "w-16 h-16"
              )}>
                <Sparkles className={cn("text-white", isCompact ? "w-6 h-6" : "w-8 h-8")} />
              </div>

              <div className="flex-1 min-w-0">
                {/* Title */}
                <h3 className={cn(
                  "font-bold text-text-primary flex items-center gap-2 flex-wrap",
                  isCompact ? "text-lg" : "text-2xl"
                )}>
                  Vibe Branding
                  <span className={cn(
                    "font-medium bg-purple-500/20 text-purple-400 rounded-full",
                    isCompact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
                  )}>
                    AI-Powered
                  </span>
                </h3>

                {/* Subtitle - only in expanded */}
                {!isCompact && (
                  <p className="text-text-secondary mt-1">
                    Let AI do the heavy lifting
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <p className={cn(
              "text-text-secondary",
              isCompact ? "text-sm mb-3" : "text-base mb-6"
            )}>
              {isCompact 
                ? "Upload an image and let AI extract your brand colors, fonts, and style."
                : "Upload a screenshot, logo, or any image that represents your brand aesthetic. Our AI will analyze it and automatically extract your brand colors, suggest fonts, and identify your visual style — creating a complete brand kit in seconds."
              }
            </p>

            {/* Features - expanded only */}
            {!isCompact && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="flex items-start gap-3 p-3 bg-purple-500/5 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary text-sm">Instant Extraction</p>
                    <p className="text-xs text-text-muted mt-0.5">Results in under 10 seconds</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-purple-500/5 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Image className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary text-sm">Any Image Works</p>
                    <p className="text-xs text-text-muted mt-0.5">Screenshots, logos, artwork</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-purple-500/5 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary text-sm">Auto-Creates Kit</p>
                    <p className="text-xs text-text-muted mt-0.5">Ready to use immediately</p>
                  </div>
                </div>
              </div>
            )}

            {/* Compact features */}
            {isCompact && (
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-lg">
                  <Zap className="w-3 h-3" /> Instant
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-lg">
                  <Image className="w-3 h-3" /> Any Image
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-lg">
                  <Sparkles className="w-3 h-3" /> Auto-Create
                </span>
              </div>
            )}

            {/* CTA */}
            <div className={cn(
              "flex items-center justify-between",
              !isCompact && "pt-4 border-t border-purple-500/10"
            )}>
              <span className={cn(
                "inline-flex items-center gap-2 font-semibold",
                vibeDisabled ? "text-text-muted" : "text-purple-400 group-hover:text-purple-300",
                isCompact ? "text-sm" : "text-base"
              )}>
                {vibeDisabled ? 'Limit Reached' : 'Extract from Image'}
                {!vibeDisabled && <ArrowRight className={cn("group-hover:translate-x-1 transition-transform", isCompact ? "w-4 h-4" : "w-5 h-5")} />}
              </span>
              
              {vibeUsage && (
                <span className={cn(
                  "text-text-muted bg-background-elevated px-2 py-1 rounded-lg",
                  isCompact ? "text-xs" : "text-sm"
                )}>
                  {vibeUsage.remaining}/{vibeUsage.limit} this month
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Manual Creation Card */}
        <button
          onClick={onSelectManual}
          disabled={manualDisabled}
          className={cn(
            "group relative rounded-2xl border-2 text-left transition-all duration-300",
            "bg-interactive-600/5",
            isCompact ? "p-4" : "p-8",
            manualDisabled
              ? "border-border-subtle opacity-60 cursor-not-allowed"
              : "border-interactive-600/30 hover:border-interactive-600 hover:shadow-xl hover:shadow-interactive-600/10 hover:-translate-y-1"
          )}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-interactive-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative">
            {/* Header */}
            <div className={cn("flex items-start gap-4", isCompact ? "mb-2" : "mb-6")}>
              {/* Icon */}
              <div className={cn(
                "rounded-xl bg-interactive-600 flex items-center justify-center shadow-lg shadow-interactive-600/20 flex-shrink-0",
                isCompact ? "w-12 h-12" : "w-16 h-16"
              )}>
                <Palette className={cn("text-white", isCompact ? "w-6 h-6" : "w-8 h-8")} />
              </div>

              <div className="flex-1 min-w-0">
                {/* Title */}
                <h3 className={cn(
                  "font-bold text-text-primary",
                  isCompact ? "text-lg" : "text-2xl"
                )}>
                  Build Your Own
                </h3>

                {/* Subtitle - only in expanded */}
                {!isCompact && (
                  <p className="text-text-secondary mt-1">
                    Full creative control
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <p className={cn(
              "text-text-secondary",
              isCompact ? "text-sm mb-3" : "text-base mb-6"
            )}>
              {isCompact 
                ? "Start from scratch with full control. Choose from presets or customize everything."
                : "Take complete control of your brand identity. Start with one of our professionally designed preset palettes, or build everything from scratch. Pick your exact colors, fonts, tone, and style — perfect for creators who know exactly what they want."
              }
            </p>

            {/* Features - expanded only */}
            {!isCompact && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="flex items-start gap-3 p-3 bg-interactive-600/5 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-interactive-600/20 flex items-center justify-center flex-shrink-0">
                    <Sliders className="w-5 h-5 text-interactive-500" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary text-sm">Full Customization</p>
                    <p className="text-xs text-text-muted mt-0.5">Every detail under your control</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-interactive-600/5 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-interactive-600/20 flex items-center justify-center flex-shrink-0">
                    <Palette className="w-5 h-5 text-interactive-500" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary text-sm">Preset Palettes</p>
                    <p className="text-xs text-text-muted mt-0.5">6 pro-designed starting points</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-interactive-600/5 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-interactive-600/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-interactive-500" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary text-sm">All Fields Optional</p>
                    <p className="text-xs text-text-muted mt-0.5">AI fills in what you skip</p>
                  </div>
                </div>
              </div>
            )}

            {/* Compact features */}
            {isCompact && (
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-interactive-600/10 text-interactive-500 text-xs rounded-lg">
                  <Sliders className="w-3 h-3" /> Full Control
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-interactive-600/10 text-interactive-500 text-xs rounded-lg">
                  <Palette className="w-3 h-3" /> Presets
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-interactive-600/10 text-interactive-500 text-xs rounded-lg">
                  <Sparkles className="w-3 h-3" /> Optional
                </span>
              </div>
            )}

            {/* CTA */}
            <div className={cn(
              "flex items-center justify-between",
              !isCompact && "pt-4 border-t border-interactive-600/10"
            )}>
              <span className={cn(
                "inline-flex items-center gap-2 font-semibold",
                manualDisabled ? "text-text-muted" : "text-interactive-500 group-hover:text-interactive-400",
                isCompact ? "text-sm" : "text-base"
              )}>
                {manualDisabled ? 'Limit Reached' : 'Create Manually'}
                {!manualDisabled && <ArrowRight className={cn("group-hover:translate-x-1 transition-transform", isCompact ? "w-4 h-4" : "w-5 h-5")} />}
              </span>
              
              <span className={cn(
                "text-text-muted bg-background-elevated px-2 py-1 rounded-lg",
                isCompact ? "text-xs" : "text-sm"
              )}>
                {brandKitCount}/{maxBrandKits} kits
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function PathCardSkeleton() {
  return (
    <div className="p-8 rounded-2xl border-2 border-border-subtle bg-background-surface/50 animate-pulse">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-16 h-16 rounded-xl bg-background-elevated" />
        <div className="flex-1">
          <div className="h-7 w-40 bg-background-elevated rounded mb-2" />
          <div className="h-4 w-32 bg-background-elevated rounded" />
        </div>
      </div>
      <div className="h-5 w-full bg-background-elevated rounded mb-2" />
      <div className="h-5 w-3/4 bg-background-elevated rounded mb-6" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="h-20 bg-background-elevated rounded-xl" />
        <div className="h-20 bg-background-elevated rounded-xl" />
        <div className="h-20 bg-background-elevated rounded-xl" />
      </div>
      <div className="h-6 w-40 bg-background-elevated rounded" />
    </div>
  );
}
