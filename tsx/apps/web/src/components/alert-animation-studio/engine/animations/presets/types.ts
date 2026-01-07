/**
 * Animation Preset Types
 *
 * Types for streamer-focused animation presets.
 */

import type { EntryAnimationConfig } from '../entry/types';
import type { LoopAnimationConfig } from '../loop/types';
import type { DepthEffectConfig } from '../depth/types';
import type { ParticleEffectConfig } from '../particles/types';

// ============================================================================
// Stream Event Types
// ============================================================================

/**
 * Stream event types that can trigger animations.
 */
export type StreamEventType =
  | 'new_subscriber'
  | 'raid'
  | 'donation_small'
  | 'donation_medium'
  | 'donation_large'
  | 'new_follower'
  | 'milestone'
  | 'bits'
  | 'gift_sub';

/**
 * Vibe/mood categories for animations.
 */
export type AnimationVibe =
  | 'cute'
  | 'aggressive'
  | 'chill'
  | 'hype'
  | 'professional'
  | 'playful'
  | 'dark'
  | 'retro';

// ============================================================================
// Preset Configuration
// ============================================================================

/**
 * Complete animation preset configuration.
 */
export interface AnimationPreset {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Vibe/mood category */
  vibe: AnimationVibe;
  /** Entry animation config */
  entry: EntryAnimationConfig | null;
  /** Loop animation config */
  loop: LoopAnimationConfig | null;
  /** Depth effect config */
  depthEffect: DepthEffectConfig | null;
  /** Particle effect config */
  particles: ParticleEffectConfig | null;
  /** Total animation duration (ms) */
  durationMs: number;
  /** Number of loops (0 = infinite) */
  loopCount: number;
  /** Recommended stream event */
  recommendedEvent?: StreamEventType;
  /** Preview thumbnail URL */
  previewUrl?: string;
  /** Icon emoji */
  icon?: string;
}

/**
 * Stream event preset with event-specific metadata.
 */
export interface StreamEventPreset extends AnimationPreset {
  /** Event type this preset is designed for */
  eventType: StreamEventType;
  /** Recommended duration for this event */
  recommendedDurationMs: number;
  /** Whether this is a system preset (vs user-created) */
  isSystem: boolean;
}

// ============================================================================
// Preset Categories
// ============================================================================

/**
 * Preset category for organization.
 */
export type PresetCategory = 'entry' | 'loop' | 'depth' | 'particles' | 'complete';

/**
 * Preset with category metadata.
 */
export interface CategorizedPreset {
  preset: AnimationPreset;
  category: PresetCategory;
  tags: string[];
}
