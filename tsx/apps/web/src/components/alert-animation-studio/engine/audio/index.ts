/**
 * Audio Reactivity Engine
 *
 * Complete audio analysis and reactivity system for the Animation Studio.
 * Provides real-time audio analysis, beat detection, and audio-reactive
 * animation mappings.
 *
 * @module audio
 *
 * @example
 * ```typescript
 * import {
 *   AudioAnalyzer,
 *   applyAudioReactivity,
 *   AUDIO_REACTIVE_PRESETS,
 *   createMappingFromPreset,
 * } from './engine/audio';
 *
 * // Create analyzer
 * const analyzer = new AudioAnalyzer();
 *
 * // Connect to audio file
 * const audio = await analyzer.connectFile('/path/to/audio.mp3');
 * audio.play();
 *
 * // In animation loop
 * function animate() {
 *   const analysis = analyzer.analyze();
 *
 *   // Apply audio reactivity to transform
 *   const { transform } = applyAudioReactivity(
 *     currentTransform,
 *     analysis,
 *     mappings,
 *     mappingStates
 *   );
 *
 *   requestAnimationFrame(animate);
 * }
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Frequency bands
  FrequencyBandName,
  FrequencyBand,
  FrequencyBandDefinition,

  // Beat detection
  BeatType,
  BeatInfo,

  // Audio analysis
  AudioAnalysis,
  FFTSize,
  AudioAnalyzerConfig,

  // Audio reactive mappings
  AudioSource,
  TriggerMode,
  AudioReactiveMapping,

  // Utility types
  AudioInputType,
  AnalyzerState,
  AudioErrorType,
  AudioError,
} from './types';

// ============================================================================
// Constant Exports
// ============================================================================

export {
  FREQUENCY_BANDS,
  DEFAULT_ANALYZER_CONFIG,
} from './types';

// ============================================================================
// Factory Function Exports
// ============================================================================

export {
  createFrequencyBand,
  createAllFrequencyBands,
  createBeatInfo,
  createDefaultAudioAnalysis,
  createAnalyzerConfig,
  createDefaultMapping,
  createAudioError,
  isBandSource,
  isBeatSource,
} from './types';

// ============================================================================
// Core Module Exports
// ============================================================================

export {
  // Audio context management
  createAudioContext,
  resumeAudioContext,
  getAudioContext,
  getAudioContextSync,
  isAudioContextSupported,
  isAudioContextReady,
  getAudioContextState,
  closeAudioContext,
  onAudioContextStateChange,
  resumeOnUserInteraction,
  ensureAudioContext,

  // FFT processing
  calculateBandEnergy,
  normalizeFFTData,
  calculateSpectralCentroid,
  calculateSpectralFlux,
  calculateOverallEnergy,
  getDominantFrequency,
  smoothFFTData,

  // Beat detection
  BeatDetector,

  // Main analyzer
  AudioAnalyzer,
} from './core';

// ============================================================================
// Reactivity Module Exports
// ============================================================================

export type {
  MappingState,
  AudioReactivePreset,
  PresetCategory,
  MappingGroup,
} from './reactivity';

export {
  // State management
  createMappingState,
  createMappingGroup,

  // Smoothing utilities
  smoothValue,
  exponentialSmoothing,
  springSmoothing,
  envelopeSmoothing,
  peakHoldDecay,
  hysteresis,
  applyDeadZone,
  smoothArray,

  // Trigger logic
  shouldTrigger,
  updateTriggerState,
  getTriggerIntensity,
  canRetrigger,
  getTimeSinceTrigger,
  createDebouncedTrigger,

  // Mappings
  getAudioSourceValue,
  mapValue,
  applyMapping,
  applyAudioReactivity,
  AUDIO_REACTIVE_PRESETS,
  getPresetsByCategory,
  createMappingFromPreset,
} from './reactivity';
