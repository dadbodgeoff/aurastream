/**
 * Dashboard Skeleton Components
 * 
 * Skeleton loading states for dashboard sections.
 * Used with Suspense boundaries for streaming SSR.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Stats section skeleton
 */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="p-6 rounded-xl bg-background-surface border border-border-subtle"
        >
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/**
 * Recent assets grid skeleton
 */
export function RecentAssetsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-background-surface border border-border-subtle overflow-hidden"
          >
            <Skeleton className="w-full h-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Active jobs list skeleton
 */
export function ActiveJobsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-lg bg-background-surface border border-border-subtle flex items-center gap-4"
          >
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Brand kits list skeleton
 */
export function BrandKitsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-background-surface border border-border-subtle"
          >
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="w-6 h-6 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Generation page skeleton
 */
export function GenerationPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Progress */}
      <div className="p-6 rounded-xl bg-background-surface border border-border-subtle">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Assets grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-background-surface border border-border-subtle"
          >
            <Skeleton className="w-full h-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full dashboard skeleton (combines all sections)
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-6">
      <StatsSkeleton />
      <RecentAssetsSkeleton />
      <ActiveJobsSkeleton />
    </div>
  );
}
