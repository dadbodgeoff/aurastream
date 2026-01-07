/**
 * Audio Reactivity Types
 *
 * Additional types specific to audio-reactive animation mappings.
 */

import type { AudioReactiveMapping, AudioSource, TriggerMode } from '../types';

// ============================================================================
// Mapping State
// ============================================================================

/**
 * Runtime state for a single audio reactive mapping.
 */
export interface MappingState {
  /** Current smoothed output value */
  currentValue: number;
  /** Previous frame's source value (for rise/fall detection) */
  previousSourceValue: number;
  /** Whether the mapping is currently triggered */
  isTriggered: boolean;
  /** Time of last trigger */
  lastTriggerTime: number;
}

/**
 * Create default mapping state.
 */
export function createMappingState(): MappingState {
  return {
    currentValue: 0,
    previousSourceValue: 0,
    isTriggered: false,
    lastTriggerTime: 0,
  };
}

// ============================================================================
// Preset Types
// ============================================================================

/**
 * Named preset for audio reactive mappings.
 */
export interface AudioReactivePreset {
  /** Preset identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of the effect */
  description: string;
  /** Category for organization */
  category: PresetCategory;
  /** The mapping configuration */
  mapping: Omit<AudioReactiveMapping, 'id'>;
}

/**
 * Categories for organizing presets.
 */
export type PresetCategory =
  | 'scale'      // Scale-based effects
  | 'position'   // Position-based effects
  | 'rotation'   // Rotation-based effects
  | 'opacity'    // Opacity/visibility effects
  | 'color'      // Color-based effects
  | 'composite'; // Combined effects

// ============================================================================
// Mapping Group
// ============================================================================

/**
 * A group of related audio reactive mappings.
 */
export interface MappingGroup {
  /** Group identifier */
  id: string;
  /** Display name */
  name: string;
  /** Whether the entire group is enabled */
  enabled: boolean;
  /** Mappings in this group */
  mappings: AudioReactiveMapping[];
}

/**
 * Create a new mapping group.
 */
export function createMappingGroup(
  id: string,
  name: string,
  mappings: AudioReactiveMapping[] = []
): MappingGroup {
  return {
    id,
    name,
    enabled: true,
    mappings,
  };
}
