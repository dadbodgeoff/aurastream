/**
 * Canvas Bounds System
 * 
 * Provides streaming-standard canvas sizes (1920x1080, etc.) with safe zones
 * that ensure animations stay within bounds streamers can resize/position in OBS.
 * 
 * Features:
 * - Standard streaming resolution presets (1080p, 720p, 4K, etc.)
 * - Safe zone margins (broadcast, action, title, overlay)
 * - Transform constraining to keep animations in bounds
 * - Entry/exit position calculation for slide animations
 * - Particle spawn bounds and culling
 * - Coordinate conversion (pixel ↔ normalized)
 * 
 * @example
 * ```typescript
 * import { computeBounds, constrainTransform, CANVAS_PRESETS } from './bounds';
 * 
 * // Create 1080p bounds with broadcast safe zone
 * const bounds = computeBounds({ preset: '1080p', safeZone: 'broadcast' });
 * 
 * // Constrain a transform to stay within bounds
 * const safeTransform = constrainTransform(transform, bounds);
 * 
 * // Get entry position for slide-in from left
 * const entryPos = getEntryPosition('left', bounds);
 * ```
 */

// Types
export type {
  CanvasPreset,
  CanvasDimensions,
  SafeZoneMargins,
  SafeZonePreset,
  CanvasBoundsConfig,
  ComputedBounds,
  BoundsOverflowBehavior,
  PropertyConstraint,
  AnimationConstraints,
  AnchorPoint,
  ElementPlacement,
} from './types';

// Constants
export {
  CANVAS_PRESETS,
  SAFE_ZONE_PRESETS,
  DEFAULT_BOUNDS_CONFIG,
  DEFAULT_PLACEMENT,
} from './types';

// Computation
export {
  computeBounds,
  getSafeZoneMargins,
  generateConstraints,
  generateParticleConstraints,
  constrainValue,
  calculateFadeFactor,
  getAnchorPosition,
  calculateElementPosition,
  pixelToNormalized,
  normalizedToPixel,
  scaleByFactor,
  isInSafeZone,
  elementFitsInSafeZone,
} from './compute';

// Constraining
export {
  constrainTransform,
  constrainParticleTransform,
  isTransformInBounds,
  getEntryPosition,
  getExitPosition,
  getMaxSafeAmplitude,
  scaleAmplitudeToFit,
  getParticleSpawnBounds,
  shouldCullParticle,
} from './constrain';
