'use client';

/**
 * Daily Brief - Intel Dashboard
 * 
 * Layout (optimized for actionable content):
 * 1. Compact header with inline insight
 * 2. Clip carousels (YouTube trending + Twitch clips) - at TOP
 * 3. Category feeds (Thumbnails, Titles, Ideas, Keywords) - main value
 */

import { useEffect, useState } from 'react';
import { 
  useIntelPreferences, 
  useDailyInsight,
  useYouTubeTrending,
  useTwitchClips,
} from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { useAuth } from '@aurastream/shared';
import Link from 'next/link';
import { 
  Zap, Clock, Image, Type, Lightbulb, Hash,
  ChevronDown, ChevronUp, Settings, Youtube, Tv2,
  ArrowRight
} from 'lucide-react';

import { BriefSkeleton } from '@/components/intel/brief/BriefSkeleton';
import { IntelOnboarding } from '@/components/intel/IntelOnboarding';
import { ThumbnailFeed, TitleFeed, VideoIdeasFeed, KeywordsFeed } from '@/components/intel/feeds';
import { ClipCarousel } from '@/components/intel/carousels';

// ============================================================================
// Category Feed Section Component
// ============================================================================

type FeedType = 'thumbnails' | 'titles' | 'ideas' | 'keywords';

interface CategoryFeedSectionProps {
  categoryKey: string;
  categoryName: string;
  defaultExpanded?: boolean;
}

function CategoryFeedSection({ categoryKey, categoryName, defaultExpanded = true }: CategoryFeedSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeFeed, setActiveFeed] = useState<FeedType>('thumbnails'); // Default to thumbnails

  const feedTabs: { key: FeedType; label: string; icon: any; color: string }[] = [
    { key: 'thumbnails', label: 'Thumbnails', icon: Image, color: 'text-purple-400' },
    { key: 'titles', label: 'Titles', icon: Type, color: 'text-blue-400' },
    { key: 'ideas', label: 'Ideas', icon: Lightbulb, color: 'text-yellow-400' },
    { key: 'keywords', label: 'Keywords', icon: Hash, color: 'text-green-400' },
  ];

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Category Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-interactive-500" />
          <h2 className="text-base font-semibold text-text-primary">{categoryName}</h2>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-text-tertiary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-tertiary" />
        )}
      </button>

      {isExpanded && (
        <>
          {/* Feed Tabs */}
          <div className="flex border-t border-white/[0.06]">
            {feedTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeFeed === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFeed(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs transition-colors ${
                    isActive 
                      ? 'bg-white/[0.04] border-b-2 border-interactive-500' 
                      : 'hover:bg-white/[0.02] text-text-tertiary'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? tab.color : ''}`} />
                  <span className={isActive ? 'text-text-primary font-medium' : ''}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Feed Content */}
          <div className="p-4">
            {activeFeed === 'thumbnails' && (
              <ThumbnailFeed categoryKey={categoryKey} categoryName={categoryName} />
            )}
            {activeFeed === 'titles' && (
              <TitleFeed categoryKey={categoryKey} categoryName={categoryName} />
            )}
            {activeFeed === 'ideas' && (
              <VideoIdeasFeed categoryKey={categoryKey} categoryName={categoryName} />
            )}
            {activeFeed === 'keywords' && (
              <KeywordsFeed categoryKey={categoryKey} categoryName={categoryName} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function DailyBriefPage() {
  const { user } = useAuth();
  const { data: preferences, isLoading: prefsLoading } = useIntelPreferences();
  const { data: insight } = useDailyInsight();
  
  // YouTube trending videos (gaming category)
  const { data: youtubeTrending, isLoading: youtubeLoading } = useYouTubeTrending('gaming', 10);
  
  const syncFromServer = useIntelStore(state => state.syncFromServer);
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);

  // Get first subscribed category's Twitch ID for clips
  // If no twitchId, fetch general clips (not category-specific)
  const firstTwitchId = subscribedCategories[0]?.twitchId;
  const { data: twitchClips, isLoading: twitchLoading } = useTwitchClips(
    firstTwitchId || undefined,  // undefined = fetch general top clips
    'day',
    10,
    true  // Always enabled - fetch general clips if no category
  );

  useEffect(() => {
    if (preferences) {
      syncFromServer(preferences);
    }
  }, [preferences, syncFromServer]);

  if (prefsLoading) {
    return <BriefSkeleton />;
  }

  if (subscribedCategories.length === 0) {
    return <IntelOnboarding />;
  }

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  // Transform YouTube trending for carousel
  const youtubeClips = (youtubeTrending || []).map(video => ({
    id: video.videoId,
    title: video.title,
    thumbnailUrl: video.thumbnail,
    url: `https://youtube.com/watch?v=${video.videoId}`,
    viewCount: video.views,
    broadcasterName: video.channelTitle,
    duration: video.durationSeconds,
  }));

  // Transform Twitch clips for carousel
  const twitchClipItems = (twitchClips || []).map(clip => ({
    id: clip.id,
    title: clip.title,
    thumbnailUrl: clip.thumbnailUrl,
    url: clip.url,
    viewCount: clip.viewCount,
    broadcasterName: clip.broadcasterName,
    duration: clip.duration,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* ================================================================== */}
      {/* COMPACT HEADER WITH INLINE INSIGHT */}
      {/* ================================================================== */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-text-primary">
              {greeting}, {user?.displayName || 'Creator'}
            </h1>
            <span className="text-xs text-text-tertiary">
              {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          
          {/* Inline insight - compact */}
          {insight && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-interactive-500/10 border border-interactive-500/20 rounded-lg">
                <Zap className="w-3.5 h-3.5 text-interactive-400" />
                <span className="text-sm text-interactive-400 font-medium">{insight.metricValue}</span>
                <span className="text-xs text-text-secondary">{insight.headline}</span>
              </div>
              <Link
                href="/create"
                className="text-xs text-interactive-400 hover:text-interactive-300 flex items-center gap-1"
              >
                Act now <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {subscribedCategories.slice(0, 2).map(cat => (
            <span key={cat.key} className="px-2 py-1 bg-white/5 text-text-tertiary text-[10px] rounded-full">
              {cat.name}
            </span>
          ))}
          {subscribedCategories.length > 2 && (
            <span className="text-[10px] text-text-tertiary">+{subscribedCategories.length - 2}</span>
          )}
          <Link 
            href="/intel/settings"
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4 text-text-tertiary" />
          </Link>
        </div>
      </header>

      {/* ================================================================== */}
      {/* CLIP CAROUSELS - COMPACT */}
      {/* ================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
          <ClipCarousel
            title="YouTube Trending"
            icon={<Youtube className="w-3 h-3 text-red-500" />}
            clips={youtubeClips}
            isLoading={youtubeLoading}
            emptyMessage="No trending videos"
            compact
          />
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
          <ClipCarousel
            title={firstTwitchId ? "Twitch Clips" : "Recent Twitch Clips"}
            icon={<Tv2 className="w-3 h-3 text-purple-500" />}
            clips={twitchClipItems}
            isLoading={twitchLoading}
            emptyMessage="No Twitch clips available"
            compact
          />
        </div>
      </section>

      {/* ================================================================== */}
      {/* CATEGORY FEEDS - MAIN VALUE */}
      {/* ================================================================== */}
      <section className="space-y-3">
        {subscribedCategories.map((category, index) => (
          <CategoryFeedSection
            key={category.key}
            categoryKey={category.key}
            categoryName={category.name}
            defaultExpanded={index === 0}
          />
        ))}
      </section>

      {/* ================================================================== */}
      {/* MINIMAL FOOTER */}
      {/* ================================================================== */}
      <footer className="flex items-center justify-between py-3 text-[10px] text-text-tertiary">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>Refreshes every 30 min</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/intel/thumbnails" className="hover:text-text-secondary transition-colors">
            Thumbnails
          </Link>
          <Link href="/intel/observatory" className="hover:text-text-secondary transition-colors">
            Observatory
          </Link>
        </div>
      </footer>
    </div>
  );
}
