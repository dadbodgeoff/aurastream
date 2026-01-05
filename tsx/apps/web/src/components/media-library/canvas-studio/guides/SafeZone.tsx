/**
 * Safe Zone Component
 * 
 * Shows safe zone boundaries to prevent important content from being cut off.
 * Different platforms have different safe zone requirements.
 */

'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { CanvasDimensions } from '../types';

// ============================================================================
// Types
// ============================================================================

export type SafeZonePreset = 'youtube' | 'twitch' | 'instagram' | 'tiktok' | 'custom';

interface SafeZonePadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface SafeZoneProps {
  dimensions: CanvasDimensions;
  preset?: SafeZonePreset;
  customPadding?: number; // percentage
  showLabels?: boolean;
  visible?: boolean;
  className?: string;
}

// ============================================================================
// Safe Zone Presets (percentage from edge)
// ============================================================================

const SAFE_ZONE_PRESETS: Record<SafeZonePreset, SafeZonePadding> = {
  youtube: { top: 10, right: 10, bottom: 10, left: 10 },
  twitch: { top: 5, right: 5, bottom: 5, left: 5 },
  instagram: { top: 10, right: 5, bottom: 10, left: 5 },
  tiktok: { top: 15, right: 5, bottom: 20, left: 5 },
  custom: { top: 10, right: 10, bottom: 10, left: 10 },
};

const PRESET_LABELS: Record<SafeZonePreset, string> = {
  youtube: 'YouTube Safe Zone',
  twitch: 'Twitch Safe Zone',
  instagram: 'Instagram Safe Zone',
  tiktok: 'TikTok Safe Zone',
  custom: 'Custom Safe Zone',
};


/** Descriptions for each preset (exported for UI tooltips) */
export const PRESET_DESCRIPTIONS: Record<SafeZonePreset, string> = {
  youtube: 'Keep text and important elements inside',
  twitch: 'Avoid overlay UI areas',
  instagram: 'Account for top/bottom UI elements',
  tiktok: 'Avoid caption and button areas',
  custom: 'Custom safe area',
};

// ============================================================================
// Icons
// ============================================================================

function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SafeZone({
  dimensions,
  preset = 'youtube',
  customPadding,
  showLabels = true,
  visible = true,
  className,
}: SafeZoneProps) {
  // Calculate padding values
  const padding = useMemo(() => {
    if (preset === 'custom' && customPadding !== undefined) {
      return {
        top: customPadding,
        right: customPadding,
        bottom: customPadding,
        left: customPadding,
      };
    }
    return SAFE_ZONE_PRESETS[preset];
  }, [preset, customPadding]);
  
  if (!visible) return null;
  
  // Use dimensions for potential future pixel-based calculations
  const _canvasAspect = dimensions.width / dimensions.height;
  
  return (
    <div 
      className={cn('absolute inset-0 pointer-events-none', className)}
      data-canvas-width={dimensions.width}
      data-canvas-height={dimensions.height}
    >
      {/* Danger zones (outside safe area) */}
      <DangerZones padding={padding} />
      
      {/* Safe zone border */}
      <SafeZoneBorder padding={padding} />
      
      {/* Labels */}
      {showLabels && (
        <SafeZoneLabel
          preset={preset}
          padding={padding}
        />
      )}
    </div>
  );
}


// ============================================================================
// Sub-components
// ============================================================================

interface DangerZonesProps {
  padding: SafeZonePadding;
}

function DangerZones({ padding }: DangerZonesProps) {
  return (
    <>
      {/* Top danger zone */}
      <div
        className="absolute left-0 right-0 top-0 bg-red-500/5"
        style={{ height: `${padding.top}%` }}
      />
      
      {/* Bottom danger zone */}
      <div
        className="absolute left-0 right-0 bottom-0 bg-red-500/5"
        style={{ height: `${padding.bottom}%` }}
      />
      
      {/* Left danger zone */}
      <div
        className="absolute left-0 top-0 bottom-0 bg-red-500/5"
        style={{
          width: `${padding.left}%`,
          top: `${padding.top}%`,
          bottom: `${padding.bottom}%`,
        }}
      />
      
      {/* Right danger zone */}
      <div
        className="absolute right-0 top-0 bottom-0 bg-red-500/5"
        style={{
          width: `${padding.right}%`,
          top: `${padding.top}%`,
          bottom: `${padding.bottom}%`,
        }}
      />
    </>
  );
}

interface SafeZoneBorderProps {
  padding: SafeZonePadding;
}

function SafeZoneBorder({ padding }: SafeZoneBorderProps) {
  return (
    <div
      className="absolute border-2 border-dashed border-amber-500/60 rounded-sm"
      style={{
        top: `${padding.top}%`,
        right: `${padding.right}%`,
        bottom: `${padding.bottom}%`,
        left: `${padding.left}%`,
      }}
    >
      {/* Corner markers */}
      <CornerMarker position="top-left" />
      <CornerMarker position="top-right" />
      <CornerMarker position="bottom-left" />
      <CornerMarker position="bottom-right" />
    </div>
  );
}


interface CornerMarkerProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

function CornerMarker({ position }: CornerMarkerProps) {
  const positionClasses = {
    'top-left': '-top-1 -left-1',
    'top-right': '-top-1 -right-1',
    'bottom-left': '-bottom-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
  };
  
  return (
    <div
      className={cn(
        'absolute w-3 h-3 border-2 border-amber-500 bg-background-primary rounded-sm',
        positionClasses[position]
      )}
    />
  );
}

interface SafeZoneLabelProps {
  preset: SafeZonePreset;
  padding: SafeZonePadding;
}

function SafeZoneLabel({ preset, padding }: SafeZoneLabelProps) {
  return (
    <div
      className="absolute flex items-center gap-1.5 px-2 py-1 bg-amber-500/90 text-white text-[10px] font-medium rounded-sm"
      style={{
        top: `${padding.top}%`,
        left: `${padding.left}%`,
        transform: 'translate(4px, 4px)',
      }}
    >
      <InfoIcon />
      <span>{PRESET_LABELS[preset]}</span>
    </div>
  );
}

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Get safe zone padding for a preset
 */
export function getSafeZonePadding(preset: SafeZonePreset): SafeZonePadding {
  return SAFE_ZONE_PRESETS[preset];
}

/**
 * Check if a position is within the safe zone
 */
export function isWithinSafeZone(
  x: number,
  y: number,
  preset: SafeZonePreset,
  customPadding?: number
): boolean {
  const padding = customPadding !== undefined && preset === 'custom'
    ? { top: customPadding, right: customPadding, bottom: customPadding, left: customPadding }
    : SAFE_ZONE_PRESETS[preset];
  
  return (
    x >= padding.left &&
    x <= (100 - padding.right) &&
    y >= padding.top &&
    y <= (100 - padding.bottom)
  );
}

/**
 * Get the safe zone bounds as percentages
 */
export function getSafeZoneBounds(
  preset: SafeZonePreset,
  customPadding?: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  const padding = customPadding !== undefined && preset === 'custom'
    ? { top: customPadding, right: customPadding, bottom: customPadding, left: customPadding }
    : SAFE_ZONE_PRESETS[preset];
  
  return {
    minX: padding.left,
    maxX: 100 - padding.right,
    minY: padding.top,
    maxY: 100 - padding.bottom,
  };
}

/**
 * Clamp a position to stay within the safe zone
 */
export function clampToSafeZone(
  x: number,
  y: number,
  preset: SafeZonePreset,
  customPadding?: number
): { x: number; y: number } {
  const bounds = getSafeZoneBounds(preset, customPadding);
  
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, y)),
  };
}
