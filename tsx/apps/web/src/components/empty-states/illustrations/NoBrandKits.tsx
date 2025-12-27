/**
 * NoBrandKits Illustration
 * 
 * Color palette and brand elements for the brand kits empty state.
 * Uses brand colors (interactive-500, interactive-600).
 * 
 * @module empty-states/illustrations/NoBrandKits
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface NoBrandKitsProps {
  /** Additional CSS classes */
  className?: string;
  /** Width of the illustration (default: 120) */
  width?: number;
  /** Height of the illustration (default: 120) */
  height?: number;
}

/**
 * NoBrandKits - SVG illustration for empty brand kits state.
 * 
 * Features:
 * - Color palette swatches representing brand colors
 * - Typography element suggesting fonts
 * - Uses interactive brand colors
 * - Optimized SVG with minimal paths
 */
export function NoBrandKits({
  className,
  width = 120,
  height = 120,
}: NoBrandKitsProps): JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-interactive-500', className)}
      aria-hidden="true"
    >
      {/* Background circle */}
      <circle
        cx="60"
        cy="60"
        r="50"
        className="fill-interactive-600/10"
      />
      
      {/* Color palette card */}
      <rect
        x="25"
        y="30"
        width="70"
        height="60"
        rx="8"
        className="fill-background-surface/80 stroke-interactive-500/50"
        strokeWidth="1.5"
      />
      
      {/* Color swatches row */}
      <rect
        x="33"
        y="40"
        width="14"
        height="14"
        rx="3"
        className="fill-interactive-600"
      />
      <rect
        x="53"
        y="40"
        width="14"
        height="14"
        rx="3"
        className="fill-interactive-500"
      />
      <rect
        x="73"
        y="40"
        width="14"
        height="14"
        rx="3"
        className="fill-interactive-500/50"
      />
      
      {/* Typography lines */}
      <rect
        x="33"
        y="62"
        width="40"
        height="4"
        rx="2"
        className="fill-interactive-500/60"
      />
      <rect
        x="33"
        y="72"
        width="54"
        height="3"
        rx="1.5"
        className="fill-interactive-500/30"
      />
      <rect
        x="33"
        y="80"
        width="30"
        height="3"
        rx="1.5"
        className="fill-interactive-500/30"
      />
      
      {/* Decorative elements */}
      <circle
        cx="20"
        cy="70"
        r="6"
        className="fill-interactive-500/20"
      />
      <circle
        cx="100"
        cy="50"
        r="8"
        className="fill-interactive-600/15"
      />
      
      {/* Sparkle/star suggesting customization */}
      <path
        d="M100 75 L102 80 L107 80 L103 83 L105 88 L100 85 L95 88 L97 83 L93 80 L98 80 Z"
        className="fill-interactive-500"
      />
    </svg>
  );
}

NoBrandKits.displayName = 'NoBrandKits';

export default NoBrandKits;
