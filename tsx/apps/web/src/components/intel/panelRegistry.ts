/**
 * Panel Registry
 * 
 * Central registry of all available panel types with metadata.
 * Used by PanelLibrary and PanelGrid for rendering.
 */

import {
  Target,
  Flame,
  Activity,
  TrendingUp,
  Clock,
  Lightbulb,
  Sparkles,
  Type,
  Image,
  Gauge,
  Calendar,
  Hash,
  type LucideIcon,
} from 'lucide-react';
import type { PanelType, PanelSize } from '@aurastream/api-client';

// =============================================================================
// Types
// =============================================================================

export interface PanelMetadata {
  type: PanelType;
  title: string;
  description: string;
  icon: LucideIcon;
  sizes: PanelSize[];
  defaultSize: PanelSize;
  tier: 'free' | 'pro' | 'studio';
  refreshInterval: number; // milliseconds
  category: 'core' | 'content' | 'analytics';
}

// =============================================================================
// Panel Registry
// =============================================================================

/**
 * Panel size definitions:
 * - small:  1 col x 2 rows (compact info)
 * - wide:   2 cols x 2 rows (horizontal content like thumbnails)
 * - large:  2 cols x 3 rows (rich content with lists)
 * - tall:   1 col x 4 rows (vertical lists)
 */
export const PANEL_REGISTRY: Record<PanelType, PanelMetadata> = {
  todays_mission: {
    type: 'todays_mission',
    title: "Today's Mission",
    description: 'AI-powered recommendation for what to create today',
    icon: Target,
    sizes: ['wide'],
    defaultSize: 'wide',
    tier: 'free',
    refreshInterval: 5 * 60 * 1000,
    category: 'core',
  },
  live_pulse: {
    type: 'live_pulse',
    title: 'Live Pulse',
    description: 'Real-time Twitch viewer and competition data',
    icon: Activity,
    sizes: ['small', 'wide'],
    defaultSize: 'wide',
    tier: 'free',
    refreshInterval: 2 * 60 * 1000,
    category: 'core',
  },
  youtube_trending: {
    type: 'youtube_trending',
    title: 'YouTube Trending',
    description: 'Top performing gaming videos on YouTube',
    icon: TrendingUp,
    sizes: ['small', 'large'],
    defaultSize: 'small',
    tier: 'free',
    refreshInterval: 15 * 60 * 1000,
    category: 'core',
  },
  competition_meter: {
    type: 'competition_meter',
    title: 'Competition Meter',
    description: 'Current saturation levels by category',
    icon: Gauge,
    sizes: ['small'],
    defaultSize: 'small',
    tier: 'free',
    refreshInterval: 5 * 60 * 1000,
    category: 'analytics',
  },
  thumbnail_patterns: {
    type: 'thumbnail_patterns',
    title: 'Thumbnail Patterns',
    description: 'What works in thumbnails right now',
    icon: Image,
    sizes: ['wide', 'large'],
    defaultSize: 'wide',
    tier: 'free',
    refreshInterval: 60 * 60 * 1000,
    category: 'content',
  },
  golden_hours: {
    type: 'golden_hours',
    title: 'Golden Hours',
    description: 'Best times to stream based on competition',
    icon: Clock,
    sizes: ['small'],
    defaultSize: 'small',
    tier: 'pro',
    refreshInterval: 60 * 60 * 1000,
    category: 'analytics',
  },
  niche_opportunities: {
    type: 'niche_opportunities',
    title: 'Niche Opportunities',
    description: 'Underserved categories with growth potential',
    icon: Lightbulb,
    sizes: ['small', 'wide'],
    defaultSize: 'small',
    tier: 'pro',
    refreshInterval: 60 * 60 * 1000,
    category: 'analytics',
  },
  title_formulas: {
    type: 'title_formulas',
    title: 'Title Formulas',
    description: 'High-performing title patterns',
    icon: Type,
    sizes: ['small', 'wide'],
    defaultSize: 'small',
    tier: 'free',
    refreshInterval: 60 * 60 * 1000,
    category: 'content',
  },
  trending_hashtags: {
    type: 'trending_hashtags',
    title: 'Trending Hashtags',
    description: 'Popular tags and keywords',
    icon: Hash,
    sizes: ['small'],
    defaultSize: 'small',
    tier: 'free',
    refreshInterval: 30 * 60 * 1000,
    category: 'content',
  },
  viral_hooks: {
    type: 'viral_hooks',
    title: 'Viral Hooks',
    description: 'Trending content hooks and angles',
    icon: Sparkles,
    sizes: ['small'],
    defaultSize: 'small',
    tier: 'pro',
    refreshInterval: 60 * 60 * 1000,
    category: 'content',
  },
  viral_clips: {
    type: 'viral_clips',
    title: 'Viral Clips',
    description: 'Trending clips with velocity tracking',
    icon: Flame,
    sizes: ['small', 'large'],
    defaultSize: 'small',
    tier: 'free',
    refreshInterval: 30 * 1000,
    category: 'core',
  },
  weekly_heatmap: {
    type: 'weekly_heatmap',
    title: 'Weekly Heatmap',
    description: 'Best streaming times visualized',
    icon: Calendar,
    sizes: ['wide', 'large'],
    defaultSize: 'wide',
    tier: 'studio',
    refreshInterval: 60 * 60 * 1000,
    category: 'analytics',
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all panel types as an array
 */
export function getAllPanelTypes(): PanelType[] {
  return Object.keys(PANEL_REGISTRY) as PanelType[];
}

/**
 * Get panels by category
 */
export function getPanelsByCategory(category: 'core' | 'content' | 'analytics'): PanelMetadata[] {
  return Object.values(PANEL_REGISTRY).filter(p => p.category === category);
}

/**
 * Get panels available for a tier
 */
export function getPanelsForTier(tier: 'free' | 'pro' | 'studio'): PanelMetadata[] {
  const tierOrder = { free: 0, pro: 1, studio: 2 };
  const userTierLevel = tierOrder[tier];
  
  return Object.values(PANEL_REGISTRY).filter(p => {
    const panelTierLevel = tierOrder[p.tier];
    return panelTierLevel <= userTierLevel;
  });
}

/**
 * Check if a panel is available for a tier
 */
export function isPanelAvailableForTier(panelType: PanelType, tier: 'free' | 'pro' | 'studio'): boolean {
  const panel = PANEL_REGISTRY[panelType];
  if (!panel) return false;
  
  const tierOrder = { free: 0, pro: 1, studio: 2 };
  return tierOrder[panel.tier] <= tierOrder[tier];
}

/**
 * Get panel metadata by type
 */
export function getPanelMetadata(panelType: PanelType): PanelMetadata | undefined {
  return PANEL_REGISTRY[panelType];
}
