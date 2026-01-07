/**
 * Enterprise Preset Types
 * Single responsibility: Type definitions for enterprise animation presets
 */

import type { EnterpriseEntryConfig, EnterpriseLoopConfig, EnterpriseParticleConfig } from '../types';
import type { EntryAnimationConfig } from '../../animations/entry/types';
import type { LoopAnimationConfig } from '../../animations/loop/types';
import type { ParticleEffectConfig } from '../../animations/particles/types';
import type { DepthEffectConfig } from '../../animations/depth/types';

/**
 * Stream event types for preset selection.
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
 * Animation vibe/mood types.
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

/**
 * Complete enterprise animation preset.
 * Combines base animation configs with enterprise enhancements.
 */
export interface EnterprisePreset {
  /** Unique preset identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of the preset */
  description: string;
  /** Vibe/mood category */
  vibe: AnimationVibe;
  /** Icon for UI display */
  icon: string;
  
  // Base animation configs
  /** Entry animation configuration */
  entry: EntryAnimationConfig;
  /** Loop animation configuration */
  loop: LoopAnimationConfig | null;
  /** Depth effect configuration */
  depthEffect: DepthEffectConfig | null;
  /** Particle effect configuration */
  particles: ParticleEffectConfig | null;
  
  // Enterprise enhancements
  /** Enterprise entry enhancements */
  enterpriseEntry: EnterpriseEntryConfig;
  /** Enterprise loop enhancements */
  enterpriseLoop: EnterpriseLoopConfig;
  /** Enterprise particle enhancements */
  enterpriseParticles: EnterpriseParticleConfig;
  
  // Timing
  /** Total animation duration (ms) */
  durationMs: number;
  /** Number of loop cycles */
  loopCount: number;
  
  // Metadata
  /** Recommended event type for this preset */
  recommendedEvent?: StreamEventType;
  /** Tags for searchability */
  tags: string[];
}

/**
 * Event-specific preset with additional metadata.
 */
export interface EnterpriseEventPreset extends EnterprisePreset {
  /** The event type this preset is designed for */
  eventType: StreamEventType;
  /** Recommended duration for this event */
  recommendedDurationMs: number;
  /** Whether this is a system preset (non-editable) */
  isSystem: boolean;
}
