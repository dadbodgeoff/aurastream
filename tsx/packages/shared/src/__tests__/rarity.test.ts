import { describe, it, expect } from 'vitest';
import {
  RARITY_CONFIG,
  RARITY_COLORS,
  RARITY_SOLID_COLORS,
  RARITY_GLOW_COLORS,
  RARITY_ANIMATION_DURATIONS,
  RARITY_LABELS,
  RARITY_TIERS,
  getRarityConfig,
  getRarityColors,
  isValidRarityTier,
  getRarityIndex,
  compareRarity,
  type RarityTier,
  type RarityConfig,
  type RarityColors,
} from '../constants/rarity';

describe('Rarity Constants', () => {
  describe('RARITY_TIERS', () => {
    it('should contain all five rarity tiers in order', () => {
      expect(RARITY_TIERS).toEqual(['common', 'rare', 'epic', 'legendary', 'mythic']);
    });

    it('should be a readonly array type', () => {
      // TypeScript enforces readonly at compile time via `as const`
      // At runtime, we verify the array has the expected length and values
      expect(RARITY_TIERS.length).toBe(5);
      expect(Array.isArray(RARITY_TIERS)).toBe(true);
    });
  });

  describe('RARITY_CONFIG', () => {
    it('should have configuration for all tiers', () => {
      const tiers: RarityTier[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];
      tiers.forEach((tier) => {
        expect(RARITY_CONFIG[tier]).toBeDefined();
      });
    });

    it('should have valid color configurations for each tier', () => {
      Object.values(RARITY_CONFIG).forEach((config: RarityConfig) => {
        expect(config.colors).toBeDefined();
        expect(config.colors.gradient).toBeTruthy();
        expect(config.colors.gradientHover).toBeTruthy();
        expect(config.colors.solid).toBeTruthy();
        expect(config.colors.text).toBeTruthy();
        expect(config.colors.glow).toBeTruthy();
        expect(config.colors.border).toBeTruthy();
        expect(config.colors.bg).toBeTruthy();
      });
    });

    it('should have positive animation durations for all tiers', () => {
      Object.values(RARITY_CONFIG).forEach((config: RarityConfig) => {
        expect(config.animationDuration).toBeGreaterThan(0);
        expect(typeof config.animationDuration).toBe('number');
      });
    });

    it('should have increasing animation durations by rarity', () => {
      const durations = RARITY_TIERS.map((tier) => RARITY_CONFIG[tier].animationDuration);
      for (let i = 1; i < durations.length; i++) {
        expect(durations[i]).toBeGreaterThan(durations[i - 1]);
      }
    });

    it('should have positive particle counts for all tiers', () => {
      Object.values(RARITY_CONFIG).forEach((config: RarityConfig) => {
        expect(config.particleCount).toBeGreaterThan(0);
        expect(typeof config.particleCount).toBe('number');
      });
    });

    it('should have increasing particle counts by rarity', () => {
      const counts = RARITY_TIERS.map((tier) => RARITY_CONFIG[tier].particleCount);
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeGreaterThan(counts[i - 1]);
      }
    });

    it('should have non-empty labels for all tiers', () => {
      Object.values(RARITY_CONFIG).forEach((config: RarityConfig) => {
        expect(config.label).toBeTruthy();
        expect(typeof config.label).toBe('string');
      });
    });
  });

  describe('Color Format Validity', () => {
    it('should have valid hex colors for solid colors', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      Object.values(RARITY_CONFIG).forEach((config: RarityConfig) => {
        expect(config.colors.solid).toMatch(hexRegex);
      });
    });

    it('should have valid rgba colors for glow', () => {
      const rgbaRegex = /^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*[\d.]+\)$/;
      Object.values(RARITY_CONFIG).forEach((config: RarityConfig) => {
        expect(config.colors.glow).toMatch(rgbaRegex);
      });
    });

    it('should have valid Tailwind gradient classes', () => {
      Object.values(RARITY_CONFIG).forEach((config: RarityConfig) => {
        expect(config.colors.gradient).toContain('from-');
        expect(config.colors.gradient).toContain('to-');
      });
    });

    it('should have valid Tailwind text classes', () => {
      Object.values(RARITY_CONFIG).forEach((config: RarityConfig) => {
        expect(config.colors.text).toMatch(/^text-\w+-\d+$/);
      });
    });

    it('should have valid Tailwind border classes', () => {
      Object.values(RARITY_CONFIG).forEach((config: RarityConfig) => {
        expect(config.colors.border).toMatch(/^border-\w+-\d+$/);
      });
    });

    it('should have valid Tailwind background classes', () => {
      Object.values(RARITY_CONFIG).forEach((config: RarityConfig) => {
        expect(config.colors.bg).toMatch(/^bg-/);
      });
    });
  });

  describe('Quick Access Constants', () => {
    it('RARITY_COLORS should match RARITY_CONFIG gradients', () => {
      RARITY_TIERS.forEach((tier) => {
        expect(RARITY_COLORS[tier]).toBe(RARITY_CONFIG[tier].colors.gradient);
      });
    });

    it('RARITY_SOLID_COLORS should match RARITY_CONFIG solid colors', () => {
      RARITY_TIERS.forEach((tier) => {
        expect(RARITY_SOLID_COLORS[tier]).toBe(RARITY_CONFIG[tier].colors.solid);
      });
    });

    it('RARITY_GLOW_COLORS should match RARITY_CONFIG glow colors', () => {
      RARITY_TIERS.forEach((tier) => {
        expect(RARITY_GLOW_COLORS[tier]).toBe(RARITY_CONFIG[tier].colors.glow);
      });
    });

    it('RARITY_ANIMATION_DURATIONS should match RARITY_CONFIG durations', () => {
      RARITY_TIERS.forEach((tier) => {
        expect(RARITY_ANIMATION_DURATIONS[tier]).toBe(RARITY_CONFIG[tier].animationDuration);
      });
    });

    it('RARITY_LABELS should match RARITY_CONFIG labels', () => {
      RARITY_TIERS.forEach((tier) => {
        expect(RARITY_LABELS[tier]).toBe(RARITY_CONFIG[tier].label);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('getRarityConfig', () => {
      it('should return the correct config for each tier', () => {
        RARITY_TIERS.forEach((tier) => {
          expect(getRarityConfig(tier)).toBe(RARITY_CONFIG[tier]);
        });
      });
    });

    describe('getRarityColors', () => {
      it('should return the correct colors for each tier', () => {
        RARITY_TIERS.forEach((tier) => {
          expect(getRarityColors(tier)).toBe(RARITY_CONFIG[tier].colors);
        });
      });
    });

    describe('isValidRarityTier', () => {
      it('should return true for valid tiers', () => {
        RARITY_TIERS.forEach((tier) => {
          expect(isValidRarityTier(tier)).toBe(true);
        });
      });

      it('should return false for invalid tiers', () => {
        expect(isValidRarityTier('invalid')).toBe(false);
        expect(isValidRarityTier('')).toBe(false);
        expect(isValidRarityTier('COMMON')).toBe(false);
        expect(isValidRarityTier('ultra')).toBe(false);
      });
    });

    describe('getRarityIndex', () => {
      it('should return correct indices', () => {
        expect(getRarityIndex('common')).toBe(0);
        expect(getRarityIndex('rare')).toBe(1);
        expect(getRarityIndex('epic')).toBe(2);
        expect(getRarityIndex('legendary')).toBe(3);
        expect(getRarityIndex('mythic')).toBe(4);
      });
    });

    describe('compareRarity', () => {
      it('should return negative when first tier is lower', () => {
        expect(compareRarity('common', 'rare')).toBeLessThan(0);
        expect(compareRarity('rare', 'legendary')).toBeLessThan(0);
        expect(compareRarity('common', 'mythic')).toBeLessThan(0);
      });

      it('should return positive when first tier is higher', () => {
        expect(compareRarity('rare', 'common')).toBeGreaterThan(0);
        expect(compareRarity('legendary', 'rare')).toBeGreaterThan(0);
        expect(compareRarity('mythic', 'common')).toBeGreaterThan(0);
      });

      it('should return zero when tiers are equal', () => {
        RARITY_TIERS.forEach((tier) => {
          expect(compareRarity(tier, tier)).toBe(0);
        });
      });
    });
  });

  describe('Type Exports', () => {
    it('should export RarityTier type', () => {
      const tier: RarityTier = 'legendary';
      expect(tier).toBe('legendary');
    });

    it('should export RarityConfig type', () => {
      const config: RarityConfig = RARITY_CONFIG.common;
      expect(config.colors).toBeDefined();
      expect(config.animationDuration).toBeDefined();
      expect(config.particleCount).toBeDefined();
      expect(config.label).toBeDefined();
    });

    it('should export RarityColors type', () => {
      const colors: RarityColors = RARITY_CONFIG.epic.colors;
      expect(colors.gradient).toBeDefined();
      expect(colors.solid).toBeDefined();
      expect(colors.glow).toBeDefined();
    });
  });
});
