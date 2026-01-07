/**
 * Audio-to-Animation Mappings
 *
 * Functions for mapping audio analysis data to animation properties.
 * Includes value extraction, mapping, and preset definitions.
 */

import type { AnimationTransform } from '../../animations/core/types';
import type {
  AudioAnalysis,
  AudioReactiveMapping,
  AudioSource,
  FrequencyBandName,
  BeatType,
} from '../types';
import { isBandSource, isBeatSource, createDefaultMapping } from '../types';
import type { MappingState, AudioReactivePreset } from './types';
import { createMappingState } from './types';
import { smoothValue } from './smoothing';
import { shouldTrigger, updateTriggerState, getTriggerIntensity } from './triggers';

// ============================================================================
// Value Extraction
// ============================================================================

/**
 * Get the current value from an audio source.
 *
 * @param audio - Audio analysis data
 * @param source - Audio source specification
 * @returns Normalized value (typically 0-1)
 */
export function getAudioSourceValue(
  audio: AudioAnalysis,
  source: AudioSource
): number {
  switch (source.type) {
    case 'band': {
      const band = audio.bands.find((b) => b.name === source.band);
      return band?.value ?? 0;
    }

    case 'energy':
      return audio.energy;

    case 'beat': {
      if (audio.beats.length === 0) return 0;
      const lastBeat = audio.beats[audio.beats.length - 1];

      // Filter by beat type if specified
      if (source.beatType && lastBeat.type !== source.beatType) {
        return 0;
      }

      // Return beat strength with decay
      const decay = Math.exp(-audio.timeSinceLastBeat / 150);
      return lastBeat.strength * decay;
    }

    case 'beatPhase':
      return audio.beatPhase;

    case 'bpm':
      // Normalize BPM to 0-1 range (assuming 60-180 BPM range)
      return Math.max(0, Math.min(1, (audio.bpm - 60) / 120));

    case 'spectralCentroid':
      // Normalize spectral centroid (assuming 0-8000 Hz range)
      return Math.max(0, Math.min(1, audio.spectralCentroid / 8000));

    case 'spectralFlux':
      return audio.spectralFlux;

    default:
      return 0;
  }
}


// ============================================================================
// Value Mapping
// ============================================================================

/**
 * Map a value from input range to output range.
 *
 * @param value - Input value
 * @param inputMin - Minimum expected input
 * @param inputMax - Maximum expected input
 * @param outputMin - Minimum output value
 * @param outputMax - Maximum output value
 * @param clamp - Whether to clamp output to range
 * @returns Mapped value
 */
export function mapValue(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
  clamp: boolean = true
): number {
  // Avoid division by zero
  const inputRange = inputMax - inputMin;
  if (inputRange === 0) {
    return outputMin;
  }

  // Normalize to 0-1
  let normalized = (value - inputMin) / inputRange;

  // Clamp if requested
  if (clamp) {
    normalized = Math.max(0, Math.min(1, normalized));
  }

  // Map to output range
  return outputMin + normalized * (outputMax - outputMin);
}

/**
 * Apply a complete audio reactive mapping to get output value.
 *
 * @param mapping - The mapping configuration
 * @param audio - Audio analysis data
 * @param state - Current mapping state
 * @returns Object with output value and updated state
 */
export function applyMapping(
  mapping: AudioReactiveMapping,
  audio: AudioAnalysis,
  state: MappingState
): { value: number; state: MappingState } {
  // Get source value
  const sourceValue = getAudioSourceValue(audio, mapping.source);

  // Check trigger
  const triggered = shouldTrigger(mapping, sourceValue, state, audio);

  // Update state
  let newState = updateTriggerState(state, sourceValue, triggered);

  // If not triggered, return current value (with decay for some modes)
  if (!triggered && mapping.triggerMode !== 'continuous') {
    // Decay current value towards output min
    const decayedValue = smoothValue(
      newState.currentValue,
      mapping.outputMin,
      0.9
    );
    newState = { ...newState, currentValue: decayedValue };
    return { value: decayedValue, state: newState };
  }

  // Map value
  let mappedValue = mapValue(
    sourceValue,
    mapping.inputMin,
    mapping.inputMax,
    mapping.outputMin,
    mapping.outputMax,
    mapping.clamp
  );

  // Apply inversion
  if (mapping.invert) {
    mappedValue = mapping.outputMax - (mappedValue - mapping.outputMin);
  }

  // Apply smoothing
  const smoothedValue = smoothValue(
    newState.currentValue,
    mappedValue,
    mapping.smoothing
  );

  newState = { ...newState, currentValue: smoothedValue };

  return { value: smoothedValue, state: newState };
}

// ============================================================================
// Transform Application
// ============================================================================

/**
 * Apply audio reactive mappings to an animation transform.
 *
 * @param transform - Current animation transform
 * @param audio - Audio analysis data
 * @param mappings - Array of audio reactive mappings
 * @param states - Map of mapping states by ID
 * @returns Object with new transform and updated states
 */
export function applyAudioReactivity(
  transform: AnimationTransform,
  audio: AudioAnalysis,
  mappings: AudioReactiveMapping[],
  states: Map<string, MappingState>
): { transform: AnimationTransform; states: Map<string, MappingState> } {
  // Clone transform to avoid mutation
  const newTransform = { ...transform };
  const newStates = new Map(states);

  for (const mapping of mappings) {
    if (!mapping.enabled) continue;

    // Get or create state
    let state = newStates.get(mapping.id);
    if (!state) {
      state = createMappingState();
    }

    // Apply mapping
    const result = applyMapping(mapping, audio, state);
    newStates.set(mapping.id, result.state);

    // Apply to transform property
    if (mapping.target in newTransform) {
      (newTransform as Record<string, number>)[mapping.target] = result.value;
    }
  }

  return { transform: newTransform, states: newStates };
}

// ============================================================================
// Preset Definitions
// ============================================================================

/**
 * Pre-built audio reactive mapping presets.
 */
export const AUDIO_REACTIVE_PRESETS: Record<string, AudioReactivePreset> = {
  // Scale presets
  bassScale: {
    id: 'bassScale',
    name: 'Bass Scale',
    description: 'Scale up on bass hits',
    category: 'scale',
    mapping: {
      enabled: true,
      source: { type: 'band', band: 'bass' },
      target: 'scaleX',
      inputMin: 0,
      inputMax: 0.8,
      outputMin: 1,
      outputMax: 1.3,
      smoothing: 0.3,
      triggerMode: 'continuous',
      invert: false,
      clamp: true,
    },
  },

  beatPulse: {
    id: 'beatPulse',
    name: 'Beat Pulse',
    description: 'Pulse on every beat',
    category: 'scale',
    mapping: {
      enabled: true,
      source: { type: 'beat' },
      target: 'scaleX',
      inputMin: 0,
      inputMax: 1,
      outputMin: 1,
      outputMax: 1.2,
      smoothing: 0.5,
      triggerMode: 'onBeat',
      invert: false,
      clamp: true,
    },
  },

  // Position presets
  bassShake: {
    id: 'bassShake',
    name: 'Bass Shake',
    description: 'Shake on bass',
    category: 'position',
    mapping: {
      enabled: true,
      source: { type: 'band', band: 'bass' },
      target: 'positionX',
      inputMin: 0,
      inputMax: 0.7,
      outputMin: -0.02,
      outputMax: 0.02,
      smoothing: 0.1,
      triggerMode: 'continuous',
      invert: false,
      clamp: false,
    },
  },

  energyBounce: {
    id: 'energyBounce',
    name: 'Energy Bounce',
    description: 'Bounce based on overall energy',
    category: 'position',
    mapping: {
      enabled: true,
      source: { type: 'energy' },
      target: 'positionY',
      inputMin: 0,
      inputMax: 1,
      outputMin: 0,
      outputMax: 0.1,
      smoothing: 0.4,
      triggerMode: 'continuous',
      invert: false,
      clamp: true,
    },
  },

  // Rotation presets
  highsRotate: {
    id: 'highsRotate',
    name: 'Highs Rotate',
    description: 'Rotate based on high frequencies',
    category: 'rotation',
    mapping: {
      enabled: true,
      source: { type: 'band', band: 'high' },
      target: 'rotationZ',
      inputMin: 0,
      inputMax: 0.6,
      outputMin: -0.1,
      outputMax: 0.1,
      smoothing: 0.5,
      triggerMode: 'continuous',
      invert: false,
      clamp: true,
    },
  },

  beatSpin: {
    id: 'beatSpin',
    name: 'Beat Spin',
    description: 'Spin on beat',
    category: 'rotation',
    mapping: {
      enabled: true,
      source: { type: 'beatPhase' },
      target: 'rotationZ',
      inputMin: 0,
      inputMax: 1,
      outputMin: 0,
      outputMax: Math.PI * 2,
      smoothing: 0.2,
      triggerMode: 'continuous',
      invert: false,
      clamp: false,
    },
  },

  // Opacity presets
  energyFade: {
    id: 'energyFade',
    name: 'Energy Fade',
    description: 'Fade based on energy',
    category: 'opacity',
    mapping: {
      enabled: true,
      source: { type: 'energy' },
      target: 'opacity',
      inputMin: 0,
      inputMax: 0.5,
      outputMin: 0.5,
      outputMax: 1,
      smoothing: 0.4,
      triggerMode: 'continuous',
      invert: false,
      clamp: true,
    },
  },

  beatFlash: {
    id: 'beatFlash',
    name: 'Beat Flash',
    description: 'Flash on beat',
    category: 'opacity',
    mapping: {
      enabled: true,
      source: { type: 'beat', beatType: 'kick' },
      target: 'opacity',
      inputMin: 0,
      inputMax: 1,
      outputMin: 0.7,
      outputMax: 1,
      smoothing: 0.6,
      triggerMode: 'onBeat',
      invert: false,
      clamp: true,
    },
  },
};

/**
 * Get all presets for a category.
 */
export function getPresetsByCategory(
  category: string
): AudioReactivePreset[] {
  return Object.values(AUDIO_REACTIVE_PRESETS).filter(
    (preset) => preset.category === category
  );
}

/**
 * Create a mapping from a preset.
 */
export function createMappingFromPreset(
  preset: AudioReactivePreset,
  id?: string
): AudioReactiveMapping {
  return {
    ...preset.mapping,
    id: id ?? `${preset.id}-${Date.now()}`,
  };
}

/**
 * Create a default mapping for a source and target.
 */
export { createDefaultMapping };
