/**
 * Constants for The Aura Lab feature.
 * 
 * Includes element definitions, rarity styling, and configuration.
 */

import type { Element, RarityType } from './types';

// ============================================================================
// Element Definitions (20 total - 12 free, 8 premium)
// ============================================================================

export const ELEMENTS: Element[] = [
  // Free Elements (12)
  {
    id: 'fire',
    name: 'Fire',
    icon: '🔥',
    description: 'Blue flames, glowing ember eyes, heat distortion, phoenix energy',
    premium: false,
    locked: false,
  },
  {
    id: 'ice',
    name: 'Ice',
    icon: '❄️',
    description: 'Frozen solid, crystalline structure, frost particles, cold blue tones',
    premium: false,
    locked: false,
  },
  {
    id: 'clown',
    name: 'Clown',
    icon: '🤡',
    description: 'Rainbow afro hair, red nose, white face paint, colorful makeup',
    premium: false,
    locked: false,
  },
  {
    id: 'gigachad',
    name: 'GigaChad',
    icon: '💪',
    description: 'Chiseled jawline, intense gaze, sigma male energy, black and white',
    premium: false,
    locked: false,
  },
  {
    id: 'mecha',
    name: 'Mecha',
    icon: '🤖',
    description: 'Robotic armor plating, LED eyes, chrome finish, transformer aesthetic',
    premium: false,
    locked: false,
  },
  {
    id: 'zombie',
    name: 'Zombie',
    icon: '🧟',
    description: 'Green rotting skin, exposed bones, undead eyes, horror movie style',
    premium: false,
    locked: false,
  },
  {
    id: 'gold',
    name: 'Gold',
    icon: '🏆',
    description: 'Solid 24k gold statue, luxury shine, trophy aesthetic',
    premium: false,
    locked: false,
  },
  {
    id: 'ghost',
    name: 'Ghost',
    icon: '👻',
    description: 'Translucent ethereal form, floating, spooky glow, paranormal',
    premium: false,
    locked: false,
  },
  {
    id: 'pixel',
    name: 'Pixel',
    icon: '👾',
    description: '16-bit retro game style, limited color palette, NES aesthetic',
    premium: false,
    locked: false,
  },
  {
    id: 'skull',
    name: 'Skull',
    icon: '💀',
    description: 'Skeletal face, Day of the Dead decorations, bone white, gothic',
    premium: false,
    locked: false,
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: '🌈',
    description: 'Pride flag colors, sparkles, glitter, celebration energy',
    premium: false,
    locked: false,
  },
  {
    id: 'electric',
    name: 'Electric',
    icon: '⚡',
    description: 'Lightning bolts, neon glow, energy crackling, storm power',
    premium: false,
    locked: false,
  },

  // Premium Elements (8)
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    icon: '🌃',
    description: 'Neon city reflections, chrome implants, Blade Runner aesthetic',
    premium: true,
    locked: false,
  },
  {
    id: '8bit',
    name: '8-Bit',
    icon: '🕹️',
    description: 'NES-style pixel art, 8-color palette, chunky pixels',
    premium: true,
    locked: false,
  },
  {
    id: 'noir',
    name: 'Noir',
    icon: '🎬',
    description: 'Black and white, film grain, dramatic shadows, detective style',
    premium: true,
    locked: false,
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    icon: '🌴',
    description: 'Pink and cyan, glitch effects, 80s aesthetic, palm trees',
    premium: true,
    locked: false,
  },
  {
    id: 'anime',
    name: 'Anime',
    icon: '✨',
    description: 'Cel-shaded, big expressive eyes, speed lines, Japanese style',
    premium: true,
    locked: false,
  },
  {
    id: 'horror',
    name: 'Horror',
    icon: '🩸',
    description: 'Gore, blood splatter, creepy smile, unsettling, nightmare',
    premium: true,
    locked: false,
  },
  {
    id: 'steampunk',
    name: 'Steampunk',
    icon: '⚙️',
    description: 'Brass gears, Victorian goggles, steam pipes, clockwork',
    premium: true,
    locked: false,
  },
  {
    id: 'hologram',
    name: 'Hologram',
    icon: '💠',
    description: 'Translucent blue projection, scan lines, futuristic, sci-fi',
    premium: true,
    locked: false,
  },
];

// ============================================================================
// Element Lookup Map
// ============================================================================

export const ELEMENTS_BY_ID: Record<string, Element> = ELEMENTS.reduce(
  (acc, element) => {
    acc[element.id] = element;
    return acc;
  },
  {} as Record<string, Element>
);

// ============================================================================
// Rarity Styling
// ============================================================================

export const RARITY_COLORS: Record<RarityType, {
  bg: string;
  border: string;
  text: string;
  glow: string;
}> = {
  common: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-600 dark:text-gray-400',
    glow: '',
  },
  rare: {
    bg: 'bg-primary-50 dark:bg-primary-900/20',
    border: 'border-primary-400 dark:border-primary-500',
    text: 'text-primary-600 dark:text-primary-400',
    glow: 'shadow-primary-500/25',
  },
  mythic: {
    bg: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20',
    border: 'border-amber-400 dark:border-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    glow: 'shadow-amber-500/40 animate-pulse',
  },
};

export const RARITY_LABELS: Record<RarityType, string> = {
  common: '⚪ Common',
  rare: '🔵 Rare',
  mythic: '🌟 Mythic',
};

export const RARITY_BADGE_STYLES: Record<RarityType, string> = {
  common: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  rare: 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300',
  mythic: 'bg-gradient-to-r from-amber-200 via-yellow-200 to-orange-200 text-amber-800 dark:from-amber-800/50 dark:via-yellow-800/50 dark:to-orange-800/50 dark:text-amber-200 animate-shimmer',
};

// ============================================================================
// Score Thresholds
// ============================================================================

export const SCORE_LABELS: Record<string, string> = {
  visualImpact: '👁️ Visual Impact',
  creativity: '💡 Creativity',
  memePotential: '😂 Meme Potential',
  technicalQuality: '✨ Technical Quality',
};

export const SCORE_THRESHOLDS = {
  low: 3,
  medium: 6,
  high: 8,
} as const;

// ============================================================================
// Sound Effects (optional)
// ============================================================================

export const SOUND_EFFECTS = {
  fuse: '/sounds/aura-lab/fuse.mp3',
  fuseComplete: '/sounds/aura-lab/fuse-complete.mp3',
  mythicReveal: '/sounds/aura-lab/mythic-reveal.mp3',
  rareReveal: '/sounds/aura-lab/rare-reveal.mp3',
  keep: '/sounds/aura-lab/keep.mp3',
  trash: '/sounds/aura-lab/trash.mp3',
  upload: '/sounds/aura-lab/upload.mp3',
} as const;

// ============================================================================
// Animation Durations
// ============================================================================

export const ANIMATION_DURATIONS = {
  fusionProgress: 3000, // 3 seconds for fusion animation
  rarityReveal: 500,    // 0.5 seconds for rarity reveal
  scoreReveal: 200,     // 0.2 seconds per score reveal
} as const;

// ============================================================================
// File Upload Config
// ============================================================================

export const ACCEPTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

// ============================================================================
// Terminal Messages (for fusion animation)
// ============================================================================

export const FUSION_TERMINAL_MESSAGES = [
  'Initializing fusion reactor...',
  'Analyzing test subject DNA...',
  'Extracting elemental essence...',
  'Calibrating transformation matrix...',
  'Merging molecular structures...',
  'Applying elemental overlay...',
  'Stabilizing fusion output...',
  'Calculating rarity scores...',
  'Fusion complete!',
];

// ============================================================================
// Usage Limits by Tier
// ============================================================================

export const USAGE_LIMITS = {
  free: 5,
  pro: 20,
  studio: 50,
} as const;
