/**
 * Achievements System
 * 
 * Defines all achievements and provides progress tracking utilities.
 */

import type { Achievement, AchievementId, AchievementProgress, UserProgress } from './types';

// ============================================================================
// Achievement Definitions
// ============================================================================

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  // Creation achievements
  first_design: {
    id: 'first_design',
    name: 'First Steps',
    description: 'Create your first design',
    icon: '🎨',
    tier: 'bronze',
    requirement: 1,
    category: 'creation',
  },
  five_designs: {
    id: 'five_designs',
    name: 'Getting Started',
    description: 'Create 5 designs',
    icon: '✨',
    tier: 'bronze',
    requirement: 5,
    category: 'creation',
  },
  ten_designs: {
    id: 'ten_designs',
    name: 'On a Roll',
    description: 'Create 10 designs',
    icon: '🔥',
    tier: 'silver',
    requirement: 10,
    category: 'creation',
  },
  twenty_five_designs: {
    id: 'twenty_five_designs',
    name: 'Design Enthusiast',
    description: 'Create 25 designs',
    icon: '💫',
    tier: 'silver',
    requirement: 25,
    category: 'creation',
  },
  fifty_designs: {
    id: 'fifty_designs',
    name: 'Design Pro',
    description: 'Create 50 designs',
    icon: '🏆',
    tier: 'gold',
    requirement: 50,
    category: 'creation',
  },
  hundred_designs: {
    id: 'hundred_designs',
    name: 'Design Legend',
    description: 'Create 100 designs',
    icon: '👑',
    tier: 'platinum',
    requirement: 100,
    category: 'creation',
  },

  // Exploration achievements
  first_template: {
    id: 'first_template',
    name: 'Template Explorer',
    description: 'Use your first template',
    icon: '📋',
    tier: 'bronze',
    requirement: 1,
    category: 'exploration',
  },
  all_templates: {
    id: 'all_templates',
    name: 'Template Master',
    description: 'Try all available templates',
    icon: '🗂️',
    tier: 'gold',
    requirement: 10,
    category: 'exploration',
  },
  first_export: {
    id: 'first_export',
    name: 'Ready to Share',
    description: 'Export your first design',
    icon: '📤',
    tier: 'bronze',
    requirement: 1,
    category: 'exploration',
  },
  pro_mode_unlock: {
    id: 'pro_mode_unlock',
    name: 'Power User',
    description: 'Switch to Pro mode',
    icon: '⚡',
    tier: 'silver',
    requirement: 1,
    category: 'exploration',
  },

  // Mastery achievements
  sketch_master: {
    id: 'sketch_master',
    name: 'Sketch Master',
    description: 'Use all sketch tools',
    icon: '✏️',
    tier: 'silver',
    requirement: 6,
    category: 'mastery',
  },
  speed_demon: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Create a design in under 30 seconds',
    icon: '⚡',
    tier: 'gold',
    requirement: 1,
    category: 'mastery',
  },
  perfectionist: {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Use undo/redo 10 times in one session',
    icon: '🎯',
    tier: 'silver',
    requirement: 10,
    category: 'mastery',
  },
};

// ============================================================================
// Achievement Utilities
// ============================================================================

/**
 * Get all achievements as an array
 */
export function getAllAchievements(): Achievement[] {
  return Object.values(ACHIEVEMENTS);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(category: Achievement['category']): Achievement[] {
  return getAllAchievements().filter((a) => a.category === category);
}

/**
 * Get achievements by tier
 */
export function getAchievementsByTier(tier: Achievement['tier']): Achievement[] {
  return getAllAchievements().filter((a) => a.tier === tier);
}

/**
 * Check if an achievement is unlocked based on progress
 */
export function isAchievementUnlocked(
  achievementId: AchievementId,
  progress: UserProgress
): boolean {
  const achievement = ACHIEVEMENTS[achievementId];
  if (!achievement) return false;

  switch (achievementId) {
    case 'first_design':
    case 'five_designs':
    case 'ten_designs':
    case 'twenty_five_designs':
    case 'fifty_designs':
    case 'hundred_designs':
      return progress.totalDesigns >= achievement.requirement;

    case 'first_template':
      return progress.templatesUsed.length >= 1;

    case 'all_templates':
      return progress.templatesUsed.length >= achievement.requirement;

    case 'first_export':
      return progress.achievementsUnlocked.includes('first_export');

    case 'pro_mode_unlock':
      return progress.achievementsUnlocked.includes('pro_mode_unlock');

    case 'sketch_master':
    case 'speed_demon':
    case 'perfectionist':
      return progress.achievementsUnlocked.includes(achievementId);

    default:
      return false;
  }
}

/**
 * Get progress percentage for an achievement
 */
export function getAchievementProgress(
  achievementId: AchievementId,
  progress: UserProgress
): AchievementProgress {
  const achievement = ACHIEVEMENTS[achievementId];
  const isUnlocked = isAchievementUnlocked(achievementId, progress);

  let currentValue = 0;

  switch (achievementId) {
    case 'first_design':
    case 'five_designs':
    case 'ten_designs':
    case 'twenty_five_designs':
    case 'fifty_designs':
    case 'hundred_designs':
      currentValue = Math.min(progress.totalDesigns, achievement.requirement);
      break;

    case 'first_template':
    case 'all_templates':
      currentValue = Math.min(progress.templatesUsed.length, achievement.requirement);
      break;

    default:
      currentValue = isUnlocked ? achievement.requirement : 0;
  }

  return {
    achievementId,
    currentValue,
    isUnlocked,
    unlockedAt: isUnlocked ? Date.now() : undefined,
  };
}

/**
 * Check for newly unlocked achievements
 */
export function checkNewAchievements(
  previousProgress: UserProgress,
  currentProgress: UserProgress
): Achievement[] {
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of getAllAchievements()) {
    const wasUnlocked = isAchievementUnlocked(achievement.id, previousProgress);
    const isNowUnlocked = isAchievementUnlocked(achievement.id, currentProgress);

    if (!wasUnlocked && isNowUnlocked) {
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}

/**
 * Get tier color for styling
 */
export function getTierColor(tier: Achievement['tier']): string {
  switch (tier) {
    case 'bronze':
      return 'text-amber-600';
    case 'silver':
      return 'text-gray-400';
    case 'gold':
      return 'text-yellow-500';
    case 'platinum':
      return 'text-purple-400';
    default:
      return 'text-text-secondary';
  }
}

/**
 * Get tier background color for styling
 */
export function getTierBgColor(tier: Achievement['tier']): string {
  switch (tier) {
    case 'bronze':
      return 'bg-amber-600/10';
    case 'silver':
      return 'bg-gray-400/10';
    case 'gold':
      return 'bg-yellow-500/10';
    case 'platinum':
      return 'bg-purple-400/10';
    default:
      return 'bg-background-elevated';
  }
}
