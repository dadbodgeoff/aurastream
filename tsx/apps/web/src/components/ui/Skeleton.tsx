'use client';

/**
 * Skeleton loading components with shimmer animation.
 * @module ui/Skeleton
 * 
 * Provides accessible skeleton loaders for various UI patterns.
 * Respects user's reduced motion preference.
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';

/**
 * Border radius options for skeleton components
 */
const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
} as const;

/**
 * Avatar size presets
 */
const avatarSizes = {
  sm: { width: 32, height: 32 },
  md: { width: 40, height: 40 },
  lg: { width: 56, height: 56 },
} as const;

/**
 * Props for the base Skeleton component
 */
export interface SkeletonProps {
  /** Additional CSS classes */
  className?: string;
  /** Width of the skeleton (CSS value or number for pixels) */
  width?: string | number;
  /** Height of the skeleton (CSS value or number for pixels) */
  height?: string | number;
  /** Border radius preset */
  rounded?: keyof typeof roundedClasses;
  /** Whether to animate the shimmer effect (defaults to true, respects reduced motion) */
  animate?: boolean;
}

/**
 * Base skeleton component with shimmer animation.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Skeleton width={200} height={20} />
 * 
 * // With custom styling
 * <Skeleton className="w-full h-8" rounded="lg" />
 * 
 * // Disable animation
 * <Skeleton width="100%" height={16} animate={false} />
 * ```
 */
export const Skeleton = memo(function Skeleton({
  className,
  width,
  height,
  rounded = 'md',
  animate = true,
}: SkeletonProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion;

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-white/5 overflow-hidden',
        roundedClasses[rounded],
        shouldAnimate && 'animate-shimmer',
        className
      )}
      style={style}
    />
  );
});

Skeleton.displayName = 'Skeleton';

/**
 * Props for SkeletonList component
 */
export interface SkeletonListProps {
  /** Number of skeleton items to render */
  count?: number;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Skeleton list with multiple items.
 * Useful for loading states in lists or feeds.
 * 
 * @example
 * ```tsx
 * <SkeletonList count={5} />
 * ```
 */
export const SkeletonList = memo(function SkeletonList({
  count = 3,
  className,
}: SkeletonListProps) {
  return (
    <div aria-hidden="true" className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton width={40} height={40} rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton height={14} className="w-3/4" />
            <Skeleton height={12} className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
});

SkeletonList.displayName = 'SkeletonList';

/**
 * Props for SkeletonText component
 */
export interface SkeletonTextProps {
  /** Number of text lines to render */
  lines?: number;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Skeleton text block with multiple lines.
 * Simulates paragraph or multi-line text content.
 * 
 * @example
 * ```tsx
 * <SkeletonText lines={4} />
 * ```
 */
export const SkeletonText = memo(function SkeletonText({
  lines = 3,
  className,
}: SkeletonTextProps) {
  return (
    <div aria-hidden="true" className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={14}
          className={cn(
            // Last line is shorter for natural text appearance
            index === lines - 1 ? 'w-2/3' : 'w-full'
          )}
        />
      ))}
    </div>
  );
});

SkeletonText.displayName = 'SkeletonText';

/**
 * Props for SkeletonAvatar component
 */
export interface SkeletonAvatarProps {
  /** Size preset for the avatar */
  size?: keyof typeof avatarSizes;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Circular skeleton for avatar placeholders.
 * 
 * @example
 * ```tsx
 * <SkeletonAvatar size="lg" />
 * ```
 */
export const SkeletonAvatar = memo(function SkeletonAvatar({
  size = 'md',
  className,
}: SkeletonAvatarProps) {
  const dimensions = avatarSizes[size];
  
  return (
    <Skeleton
      width={dimensions.width}
      height={dimensions.height}
      rounded="full"
      className={className}
    />
  );
});

SkeletonAvatar.displayName = 'SkeletonAvatar';

/**
 * Props for SkeletonCard component
 */
export interface SkeletonCardProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton card with image, title, and description.
 * Useful for card-based layouts.
 * 
 * @example
 * ```tsx
 * <SkeletonCard />
 * ```
 */
export const SkeletonCard = memo(function SkeletonCard({
  className,
}: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-background-surface/50 border border-border-subtle rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Image placeholder */}
      <Skeleton height={160} rounded="none" className="w-full" />
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton height={18} className="w-3/4" />
        
        {/* Description */}
        <div className="space-y-2">
          <Skeleton height={14} className="w-full" />
          <Skeleton height={14} className="w-2/3" />
        </div>
        
        {/* Footer/meta */}
        <div className="flex items-center justify-between pt-2">
          <Skeleton width={80} height={12} />
          <Skeleton width={60} height={12} />
        </div>
      </div>
    </div>
  );
});

SkeletonCard.displayName = 'SkeletonCard';

/**
 * Props for SkeletonAssetCard component
 */
export interface SkeletonAssetCardProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton for asset grid cards.
 * Matches the layout of generated asset cards in the dashboard.
 * 
 * @example
 * ```tsx
 * <div className="grid grid-cols-3 gap-4">
 *   <SkeletonAssetCard />
 *   <SkeletonAssetCard />
 *   <SkeletonAssetCard />
 * </div>
 * ```
 */
export const SkeletonAssetCard = memo(function SkeletonAssetCard({
  className,
}: SkeletonAssetCardProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-background-surface/50 border border-border-subtle rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Asset image - square aspect ratio */}
      <div className="aspect-square">
        <Skeleton height="100%" rounded="none" className="w-full h-full" />
      </div>
      
      {/* Asset info */}
      <div className="p-3 space-y-2">
        {/* Asset type badge */}
        <Skeleton width={80} height={20} rounded="full" />
        
        {/* Timestamp */}
        <Skeleton width={100} height={12} />
      </div>
    </div>
  );
});

SkeletonAssetCard.displayName = 'SkeletonAssetCard';

/**
 * Props for SkeletonBrandKit component
 */
export interface SkeletonBrandKitProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton for brand kit cards.
 * Matches the layout of brand kit cards in the dashboard.
 * 
 * @example
 * ```tsx
 * <SkeletonBrandKit />
 * ```
 */
export const SkeletonBrandKit = memo(function SkeletonBrandKit({
  className,
}: SkeletonBrandKitProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-background-surface/50 border border-border-subtle rounded-xl p-5',
        className
      )}
    >
      {/* Header with logo and name */}
      <div className="flex items-start gap-4 mb-4">
        {/* Logo placeholder */}
        <Skeleton width={64} height={64} rounded="lg" />
        
        <div className="flex-1 space-y-2">
          {/* Brand name */}
          <Skeleton height={20} className="w-2/3" />
          
          {/* Status badge */}
          <Skeleton width={60} height={18} rounded="full" />
        </div>
      </div>
      
      {/* Color palette */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} width={24} height={24} rounded="full" />
        ))}
      </div>
      
      {/* Footer with actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        <Skeleton width={80} height={12} />
        <div className="flex gap-2">
          <Skeleton width={32} height={32} rounded="md" />
          <Skeleton width={32} height={32} rounded="md" />
        </div>
      </div>
    </div>
  );
});

SkeletonBrandKit.displayName = 'SkeletonBrandKit';
