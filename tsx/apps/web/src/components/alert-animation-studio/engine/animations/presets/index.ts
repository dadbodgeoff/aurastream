/**
 * Animation Presets Module
 *
 * Pre-configured animation combinations for streamers.
 */

// Types
export * from './types';

// Vibe presets
export {
  VIBE_PRESETS,
  CUTE_PRESET,
  AGGRESSIVE_PRESET,
  CHILL_PRESET,
  HYPE_PRESET,
  PROFESSIONAL_PRESET,
  PLAYFUL_PRESET,
  DARK_PRESET,
  RETRO_PRESET,
  getVibePreset,
  getAllVibePresets,
} from './vibePresets';

// Event presets
export {
  EVENT_PRESETS,
  NEW_SUBSCRIBER_PRESET,
  RAID_PRESET,
  DONATION_SMALL_PRESET,
  DONATION_MEDIUM_PRESET,
  DONATION_LARGE_PRESET,
  NEW_FOLLOWER_PRESET,
  MILESTONE_PRESET,
  BITS_PRESET,
  GIFT_SUB_PRESET,
  getEventPreset,
  getAllEventPresets,
} from './eventPresets';
