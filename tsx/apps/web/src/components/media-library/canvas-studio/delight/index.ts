/**
 * Delight Module
 * 
 * Celebrations, achievements, and engagement features for Canvas Studio.
 */

// Types
export type {
  AchievementId,
  Achievement,
  AchievementProgress,
  CelebrationTrigger,
  CelebrationIntensity,
  CelebrationConfig,
  SoundEffect,
  SoundSettings,
  UserProgress,
  ProgressBadge,
} from './types';

// Achievements
export {
  ACHIEVEMENTS,
  getAllAchievements,
  getAchievementsByCategory,
  getAchievementsByTier,
  isAchievementUnlocked,
  getAchievementProgress,
  checkNewAchievements,
  getTierColor,
  getTierBgColor,
} from './Achievements';

// Sound Effects
export {
  soundManager,
  playSound,
  enableSounds,
  disableSounds,
  toggleSounds,
  setSoundVolume,
  getSoundSettings,
} from './SoundEffects';

// Celebrations
export {
  useCelebration,
  CelebrationOverlay,
  Celebration,
} from './Celebrations';

// Progress Badges
export {
  AchievementBadge,
  ProgressOverview,
  AchievementsGrid,
  CompactProgressBadge,
} from './ProgressBadges';
