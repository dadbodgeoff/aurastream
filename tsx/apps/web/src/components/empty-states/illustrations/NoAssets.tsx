/**
 * NoAssets Illustration
 * 
 * Abstract shapes suggesting images/media for the assets empty state.
 * Uses brand colors (interactive-500, interactive-600).
 * 
 * @module empty-states/illustrations/NoAssets
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface NoAssetsProps {
  /** Additional CSS classes */
  className?: string;
  /** Width of the illustration (default: 120) */
  width?: number;
  /** Height of the illustration (default: 120) */
  height?: number;
}

/**
 * NoAssets - SVG illustration for empty assets state.
 * 
 * Features:
 * - Abstract shapes representing images/media
 * - Uses interactive brand colors
 * - Optimized SVG with minimal paths
 * - Accessible with aria-hidden
 */
export function NoAssets({
  className,
  width = 120,
  height = 120,
}: NoAssetsProps): JSX.Element {
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
      
      {/* Main image frame */}
      <rect
        x="30"
        y="35"
        width="60"
        height="50"
        rx="6"
        className="stroke-interactive-500"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Mountain shape inside frame */}
      <path
        d="M35 75 L50 55 L60 65 L75 45 L85 75 Z"
        className="fill-interactive-600/30"
      />
      
      {/* Sun circle */}
      <circle
        cx="75"
        cy="48"
        r="6"
        className="fill-interactive-500/50"
      />
      
      {/* Decorative floating squares */}
      <rect
        x="18"
        y="50"
        width="8"
        height="8"
        rx="2"
        className="fill-interactive-500/30"
        transform="rotate(-15 22 54)"
      />
      <rect
        x="94"
        y="45"
        width="10"
        height="10"
        rx="2"
        className="fill-interactive-600/20"
        transform="rotate(10 99 50)"
      />
      <rect
        x="85"
        y="75"
        width="6"
        height="6"
        rx="1"
        className="fill-interactive-500/40"
        transform="rotate(25 88 78)"
      />
      
      {/* Plus icon suggesting creation */}
      <circle
        cx="95"
        cy="30"
        r="12"
        className="fill-interactive-600"
      />
      <path
        d="M95 24 V36 M89 30 H101"
        className="stroke-white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

NoAssets.displayName = 'NoAssets';

export default NoAssets;
