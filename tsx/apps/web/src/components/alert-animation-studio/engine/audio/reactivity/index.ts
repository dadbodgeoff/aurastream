/**
 * Audio Reactivity Module Exports
 *
 * Functions and types for mapping audio analysis to animation properties.
 */

// Types
export type {
  MappingState,
  AudioReactivePreset,
  PresetCategory,
  MappingGroup,
} from './types';

export { createMappingState, createMappingGroup } from './types';

// Smoothing utilities
export {
  smoothValue,
  exponentialSmoothing,
  springSmoothing,
  envelopeSmoothing,
  peakHoldDecay,
  hysteresis,
  applyDeadZone,
  smoothArray,
} from './smoothing';

// Trigger logic
export {
  shouldTrigger,
  updateTriggerState,
  getTriggerIntensity,
  canRetrigger,
  getTimeSinceTrigger,
  createDebouncedTrigger,
} from './triggers';

// Mappings
export {
  getAudioSourceValue,
  mapValue,
  applyMapping,
  applyAudioReactivity,
  AUDIO_REACTIVE_PRESETS,
  getPresetsByCategory,
  createMappingFromPreset,
  createDefaultMapping,
} from './mappings';
