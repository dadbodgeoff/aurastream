'use client';

/**
 * Brief Skeleton
 * 
 * Loading skeleton for the Daily Brief page.
 */

export function BriefSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Hero Skeleton */}
      <div className="bg-white/5 rounded-2xl p-6">
        <div className="h-8 w-64 bg-white/10 rounded-lg mb-2" />
        <div className="h-5 w-48 bg-white/10 rounded mb-4" />
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-white/10 rounded-full" />
          <div className="h-6 w-24 bg-white/10 rounded-full" />
          <div className="h-6 w-20 bg-white/10 rounded-full" />
        </div>
      </div>

      {/* Today's Play Skeleton */}
      <div className="bg-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-white/10 rounded" />
          <div className="h-6 w-32 bg-white/10 rounded" />
        </div>
        <div className="h-8 w-3/4 bg-white/10 rounded-lg mb-4" />
        <div className="h-4 w-1/2 bg-white/10 rounded mb-4" />
        <div className="h-20 bg-white/10 rounded-lg" />
      </div>

      {/* Thumbnail Formula Skeleton */}
      <div className="bg-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-white/10 rounded" />
          <div className="h-6 w-40 bg-white/10 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-video bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Title + Tags Skeleton */}
      <div className="bg-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-white/10 rounded" />
          <div className="h-6 w-28 bg-white/10 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white/10 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Clip Opportunities Skeleton */}
      <div className="bg-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-white/10 rounded" />
          <div className="h-6 w-40 bg-white/10 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="aspect-video bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>

      {/* What's Working Skeleton */}
      <div className="bg-white/5 rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="h-6 w-32 bg-white/10 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-16 bg-white/10 rounded-lg" />
              ))}
            </div>
          </div>
          <div>
            <div className="h-6 w-40 bg-white/10 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-16 bg-white/10 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Video Ideas Skeleton */}
      <div className="bg-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-white/10 rounded" />
          <div className="h-6 w-28 bg-white/10 rounded" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Alerts Skeleton */}
      <div className="bg-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-white/10 rounded" />
          <div className="h-6 w-20 bg-white/10 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
