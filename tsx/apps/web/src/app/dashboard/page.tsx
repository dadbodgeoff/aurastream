'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@aurastream/shared';
import { useBrandKits, useAssets, useJobs } from '@aurastream/api-client';
import { cn } from '@/lib/utils';

// Enterprise Dashboard Components
import {
  PageContainer,
  StatCard,
  UsageMeter,
  MetricsGrid,
  QuickActionCard,
  ActivityFeed,
  JobTracker,
  EmptyState,
  LoadingState,
  CreateIcon,
  BrandIcon,
  LibraryIcon,
  TwitchIcon,
  CoachIcon,
  ArrowRightIcon,
} from '@/components/dashboard';

// Usage Display
import { UsageDisplay } from '@/components/usage';

// =============================================================================
// Types
// =============================================================================

interface RecentAsset {
  id: string;
  url: string;
  asset_type: string;
  created_at: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatAssetType(type: string | undefined | null): string {
  if (!type) return 'Asset';
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// =============================================================================
// Main Dashboard Page
// =============================================================================

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data: brandKitsData, isLoading: brandKitsLoading } = useBrandKits();
  const { data: assetsData, isLoading: assetsLoading } = useAssets({ limit: 10 });
  const { data: jobsData, isLoading: jobsLoading } = useJobs({ limit: 10 });

  const brandKits = brandKitsData?.brandKits ?? [];
  const recentAssets = assetsData?.assets ?? [];
  const jobs = jobsData?.jobs ?? [];
  
  const activeJobs = jobs.filter((j: any) => j.status === 'queued' || j.status === 'processing');
  const hasNoBrandKits = brandKits.length === 0;
  const isPremium = user?.subscriptionTier === 'studio';

  // Calculate usage
  const assetsUsed = user?.assetsGeneratedThisMonth ?? 0;
  const assetsLimit = isPremium ? -1 : 10; // -1 = unlimited

  // Build activity feed from recent assets and jobs
  const activities = [
    ...recentAssets.slice(0, 5).map((asset: any) => ({
      id: asset.id,
      type: 'asset_created' as const,
      title: `Created ${formatAssetType(asset.asset_type)}`,
      timestamp: asset.created_at,
      status: 'success' as const,
      imageUrl: asset.url,
    })),
    ...jobs.filter((j: any) => j.status === 'completed').slice(0, 3).map((job: any) => ({
      id: job.id,
      type: 'job_completed' as const,
      title: `${formatAssetType(job.asset_type)} generation completed`,
      timestamp: job.completed_at || job.updated_at,
      status: 'success' as const,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

  if (authLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  return (
    <PageContainer>
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            {getGreeting()}, {user?.displayName || 'Creator'}
          </h1>
          <p className="mt-1 text-text-secondary">
            Here's what's happening with your content today
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-xl shadow-lg shadow-interactive-600/20 transition-colors"
        >
          <CreateIcon className="w-5 h-5" />
          Create Asset
        </Link>
      </div>

      {/* Getting Started Banner */}
      {hasNoBrandKits && (
        <div className="p-6 bg-gradient-to-r from-interactive-600/10 via-interactive-600/5 to-transparent border border-interactive-600/20 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-interactive-600 flex items-center justify-center text-white flex-shrink-0">
              <BrandIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-text-primary mb-1">Get started with your brand</h2>
              <p className="text-sm text-text-secondary mb-4">
                Create a brand kit to ensure all your assets match your style — colors, fonts, logos, and voice.
              </p>
              <Link
                href="/dashboard/brand-kits"
                className="inline-flex items-center gap-2 px-4 py-2 bg-interactive-600 hover:bg-interactive-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Create Brand Kit
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div>
        <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-4">Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Assets This Month"
            value={assetsUsed}
            icon={<LibraryIcon className="w-5 h-5" />}
            trend={assetsUsed > 0 ? { value: 12, direction: 'up', label: 'vs last month' } : undefined}
          />
          <StatCard
            label="Brand Kits"
            value={brandKits.length}
            icon={<BrandIcon className="w-5 h-5" />}
            sublabel={`${10 - brandKits.length} slots available`}
          />
          <StatCard
            label="Active Jobs"
            value={activeJobs.length}
            icon={<CreateIcon className="w-5 h-5" />}
            variant={activeJobs.length > 0 ? 'primary' : 'default'}
          />
          <StatCard
            label="Plan"
            value={isPremium ? 'Studio' : 'Free'}
            sublabel={isPremium ? 'Unlimited assets' : `${assetsLimit - assetsUsed} remaining`}
            variant={isPremium ? 'success' : 'default'}
          />
        </div>
      </div>

      {/* Usage & Plan Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <UsageDisplay 
            variant="full" 
            showUpgrade 
            onUpgrade={() => router.push('/dashboard/settings?tab=billing')}
          />
        </div>
        
        {/* Active Jobs Tracker */}
        <div className="lg:col-span-2">
          {activeJobs.length > 0 ? (
            <JobTracker
              jobs={activeJobs.map((job: any) => ({
                id: job.id,
                assetType: job.asset_type,
                status: job.status,
                progress: job.progress,
                createdAt: job.created_at,
              }))}
              onJobClick={(id) => router.push(`/dashboard/assets?job=${id}`)}
              onViewAll={() => router.push('/dashboard/generate')}
            />
          ) : (
            <div className="h-full p-6 bg-background-surface/50 border border-border-subtle rounded-xl flex flex-col items-center justify-center text-center">
              <CreateIcon className="w-10 h-10 text-text-tertiary mb-3" />
              <h3 className="font-medium text-text-primary mb-1">No active jobs</h3>
              <p className="text-sm text-text-secondary mb-4">Start creating to see your generation progress here</p>
              <Link
                href="/dashboard/create"
                className="text-sm font-medium text-interactive-600 hover:text-interactive-500"
              >
                Create Asset →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            href="/dashboard/create"
            icon={<CreateIcon className="w-6 h-6" />}
            title="Create Asset"
            description="Generate thumbnails, overlays, and more"
            variant="primary"
          />
          <QuickActionCard
            href="/dashboard/brand-kits"
            icon={<BrandIcon className="w-6 h-6" />}
            title="Brand Studio"
            description="Manage your brand identities"
          />
          <QuickActionCard
            href="/dashboard/twitch"
            icon={<TwitchIcon className="w-6 h-6" />}
            title="Twitch Assets"
            description="Emotes, badges, and panels"
          />
          <QuickActionCard
            href="/dashboard/coach"
            icon={<CoachIcon className="w-6 h-6" />}
            title="Prompt Coach"
            description="AI-powered prompt refinement"
            badge={isPremium ? undefined : 'Pro'}
            disabled={!isPremium}
          />
        </div>
      </div>

      {/* Two Column Layout: Activity + Recent Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <ActivityFeed
          activities={activities}
          onViewAll={() => router.push('/dashboard/assets')}
          emptyMessage="No recent activity. Create your first asset to get started!"
        />

        {/* Recent Assets */}
        <div className="bg-background-surface/50 border border-border-subtle rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <h3 className="font-medium text-text-primary">Recent Assets</h3>
            <Link
              href="/dashboard/assets"
              className="text-sm text-interactive-600 hover:text-interactive-500 font-medium"
            >
              View all
            </Link>
          </div>
          {recentAssets.length > 0 ? (
            <div className="p-4 grid grid-cols-3 gap-3">
              {recentAssets.slice(0, 6).map((asset: any) => (
                <Link
                  key={asset.id}
                  href={`/dashboard/assets?asset=${asset.id}`}
                  className="group aspect-video bg-background-elevated rounded-lg overflow-hidden hover:ring-2 hover:ring-interactive-600/50 transition-all"
                >
                  {asset.url ? (
                    <img
                      src={asset.url}
                      alt={asset.asset_type}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <LibraryIcon className="w-6 h-6" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<LibraryIcon className="w-8 h-8" />}
              title="No assets yet"
              description="Create your first asset to see it here"
              action={{ label: 'Create Asset', href: '/dashboard/create' }}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
