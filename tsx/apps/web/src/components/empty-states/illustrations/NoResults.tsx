/**
 * NoResults Illustration
 * 
 * Search/magnifying glass for the search empty state.
 * Uses brand colors (interactive-500, interactive-600).
 * 
 * @module empty-states/illustrations/NoResults
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface NoResultsProps {
  /** Additional CSS classes */
  className?: string;
  /** Width of the illustration (default: 120) */
  width?: number;
  /** Height of the illustration (default: 120) */
  height?: number;
}

/**
 * NoResults - SVG illustration for empty search results state.
 * 
 * Features:
 * - Magnifying glass with question mark
 * - Scattered document elements
 * - Uses interactive brand colors
 * - Optimized SVG with minimal paths
 */
export function NoResults({
  className,
  width = 120,
  height = 120,
}: NoResultsProps): JSX.Element {
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
      
      {/* Magnifying glass circle */}
      <circle
        cx="52"
        cy="50"
        r="25"
        className="stroke-interactive-500"
        strokeWidth="3"
        fill="none"
      />
      
      {/* Magnifying glass handle */}
      <line
        x1="70"
        y1="68"
        x2="88"
        y2="86"
        className="stroke-interactive-500"
        strokeWidth="4"
        strokeLinecap="round"
      />
      
      {/* Question mark inside magnifying glass */}
      <path
        d="M47 42 C47 38 50 35 54 35 C58 35 61 38 61 42 C61 45 58 47 54 49 L54 53"
        className="stroke-interactive-600"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle
        cx="54"
        cy="59"
        r="2"
        className="fill-interactive-600"
      />
      
      {/* Scattered document elements */}
      <rect
        x="20"
        y="75"
        width="16"
        height="20"
        rx="2"
        className="fill-interactive-500/20 stroke-interactive-500/40"
        strokeWidth="1"
        transform="rotate(-10 28 85)"
      />
      <rect
        x="85"
        y="30"
        width="14"
        height="18"
        rx="2"
        className="fill-interactive-500/15 stroke-interactive-500/30"
        strokeWidth="1"
        transform="rotate(15 92 39)"
      />
      
      {/* Small decorative dots */}
      <circle
        cx="30"
        cy="35"
        r="3"
        className="fill-interactive-500/30"
      />
      <circle
        cx="95"
        cy="70"
        r="4"
        className="fill-interactive-600/20"
      />
      <circle
        cx="15"
        cy="55"
        r="2"
        className="fill-interactive-500/40"
      />
    </svg>
  );
}

NoResults.displayName = 'NoResults';

export default NoResults;
