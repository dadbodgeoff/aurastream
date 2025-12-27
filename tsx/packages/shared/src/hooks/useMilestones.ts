/**
 * Milestones Hook
 * Tracks asset count and checks for milestone achievements
 *
 * @module hooks/useMilestones
 */

import { useCallback, useRef } from 'react';
import {
  getMilestoneForCount,
  getNextMilestone,
  getMilestoneProgress,
  type Milestone,
} from '../constants/milestones';
import { usePolishStore } from '../stores/polishStore';

/**
 * Return type for the useMilestones hook
 */
export interface UseMilestonesReturn {
  /**
   * Check if a milestone was just reached and trigger celebration
   * @param newCount - The new asset count after creation
   * @returns The milestone if one was reached, or null
   */
  checkMilestone: (newCount: number) => Milestone | null;

  /**
   * Get the next milestone to reach
   * @param currentCount - Current asset count
   * @returns The next milestone or null if all achieved
   */
  getNextMilestone: (currentCount: number) => Milestone | null;

  /**
   * Get progress percentage to next milestone
   * @param currentCount - Current asset count
   * @returns Progress percentage (0-100)
   */
  getProgress: (currentCount: number) => number;

  /**
   * Trigger a milestone celebration manually
   * @param milestone - The milestone to celebrate
   */
  triggerMilestoneCelebration: (milestone: Milestone) => void;
}

/**
 * Hook for tracking and celebrating asset generation milestones
 *
 * @example
 * ```tsx
 * function GenerationComplete({ assetCount }: { assetCount: number }) {
 *   const { checkMilestone, getNextMilestone, getProgress } = useMilestones();
 *
 *   useEffect(() => {
 *     // Check if a milestone was reached
 *     const milestone = checkMilestone(assetCount);
 *     if (milestone) {
 *       console.log('Milestone reached:', milestone.title);
 *     }
 *   }, [assetCount, checkMilestone]);
 *
 *   const next = getNextMilestone(assetCount);
 *   const progress = getProgress(assetCount);
 *
 *   return (
 *     <div>
 *       {next && (
 *         <p>Next milestone: {next.title} ({progress}% progress)</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMilestones(): UseMilestonesReturn {
  const queueCelebration = usePolishStore((state) => state.queueCelebration);
  
  // Track which milestones have been celebrated to prevent duplicates
  const celebratedMilestonesRef = useRef<Set<number>>(new Set());

  /**
   * Trigger a celebration for a milestone
   */
  const triggerMilestoneCelebration = useCallback(
    (milestone: Milestone) => {
      queueCelebration({
        type: 'milestone',
        title: milestone.title,
        description: milestone.description,
        rarity: milestone.rarity,
        priority: 100, // Higher priority than regular celebrations
      });
    },
    [queueCelebration]
  );

  /**
   * Check if a milestone was just reached
   */
  const checkMilestone = useCallback(
    (newCount: number): Milestone | null => {
      const milestone = getMilestoneForCount(newCount);

      if (milestone && !celebratedMilestonesRef.current.has(milestone.count)) {
        // Mark as celebrated to prevent duplicate celebrations
        celebratedMilestonesRef.current.add(milestone.count);
        
        // Trigger the celebration
        triggerMilestoneCelebration(milestone);
        
        return milestone;
      }

      return null;
    },
    [triggerMilestoneCelebration]
  );

  /**
   * Get progress to next milestone
   */
  const getProgress = useCallback((currentCount: number): number => {
    return getMilestoneProgress(currentCount);
  }, []);

  return {
    checkMilestone,
    getNextMilestone,
    getProgress,
    triggerMilestoneCelebration,
  };
}
