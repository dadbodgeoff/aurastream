/**
 * Delight Module Types
 * 
 * Types for celebrations, achievements, and engagement features.
 */

// ============================================================================
// Achievement Types
// ============================================================================

/**
 * Achievement identifiers
 */
export type AchievementId =
  | 'first_design'
  | 'five_designs'
  | 'ten_designs'
  | 'twenty_five_designs'
  | 'fifty_designs'
  | 'hundred_designs'
  | 'first_template'
  | 'all_templates'
  | 'first_export'
  | 'pro_mode_unlock'
  | 'sketch_master'
  | 'speed_demon'
  | 'perfectionist';

/**
 * Achievement definition
 */
export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: number;
  category: 'creation' | 'exploration' | 'mastery';
}

/**
 * User's achievement progress
 */
export interface AchievementProgress {
  achievementId: AchievementId;
  currentValue: number;
  isUnlocked: boolean;
  unlockedAt?: number;
}

// ============================================================================
// Celebration Types
// ============================================================================

/**
 * Celebration trigger events
 */
export type CelebrationTrigger =
  | 'design_created'
  | 'achievement_unlocked'
  | 'milestone_reached'
  | 'first_export'
  | 'streak_continued';

/**
 * Celebration intensity levels
 */
export type CelebrationIntensity = 'subtle' | 'normal' | 'epic';

/**
 * Celebration configuration
 */
export interface CelebrationConfig {
  trigger: CelebrationTrigger;
  intensity: CelebrationIntensity;
  message?: string;
  achievement?: Achievement;
  milestone?: number;
}

// ============================================================================
// Sound Effect Types
// ============================================================================

/**
 * Available sound effects
 */
export type SoundEffect =
  | 'click'
  | 'success'
  | 'achievement'
  | 'whoosh'
  | 'pop'
  | 'celebration'
  | 'error';

/**
 * Sound settings
 */
export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-1
}

// ============================================================================
// Progress Types
// ============================================================================

/**
 * User progress stats
 */
export interface UserProgress {
  totalDesigns: number;
  designsThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  templatesUsed: string[];
  achievementsUnlocked: AchievementId[];
  lastActivityAt: number;
}

/**
 * Progress badge display
 */
export interface ProgressBadge {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}
