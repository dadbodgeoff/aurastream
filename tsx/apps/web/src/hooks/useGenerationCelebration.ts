/**
 * Generation Celebration Hook
 * Triggers celebrations when asset generation completes
 *
 * @module hooks/useGenerationCelebration
 */

'use client';

import { useCallback, useRef, useEffect } from 'react';
import { usePolishStore, useMilestones, usePreferencesStore } from '@aurastream/shared';
import type { RarityTier } from '@aurastream/shared';
import { useSoundEffects } from './useSoundEffects';

/**
 * Asset type display names for celebration messages
 */
const ASSET_TYPE_LABELS: Record<string, string> = {
  twitch_emote: 'Twitch Emote',
  youtube_thumbnail: 'YouTube Thumbnail',
  twitch_banner: 'Twitch Banner',
  twitch_badge: 'Twitch Badge',
  overlay: 'Stream Overlay',
  twitch_panel: 'Twitch Panel',
  twitch_offline: 'Offline Screen',
  story_graphic: 'Story Graphic',
  tiktok_story: 'TikTok Story',
  instagram_story: 'Instagram Story',
  instagram_reel: 'Instagram Reel',
  emote: 'Emote',
  badge: 'Badge',
  panel: 'Panel',
  banner: 'Banner',
  offline_screen: 'Offline Screen',
  schedule: 'Schedule',
  thumbnail: 'Thumbnail',
  alert: 'Alert',
  transition: 'Transition',
  starting_soon: 'Starting Soon',
  brb: 'BRB Screen',
  ending: 'Ending Screen',
  chat_box: 'Chat Box',
};

/**
 * Format asset type for display
 */
function formatAssetType(assetType: string): string {
  return ASSET_TYPE_LABELS[assetType] || assetType.replace(/_/g, ' ');
}

/**
 * Determine rarity based on asset count
 * Higher counts get better rarity for the base celebration
 */
function getRarityForCount(count: number): RarityTier {
  if (count >= 100) return 'legendary';
  if (count >= 50) return 'epic';
  if (count >= 10) return 'rare';
  return 'common';
}

/**
 * Asset information for celebration
 */
export interface CelebrationAsset {
  id: string;
  assetType: string;
  url: string;
}

/**
 * Return type for useGenerationCelebration hook
 */
export interface UseGenerationCelebrationReturn {
  /**
   * Trigger celebration for a completed generation
   * @param asset - The generated asset
   * @param userAssetCount - Total assets the user has created
   */
  celebrateGeneration: (asset: CelebrationAsset, userAssetCount: number) => void;

  /**
   * Check if celebrations are enabled
   */
  celebrationsEnabled: boolean;
}

/**
 * Hook for triggering celebrations when asset generation completes
 *
 * @example
 * ```tsx
 * function GenerationPage() {
 *   const { celebrateGeneration } = useGenerationCelebration();
 *   const { user } = useAuth();
 *
 *   useEffect(() => {
 *     if (status === 'completed' && asset) {
 *       celebrateGeneration(
 *         { id: asset.id, assetType: asset.asset_type, url: asset.url },
 *         user?.assetsGeneratedThisMonth ?? 0
 *       );
 *     }
 *   }, [status, asset, celebrateGeneration, user]);
 * }
 * ```
 */
export function useGenerationCelebration(): UseGenerationCelebrationReturn {
  const queueCelebration = usePolishStore((state) => state.queueCelebration);
  const celebrationsEnabled = usePolishStore((state) => state.celebrationsEnabled);
  const reducedCelebrations = usePreferencesStore((state) => state.reducedCelebrations);
  const { checkMilestone } = useMilestones();
  const { playSuccess } = useSoundEffects();

  // Track celebrated assets to prevent duplicate celebrations
  const celebratedAssetsRef = useRef<Set<string>>(new Set());

  /**
   * Trigger celebration for completed generation
   */
  const celebrateGeneration = useCallback(
    (asset: CelebrationAsset, userAssetCount: number) => {
      // Prevent duplicate celebrations for the same asset
      if (celebratedAssetsRef.current.has(asset.id)) {
        return;
      }
      celebratedAssetsRef.current.add(asset.id);

      // Play success sound
      playSuccess();

      // Skip visual celebration if disabled or reduced
      if (!celebrationsEnabled || reducedCelebrations) {
        return;
      }

      // Determine rarity based on user's total asset count
      const rarity = getRarityForCount(userAssetCount);

      // Queue the base generation celebration
      queueCelebration({
        type: 'achievement',
        title: 'Asset Created!',
        description: `Your ${formatAssetType(asset.assetType)} is ready`,
        rarity,
        priority: 50, // Standard priority
        data: {
          assetId: asset.id,
          assetType: asset.assetType,
          assetUrl: asset.url,
        },
      });

      // Check for milestone achievements
      // This will automatically queue a higher-priority celebration if a milestone is reached
      checkMilestone(userAssetCount);
    },
    [queueCelebration, celebrationsEnabled, reducedCelebrations, checkMilestone, playSuccess]
  );

  // Clean up old celebrated assets periodically to prevent memory leaks
  useEffect(() => {
    const cleanup = () => {
      // Keep only the last 100 celebrated assets
      if (celebratedAssetsRef.current.size > 100) {
        const entries = Array.from(celebratedAssetsRef.current);
        celebratedAssetsRef.current = new Set(entries.slice(-50));
      }
    };

    const interval = setInterval(cleanup, 60000); // Clean up every minute
    return () => clearInterval(interval);
  }, []);

  return {
    celebrateGeneration,
    celebrationsEnabled: celebrationsEnabled && !reducedCelebrations,
  };
}
