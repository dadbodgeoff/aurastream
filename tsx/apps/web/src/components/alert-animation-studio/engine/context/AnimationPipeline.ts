/**
 * Animation Pipeline
 *
 * Unified animation processing pipeline for Animation Studio V2.
 * Processes transforms through multiple stages: timeline, entry, loop, audio, and depth.
 *
 * @module context/AnimationPipeline
 */

import type { AnimationTransform } from '../animations/core/types';
import { DEFAULT_TRANSFORM, createDefaultTransform, clamp } from '../animations/core/types';
import type { AnimatableProperty, PROPERTY_METADATA } from '../timeline/types';
import type { AudioAnalysis, AudioReactiveMapping, AudioSource } from '../audio/types';
import { isBandSource, isBeatSource } from '../audio/types';
import type {
  AnimationContextV2,
  AnimationPipelineConfig,
  PipelineResult,
  PipelineStageResult,
  EntryAnimationConfig,
  LoopAnimationConfig,
  DepthEffectConfig,
  TransformMergeMode,
} from './types';
import { createDefaultPipelineConfig, hasTimelineState, hasAudioState } from './types';

// ============================================================================
// Pipeline Result Interface
// ============================================================================

/**
 * Create an empty pipeline result.
 */
function createEmptyPipelineResult(transform: AnimationTransform): PipelineResult {
  return {
    transform,
    stages: [],
    totalProcessingTimeMs: 0,
  };
}

// ============================================================================
// Transform Utilities
// ============================================================================

/**
 * Merge two transforms based on the specified mode.
 *
 * @param base - Base transform
 * @param overlay - Transform to merge
 * @param mode - How to merge the transforms
 * @param weight - Blend weight for 'blend' mode (0-1)
 * @returns Merged transform
 */
export function mergeTransforms(
  base: AnimationTransform,
  overlay: AnimationTransform,
  mode: TransformMergeMode = 'replace',
  weight: number = 1
): AnimationTransform {
  switch (mode) {
    case 'replace':
      return { ...overlay };

    case 'additive':
      return {
        scaleX: base.scaleX + (overlay.scaleX - 1), // Scale is multiplicative, so subtract 1
        scaleY: base.scaleY + (overlay.scaleY - 1),
        scaleZ: base.scaleZ + (overlay.scaleZ - 1),
        rotationX: base.rotationX + overlay.rotationX,
        rotationY: base.rotationY + overlay.rotationY,
        rotationZ: base.rotationZ + overlay.rotationZ,
        positionX: base.positionX + overlay.positionX,
        positionY: base.positionY + overlay.positionY,
        positionZ: base.positionZ + overlay.positionZ,
        opacity: clamp(base.opacity + (overlay.opacity - 1), 0, 1),
      };

    case 'multiply':
      return {
        scaleX: base.scaleX * overlay.scaleX,
        scaleY: base.scaleY * overlay.scaleY,
        scaleZ: base.scaleZ * overlay.scaleZ,
        rotationX: base.rotationX * overlay.rotationX,
        rotationY: base.rotationY * overlay.rotationY,
        rotationZ: base.rotationZ * overlay.rotationZ,
        positionX: base.positionX * overlay.positionX,
        positionY: base.positionY * overlay.positionY,
        positionZ: base.positionZ * overlay.positionZ,
        opacity: clamp(base.opacity * overlay.opacity, 0, 1),
      };

    case 'blend':
      const w = clamp(weight, 0, 1);
      const invW = 1 - w;
      return {
        scaleX: base.scaleX * invW + overlay.scaleX * w,
        scaleY: base.scaleY * invW + overlay.scaleY * w,
        scaleZ: base.scaleZ * invW + overlay.scaleZ * w,
        rotationX: base.rotationX * invW + overlay.rotationX * w,
        rotationY: base.rotationY * invW + overlay.rotationY * w,
        rotationZ: base.rotationZ * invW + overlay.rotationZ * w,
        positionX: base.positionX * invW + overlay.positionX * w,
        positionY: base.positionY * invW + overlay.positionY * w,
        positionZ: base.positionZ * invW + overlay.positionZ * w,
        opacity: clamp(base.opacity * invW + overlay.opacity * w, 0, 1),
      };

    default:
      return { ...base };
  }
}

/**
 * Apply timeline values to a transform.
 *
 * @param transform - Base transform
 * @param values - Evaluated timeline values
 * @returns Transform with timeline values applied
 */
function applyTimelineValues(
  transform: AnimationTransform,
  values: Record<string, number>
): AnimationTransform {
  const result = { ...transform };

  // Map timeline properties to transform properties
  if (values.scaleX !== undefined) result.scaleX = values.scaleX;
  if (values.scaleY !== undefined) result.scaleY = values.scaleY;
  if (values.scaleZ !== undefined) result.scaleZ = values.scaleZ;
  if (values.scaleUniform !== undefined) {
    result.scaleX = values.scaleUniform;
    result.scaleY = values.scaleUniform;
    result.scaleZ = values.scaleUniform;
  }
  if (values.positionX !== undefined) result.positionX = values.positionX;
  if (values.positionY !== undefined) result.positionY = values.positionY;
  if (values.positionZ !== undefined) result.positionZ = values.positionZ;
  if (values.rotationX !== undefined) result.rotationX = values.rotationX;
  if (values.rotationY !== undefined) result.rotationY = values.rotationY;
  if (values.rotationZ !== undefined) result.rotationZ = values.rotationZ;
  if (values.opacity !== undefined) result.opacity = clamp(values.opacity, 0, 1);

  return result;
}

// ============================================================================
// Placeholder Animation Functions
// ============================================================================

/**
 * Apply entry animation to transform.
 * Placeholder - will be replaced when entry animation module is implemented.
 *
 * @param config - Entry animation configuration
 * @param context - Animation context
 * @param transform - Current transform
 * @returns Transform with entry animation applied
 */
function applyEntryAnimation(
  config: EntryAnimationConfig,
  context: AnimationContextV2,
  transform: AnimationTransform
): AnimationTransform {
  // Placeholder implementation
  // Entry animations typically modify transform during the entry phase
  // based on config.type (pop_in, slide_in, fade_in, etc.)

  const entryProgress = Math.min(1, context.timeMs / config.duration);

  // If entry is complete, return transform unchanged
  if (entryProgress >= 1) {
    return transform;
  }

  // Basic fade-in as placeholder
  // Real implementation would switch on config.type
  return {
    ...transform,
    opacity: transform.opacity * entryProgress,
  };
}

/**
 * Apply loop animation to transform.
 * Placeholder - will be replaced when loop animation module is implemented.
 *
 * @param config - Loop animation configuration
 * @param context - Animation context
 * @param transform - Current transform
 * @param loopT - Normalized time within current loop cycle (0-1)
 * @returns Transform with loop animation applied
 */
function applyLoopAnimation(
  config: LoopAnimationConfig,
  context: AnimationContextV2,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  // Placeholder implementation
  // Loop animations add continuous motion based on config.type
  // (float, pulse, wiggle, glow, etc.)

  // Return transform unchanged for now
  // Real implementation would apply oscillating transforms
  return transform;
}

/**
 * Apply depth effect to transform.
 * Placeholder - will be replaced when depth effect module is implemented.
 *
 * @param config - Depth effect configuration
 * @param context - Animation context
 * @param transform - Current transform
 * @param state - Additional state for depth calculations
 * @returns Transform with depth effect applied
 */
function applyDepthEffect(
  config: DepthEffectConfig,
  context: AnimationContextV2,
  transform: AnimationTransform,
  state: { mouseX: number; mouseY: number }
): AnimationTransform {
  // Placeholder implementation
  // Depth effects add parallax/tilt based on mouse position
  // or automatic movement

  // Return transform unchanged for now
  // Real implementation would apply depth-based transforms
  return transform;
}

// ============================================================================
// Audio Reactivity
// ============================================================================

/**
 * Get value from audio source.
 *
 * @param source - Audio source configuration
 * @param analysis - Current audio analysis
 * @returns Normalized value (0-1)
 */
function getAudioSourceValue(source: AudioSource, analysis: AudioAnalysis): number {
  switch (source.type) {
    case 'band':
      if (isBandSource(source)) {
        const band = analysis.bands.find(b => b.name === source.band);
        return band?.value ?? 0;
      }
      return 0;

    case 'energy':
      return analysis.energy;

    case 'beat':
      if (isBeatSource(source)) {
        // Return 1 on beat, decay over time
        const timeSinceBeat = analysis.timeSinceLastBeat;
        const decay = Math.exp(-timeSinceBeat / 100); // 100ms decay
        return decay;
      }
      return 0;

    case 'beatPhase':
      return analysis.beatPhase;

    case 'bpm':
      // Normalize BPM to 0-1 range (60-180 BPM typical range)
      return clamp((analysis.bpm - 60) / 120, 0, 1);

    case 'spectralCentroid':
      // Normalize spectral centroid (typically 0-8000 Hz)
      return clamp(analysis.spectralCentroid / 8000, 0, 1);

    case 'spectralFlux':
      return clamp(analysis.spectralFlux, 0, 1);

    default:
      return 0;
  }
}

/**
 * Apply audio reactive mapping to a value.
 *
 * @param mapping - Audio reactive mapping configuration
 * @param analysis - Current audio analysis
 * @param currentValue - Current property value
 * @returns Modified value
 */
function applyAudioMapping(
  mapping: AudioReactiveMapping,
  analysis: AudioAnalysis,
  currentValue: number
): number {
  if (!mapping.enabled) return currentValue;

  // Get source value
  let sourceValue = getAudioSourceValue(mapping.source, analysis);

  // Apply input range mapping
  const normalizedInput = clamp(
    (sourceValue - mapping.inputMin) / (mapping.inputMax - mapping.inputMin),
    0,
    1
  );

  // Apply inversion
  const processedInput = mapping.invert ? 1 - normalizedInput : normalizedInput;

  // Map to output range
  let outputValue = mapping.outputMin + processedInput * (mapping.outputMax - mapping.outputMin);

  // Apply clamping
  if (mapping.clamp) {
    outputValue = clamp(outputValue, mapping.outputMin, mapping.outputMax);
  }

  // Apply based on trigger mode
  switch (mapping.triggerMode) {
    case 'continuous':
      return outputValue;

    case 'onBeat':
      // Only apply on beat detection
      if (analysis.timeSinceLastBeat < 50) { // Within 50ms of beat
        return outputValue;
      }
      return currentValue;

    case 'onThreshold':
      // Only apply when source exceeds threshold
      if (sourceValue >= (mapping.threshold ?? 0.5)) {
        return outputValue;
      }
      return currentValue;

    default:
      return outputValue;
  }
}

/**
 * Apply audio reactivity to transform.
 *
 * @param transform - Current transform
 * @param analysis - Audio analysis data
 * @param mappings - Audio reactive mappings
 * @returns Transform with audio reactivity applied
 */
function applyAudioReactivity(
  transform: AnimationTransform,
  analysis: AudioAnalysis,
  mappings: AudioReactiveMapping[]
): AnimationTransform {
  const result = { ...transform };

  for (const mapping of mappings) {
    if (!mapping.enabled) continue;

    const target = mapping.target as keyof AnimationTransform;

    // Check if target is a valid transform property
    if (target in result) {
      const currentValue = result[target];
      result[target] = applyAudioMapping(mapping, analysis, currentValue);
    }
  }

  return result;
}

// ============================================================================
// Main Pipeline Function
// ============================================================================

/**
 * Process the complete animation pipeline.
 *
 * Pipeline stages (in order):
 * 1. Timeline - Base layer from keyframe evaluation
 * 2. Entry - Additive entry animation effects
 * 3. Loop - Additive loop animation effects
 * 4. Audio - Modulation from audio reactivity
 * 5. Depth - Final pass depth/parallax effects
 *
 * @param context - Animation context with all state
 * @param config - Pipeline configuration
 * @param initialTransform - Starting transform (defaults to identity)
 * @returns Pipeline result with final transform and stage info
 *
 * @example
 * ```typescript
 * const result = processAnimationPipeline(context, {
 *   timelineEnabled: true,
 *   entry: { type: 'pop_in', duration: 500, delay: 0, params: {} },
 *   loop: { type: 'float', duration: 2000, intensity: 0.5, params: {} },
 *   audioEnabled: true,
 *   depth: { type: 'parallax', intensity: 0.3, params: {} },
 * });
 *
 * // Apply result.transform to your element
 * ```
 */
export function processAnimationPipeline(
  context: AnimationContextV2,
  config: AnimationPipelineConfig,
  initialTransform: AnimationTransform = createDefaultTransform()
): PipelineResult {
  const startTime = performance.now();
  const stages: PipelineStageResult[] = [];
  let currentTransform = { ...initialTransform };

  // ==========================================================================
  // Stage 1: Timeline (Base Layer)
  // ==========================================================================
  if (config.timelineEnabled && hasTimelineState(context)) {
    const stageStart = performance.now();

    currentTransform = applyTimelineValues(
      currentTransform,
      context.timeline.evaluatedValues
    );

    stages.push({
      stage: 'timeline',
      applied: true,
      transform: { ...currentTransform },
      processingTimeMs: performance.now() - stageStart,
    });
  } else {
    stages.push({
      stage: 'timeline',
      applied: false,
      transform: { ...currentTransform },
    });
  }

  // ==========================================================================
  // Stage 2: Entry Animation (Additive)
  // ==========================================================================
  if (config.entry !== null) {
    const stageStart = performance.now();

    currentTransform = applyEntryAnimation(
      config.entry,
      context,
      currentTransform
    );

    stages.push({
      stage: 'entry',
      applied: true,
      transform: { ...currentTransform },
      processingTimeMs: performance.now() - stageStart,
    });
  } else {
    stages.push({
      stage: 'entry',
      applied: false,
      transform: { ...currentTransform },
    });
  }

  // ==========================================================================
  // Stage 3: Loop Animation (Additive)
  // ==========================================================================
  if (config.loop !== null) {
    const stageStart = performance.now();

    // Calculate loop progress
    const loopDuration = config.loop.duration;
    const loopT = loopDuration > 0
      ? (context.timeMs % loopDuration) / loopDuration
      : 0;

    currentTransform = applyLoopAnimation(
      config.loop,
      context,
      currentTransform,
      loopT
    );

    stages.push({
      stage: 'loop',
      applied: true,
      transform: { ...currentTransform },
      processingTimeMs: performance.now() - stageStart,
    });
  } else {
    stages.push({
      stage: 'loop',
      applied: false,
      transform: { ...currentTransform },
    });
  }

  // ==========================================================================
  // Stage 4: Audio Reactivity (Modulation)
  // ==========================================================================
  if (config.audioEnabled && hasAudioState(context) && context.audio.isEnabled) {
    const stageStart = performance.now();

    currentTransform = applyAudioReactivity(
      currentTransform,
      context.audio.analysis,
      context.audio.mappings
    );

    stages.push({
      stage: 'audio',
      applied: true,
      transform: { ...currentTransform },
      processingTimeMs: performance.now() - stageStart,
    });
  } else {
    stages.push({
      stage: 'audio',
      applied: false,
      transform: { ...currentTransform },
    });
  }

  // ==========================================================================
  // Stage 5: Depth Effects (Final Pass)
  // ==========================================================================
  if (config.depth !== null) {
    const stageStart = performance.now();

    currentTransform = applyDepthEffect(
      config.depth,
      context,
      currentTransform,
      { mouseX: context.mouseX, mouseY: context.mouseY }
    );

    stages.push({
      stage: 'depth',
      applied: true,
      transform: { ...currentTransform },
      processingTimeMs: performance.now() - stageStart,
    });
  } else {
    stages.push({
      stage: 'depth',
      applied: false,
      transform: { ...currentTransform },
    });
  }

  // ==========================================================================
  // Return Result
  // ==========================================================================
  return {
    transform: currentTransform,
    stages,
    totalProcessingTimeMs: performance.now() - startTime,
  };
}

// ============================================================================
// Pipeline Configuration Helpers
// ============================================================================

/**
 * Create a pipeline configuration with specified options.
 *
 * @param options - Partial configuration options
 * @returns Complete pipeline configuration
 */
export function createPipelineConfig(
  options: Partial<AnimationPipelineConfig> = {}
): AnimationPipelineConfig {
  return {
    ...createDefaultPipelineConfig(),
    ...options,
  };
}

/**
 * Create an entry animation configuration.
 *
 * @param type - Entry animation type
 * @param duration - Animation duration in milliseconds
 * @param options - Additional options
 * @returns Entry animation configuration
 */
export function createEntryConfig(
  type: EntryAnimationConfig['type'],
  duration: number = 500,
  options: Partial<Omit<EntryAnimationConfig, 'type' | 'duration'>> = {}
): EntryAnimationConfig {
  return {
    type,
    duration,
    delay: options.delay ?? 0,
    params: options.params ?? {},
  };
}

/**
 * Create a loop animation configuration.
 *
 * @param type - Loop animation type
 * @param duration - Loop cycle duration in milliseconds
 * @param options - Additional options
 * @returns Loop animation configuration
 */
export function createLoopConfig(
  type: LoopAnimationConfig['type'],
  duration: number = 2000,
  options: Partial<Omit<LoopAnimationConfig, 'type' | 'duration'>> = {}
): LoopAnimationConfig {
  return {
    type,
    duration,
    intensity: options.intensity ?? 0.5,
    params: options.params ?? {},
  };
}

/**
 * Create a depth effect configuration.
 *
 * @param type - Depth effect type
 * @param intensity - Effect intensity (0-1)
 * @param options - Additional options
 * @returns Depth effect configuration
 */
export function createDepthConfig(
  type: DepthEffectConfig['type'],
  intensity: number = 0.5,
  options: Partial<Omit<DepthEffectConfig, 'type' | 'intensity'>> = {}
): DepthEffectConfig {
  return {
    type,
    intensity: clamp(intensity, 0, 1),
    params: options.params ?? {},
  };
}
