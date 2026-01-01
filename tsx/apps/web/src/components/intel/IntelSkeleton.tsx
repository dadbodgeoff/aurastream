'use client';

import { cn } from '@/lib/utils';

// =============================================================================
// Shimmer Animation
// =============================================================================

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5',
        'bg-[length:200%_100%]',
        className
      )}
      style={{
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

// =============================================================================
// Panel Skeleton
// =============================================================================

function PanelSkeleton({ 
  size = 'small' 
}: { 
  size?: 'small' | 'wide' | 'large' 
}) {
  const height = size === 'large' ? 'min-h-[300px]' : 'min-h-[200px]';
  const colSpan = size === 'small' ? '' : 'md:col-span-2';
  
  return (
    <div className={cn(
      'rounded-xl border border-border-subtle/50 bg-background-surface/50 overflow-hidden',
      height,
      colSpan
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle/50">
        <div className="flex items-center gap-2">
          <Shimmer className="w-4 h-4 rounded" />
          <Shimmer className="w-24 h-3 rounded" />
        </div>
        <Shimmer className="w-6 h-6 rounded" />
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <Shimmer className="w-full h-4 rounded" />
        <Shimmer className="w-3/4 h-4 rounded" />
        <Shimmer className="w-1/2 h-4 rounded" />
        {size === 'large' && (
          <>
            <Shimmer className="w-2/3 h-4 rounded" />
            <Shimmer className="w-full h-4 rounded" />
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border-subtle/50 mt-auto">
        <Shimmer className="w-20 h-3 rounded" />
        <Shimmer className="w-6 h-6 rounded" />
      </div>
    </div>
  );
}

// =============================================================================
// Mission Skeleton
// =============================================================================

function MissionSkeleton() {
  return (
    <div className="rounded-xl border border-interactive-500/20 bg-interactive-600/10 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Shimmer className="w-4 h-4 rounded" />
        <Shimmer className="w-32 h-3 rounded" />
      </div>
      
      {/* Content */}
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Confidence Ring */}
        <Shimmer className="w-24 h-24 rounded-full flex-shrink-0" />
        
        {/* Text */}
        <div className="flex-1 space-y-3">
          <Shimmer className="w-3/4 h-6 rounded" />
          <Shimmer className="w-full h-4 rounded" />
          <Shimmer className="w-2/3 h-4 rounded" />
        </div>
      </div>
      
      {/* Suggested Title */}
      <div className="mt-6 space-y-2">
        <Shimmer className="w-24 h-3 rounded" />
        <Shimmer className="w-full h-12 rounded-lg" />
      </div>
      
      {/* CTA */}
      <div className="mt-6 flex items-center justify-between">
        <Shimmer className="w-32 h-10 rounded-lg" />
        <Shimmer className="w-24 h-3 rounded" />
      </div>
    </div>
  );
}

// =============================================================================
// Full Page Skeleton
// =============================================================================

export function IntelSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Shimmer className="w-48 h-8 rounded-lg" />
          <Shimmer className="w-64 h-4 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="w-24 h-8 rounded-full" />
          <Shimmer className="w-24 h-8 rounded-full" />
          <Shimmer className="w-16 h-8 rounded-full" />
        </div>
      </div>
      
      {/* Filter */}
      <Shimmer className="w-48 h-10 rounded-lg" />
      
      {/* Mission */}
      <MissionSkeleton />
      
      {/* Panel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PanelSkeleton size="large" />
        <PanelSkeleton size="wide" />
        <PanelSkeleton size="small" />
        <PanelSkeleton size="small" />
        <PanelSkeleton size="small" />
        <PanelSkeleton size="small" />
      </div>
    </div>
  );
}

// =============================================================================
// Individual Panel Skeletons
// =============================================================================

export function ClipsPanelSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <Shimmer className="w-20 h-11 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="w-full h-4 rounded" />
            <Shimmer className="w-2/3 h-3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsPanelSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-3 rounded-lg bg-white/5">
          <Shimmer className="w-16 h-3 rounded mb-2" />
          <Shimmer className="w-12 h-6 rounded" />
        </div>
      ))}
    </div>
  );
}

export function ListPanelSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 rounded-lg bg-white/5">
          <Shimmer className="w-full h-4 rounded mb-2" />
          <Shimmer className="w-2/3 h-3 rounded" />
        </div>
      ))}
    </div>
  );
}

// Add shimmer keyframes to global styles
const shimmerStyles = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

// Inject styles (in production, add to global CSS)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerStyles;
  document.head.appendChild(style);
}
