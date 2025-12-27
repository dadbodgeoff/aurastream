/**
 * Color Token Property Tests
 * Feature: design-tokens, Property 4: Hex Color Validation
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { colors } from './colors';
import { hexColorArbitrary, fcConfig } from '@aurastream/shared';

describe('Color Tokens', () => {
  describe('Property Tests', () => {
    it('all primary colors should be valid hex codes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(colors.primary)),
          (color) => {
            expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
          }
        ),
        fcConfig
      );
    });

    it('all interactive colors should be valid hex codes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(colors.interactive)),
          (color) => {
            expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
          }
        ),
        fcConfig
      );
    });

    it('all accent colors should be valid hex codes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(colors.accent)),
          (color) => {
            expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
          }
        ),
        fcConfig
      );
    });

    it('all neutral colors should be valid hex codes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(colors.neutral)),
          (color) => {
            expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
          }
        ),
        fcConfig
      );
    });

    it('all background colors should be valid color values', () => {
      // Background colors can be hex or rgba
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(colors.background)),
          (color) => {
            const isHex = /^#[0-9A-Fa-f]{6}$/.test(color);
            const isRgba = /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/.test(color);
            expect(isHex || isRgba).toBe(true);
          }
        ),
        fcConfig
      );
    });

    it('all text colors should be valid hex codes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(colors.text)),
          (color) => {
            expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
          }
        ),
        fcConfig
      );
    });
  });

  describe('Unit Tests', () => {
    it('should have primary-700 as the main brand color', () => {
      expect(colors.primary[700]).toBe('#1E3A5F');
    });

    it('should have interactive-600 as the main interactive color', () => {
      expect(colors.interactive[600]).toBe('#2563EB');
    });

    it('should have accent-600 as the main accent color', () => {
      expect(colors.accent[600]).toBe('#D97706');
    });

    it('should have dark background base', () => {
      expect(colors.background.base).toBe('#0F172A');
    });

    it('should have info semantic color', () => {
      expect(colors.info.main).toBe('#3B82F6');
    });
  });
});
