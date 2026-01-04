'use client';

/**
 * Intel Layout Header - Redesigned
 * 
 * Clean, minimal header with:
 * - Logo/brand left
 * - Compact stats (hover for details)
 * - Primary CTA right
 */

import Link from 'next/link';
import { useState } from 'react';
import { Plus, Settings, Zap, ChevronDown, Users, Crown, BarChart3, Server, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@aurastream/shared';

const ADMIN_EMAIL = 'dadbodgeoff@gmail.com';

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
  const [showStatsTooltip, setShowStatsTooltip] = useState(false);
  const { user } = useAuth();
  const isPremium = stats.tier === 'pro' || stats.tier === 'studio';
  const isAdmin = user?.email === ADMIN_EMAIL;

  if (isLoading) {
    return (
      <header className="h-14 bg-background-secondary/60 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
          <div className="h-9 w-28 bg-white/5 rounded-lg animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="h-14 bg-background-secondary/60 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <Link href="/intel" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-interactive-500 to-interactive-600 rounded-lg flex items-center justify-center shadow-lg shadow-interactive-600/20 group-hover:shadow-interactive-600/30 transition-all">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-semibold text-text-primary hidden sm:block">Creator Intel</span>
        </Link>

        {/* Center: Compact Stats Pill */}
        <div 
          className="relative hidden md:flex"
          onMouseEnter={() => setShowStatsTooltip(true)}
          onMouseLeave={() => setShowStatsTooltip(false)}
        >
          <button className="flex items-center gap-3 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] rounded-full transition-colors">
            <span className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{stats.assetsThisMonth}</span>
              <span className="text-text-muted"> assets</span>
            </span>
            <span className="w-px h-3 bg-white/10" />
            <span className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{stats.brandKitCount}</span>
              <span className="text-text-muted"> kits</span>
            </span>
            <span className="w-px h-3 bg-white/10" />
            {isPremium ? (
              <span className="flex items-center gap-1 text-sm text-interactive-400">
                <Crown className="w-3 h-3" />
                <span className="font-medium">Pro</span>
              </span>
            ) : (
              <span className="text-sm text-text-muted">Free</span>
            )}
            <ChevronDown className="w-3 h-3 text-text-muted" />
          </button>

          {/* Stats Tooltip */}
          {showStatsTooltip && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 p-3 bg-background-elevated border border-white/[0.08] rounded-xl shadow-xl z-50">
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Assets this month</span>
                  <span className="text-text-primary font-medium">
                    {stats.assetsThisMonth}
                    {!isPremium && stats.assetsLimit > 0 && (
                      <span className="text-text-muted">/{stats.assetsLimit}</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Brand kits</span>
                  <span className="text-text-primary font-medium">{stats.brandKitCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Plan</span>
                  <span className={cn(
                    "font-medium",
                    isPremium ? "text-interactive-400" : "text-text-primary"
                  )}>
                    {stats.tier.charAt(0).toUpperCase() + stats.tier.slice(1)}
                  </span>
                </div>
                {!isPremium && (
                  <Link 
                    href="/intel/settings?tab=billing"
                    className="block w-full mt-2 py-1.5 text-center text-xs font-medium text-interactive-400 hover:text-interactive-300 bg-interactive-600/10 hover:bg-interactive-600/15 rounded-lg transition-colors"
                  >
                    Upgrade to Pro
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Admin-only buttons */}
          {isAdmin && (
            <>
              <Link
                href="/admin/analytics"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                title="Analytics Dashboard"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden lg:inline">Analytics</span>
              </Link>
              <Link
                href="/admin/orchestrator"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
                title="Orchestrator Dashboard"
              >
                <Server className="w-4 h-4" />
                <span className="hidden lg:inline">Workers</span>
              </Link>
              <Link
                href="/admin/rate-limits"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                title="Rate Limits Admin"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden lg:inline">Limits</span>
              </Link>
              <span className="w-px h-5 bg-white/10 mx-1" />
            </>
          )}
          
          <Link
            href="/community"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-text-muted hover:text-text-primary hover:bg-white/[0.04] rounded-lg transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Community</span>
          </Link>
          
          <button
            onClick={onOpenSettings}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-white/[0.04] rounded-lg transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>
          
          <button
            onClick={onCreateAsset}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 ml-1',
              'bg-interactive-600 hover:bg-interactive-500',
              'text-white text-sm font-medium rounded-lg',
              'shadow-lg shadow-interactive-600/25 hover:shadow-interactive-600/35',
              'transition-all duration-200'
            )}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create</span>
          </button>
        </div>
      </div>
    </header>
  );
}
