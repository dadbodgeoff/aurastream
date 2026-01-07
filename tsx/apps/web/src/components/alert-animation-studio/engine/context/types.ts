/**
 * Animation Context V2 - Extended Type Definitions
 *
 * Unified context types for the Animation Studio V2 pipeline.
 * Extends the base AnimationContext with timeline, audio, WebGL, and export capabilities.
 *
 * @module context/types
 */

import type {
  AnimationContext,
  AnimationTransform,
  EntryAnimationType,
  LoopAnimationType,
  DepthEffectType,
} from '../animations/core/types';
import type { Timeline, TimelineUIState, AnimatableProperty } from '../timeline/types';
import type { AudioAnalysis, AudioReactiveMapping } from '../audio/types';
import type { ParticleRendererInterface } from '../webgl/types';

// ============================================================================
// Extended Animation Context
// ============================================================================

/**
 * Timeline state within the animation context.
 * Contains timeline data, UI state, and pre-evaluated property values.
 */
export interface TimelineContextState {
  /** The timeline data structure */
  data: Timeline;
  /** Current UI state (playhead position, selection, etc.) */
  state: TimelineUIState;
  /** Pre-evaluated property values at current time */
  evaluatedValues: Record<AnimatableProperty, number>;
}

/**
 * Audio state within the animation context.
 * Contains analysis data and reactive mappings.
 */
export interface AudioContextState {
  /** Current audio analysis frame */
  analysis: AudioAnalysis;
  /** Active audio-to-property mappings */
  mappings: AudioReactiveMapping[];
  /** Whether audio reactivity is enabled */
  isEnabled: boolean;
}

/**
 * WebGL particle state within the animation context.
 */
export interface WebGLContextState {
  /** WebGL particle renderer instance (null if not initialized) */
  renderer: ParticleRendererInterface | null;
  /** Whether WebGL particles are enabled */
  isEnabled: boolean;
}

/**
 * Export mode state within the animation context.
 */
export interface ExportContextState {
  /** Whether currently exporting */
  isExporting: boolean;
  /** Export format */
  format: 'webm' | 'gif' | 'apng';
  /** Current frame being exported */
  frame: number;
  /** Total frames to export */
  totalFrames: number;
}

/**
 * Extended animation context for Animation Studio V2.
 * Combines base context with timeline, audio, WebGL, and export state.
 */
export interface AnimationContextV2 extends AnimationContext {
  /** Timeline state (optional - may not be using timeline) */
  timeline?: TimelineContextState;
  /** Audio reactivity state (optional - may not have audio) */
  audio?: AudioContextState;
  /** WebGL particle state (optional - may use CSS particles) */
  webglParticles?: WebGLContextState;
  /** Export mode state (optional - only during export) */
  exportMode?: ExportContextState;
}

/**
 * Create a default AnimationContextV2 with optional extensions.
 *
 * @param durationMs - Total animation duration in milliseconds
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @returns A new AnimationContextV2 instance
 */
export function createAnimationContextV2(
  durationMs: number = 3000,
  canvasWidth: number = 512,
  canvasHeight: number = 512
): AnimationContextV2 {
  return {
    // Base context properties
    t: 0,
    timeMs: 0,
    durationMs,
    deltaTime: 0,
    isPlaying: false,
    mesh: null,
    material: null,
    canvasWidth,
    canvasHeight,
    mouseX: 0,
    mouseY: 0,
    isHovering: false,
    // Extended properties are undefined by default
    timeline: undefined,
    audio: undefined,
    webglParticles: undefined,
    exportMode: undefined,
  };
}

// ============================================================================
// Animation Pipeline Types
// ============================================================================

/**
 * Stages in the animation pipeline.
 * Each stage processes the transform in order.
 */
export type PipelineStage =
  | 'timeline'      // Base layer: keyframe-driven values
  | 'entry'         // Additive: entry animation effects
  | 'loop'          // Additive: loop animation effects
  | 'audio'         // Modulation: audio-reactive adjustments
  | 'depth';        // Final pass: depth/parallax effects

/**
 * Configuration for a single pipeline stage.
 */
export interface PipelineStageConfig {
  /** Stage identifier */
  stage: PipelineStage;
  /** Whether this stage is enabled */
  enabled: boolean;
  /** Stage-specific configuration */
  config: unknown;
}

/**
 * Entry animation configuration for the pipeline.
 */
export interface EntryAnimationConfig {
  /** Entry animation type */
  type: EntryAnimationType;
  /** Animation duration in milliseconds */
  duration: number;
  /** Delay before animation starts */
  delay: number;
  /** Animation-specific parameters */
  params: Record<string, unknown>;
}

/**
 * Loop animation configuration for the pipeline.
 */
export interface LoopAnimationConfig {
  /** Loop animation type */
  type: LoopAnimationType;
  /** Loop cycle duration in milliseconds */
  duration: number;
  /** Animation intensity (0-1) */
  intensity: number;
  /** Animation-specific parameters */
  params: Record<string, unknown>;
}

/**
 * Depth effect configuration for the pipeline.
 */
export interface DepthEffectConfig {
  /** Depth effect type */
  type: DepthEffectType;
  /** Effect intensity (0-1) */
  intensity: number;
  /** Effect-specific parameters */
  params: Record<string, unknown>;
}

/**
 * Complete animation pipeline configuration.
 */
export interface AnimationPipelineConfig {
  /** Whether timeline keyframes are enabled */
  timelineEnabled: boolean;
  /** Entry animation configuration (null if disabled) */
  entry: EntryAnimationConfig | null;
  /** Loop animation configuration (null if disabled) */
  loop: LoopAnimationConfig | null;
  /** Audio reactivity enabled */
  audioEnabled: boolean;
  /** Depth effect configuration (null if disabled) */
  depth: DepthEffectConfig | null;
}

/**
 * Create a default pipeline configuration.
 *
 * @returns Default AnimationPipelineConfig with all stages disabled
 */
export function createDefaultPipelineConfig(): AnimationPipelineConfig {
  return {
    timelineEnabled: false,
    entry: null,
    loop: null,
    audioEnabled: false,
    depth: null,
  };
}

// ============================================================================
// Pipeline Result Types
// ============================================================================

/**
 * Result from processing a single pipeline stage.
 */
export interface PipelineStageResult {
  /** The stage that was processed */
  stage: PipelineStage;
  /** Whether the stage was applied */
  applied: boolean;
  /** The transform after this stage */
  transform: AnimationTransform;
  /** Processing time in milliseconds (for debugging) */
  processingTimeMs?: number;
}

/**
 * Complete result from the animation pipeline.
 */
export interface PipelineResult {
  /** Final computed transform */
  transform: AnimationTransform;
  /** Results from each stage */
  stages: PipelineStageResult[];
  /** Total processing time in milliseconds */
  totalProcessingTimeMs: number;
}

// ============================================================================
// Transform Merge Modes
// ============================================================================

/**
 * How to combine transforms from different pipeline stages.
 */
export type TransformMergeMode =
  | 'replace'     // New transform replaces old
  | 'additive'    // Add values together
  | 'multiply'    // Multiply values together
  | 'blend';      // Blend with a weight factor

/**
 * Configuration for merging transforms.
 */
export interface TransformMergeConfig {
  /** Merge mode to use */
  mode: TransformMergeMode;
  /** Blend weight (0-1) for 'blend' mode */
  weight?: number;
  /** Properties to merge (null = all properties) */
  properties?: (keyof AnimationTransform)[];
}

// ============================================================================
// Context Update Options
// ============================================================================

/**
 * Options for updating the animation context.
 */
export interface ContextUpdateOptions {
  /** Delta time in seconds */
  deltaTime: number;
  /** Whether animation is playing */
  isPlaying?: boolean;
  /** Mouse position (normalized -1 to 1) */
  mouse?: { x: number; y: number };
  /** Whether mouse is hovering */
  isHovering?: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if context has timeline state.
 */
export function hasTimelineState(
  context: AnimationContextV2
): context is AnimationContextV2 & { timeline: TimelineContextState } {
  return context.timeline !== undefined;
}

/**
 * Check if context has audio state.
 */
export function hasAudioState(
  context: AnimationContextV2
): context is AnimationContextV2 & { audio: AudioContextState } {
  return context.audio !== undefined;
}

/**
 * Check if context has WebGL state.
 */
export function hasWebGLState(
  context: AnimationContextV2
): context is AnimationContextV2 & { webglParticles: WebGLContextState } {
  return context.webglParticles !== undefined;
}

/**
 * Check if context is in export mode.
 */
export function isExporting(
  context: AnimationContextV2
): context is AnimationContextV2 & { exportMode: ExportContextState } {
  return context.exportMode !== undefined && context.exportMode.isExporting;
}
