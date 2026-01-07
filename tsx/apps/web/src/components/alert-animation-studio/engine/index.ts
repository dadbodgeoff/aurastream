/**
 * Animation Studio V2 Engine
 *
 * Unified export for all Animation Studio V2 engine modules.
 * This module provides a single entry point for:
 * - WebGL Particle System (10,000+ particles at 60fps)
 * - Timeline Editor with Keyframes (After Effects-style control)
 * - Audio Reactivity Engine (FFT + Beat Detection)
 * - Export System (OBS HTML Blob, WebM, GIF, APNG)
 * - Unified Animation Context & Pipeline
 *
 * @module engine
 *
 * @example
 * ```typescript
 * import {
 *   // WebGL Particles
 *   WebGLParticleRenderer,
 *   createParticleRenderer,
 *
 *   // Timeline
 *   useTimeline,
 *   usePlayback,
 *   useKeyframes,
 *
 *   // Audio
 *   AudioAnalyzer,
 *   BeatDetector,
 *
 *   // Export
 *   generateOBSHtmlBlob,
 *   WebMEncoder,
 *   GIFEncoder,
 *
 *   // Context
 *   AnimationContextManager,
 *   processAnimationPipeline,
 * } from './engine';
 * ```
 */

// ============================================================================
// WebGL Particle System (Phase 1)
// ============================================================================

export {
  // Main renderer
  WebGLParticleRenderer,
  createParticleRenderer,

  // Types
  type ParticleGPUData,
  type WebGLParticleConfig,
  type ParticleUniforms,
  type ParticleTextureAtlas,
  type TextureRegion,
  type ParticleShape,
  type BlendMode,
  type ParticleRendererInterface,
} from './webgl';

// ============================================================================
// Timeline Editor Engine (Phase 2)
// ============================================================================

export {
  // Core timeline functions
  createKeyframe,
  updateKeyframe,
  removeKeyframe,
  createTrack,
  updateTrack,
  removeTrack,
  createTimeline,
  evaluateTimeline,
  interpolateKeyframes,
  PROPERTY_METADATA,

  // React hooks
  useTimeline,
  usePlayback,
  useKeyframes,

  // Types
  type Keyframe,
  type BezierHandle,
  type Track,
  type Timeline,
  type AnimatableProperty,
  type PropertyMeta,
  type PlaybackState,
  type TimelineUIState,
  type UseTimelineOptions,
  type UsePlaybackOptions,
} from './timeline';

// ============================================================================
// Audio Reactivity Engine (Phase 3)
// ============================================================================

export {
  // Core audio
  createAudioContext,
  AudioAnalyzer,
  BeatDetector,

  // Reactivity
  applyAudioReactivity,
  createMappingFromPreset,
  smoothValue,
  shouldTrigger,
  AUDIO_REACTIVE_PRESETS,

  // Types
  type AudioAnalysis,
  type FrequencyBand,
  type FrequencyBandName,
  type BeatInfo,
  type TriggerMode,
  type AudioReactiveMapping,
  type AudioSource,
  type MappingState,
} from './audio';

// ============================================================================
// Export System (Phase 4)
// ============================================================================

export {
  // OBS Integration
  generateOBSHtmlBlob,
  downloadOBSHtmlBlob,

  // Video Export
  WebMEncoder,

  // GIF Export
  GIFEncoder,

  // APNG Export
  APNGEncoder,

  // Types
  type ExportFormat,
  type ExportQuality,
  type AlertBlobConfig,
  type WebMExportConfig,
  type GIFExportConfig,
  type APNGExportConfig,
  type ExportProgress,
  type ExportResult,
} from './export';

// ============================================================================
// Unified Animation Context (Phase 5)
// ============================================================================

export {
  // Context manager
  AnimationContextManager,

  // Pipeline
  processAnimationPipeline,
  mergeTransforms,
  createPipelineConfig,
  createEntryConfig,
  createLoopConfig,
  createDepthConfig,

  // Context creation
  createAnimationContextV2,
  createDefaultPipelineConfig,

  // Type guards
  hasTimelineState,
  hasAudioState,
  hasWebGLState,
  isExporting,

  // Types
  type AnimationContextV2,
  type TimelineContextState,
  type AudioContextState,
  type WebGLContextState,
  type ExportContextState,
  type PipelineStage,
  type PipelineStageConfig,
  type AnimationPipelineConfig,
  type EntryAnimationConfig,
  type LoopAnimationConfig,
  type DepthEffectConfig,
  type PipelineStageResult,
  type PipelineResult,
  type TransformMergeMode,
  type TransformMergeConfig,
  type ContextUpdateOptions,
} from './context';

// ============================================================================
// Version & Feature Flags
// ============================================================================

/**
 * Animation Studio V2 version info
 */
export const ENGINE_VERSION = {
  major: 2,
  minor: 0,
  patch: 0,
  label: 'Animation Studio V2',
  features: [
    'webgl-particles',
    'timeline-keyframes',
    'audio-reactivity',
    'obs-integration',
    'video-export',
  ],
} as const;

/**
 * Feature detection for V2 capabilities
 */
export const V2_FEATURES = {
  /** WebGL2 particle rendering (10,000+ particles) */
  webglParticles: typeof WebGL2RenderingContext !== 'undefined',

  /** Web Audio API for audio reactivity */
  audioReactivity: typeof AudioContext !== 'undefined' || (typeof window !== 'undefined' && typeof (window as any).webkitAudioContext !== 'undefined'),

  /** MediaRecorder for WebM export */
  webmExport: typeof MediaRecorder !== 'undefined',

  /** OffscreenCanvas for GIF/APNG encoding */
  offscreenCanvas: typeof OffscreenCanvas !== 'undefined',

  /** Check all V2 features */
  get allSupported(): boolean {
    return this.webglParticles && this.audioReactivity && this.webmExport;
  },
} as const;

/**
 * Check if browser supports Animation Studio V2 features
 */
export function checkV2Support(): {
  supported: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!V2_FEATURES.webglParticles) {
    missing.push('WebGL2 (required for particle effects)');
  }

  if (!V2_FEATURES.audioReactivity) {
    missing.push('Web Audio API (required for audio reactivity)');
  }

  if (!V2_FEATURES.webmExport) {
    warnings.push('MediaRecorder not available - WebM export disabled');
  }

  if (!V2_FEATURES.offscreenCanvas) {
    warnings.push('OffscreenCanvas not available - export may be slower');
  }

  return {
    supported: missing.length === 0,
    missing,
    warnings,
  };
}
