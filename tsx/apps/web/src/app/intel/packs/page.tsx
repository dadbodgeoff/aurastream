'use client';

/**
 * Stream Packs Page
 * 
 * Template-first creation experience where users:
 * 1. Browse pre-made visual stream packages
 * 2. Customize variables (name, colors, platforms)
 * 3. AI regenerates the package with their customizations
 */

import { Suspense } from 'react';
import { StreamPacksGallery } from '@/components/stream-packs';

function PacksLoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/5 rounded" />
        <div className="h-4 w-96 bg-white/5 rounded" />
      </div>
      
      {/* Category tabs */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-24 bg-white/5 rounded-lg" />
        ))}
      </div>
      
      {/* Pack grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-video bg-white/5 rounded-xl" />
            <div className="h-5 w-32 bg-white/5 rounded" />
            <div className="h-4 w-48 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StreamPacksPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Suspense fallback={<PacksLoadingSkeleton />}>
        <StreamPacksGallery />
      </Suspense>
    </div>
  );
}
