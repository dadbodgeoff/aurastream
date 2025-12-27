/**
 * Content-Aware Skeleton Components
 * 
 * Skeleton loaders that match the exact dimensions and layout of their
 * corresponding content components to prevent Cumulative Layout Shift (CLS).
 * 
 * Features:
 * - Shimmer animation with reduced motion support
 * - Brand-colored shimmer option (purple tint)
 * - Dark mode support
 * - Responsive layouts
 * - Contextual loading messages for accessibility
 * 
 * @module ui/skeletons
 */

export { AssetGridSkeleton } from './AssetGridSkeleton';
export type { AssetGridSkeletonProps } from './AssetGridSkeleton';

export { BrandKitCardSkeleton } from './BrandKitCardSkeleton';
export type { BrandKitCardSkeletonProps } from './BrandKitCardSkeleton';

export { DashboardStatsSkeleton } from './DashboardStatsSkeleton';
export type { DashboardStatsSkeletonProps } from './DashboardStatsSkeleton';

export { CoachMessageSkeleton } from './CoachMessageSkeleton';
export type { CoachMessageSkeletonProps } from './CoachMessageSkeleton';
