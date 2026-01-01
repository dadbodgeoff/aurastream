'use client';

/**
 * Intel Layout Header
 * 
 * Persistent header for the Intel layout with stats, quick actions, and usage.
 */

import Link from 'next/link';
import { Plus, Settings, Zap, Image, Palette, BarChart3, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderStats {
  assetsThisMonth: number;
  assetsLimit: number;
  brandKitCount: number;
  tier: string;
  displayName: string;
}

interface IntelLayoutHeaderProps {
  stats: HeaderStats;
  isLoading: boolean;
  onCreateAsset: () => void;
  onOpenSettings: () => void;
}

export function IntelLayoutHeader({ 
  stats, 
  isLoading, 
  onCreateAsset, 
  onOpenSettings 
}: IntelLayoutHeaderProps) {
  const isPremium = stats.tier === 'pro' || stats.tier === 'studio';
  const usagePercent = stats.assetsLimit > 0 
    ? Math.min(100, (stats.assetsThisMonth / stats.assetsLimit) * 100)
    : 0;

  if (isLoading) {
    return (
      <header className="bg-background-secondary/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between animate-pulse">
            <div className="h-8 w-48 bg-white/5 rounded-lg" />
            <div className="flex gap-4">
              <div className="h-10 w-24 bg-white/5 rounded-lg" />
              <div className="h-10 w-32 bg-white/5 rounded-lg" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-background-secondary/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Logo and Title */}
          <div className="flex items-center gap-4">
            <Link href="/intel" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-interactive-600 rounded-xl flex items-center justify-center shadow-lg shadow-interactive-600/20 ring-1 ring-white/10 group-hover:shadow-interactive-600/30 transition-shadow">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-text-primary tracking-tight">Creator Intel</span>
            </Link>
          </div>

          {/* Center: Quick Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
              <Image className="w-3.5 h-3.5 text-text-tertiary" />
              <span className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">{stats.assetsThisMonth}</span>
                {!isPremium && stats.assetsLimit > 0 && (
                  <span className="text-text-tertiary">/{stats.assetsLimit}</span>
                )}
                <span className="text-text-tertiary ml-1 text-xs">assets</span>
              </span>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
              <Palette className="w-3.5 h-3.5 text-text-tertiary" />
              <span className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">{stats.brandKitCount}</span>
                <span className="text-text-tertiary ml-1 text-xs">brand kits</span>
              </span>
            </div>
            
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg",
              isPremium ? "bg-interactive-600/15 ring-1 ring-interactive-500/20" : "bg-white/5"
            )}>
              <BarChart3 className={cn(
                "w-3.5 h-3.5",
                isPremium ? "text-interactive-400" : "text-text-tertiary"
              )} />
              <span className={cn(
                "text-sm font-semibold",
                isPremium ? "text-interactive-400" : "text-text-secondary"
              )}>
                {isPremium ? 'Unlimited' : stats.tier.charAt(0).toUpperCase() + stats.tier.slice(1)}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/community"
              className="flex items-center gap-2 px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-all text-sm"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Community</span>
            </Link>
            
            <button
              onClick={onOpenSettings}
              className="p-2.5 text-text-tertiary hover:text-text-primary hover:bg-white/5 rounded-lg transition-all"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <button
              onClick={onCreateAsset}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5',
                'bg-interactive-600 hover:bg-interactive-500',
                'text-white font-medium rounded-xl',
                'shadow-lg shadow-interactive-600/25',
                'ring-1 ring-white/10',
                'transition-all duration-200'
              )}
            >
              <Plus className="w-4 h-4" />
              <span>Create Asset</span>
            </button>
          </div>
        </div>

        {/* Usage Bar (Free tier only) - More subtle */}
        {!isPremium && stats.assetsLimit > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between text-xs text-text-tertiary mb-1.5">
              <span>Monthly usage</span>
              <span className="font-medium">{stats.assetsThisMonth} of {stats.assetsLimit} assets</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  usagePercent >= 90 ? "bg-red-500" :
                  usagePercent >= 70 ? "bg-amber-500" :
                  "bg-interactive-600"
                )}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
