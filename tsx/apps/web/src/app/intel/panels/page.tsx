'use client';

/**
 * My Panels Page
 * 
 * Customizable panel exploration mode.
 * Users can add, remove, and rearrange panels.
 * 
 * @module app/intel/panels/page
 */

import { useEffect } from 'react';
import { useIntelPreferences } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { useAuth } from '@aurastream/shared';
import { PanelGrid, PanelWrapper } from '@/components/intel/PanelGrid';
import { PanelLibrary } from '@/components/intel/PanelLibrary';
import { IntelSkeleton } from '@/components/intel/IntelSkeleton';
import { getPanelsForTier } from '@/components/intel/panelRegistry';// Panel Components
import {
  TodaysMissionPanel,
  LivePulsePanel,
  YouTubeTrendingPanel,
  CompetitionMeterPanel,
  ThumbnailPatternsPanel,
  GoldenHoursPanel,
  NicheOpportunitiesPanel,
  TitleFormulasPanel,
  TrendingHashtagsPanel,
  ViralHooksPanel,
  ViralClipsPanel,
  WeeklyHeatmapPanel,
} from '@/components/intel/panels';

// Panel component map
const PANEL_COMPONENTS: Record<string, React.ComponentType<any>> = {
  todays_mission: TodaysMissionPanel,
  live_pulse: LivePulsePanel,
  youtube_trending: YouTubeTrendingPanel,
  competition_meter: CompetitionMeterPanel,
  thumbnail_patterns: ThumbnailPatternsPanel,
  golden_hours: GoldenHoursPanel,
  niche_opportunities: NicheOpportunitiesPanel,
  title_formulas: TitleFormulasPanel,
  trending_hashtags: TrendingHashtagsPanel,
  viral_hooks: ViralHooksPanel,
  viral_clips: ViralClipsPanel,
  weekly_heatmap: WeeklyHeatmapPanel,
};

export default function MyPanelsPage() {
  const { user } = useAuth();
  const { data: preferences, isLoading } = useIntelPreferences();
  const syncFromServer = useIntelStore(state => state.syncFromServer);
  const dashboardLayout = useIntelStore(state => state.dashboardLayout);
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);

  const tier = (user?.subscriptionTier || 'free') as 'free' | 'pro' | 'studio';
  const availablePanels = getPanelsForTier(tier);

  // Sync preferences to store
  useEffect(() => {
    if (preferences) {
      syncFromServer(preferences);
    }
  }, [preferences, syncFromServer]);

  if (isLoading) {
    return <IntelSkeleton />;
  }

  // Get panels to render
  const panelsToRender = dashboardLayout.length > 0 
    ? dashboardLayout 
    : availablePanels.slice(0, 6).map((p, i) => ({
        panelType: p.type,
        position: { x: i % 4, y: Math.floor(i / 4) },
        size: p.defaultSize,
      }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">My Panels</h1>
          <p className="text-text-secondary mt-1">
            Customize your intelligence dashboard
          </p>
        </div>
        <PanelLibrary userTier={tier} />
      </div>

      {/* Panel Grid */}
      <PanelGrid>
        {panelsToRender.map((panel) => {
          const PanelComponent = PANEL_COMPONENTS[panel.panelType];
          if (!PanelComponent) return null;
          
          return (
            <PanelWrapper key={panel.panelType} panelType={panel.panelType}>
              <PanelComponent 
                subscribedCategories={subscribedCategories}
                tier={tier}
              />
            </PanelWrapper>
          );
        })}
      </PanelGrid>

      {/* Empty State */}
      {panelsToRender.length === 0 && (
        <div className="text-center py-12 bg-background-secondary border border-border-primary rounded-2xl">
          <h3 className="text-lg font-medium text-text-primary mb-2">No Panels Added</h3>
          <p className="text-text-secondary mb-4">
            Click "Add Panel" to customize your dashboard
          </p>
        </div>
      )}
    </div>
  );
}
