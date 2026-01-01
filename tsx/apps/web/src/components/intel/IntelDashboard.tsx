'use client';

import { useEffect, lazy, Suspense, memo, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useIntelStore } from '@/stores/intelStore';
import { useIntelPreferences, PanelType, PanelConfig } from '@aurastream/api-client';
import { IntelHeader } from './IntelHeader';
import { PanelGrid } from './PanelGrid';
import { PanelLibrary } from './PanelLibrary';
import { CategoryPicker } from './CategoryPicker';
import { PANEL_REGISTRY } from './panelRegistry';
import { ClipsPanelSkeleton, StatsPanelSkeleton, ListPanelSkeleton } from './IntelSkeleton';

// Direct imports for full-page views (lazy loading was causing issues)
import { TwitchLiveView } from './views/TwitchLiveView';
import { YouTubeView } from './views/YouTubeView';
import { ClipsView } from './views/ClipsView';

// Local tab type for this dashboard (different from IntelTabs)
type DashboardTab = 'overview' | 'twitch' | 'youtube' | 'clips';

// Simple local tabs for this dashboard
function DashboardTabs({ activeTab, onTabChange }: { activeTab: DashboardTab; onTabChange: (tab: DashboardTab) => void }) {
  const tabs: { id: DashboardTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'twitch', label: 'Twitch' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'clips', label: 'Clips' },
  ];
  
  return (
    <div className="flex gap-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-interactive-600 text-white'
              : 'text-text-secondary hover:bg-white/5'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Lazy-loaded Panel Components (Performance Optimization)
// =============================================================================

const TodaysMissionPanel = lazy(() => 
  import('./panels/TodaysMissionPanel').then(m => ({ default: m.TodaysMissionPanel }))
);
const ViralClipsPanel = lazy(() => 
  import('./panels/ViralClipsPanel').then(m => ({ default: m.ViralClipsPanel }))
);
const LivePulsePanel = lazy(() => 
  import('./panels/LivePulsePanel').then(m => ({ default: m.LivePulsePanel }))
);
const YouTubeTrendingPanel = lazy(() => 
  import('./panels/YouTubeTrendingPanel').then(m => ({ default: m.YouTubeTrendingPanel }))
);
const GoldenHoursPanel = lazy(() => 
  import('./panels/GoldenHoursPanel').then(m => ({ default: m.GoldenHoursPanel }))
);
const NicheOpportunitiesPanel = lazy(() => 
  import('./panels/NicheOpportunitiesPanel').then(m => ({ default: m.NicheOpportunitiesPanel }))
);
const TitleFormulasPanel = lazy(() => 
  import('./panels/TitleFormulasPanel').then(m => ({ default: m.TitleFormulasPanel }))
);
const TrendingHashtagsPanel = lazy(() => 
  import('./panels/TrendingHashtagsPanel').then(m => ({ default: m.TrendingHashtagsPanel }))
);
const ViralHooksPanel = lazy(() => 
  import('./panels/ViralHooksPanel').then(m => ({ default: m.ViralHooksPanel }))
);
const ThumbnailPatternsPanel = lazy(() => 
  import('./panels/ThumbnailPatternsPanel').then(m => ({ default: m.ThumbnailPatternsPanel }))
);
const CompetitionMeterPanel = lazy(() => 
  import('./panels/CompetitionMeterPanel').then(m => ({ default: m.CompetitionMeterPanel }))
);
const WeeklyHeatmapPanel = lazy(() => 
  import('./panels/WeeklyHeatmapPanel').then(m => ({ default: m.WeeklyHeatmapPanel }))
);

// =============================================================================
// Panel Component Map
// =============================================================================

const PANEL_COMPONENTS: Record<PanelType, React.LazyExoticComponent<React.ComponentType>> = {
  todays_mission: TodaysMissionPanel,
  viral_clips: ViralClipsPanel,
  live_pulse: LivePulsePanel,
  youtube_trending: YouTubeTrendingPanel,
  golden_hours: GoldenHoursPanel,
  niche_opportunities: NicheOpportunitiesPanel,
  viral_hooks: ViralHooksPanel,
  title_formulas: TitleFormulasPanel,
  thumbnail_patterns: ThumbnailPatternsPanel,
  competition_meter: CompetitionMeterPanel,
  weekly_heatmap: WeeklyHeatmapPanel,
  trending_hashtags: TrendingHashtagsPanel,
};

// Panel type to skeleton mapping
const PANEL_SKELETONS: Record<PanelType, React.ReactNode> = {
  todays_mission: <StatsPanelSkeleton />,
  viral_clips: <ClipsPanelSkeleton />,
  live_pulse: <StatsPanelSkeleton />,
  youtube_trending: <ClipsPanelSkeleton />,
  golden_hours: <ListPanelSkeleton />,
  niche_opportunities: <ListPanelSkeleton />,
  viral_hooks: <ListPanelSkeleton />,
  title_formulas: <ListPanelSkeleton />,
  thumbnail_patterns: <StatsPanelSkeleton />,
  competition_meter: <StatsPanelSkeleton />,
  weekly_heatmap: <StatsPanelSkeleton />,
  trending_hashtags: <ListPanelSkeleton />,
};

// =============================================================================
// Memoized Panel Wrapper (Prevents unnecessary re-renders)
// =============================================================================

interface PanelWrapperProps {
  panel: PanelConfig;
}

const MemoizedPanelWrapper = memo(function PanelWrapper({ panel }: PanelWrapperProps) {
  const PanelComponent = PANEL_COMPONENTS[panel.panelType];
  const skeleton = PANEL_SKELETONS[panel.panelType];
  
  if (!PanelComponent) return null;
  
  return (
    <Suspense fallback={skeleton}>
      <PanelComponent />
    </Suspense>
  );
});

// =============================================================================
// Intel Dashboard
// =============================================================================

interface IntelDashboardProps {
  initialTab?: DashboardTab;
}

export function IntelDashboard({ initialTab = 'overview' }: IntelDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const { data: preferences } = useIntelPreferences();
  
  const dashboardLayout = useIntelStore(state => state.dashboardLayout);
  const syncFromServer = useIntelStore(state => state.syncFromServer);
  const setPanelLibraryOpen = useIntelStore(state => state.setPanelLibraryOpen);
  
  // Sync preferences from server when loaded
  useEffect(() => {
    if (preferences) {
      syncFromServer(preferences);
    }
  }, [preferences, syncFromServer]);
  
  // Update tab when initialTab changes (from URL)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // Memoize panels to render (excluding Today's Mission)
  const panelsToRender = useMemo(
    () => dashboardLayout.filter(p => p.panelType !== 'todays_mission'),
    [dashboardLayout]
  );
  
  // Memoize grid items to prevent re-renders
  const gridItems = useMemo(() => {
    // Size to grid dimensions mapping (must match PanelGrid.tsx)
    const SIZE_TO_GRID: Record<string, { w: number; h: number }> = {
      small:  { w: 1, h: 2 },
      medium: { w: 1, h: 3 },
      wide:   { w: 2, h: 2 },
      tall:   { w: 1, h: 4 },
      large:  { w: 2, h: 3 },
      hero:   { w: 4, h: 2 },
    };
    
    return panelsToRender.map((panel) => {
      const metadata = PANEL_REGISTRY[panel.panelType];
      if (!metadata) return null;
      
      const gridSize = SIZE_TO_GRID[panel.size] || SIZE_TO_GRID.small;
      
      return (
        <div
          key={panel.panelType}
          data-grid={{
            x: panel.position.x,
            y: panel.position.y,
            w: gridSize.w,
            h: gridSize.h,
            static: false,
          }}
          className="h-full"
        >
          <MemoizedPanelWrapper panel={panel} />
        </div>
      );
    }).filter(Boolean);
  }, [panelsToRender]);
  
  // Render full-page view based on active tab
  const renderFullPageView = () => {
    switch (activeTab) {
      case 'twitch':
        return <TwitchLiveView />;
      case 'youtube':
        return <YouTubeView />;
      case 'clips':
        return <ClipsView />;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Full-page views */}
      {activeTab !== 'overview' ? (
        renderFullPageView()
      ) : (
        <>
          {/* Header with categories and filter */}
          <IntelHeader />
          
          {/* Today's Mission - Always first, not in grid */}
          <Suspense fallback={<StatsPanelSkeleton />}>
            <TodaysMissionPanel />
          </Suspense>
          
          {/* Panel Grid */}
          {panelsToRender.length > 0 ? (
            <PanelGrid>
              {gridItems}
            </PanelGrid>
          ) : (
            // Empty state when no panels
            <div className="text-center py-12">
              <p className="text-text-muted mb-4">No panels added yet</p>
              <button
                onClick={() => setPanelLibraryOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-interactive-600 hover:bg-interactive-500 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Panel
              </button>
            </div>
          )}
          
          {/* Add Panel Button */}
          <button
            onClick={() => setPanelLibraryOpen(true)}
            className="w-full py-4 border-2 border-dashed border-border-subtle hover:border-interactive-500/30 rounded-xl text-text-muted hover:text-text-secondary transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Panel
          </button>
          
          {/* Modals */}
          <PanelLibrary userTier="free" />
          <CategoryPicker userTier="free" />
        </>
      )}
    </div>
  );
}
