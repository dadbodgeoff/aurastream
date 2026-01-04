'use client';

/**
 * Daily Brief - Intel Dashboard (Redesigned)
 * 
 * Target Layout:
 * 1. Header: Greeting + date (left), Market Opportunity + Daily Assets badges (right)
 * 2. Side-by-side carousels: YouTube Trending | Twitch Clips with "View All" links
 * 3. Intelligence section: Topic dropdown inline with title, tabs, AI insight banner inside
 * 4. Thumbnail rows: Row-based layout with aspect ratio, hashtags, stats, Analyze button
 */

import { useEffect, useState, useRef } from 'react';
import { 
  useIntelPreferences, 
  useDailyBrief,
  useYouTubeTrending,
  useTwitchClips,
  useCategoryInsight,
} from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { useAuth } from '@aurastream/shared';
import Link from 'next/link';
import { 
  Clock, Image, Type, Lightbulb, Hash,
  Settings, Tv2, Play, ChevronRight,
} from 'lucide-react';

import { BriefSkeleton } from '@/components/intel/brief/BriefSkeleton';
import { IntelOnboarding } from '@/components/intel/IntelOnboarding';
import { TitleFeed, VideoIdeasFeed, KeywordsFeed, ThumbnailEntryRow } from '@/components/intel/feeds';
import { ClipCarousel } from '@/components/intel/carousels';
import { TopicDropdown } from '@/components/intel/TopicDropdown';
import { AIInsightBanner } from '@/components/intel/AIInsightBanner';
import { MarketOpportunityBadge, DailyAssetsBadge } from '@/components/intel/badges';

// ============================================================================
// Feed Tab Types
// ============================================================================

type FeedType = 'thumbnails' | 'titles' | 'ideas' | 'keywords';

const feedTabs: { key: FeedType; label: string; icon: any }[] = [
  { key: 'thumbnails', label: 'Thumbnails', icon: Image },
  { key: 'titles', label: 'Titles', icon: Type },
  { key: 'ideas', label: 'Ideas', icon: Lightbulb },
  { key: 'keywords', label: 'Keywords', icon: Hash },
];

// ============================================================================
// Main Component
// ============================================================================

export default function DailyBriefPage() {
  const { user } = useAuth();
  const { data: preferences, isLoading: prefsLoading } = useIntelPreferences();
  const { data: dailyBrief, isLoading: briefLoading } = useDailyBrief();
  
  const { data: youtubeTrending, isLoading: youtubeLoading } = useYouTubeTrending('gaming', 10);
  
  const syncFromServer = useIntelStore(state => state.syncFromServer);
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);

  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('');
  const [activeFeed, setActiveFeed] = useState<FeedType>('thumbnails');
  
  // Track if initial sync has happened to prevent race conditions
  const hasSyncedRef = useRef(false);

  const selectedCategory = subscribedCategories.find(c => c.key === selectedCategoryKey) 
    || subscribedCategories[0];

  const selectedTwitchId = selectedCategory?.twitchId;
  const { data: twitchClips, isLoading: twitchLoading } = useTwitchClips(
    selectedTwitchId || undefined, 'day', 10, true
  );

  // Get category insight for thumbnails and AI insight
  const { data: categoryInsight } = useCategoryInsight(selectedCategory?.key || '');

  // Sync preferences to store only once when data arrives
  useEffect(() => {
    if (preferences && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      syncFromServer(preferences);
    }
  }, [preferences, syncFromServer]);

  // Set initial category only after sync and when categories are available
  useEffect(() => {
    if (subscribedCategories.length > 0 && !selectedCategoryKey && hasSyncedRef.current) {
      setSelectedCategoryKey(subscribedCategories[0].key);
    }
  }, [subscribedCategories, selectedCategoryKey]);

  // Unified loading state - wait for critical data before rendering
  const isInitialLoading = prefsLoading || (preferences && !hasSyncedRef.current);
  
  if (isInitialLoading) return <BriefSkeleton />;
  if (subscribedCategories.length === 0) return <IntelOnboarding />;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const youtubeClips = (youtubeTrending || []).map(video => ({
    id: video.videoId, title: video.title, thumbnailUrl: video.thumbnail,
    url: `https://youtube.com/watch?v=${video.videoId}`,
    viewCount: video.views, broadcasterName: video.channelTitle, duration: video.durationSeconds,
  }));

  const twitchClipItems = (twitchClips || []).map(clip => ({
    id: clip.id, title: clip.title, thumbnailUrl: clip.thumbnailUrl, url: clip.url,
    viewCount: clip.viewCount, broadcasterName: clip.broadcasterName, duration: clip.duration,
  }));

  const aiInsight = categoryInsight?.categoryStyleSummary || dailyBrief?.insights?.[0]?.insight || null;
  const thumbnails = categoryInsight?.thumbnails || [];

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-4">
      {/* ================================================================== */}
      {/* HEADER: Greeting + Date (left) | Badges (right) */}
      {/* ================================================================== */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-text-primary">
            {greeting}, {user?.displayName || 'Creator'}
          </h1>
          <span className="text-xs text-text-tertiary">{dateStr}</span>
          <Link href="/intel/settings" className="p-1 hover:bg-white/5 rounded ml-1">
            <Settings className="w-4 h-4 text-text-tertiary" />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MarketOpportunityBadge data={dailyBrief?.marketOpportunity} isLoading={briefLoading} />
          <DailyAssetsBadge data={dailyBrief?.dailyAssets} isLoading={briefLoading} />
        </div>
      </header>

      {/* ================================================================== */}
      {/* CAROUSELS: Side-by-side YouTube Trending | Twitch Clips */}
      {/* ================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-text-primary">YouTube Trending</span>
            </div>
            <Link href="/intel/youtube" className="text-xs text-text-tertiary hover:text-text-secondary flex items-center gap-0.5">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <ClipCarousel clips={youtubeClips} isLoading={youtubeLoading} emptyMessage="No trending videos" compact hideHeader />
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Tv2 className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-text-primary">
                {selectedCategory?.name || 'Twitch'} Clips ({twitchClipItems.length})
              </span>
            </div>
            <Link href="/intel/clips" className="text-xs text-text-tertiary hover:text-text-secondary flex items-center gap-0.5">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <ClipCarousel clips={twitchClipItems} isLoading={twitchLoading} emptyMessage="No clips available" compact hideHeader />
        </div>
      </section>

      {/* ================================================================== */}
      {/* INTELLIGENCE SECTION: Topic dropdown + Tabs + AI Insight + Content */}
      {/* ================================================================== */}
      {selectedCategory && (
        <section className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          {/* Section Header: Title + Topic Dropdown + Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-interactive-500" />
                <h2 className="text-base font-semibold text-text-primary">
                  {selectedCategory.name} Intelligence
                </h2>
              </div>
              <TopicDropdown
                categories={subscribedCategories}
                selectedKey={selectedCategoryKey || subscribedCategories[0]?.key || ''}
                onSelect={setSelectedCategoryKey}
              />
            </div>
            
            {/* Feed Tabs - pill style */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              {feedTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeFeed === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFeed(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      isActive 
                        ? 'bg-white/10 text-text-primary font-medium' 
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Insight Banner - inside the section */}
          {aiInsight && activeFeed === 'thumbnails' && (
            <div className="px-4 pt-3">
              <AIInsightBanner insight={aiInsight} categoryName={selectedCategory.name} onDismiss={() => {}} />
            </div>
          )}

          {/* Feed Content */}
          <div className="p-4">
            {activeFeed === 'thumbnails' && (
              <div className="space-y-1">
                {thumbnails.length === 0 ? (
                  <p className="text-sm text-text-tertiary text-center py-8">
                    No thumbnail data yet for {selectedCategory.name}
                  </p>
                ) : (
                  thumbnails.map((thumb, i) => (
                    <ThumbnailEntryRow
                      key={thumb.videoId || i}
                      thumbnail={{
                        videoId: thumb.videoId,
                        title: thumb.title,
                        thumbnailUrl: thumb.thumbnailUrl || thumb.url,
                        viewCount: thumb.viewCount || thumb.views || 0,
                        layoutType: thumb.layoutType || 'standard',
                        colorMood: thumb.colorMood || '',
                        whyItWorks: thumb.whyItWorks || '',
                        aspectRatio: thumb.aspectRatio,
                        hashtags: thumb.hashtags || [],
                        formatType: thumb.formatType || thumb.layoutType,
                        channelName: thumb.channelName,
                        hasFace: thumb.hasFace,
                        hasText: thumb.hasText,
                        dominantColors: thumb.dominantColors,
                        textContent: thumb.textContent,
                      }}
                      onAnalyze={(videoId) => console.log('Analyze:', videoId)}
                    />
                  ))
                )}
              </div>
            )}
            {activeFeed === 'titles' && (
              <TitleFeed categoryKey={selectedCategory.key} categoryName={selectedCategory.name} />
            )}
            {activeFeed === 'ideas' && (
              <VideoIdeasFeed categoryKey={selectedCategory.key} categoryName={selectedCategory.name} />
            )}
            {activeFeed === 'keywords' && (
              <KeywordsFeed categoryKey={selectedCategory.key} categoryName={selectedCategory.name} />
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="flex items-center justify-between py-3 text-micro text-text-tertiary">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>Refreshes every 30 min</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/intel/thumbnails" className="hover:text-text-secondary">Thumbnails</Link>
          <Link href="/intel/observatory" className="hover:text-text-secondary">Observatory</Link>
        </div>
      </footer>
    </div>
  );
}
