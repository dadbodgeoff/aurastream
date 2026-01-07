/**
 * Audio Reactivity Engine Types
 *
 * Type definitions for audio analysis, beat detection, and audio-reactive animations.
 * Designed for real-time audio visualization and animation synchronization.
 */

// ============================================================================
// Frequency Band Definitions
// ============================================================================

/**
 * Names for the 7 frequency bands used in audio analysis.
 */
export type FrequencyBandName =
  | 'sub'         // 20-60 Hz - Sub-bass, felt more than heard
  | 'bass'        // 60-250 Hz - Bass, kick drums, bass guitar
  | 'lowMid'      // 250-500 Hz - Low mids, warmth
  | 'mid'         // 500-2000 Hz - Mids, vocals, instruments
  | 'highMid'     // 2000-4000 Hz - High mids, presence
  | 'high'        // 4000-8000 Hz - Highs, brilliance
  | 'brilliance'; // 8000-20000 Hz - Air, sparkle

/**
 * A single frequency band with analysis data.
 */
export interface FrequencyBand {
  /** Band identifier */
  name: FrequencyBandName;
  /** Minimum frequency in Hz */
  minHz: number;
  /** Maximum frequency in Hz */
  maxHz: number;
  /** Current normalized value (0-1) */
  value: number;
  /** Recent peak for visualization (0-1) */
  peak: number;
  /** Rolling average for smoothing (0-1) */
  average: number;
}

/**
 * Frequency band definitions without runtime values.
 */
export type FrequencyBandDefinition = Omit<FrequencyBand, 'value' | 'peak' | 'average'>;

/**
 * Standard frequency band definitions based on audio engineering standards.
 */
export const FREQUENCY_BANDS: FrequencyBandDefinition[] = [
  { name: 'sub', minHz: 20, maxHz: 60 },
  { name: 'bass', minHz: 60, maxHz: 250 },
  { name: 'lowMid', minHz: 250, maxHz: 500 },
  { name: 'mid', minHz: 500, maxHz: 2000 },
  { name: 'highMid', minHz: 2000, maxHz: 4000 },
  { name: 'high', minHz: 4000, maxHz: 8000 },
  { name: 'brilliance', minHz: 8000, maxHz: 20000 },
];

/**
 * Create a frequency band with default runtime values.
 */
export function createFrequencyBand(definition: FrequencyBandDefinition): FrequencyBand {
  return {
    ...definition,
    value: 0,
    peak: 0,
    average: 0,
  };
}

/**
 * Create all frequency bands with default values.
 */
export function createAllFrequencyBands(): FrequencyBand[] {
  return FREQUENCY_BANDS.map(createFrequencyBand);
}

// ============================================================================
// Beat Detection Types
// ============================================================================

/**
 * Classification of detected beats based on frequency content.
 */
export type BeatType = 'kick' | 'snare' | 'hihat' | 'other';

/**
 * Information about a detected beat.
 */
export interface BeatInfo {
  /** Timestamp in milliseconds */
  time: number;
  /** Beat intensity (0-1) */
  strength: number;
  /** Beat classification based on frequency content */
  type: BeatType;
  /** Detection confidence (0-1) */
  confidence: number;
}

/**
 * Create a beat info object.
 */
export function createBeatInfo(
  time: number,
  strength: number,
  type: BeatType,
  confidence: number
): BeatInfo {
  return { time, strength, type, confidence };
}

// ============================================================================
// Audio Analysis State
// ============================================================================

/**
 * Complete audio analysis state for a single frame.
 */
export interface AudioAnalysis {
  /** Raw FFT frequency data (Float32Array) */
  fft: Float32Array;
  /** Time-domain waveform data (Float32Array) */
  waveform: Float32Array;
  /** Processed frequency bands */
  bands: FrequencyBand[];
  /** Overall audio energy (0-1) */
  energy: number;
  /** Spectral centroid - "brightness" of sound (Hz) */
  spectralCentroid: number;
  /** Spectral flux - rate of spectral change */
  spectralFlux: number;
  /** History of detected beats */
  beats: BeatInfo[];
  /** Index of the current/most recent beat */
  currentBeatIndex: number;
  /** Time since last beat in milliseconds */
  timeSinceLastBeat: number;
  /** Estimated BPM (beats per minute) */
  bpm: number;
  /** Current phase within beat cycle (0-1) */
  beatPhase: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
}

/**
 * Create a default audio analysis state.
 */
export function createDefaultAudioAnalysis(): AudioAnalysis {
  return {
    fft: new Float32Array(0),
    waveform: new Float32Array(0),
    bands: createAllFrequencyBands(),
    energy: 0,
    spectralCentroid: 0,
    spectralFlux: 0,
    beats: [],
    currentBeatIndex: -1,
    timeSinceLastBeat: Infinity,
    bpm: 0,
    beatPhase: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  };
}

// ============================================================================
// Audio Analyzer Configuration
// ============================================================================

/**
 * Valid FFT sizes for Web Audio API AnalyserNode.
 */
export type FFTSize = 2048 | 4096 | 8192;

/**
 * Configuration for the audio analyzer.
 */
export interface AudioAnalyzerConfig {
  /** FFT size - higher = more frequency resolution, lower time resolution */
  fftSize: FFTSize;
  /** Smoothing between FFT frames (0-1) */
  smoothingTimeConstant: number;
  /** Minimum decibels for FFT range */
  minDecibels: number;
  /** Maximum decibels for FFT range */
  maxDecibels: number;
  /** Beat detection sensitivity (0-1, higher = more sensitive) */
  beatSensitivity: number;
  /** Beat decay rate (0-1, higher = faster decay) */
  beatDecay: number;
  /** Frequency band smoothing factor (0-1) */
  bandSmoothing: number;
  /** Peak value decay rate (0-1) */
  peakDecay: number;
}

/**
 * Default analyzer configuration optimized for music visualization.
 */
export const DEFAULT_ANALYZER_CONFIG: Readonly<AudioAnalyzerConfig> = Object.freeze({
  fftSize: 4096,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
  beatSensitivity: 0.7,
  beatDecay: 0.95,
  bandSmoothing: 0.3,
  peakDecay: 0.98,
});

/**
 * Create analyzer config with optional overrides.
 */
export function createAnalyzerConfig(
  overrides?: Partial<AudioAnalyzerConfig>
): AudioAnalyzerConfig {
  return { ...DEFAULT_ANALYZER_CONFIG, ...overrides };
}

// ============================================================================
// Audio Reactive Mapping Types
// ============================================================================

/**
 * Source of audio data for reactive mapping.
 */
export type AudioSource =
  | { type: 'band'; band: FrequencyBandName }
  | { type: 'energy' }
  | { type: 'beat'; beatType?: BeatType }
  | { type: 'beatPhase' }
  | { type: 'bpm' }
  | { type: 'spectralCentroid' }
  | { type: 'spectralFlux' };

/**
 * Trigger mode for audio reactive mappings.
 */
export type TriggerMode =
  | 'continuous'    // Always apply mapping
  | 'onBeat'        // Only apply on beat detection
  | 'onThreshold'   // Apply when source exceeds threshold
  | 'onRise'        // Apply when source value increases
  | 'onFall';       // Apply when source value decreases

/**
 * Mapping from audio source to animation property.
 */
export interface AudioReactiveMapping {
  /** Unique identifier for this mapping */
  id: string;
  /** Whether this mapping is active */
  enabled: boolean;
  /** Audio source to read from */
  source: AudioSource;
  /** Target animation property (e.g., 'scaleX', 'opacity') */
  target: string;
  /** Minimum expected input value */
  inputMin: number;
  /** Maximum expected input value */
  inputMax: number;
  /** Minimum output value */
  outputMin: number;
  /** Maximum output value */
  outputMax: number;
  /** Smoothing factor (0-1, higher = smoother) */
  smoothing: number;
  /** When to apply this mapping */
  triggerMode: TriggerMode;
  /** Threshold for threshold-based triggers */
  threshold?: number;
  /** Invert the output value */
  invert: boolean;
  /** Clamp output to min/max range */
  clamp: boolean;
}

/**
 * Create a default audio reactive mapping.
 */
export function createDefaultMapping(
  id: string,
  source: AudioSource,
  target: string
): AudioReactiveMapping {
  return {
    id,
    enabled: true,
    source,
    target,
    inputMin: 0,
    inputMax: 1,
    outputMin: 0,
    outputMax: 1,
    smoothing: 0.3,
    triggerMode: 'continuous',
    threshold: 0.5,
    invert: false,
    clamp: true,
  };
}

// ============================================================================
// Audio Source Type Guards
// ============================================================================

/**
 * Check if audio source is a frequency band source.
 */
export function isBandSource(source: AudioSource): source is { type: 'band'; band: FrequencyBandName } {
  return source.type === 'band';
}

/**
 * Check if audio source is a beat source.
 */
export function isBeatSource(source: AudioSource): source is { type: 'beat'; beatType?: BeatType } {
  return source.type === 'beat';
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Audio input source type.
 */
export type AudioInputType = 'file' | 'microphone' | 'stream';

/**
 * Audio analyzer state.
 */
export type AnalyzerState = 'idle' | 'connecting' | 'active' | 'error' | 'disposed';

/**
 * Error types for audio operations.
 */
export type AudioErrorType =
  | 'context_creation_failed'
  | 'microphone_denied'
  | 'file_load_failed'
  | 'decode_failed'
  | 'connection_failed';

/**
 * Audio error with type and message.
 */
export interface AudioError {
  type: AudioErrorType;
  message: string;
  originalError?: Error;
}

/**
 * Create an audio error.
 */
export function createAudioError(
  type: AudioErrorType,
  message: string,
  originalError?: Error
): AudioError {
  return { type, message, originalError };
}
