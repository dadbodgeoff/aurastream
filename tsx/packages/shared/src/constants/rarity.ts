/**
 * Rarity/Tier Color System Constants
 * Provides consistent styling across achievements, shop items, and rewards
 *
 * @module constants/rarity
 */

/**
 * Available rarity tiers from lowest to highest
 */
export type RarityTier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

/**
 * Color configuration for a rarity tier
 */
export interface RarityColors {
  /** Tailwind gradient classes (e.g., 'from-gray-400 to-gray-600') */
  gradient: string;
  /** Hover state gradient classes */
  gradientHover: string;
  /** Primary solid color in hex format */
  solid: string;
  /** Text color Tailwind class */
  text: string;
  /** Box-shadow glow color in rgba format */
  glow: string;
  /** Border color Tailwind class */
  border: string;
  /** Background color Tailwind class */
  bg: string;
}

/**
 * Complete configuration for a rarity tier
 */
export interface RarityConfig {
  /** Color scheme for the tier */
  colors: RarityColors;
  /** Animation duration in milliseconds */
  animationDuration: number;
  /** Number of particles for celebration effects */
  particleCount: number;
  /** Human-readable display name */
  label: string;
}

/**
 * Ordered list of rarity tiers from lowest to highest
 */
export const RARITY_TIERS: readonly RarityTier[] = [
  'common',
  'rare',
  'epic',
  'legendary',
  'mythic',
] as const;

/**
 * Complete rarity configuration for all tiers
 */
export const RARITY_CONFIG: Record<RarityTier, RarityConfig> = {
  common: {
    colors: {
      gradient: 'from-gray-400 to-gray-600',
      gradientHover: 'from-gray-300 to-gray-500',
      solid: '#9CA3AF',
      text: 'text-gray-400',
      glow: 'rgba(156, 163, 175, 0.4)',
      border: 'border-gray-400',
      bg: 'bg-gray-500',
    },
    animationDuration: 200,
    particleCount: 5,
    label: 'Common',
  },
  rare: {
    colors: {
      gradient: 'from-blue-400 to-blue-600',
      gradientHover: 'from-blue-300 to-blue-500',
      solid: '#60A5FA',
      text: 'text-blue-400',
      glow: 'rgba(96, 165, 250, 0.5)',
      border: 'border-blue-400',
      bg: 'bg-blue-500',
    },
    animationDuration: 300,
    particleCount: 10,
    label: 'Rare',
  },
  epic: {
    colors: {
      gradient: 'from-purple-400 to-purple-600',
      gradientHover: 'from-purple-300 to-purple-500',
      solid: '#A78BFA',
      text: 'text-purple-400',
      glow: 'rgba(167, 139, 250, 0.5)',
      border: 'border-purple-400',
      bg: 'bg-purple-500',
    },
    animationDuration: 400,
    particleCount: 15,
    label: 'Epic',
  },
  legendary: {
    colors: {
      gradient: 'from-yellow-400 to-orange-500',
      gradientHover: 'from-yellow-300 to-orange-400',
      solid: '#FBBF24',
      text: 'text-yellow-400',
      glow: 'rgba(251, 191, 36, 0.6)',
      border: 'border-yellow-400',
      bg: 'bg-yellow-500',
    },
    animationDuration: 600,
    particleCount: 25,
    label: 'Legendary',
  },
  mythic: {
    colors: {
      gradient: 'from-pink-500 via-purple-500 to-cyan-500',
      gradientHover: 'from-pink-400 via-purple-400 to-cyan-400',
      solid: '#EC4899',
      text: 'text-pink-400',
      glow: 'rgba(236, 72, 153, 0.6)',
      border: 'border-pink-400',
      bg: 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500',
    },
    animationDuration: 800,
    particleCount: 40,
    label: 'Mythic',
  },
} as const;

/**
 * Quick access to gradient classes by rarity tier
 */
export const RARITY_COLORS: Record<RarityTier, string> = {
  common: RARITY_CONFIG.common.colors.gradient,
  rare: RARITY_CONFIG.rare.colors.gradient,
  epic: RARITY_CONFIG.epic.colors.gradient,
  legendary: RARITY_CONFIG.legendary.colors.gradient,
  mythic: RARITY_CONFIG.mythic.colors.gradient,
} as const;

/**
 * Quick access to solid hex colors by rarity tier
 */
export const RARITY_SOLID_COLORS: Record<RarityTier, string> = {
  common: RARITY_CONFIG.common.colors.solid,
  rare: RARITY_CONFIG.rare.colors.solid,
  epic: RARITY_CONFIG.epic.colors.solid,
  legendary: RARITY_CONFIG.legendary.colors.solid,
  mythic: RARITY_CONFIG.mythic.colors.solid,
} as const;

/**
 * Quick access to glow colors by rarity tier
 */
export const RARITY_GLOW_COLORS: Record<RarityTier, string> = {
  common: RARITY_CONFIG.common.colors.glow,
  rare: RARITY_CONFIG.rare.colors.glow,
  epic: RARITY_CONFIG.epic.colors.glow,
  legendary: RARITY_CONFIG.legendary.colors.glow,
  mythic: RARITY_CONFIG.mythic.colors.glow,
} as const;

/**
 * Animation durations by rarity tier (in milliseconds)
 */
export const RARITY_ANIMATION_DURATIONS: Record<RarityTier, number> = {
  common: RARITY_CONFIG.common.animationDuration,
  rare: RARITY_CONFIG.rare.animationDuration,
  epic: RARITY_CONFIG.epic.animationDuration,
  legendary: RARITY_CONFIG.legendary.animationDuration,
  mythic: RARITY_CONFIG.mythic.animationDuration,
} as const;

/**
 * Display labels by rarity tier
 */
export const RARITY_LABELS: Record<RarityTier, string> = {
  common: RARITY_CONFIG.common.label,
  rare: RARITY_CONFIG.rare.label,
  epic: RARITY_CONFIG.epic.label,
  legendary: RARITY_CONFIG.legendary.label,
  mythic: RARITY_CONFIG.mythic.label,
} as const;

/**
 * Get the rarity configuration for a specific tier
 * @param tier - The rarity tier
 * @returns The complete rarity configuration
 */
export function getRarityConfig(tier: RarityTier): RarityConfig {
  return RARITY_CONFIG[tier];
}

/**
 * Get the colors for a specific rarity tier
 * @param tier - The rarity tier
 * @returns The color configuration
 */
export function getRarityColors(tier: RarityTier): RarityColors {
  return RARITY_CONFIG[tier].colors;
}

/**
 * Check if a string is a valid rarity tier
 * @param value - The value to check
 * @returns True if the value is a valid RarityTier
 */
export function isValidRarityTier(value: string): value is RarityTier {
  return RARITY_TIERS.includes(value as RarityTier);
}

/**
 * Get the numeric index of a rarity tier (0 = common, 4 = mythic)
 * @param tier - The rarity tier
 * @returns The numeric index
 */
export function getRarityIndex(tier: RarityTier): number {
  return RARITY_TIERS.indexOf(tier);
}

/**
 * Compare two rarity tiers
 * @param a - First rarity tier
 * @param b - Second rarity tier
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareRarity(a: RarityTier, b: RarityTier): number {
  return getRarityIndex(a) - getRarityIndex(b);
}
