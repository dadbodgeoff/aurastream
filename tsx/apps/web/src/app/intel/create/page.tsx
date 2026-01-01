'use client';

/**
 * Intel Create Page
 * 
 * Wraps the Studio creation flow within the Intel layout.
 * Provides Quick Create, Build Your Own, and AI Coach options.
 */

import { Suspense } from 'react';
import { CreateStudio } from '@/components/create-studio';

function StudioLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5" />
        <div className="space-y-2">
          <div className="h-6 w-36 bg-white/5 rounded" />
          <div className="h-4 w-56 bg-white/5 rounded" />
        </div>
      </div>
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-11 w-32 bg-white/10 rounded-lg" />
        ))}
      </div>
      <div className="space-y-4 mt-6">
        <div className="h-48 bg-white/5 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function IntelCreatePage() {
  return (
    <div className="max-w-5xl mx-auto">
      <Suspense fallback={<StudioLoadingSkeleton />}>
        <CreateStudio testId="intel-create-page" />
      </Suspense>
    </div>
  );
}
