/**
 * Animation Context Module
 *
 * Unified animation context and pipeline for Animation Studio V2.
 * Provides context management, transform processing, and multi-stage animation pipeline.
 *
 * @module context
 *
 * @example
 * ```typescript
 * import {
 *   AnimationContextManager,
 *   processAnimationPipeline,
 *   createPipelineConfig,
 * } from './context';
 *
 * // Create context manager
 * const manager = new AnimationContextManager(512, 512, 3000);
 *
 * // Configure pipeline
 * const config = createPipelineConfig({
 *   timelineEnabled: true,
 *   entry: createEntryConfig('pop_in', 500),
 *   loop: createLoopConfig('float', 2000),
 *   audioEnabled: true,
 *   depth: createDepthConfig('parallax', 0.3),
 * });
 *
 * // In animation loop
 * function animate(deltaTime: number) {
 *   manager.update(deltaTime);
 *   const context = manager.getContext();
 *   const result = processAnimationPipeline(context, config);
 *   // Apply result.transform to element
 * }
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Extended context types
  AnimationContextV2,
  TimelineContextState,
  AudioContextState,
  WebGLContextState,
  ExportContextState,

  // Pipeline types
  PipelineStage,
  PipelineStageConfig,
  AnimationPipelineConfig,
  EntryAnimationConfig,
  LoopAnimationConfig,
  DepthEffectConfig,

  // Result types
  PipelineStageResult,
  PipelineResult,

  // Merge types
  TransformMergeMode,
  TransformMergeConfig,

  // Update types
  ContextUpdateOptions,
} from './types';

// ============================================================================
// Function Exports from Types
// ============================================================================

export {
  // Context creation
  createAnimationContextV2,
  createDefaultPipelineConfig,

  // Type guards
  hasTimelineState,
  hasAudioState,
  hasWebGLState,
  isExporting,
} from './types';

// ============================================================================
// Class Exports
// ============================================================================

export { AnimationContextManager } from './AnimationContext';

// ============================================================================
// Pipeline Exports
// ============================================================================

export {
  // Main pipeline function
  processAnimationPipeline,

  // Transform utilities
  mergeTransforms,

  // Configuration helpers
  createPipelineConfig,
  createEntryConfig,
  createLoopConfig,
  createDepthConfig,
} from './AnimationPipeline';
