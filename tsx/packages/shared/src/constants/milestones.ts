/**
 * Asset Generation Milestones
 * Defines achievement milestones for asset creation
 *
 * @module constants/milestones
 */

import type { RarityTier } from './rarity';

/**
 * Represents an asset generation milestone
 */
export interface Milestone {
  /** Number of assets required to reach this milestone */
  count: number;
  /** Display title for the milestone */
  title: string;
  /** Description text shown in celebration */
  description: string;
  /** Rarity tier affecting visual style */
  rarity: RarityTier;
}

/**
 * Asset generation milestones in ascending order
 * Each milestone triggers a special celebration when reached
 */
export const ASSET_MILESTONES: Milestone[] = [
  {
    count: 1,
    title: 'First Creation',
    description: 'You created your first asset!',
    rarity: 'rare',
  },
  {
    count: 10,
    title: 'Getting Started',
    description: '10 assets created!',
    rarity: 'epic',
  },
  {
    count: 25,
    title: 'Rising Creator',
    description: '25 assets and counting!',
    rarity: 'epic',
  },
  {
    count: 50,
    title: 'Content Creator',
    description: 'Half a century of assets!',
    rarity: 'legendary',
  },
  {
    count: 100,
    title: 'Asset Master',
    description: '100 assets created!',
    rarity: 'mythic',
  },
  {
    count: 250,
    title: 'Prolific Producer',
    description: '250 assets! You\'re on fire!',
    rarity: 'mythic',
  },
  {
    count: 500,
    title: 'Creative Legend',
    description: '500 assets! Legendary status achieved!',
    rarity: 'mythic',
  },
  {
    count: 1000,
    title: 'Asset Titan',
    description: '1000 assets! You\'re unstoppable!',
    rarity: 'mythic',
  },
] as const;

/**
 * Get the milestone for a specific asset count
 * Returns the milestone if the count exactly matches a milestone threshold
 *
 * @param count - The current asset count
 * @returns The milestone if one was just reached, or null
 */
export function getMilestoneForCount(count: number): Milestone | null {
  return ASSET_MILESTONES.find((m) => m.count === count) ?? null;
}

/**
 * Get the next milestone for a given asset count
 *
 * @param count - The current asset count
 * @returns The next milestone to reach, or null if all milestones achieved
 */
export function getNextMilestone(count: number): Milestone | null {
  return ASSET_MILESTONES.find((m) => m.count > count) ?? null;
}

/**
 * Get the previous milestone (most recently achieved)
 *
 * @param count - The current asset count
 * @returns The most recently achieved milestone, or null if none
 */
export function getPreviousMilestone(count: number): Milestone | null {
  const achieved = ASSET_MILESTONES.filter((m) => m.count <= count);
  return achieved.length > 0 ? achieved[achieved.length - 1] : null;
}

/**
 * Calculate progress to the next milestone
 *
 * @param count - The current asset count
 * @returns Progress percentage (0-100) or 100 if all milestones achieved
 */
export function getMilestoneProgress(count: number): number {
  const next = getNextMilestone(count);
  if (!next) return 100;

  const previous = getPreviousMilestone(count);
  const start = previous?.count ?? 0;
  const end = next.count;

  return Math.round(((count - start) / (end - start)) * 100);
}
