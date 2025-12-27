/**
 * Streamer Studio Test Utilities
 * Shared test helpers and fast-check arbitraries
 */

import * as fc from 'fast-check';

// ============================================================================
// Fast-Check Arbitraries for Domain Types
// ============================================================================

/**
 * Arbitrary for valid hex color codes
 */
export const hexColorArbitrary = fc
  .hexaString({ minLength: 6, maxLength: 6 })
  .map((s) => `#${s}`);

/**
 * Arbitrary for User objects
 */
export const userArbitrary = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  subscriptionTier: fc.constantFrom('free', 'pro', 'studio'),
});

/**
 * Arbitrary for BrandKit objects
 */
export const brandKitArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  primaryColors: fc.array(hexColorArbitrary, { minLength: 1, maxLength: 5 }),
  accentColors: fc.array(hexColorArbitrary, { minLength: 0, maxLength: 3 }),
  tone: fc.constantFrom(
    'competitive',
    'casual',
    'educational',
    'comedic',
    'professional'
  ),
});

/**
 * Arbitrary for GenerationJob objects
 */
export const generationJobArbitrary = fc.record({
  id: fc.uuid(),
  status: fc.constantFrom('queued', 'processing', 'completed', 'failed', 'partial'),
  jobType: fc.constantFrom('single', 'batch', 'variation'),
  assetType: fc.constantFrom(
    'thumbnail',
    'overlay',
    'banner',
    'story_graphic',
    'clip_cover'
  ),
  totalAssets: fc.integer({ min: 1, max: 15 }),
  completedAssets: fc.integer({ min: 0, max: 15 }),
  failedAssets: fc.integer({ min: 0, max: 15 }),
});

/**
 * Arbitrary for Asset objects
 */
export const assetArbitrary = fc.record({
  id: fc.uuid(),
  assetType: fc.constantFrom(
    'thumbnail',
    'overlay',
    'banner',
    'story_graphic',
    'clip_cover'
  ),
  width: fc.constantFrom(1280, 1920, 2560, 1080),
  height: fc.constantFrom(720, 1080, 1440, 1920),
  format: fc.constantFrom('png', 'jpeg', 'webp'),
  cdnUrl: fc.webUrl(),
  viralScore: fc.option(fc.integer({ min: 0, max: 100 })),
});

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Configure fast-check for CI vs local development
 */
export const fcConfig = {
  numRuns: process.env.CI ? 100 : 20,
  verbose: process.env.DEBUG ? 2 : 0,
};

/**
 * Helper to run property tests with consistent configuration
 */
export function runProperty<T>(
  name: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | void
) {
  return fc.assert(fc.property(arbitrary, predicate), fcConfig);
}
