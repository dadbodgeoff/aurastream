/**
 * Deterministic Noise Functions
 *
 * Provides seeded random and noise functions for consistent,
 * reproducible animation effects (especially glitch).
 *
 * Key principle: Same seed = same output, every time.
 */

// ============================================================================
// Seeded Random Number Generator
// ============================================================================

/**
 * Mulberry32 PRNG - fast, high-quality 32-bit generator.
 * Returns a function that generates numbers in [0, 1).
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0; // Ensure unsigned 32-bit

  return function (): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Get a single seeded random value.
 * Useful for one-off random values based on a seed.
 */
export function seededRandom(seed: number): number {
  return createSeededRandom(seed)();
}

/**
 * Get a seeded random value in a range.
 */
export function seededRandomRange(seed: number, min: number, max: number): number {
  return min + seededRandom(seed) * (max - min);
}

/**
 * Get a seeded random integer in a range (inclusive).
 */
export function seededRandomInt(seed: number, min: number, max: number): number {
  return Math.floor(seededRandomRange(seed, min, max + 1));
}

// ============================================================================
// Hash Functions
// ============================================================================

/**
 * Simple hash function for combining multiple values into a seed.
 * Based on MurmurHash3 finalizer.
 */
export function hash(value: number): number {
  let h = value >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Combine multiple values into a single hash.
 */
export function hashCombine(...values: number[]): number {
  let result = 0;
  for (const value of values) {
    result = hash(result ^ hash(Math.floor(value * 1000)));
  }
  return result;
}

/**
 * Create a time-based seed that changes at a specified interval.
 * Useful for glitch effects that should change periodically.
 *
 * @param timeMs Current time in milliseconds
 * @param intervalMs How often the seed should change
 * @param offset Optional offset for variation
 */
export function createTimeSeed(
  timeMs: number,
  intervalMs: number,
  offset: number = 0
): number {
  return hash(Math.floor(timeMs / intervalMs) + offset);
}

// ============================================================================
// 1D Noise Functions
// ============================================================================

/**
 * Simple 1D value noise.
 * Returns smooth noise value in [-1, 1] based on position.
 */
export function valueNoise1D(x: number, seed: number = 0): number {
  const xi = Math.floor(x);
  const xf = x - xi;

  // Smooth interpolation (smoothstep)
  const t = xf * xf * (3 - 2 * xf);

  // Get random values at integer positions
  const v0 = seededRandom(hash(xi + seed)) * 2 - 1;
  const v1 = seededRandom(hash(xi + 1 + seed)) * 2 - 1;

  // Interpolate
  return v0 + t * (v1 - v0);
}

/**
 * Fractal Brownian Motion (fBm) - layered noise for natural variation.
 *
 * @param x Position
 * @param octaves Number of noise layers (more = more detail)
 * @param persistence How much each octave contributes (0.5 typical)
 * @param seed Random seed
 */
export function fbm1D(
  x: number,
  octaves: number = 4,
  persistence: number = 0.5,
  seed: number = 0
): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += valueNoise1D(x * frequency, seed + i * 1000) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  return total / maxValue;
}

// ============================================================================
// 2D Noise Functions
// ============================================================================

/**
 * Simple 2D value noise.
 * Returns smooth noise value in [-1, 1] based on position.
 */
export function valueNoise2D(x: number, y: number, seed: number = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  // Smooth interpolation
  const tx = xf * xf * (3 - 2 * xf);
  const ty = yf * yf * (3 - 2 * yf);

  // Get random values at corners
  const v00 = seededRandom(hashCombine(xi, yi, seed)) * 2 - 1;
  const v10 = seededRandom(hashCombine(xi + 1, yi, seed)) * 2 - 1;
  const v01 = seededRandom(hashCombine(xi, yi + 1, seed)) * 2 - 1;
  const v11 = seededRandom(hashCombine(xi + 1, yi + 1, seed)) * 2 - 1;

  // Bilinear interpolation
  const v0 = v00 + tx * (v10 - v00);
  const v1 = v01 + tx * (v11 - v01);

  return v0 + ty * (v1 - v0);
}

/**
 * 2D Fractal Brownian Motion.
 */
export function fbm2D(
  x: number,
  y: number,
  octaves: number = 4,
  persistence: number = 0.5,
  seed: number = 0
): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += valueNoise2D(x * frequency, y * frequency, seed + i * 1000) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  return total / maxValue;
}

// ============================================================================
// Glitch-Specific Noise
// ============================================================================

/**
 * Glitch noise generator for digital distortion effects.
 * Returns deterministic "glitchy" values that change at specified intervals.
 */
export interface GlitchNoiseResult {
  /** Horizontal offset (-1 to 1) */
  offsetX: number;
  /** Vertical offset (-1 to 1) */
  offsetY: number;
  /** Scale distortion (-1 to 1) */
  scaleGlitch: number;
  /** Whether to show (false = flicker off) */
  visible: boolean;
  /** RGB split amount (0 to 1) */
  rgbSplit: number;
  /** Scanline intensity (0 to 1) */
  scanlines: number;
}

/**
 * Generate deterministic glitch noise values.
 *
 * @param timeMs Current time in milliseconds
 * @param intensity Glitch intensity (0 to 1)
 * @param seed Base seed for variation
 */
export function glitchNoise(
  timeMs: number,
  intensity: number,
  seed: number = 0
): GlitchNoiseResult {
  // Create time-based seeds that change at different rates
  const fastSeed = createTimeSeed(timeMs, 50, seed); // Changes every 50ms
  const mediumSeed = createTimeSeed(timeMs, 100, seed + 1000);
  const slowSeed = createTimeSeed(timeMs, 200, seed + 2000);

  // Create RNG instances
  const fastRng = createSeededRandom(fastSeed);
  const mediumRng = createSeededRandom(mediumSeed);
  const slowRng = createSeededRandom(slowSeed);

  // Generate glitch values
  const offsetX = (fastRng() - 0.5) * 2 * intensity * 0.1;
  const offsetY = (fastRng() - 0.5) * 2 * intensity * 0.05;

  // Scale glitch only happens occasionally
  const scaleGlitch = mediumRng() > 0.7 ? (mediumRng() - 0.5) * intensity * 0.1 : 0;

  // Visibility flicker (rare)
  const visible = slowRng() > 0.1 * intensity;

  // RGB split based on intensity
  const rgbSplit = fastRng() * intensity * 0.05;

  // Scanlines
  const scanlines = mediumRng() * intensity * 0.3;

  return {
    offsetX,
    offsetY,
    scaleGlitch,
    visible,
    rgbSplit,
    scanlines,
  };
}

/**
 * Generate a glitch "burst" - a sudden intense glitch moment.
 * Useful for entry animations.
 *
 * @param progress Animation progress (0 to 1)
 * @param intensity Base intensity
 * @param seed Random seed
 */
export function glitchBurst(
  progress: number,
  intensity: number,
  seed: number = 0
): GlitchNoiseResult {
  // Intensity decreases as animation progresses
  const decayedIntensity = intensity * Math.pow(1 - progress, 2);

  // Use progress as time for deterministic results
  const timeMs = progress * 1000;

  return glitchNoise(timeMs, decayedIntensity, seed);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a stepped noise function that holds values for a duration.
 * Useful for creating "jumpy" effects.
 *
 * @param timeMs Current time
 * @param holdMs How long to hold each value
 * @param seed Random seed
 */
export function steppedNoise(timeMs: number, holdMs: number, seed: number = 0): number {
  const step = Math.floor(timeMs / holdMs);
  return seededRandom(hash(step + seed)) * 2 - 1;
}

/**
 * Create smooth noise that transitions between stepped values.
 *
 * @param timeMs Current time
 * @param holdMs How long between transitions
 * @param transitionMs How long the transition takes
 * @param seed Random seed
 */
export function smoothSteppedNoise(
  timeMs: number,
  holdMs: number,
  transitionMs: number,
  seed: number = 0
): number {
  const totalMs = holdMs + transitionMs;
  const cycleTime = timeMs % totalMs;
  const step = Math.floor(timeMs / totalMs);

  const currentValue = seededRandom(hash(step + seed)) * 2 - 1;
  const nextValue = seededRandom(hash(step + 1 + seed)) * 2 - 1;

  if (cycleTime < holdMs) {
    return currentValue;
  }

  // Smooth transition
  const t = (cycleTime - holdMs) / transitionMs;
  const smoothT = t * t * (3 - 2 * t); // smoothstep
  return currentValue + smoothT * (nextValue - currentValue);
}
