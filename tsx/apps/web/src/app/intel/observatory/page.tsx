'use client';

/**
 * Global Observatory Page
 * 
 * Full platform view of ALL Twitch/YouTube data we parse.
 * 5 tabs: Twitch Overview, YouTube Trending, Viral Clips, Thumbnail Gallery, Historical Data
 * 
 * @module app/intel/observatory/page
 */

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Globe, Tv, Youtube, Film, Image, History } from 'lucide-react';
import { 
  useTwitchGames, 
  useTwitchLive, 
  useTrendHistory,
  useViralClips,
  useThumbnailIntelOverview,
} from '@aurastream/api-client';
import { useAuth } from '@aurastream/shared';

// Tab Components
import { TwitchOverviewTab } from '@/components/intel/observatory/TwitchOverviewTab';
import { YouTubeTrendingTab } from '@/components/intel/observatory/YouTubeTrendingTab';
import { ViralClipsTab } from '@/components/intel/observatory/ViralClipsTab';
import { ThumbnailGalleryTab } from '@/components/intel/observatory/ThumbnailGalleryTab';
import { HistoricalDataTab } from '@/components/intel/observatory/HistoricalDataTab';

type ObservatoryTab = 'twitch' | 'youtube' | 'clips' | 'thumbnails' | 'history';

const TABS: { id: ObservatoryTab; label: string; icon: React.ReactNode }[] = [
  { id: 'twitch', label: 'Twitch', icon: <Tv className="w-4 h-4" /> },
  { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-4 h-4" /> },
  { id: 'clips', label: 'Viral Clips', icon: <Film className="w-4 h-4" /> },
  { id: 'thumbnails', label: 'Thumbnails', icon: <Image className="w-4 h-4" /> },
  { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
];

export default function ObservatoryPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as ObservatoryTab) || 'twitch';
  const [activeTab, setActiveTab] = useState<ObservatoryTab>(initialTab);
  const { user } = useAuth();
  
  const tier = user?.subscriptionTier || 'free';
  const isPro = tier === 'pro' || tier === 'studio';
  const isStudio = tier === 'studio';

  // Fetch data for all tabs
  const { data: twitchGames, isLoading: gamesLoading } = useTwitchGames(50);
  const { data: twitchStreams, isLoading: streamsLoading } = useTwitchLive(50);
  const { data: viralClipsData, isLoading: clipsLoading } = useViralClips();
  const { data: thumbnailOverview, isLoading: thumbsLoading } = useThumbnailIntelOverview();
  const { data: historyData, isLoading: historyLoading } = useTrendHistory(isPro ? (isStudio ? 30 : 7) : 0, isPro);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
          <Globe className="w-6 h-6 text-interactive-500" />
          Global Observatory
        </h1>
        <p className="text-text-secondary mt-1">
          Full platform view of all Twitch and YouTube data
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border-primary pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-interactive-600 text-white'
                : 'text-text-secondary hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'twitch' && (
          <TwitchOverviewTab 
            games={twitchGames}
            streams={twitchStreams}
            isLoading={gamesLoading || streamsLoading}
          />
        )}
        
        {activeTab === 'youtube' && (
          <YouTubeTrendingTab />
        )}
        
        {activeTab === 'clips' && (
          <ViralClipsTab 
            clips={viralClipsData?.clips}
            isLoading={clipsLoading}
          />
        )}
        
        {activeTab === 'thumbnails' && (
          <ThumbnailGalleryTab 
            overview={thumbnailOverview}
            isLoading={thumbsLoading}
          />
        )}
        
        {activeTab === 'history' && (
          <HistoricalDataTab 
            history={historyData}
            isLoading={historyLoading}
            tier={tier}
          />
        )}
      </div>
    </div>
  );
}
