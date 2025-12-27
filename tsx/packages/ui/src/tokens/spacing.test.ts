/**
 * Spacing Token Property Tests
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { spacing, radius, zIndex, breakpoints } from './spacing';
import { fcConfig } from '@aurastream/shared';

describe('Spacing Tokens', () => {
  describe('Property Tests', () => {
    it('all spacing values should be valid CSS rem values or 0', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(spacing)),
          (value) => {
            expect(value).toMatch(/^(0|[\d.]+rem)$/);
          }
        ),
        fcConfig
      );
    });

    it('all radius values should be valid CSS values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(radius)),
          (value) => {
            expect(value).toMatch(/^(0|[\d.]+rem|9999px)$/);
          }
        ),
        fcConfig
      );
    });

    it('all z-index values should be positive integers', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(zIndex)),
          (value) => {
            expect(typeof value).toBe('number');
            expect(value).toBeGreaterThan(0);
            expect(Number.isInteger(value)).toBe(true);
          }
        ),
        fcConfig
      );
    });
  });

  describe('Unit Tests', () => {
    it('should follow 8px grid system', () => {
      expect(spacing[2]).toBe('0.5rem'); // 8px
      expect(spacing[4]).toBe('1rem');   // 16px
      expect(spacing[8]).toBe('2rem');   // 32px
    });

    it('should have correct z-index hierarchy', () => {
      expect(zIndex.dropdown).toBeLessThan(zIndex.modal);
      expect(zIndex.modal).toBeLessThan(zIndex.tooltip);
      expect(zIndex.tooltip).toBeLessThan(zIndex.toast);
    });
  });
});
