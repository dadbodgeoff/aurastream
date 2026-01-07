/**
 * Animation Context Manager
 *
 * Manages the unified animation context state for Animation Studio V2.
 * Handles context updates, state management, and mouse tracking.
 *
 * @module context/AnimationContext
 */

import type { Timeline, TimelineUIState, AnimatableProperty } from '../timeline/types';
import type { AudioAnalysis, AudioReactiveMapping } from '../audio/types';
import type { ParticleRendererInterface } from '../webgl/types';
import type {
  AnimationContextV2,
  TimelineContextState,
  AudioContextState,
  WebGLContextState,
  ExportContextState,
  ContextUpdateOptions,
} from './types';
import { createAnimationContextV2 } from './types';

// ============================================================================
// Animation Context Manager
// ============================================================================

/**
 * Manages the animation context state for the Animation Studio V2.
 *
 * Responsibilities:
 * - Maintains the unified context state
 * - Handles time progression and delta time
 * - Manages mouse position tracking
 * - Coordinates timeline, audio, and WebGL state
 *
 * @example
 * ```typescript
 * const manager = new AnimationContextManager(512, 512, 3000);
 *
 * // Update each frame
 * manager.update(deltaTime);
 *
 * // Get current context for pipeline
 * const context = manager.getContext();
 * ```
 */
export class AnimationContextManager {
  /** Internal context state */
  private context: AnimationContextV2;

  /** Accumulated time in milliseconds */
  private accumulatedTimeMs: number = 0;

  /** Last update timestamp for delta calculation */
  private lastUpdateTime: number = 0;

  /** Whether the manager has been initialized */
  private initialized: boolean = false;

  /**
   * Create a new AnimationContextManager.
   *
   * @param canvasWidth - Canvas width in pixels
   * @param canvasHeight - Canvas height in pixels
   * @param durationMs - Total animation duration in milliseconds
   */
  constructor(
    canvasWidth: number = 512,
    canvasHeight: number = 512,
    durationMs: number = 3000
  ) {
    this.context = createAnimationContextV2(durationMs, canvasWidth, canvasHeight);
    this.initialized = true;
  }

  // ==========================================================================
  // Core Update Methods
  // ==========================================================================

  /**
   * Update the context with new timing information.
   *
   * @param deltaTime - Time elapsed since last frame in seconds
   */
  public update(deltaTime: number): void {
    if (!this.initialized) return;

    // Update timing
    this.context.deltaTime = deltaTime;
    const deltaMs = deltaTime * 1000;

    if (this.context.isPlaying) {
      this.accumulatedTimeMs += deltaMs;

      // Handle looping
      if (this.accumulatedTimeMs >= this.context.durationMs) {
        this.accumulatedTimeMs = this.accumulatedTimeMs % this.context.durationMs;
      }
    }

    // Update context time values
    this.context.timeMs = this.accumulatedTimeMs;
    this.context.t = this.context.durationMs > 0
      ? this.accumulatedTimeMs / this.context.durationMs
      : 0;

    // Update timeline state if present
    if (this.context.timeline) {
      this.context.timeline.state.currentTime = this.accumulatedTimeMs;
    }

    this.lastUpdateTime = performance.now();
  }

  /**
   * Update context with full options.
   *
   * @param options - Update options including deltaTime, mouse, etc.
   */
  public updateWithOptions(options: ContextUpdateOptions): void {
    // Update timing
    this.update(options.deltaTime);

    // Update playing state
    if (options.isPlaying !== undefined) {
      this.context.isPlaying = options.isPlaying;
    }

    // Update mouse position
    if (options.mouse) {
      this.context.mouseX = options.mouse.x;
      this.context.mouseY = options.mouse.y;
    }

    // Update hover state
    if (options.isHovering !== undefined) {
      this.context.isHovering = options.isHovering;
    }
  }

  // ==========================================================================
  // Timeline Management
  // ==========================================================================

  /**
   * Set the timeline state.
   *
   * @param timeline - Timeline data structure
   * @param uiState - Optional UI state (uses defaults if not provided)
   */
  public setTimeline(timeline: Timeline, uiState?: Partial<TimelineUIState>): void {
    const defaultUIState: TimelineUIState = {
      currentTime: this.accumulatedTimeMs,
      isPlaying: this.context.isPlaying,
      playbackSpeed: 1,
      selectedKeyframes: new Set(),
      selectedTracks: new Set(),
      zoom: 100,
      scrollX: 0,
      scrollY: 0,
      isDragging: false,
      dragType: null,
      dragStartPos: null,
      snapToFrames: true,
      snapToKeyframes: true,
      snapToMarkers: true,
      snapToBeats: false,
    };

    this.context.timeline = {
      data: timeline,
      state: { ...defaultUIState, ...uiState },
      evaluatedValues: {} as Record<AnimatableProperty, number>,
    };

    // Update duration from timeline
    this.context.durationMs = timeline.duration;
  }

  /**
   * Update evaluated timeline values.
   *
   * @param values - Map of property names to evaluated values
   */
  public setTimelineValues(values: Record<AnimatableProperty, number>): void {
    if (this.context.timeline) {
      this.context.timeline.evaluatedValues = values;
    }
  }

  /**
   * Clear timeline state.
   */
  public clearTimeline(): void {
    this.context.timeline = undefined;
  }

  // ==========================================================================
  // Audio Management
  // ==========================================================================

  /**
   * Set the audio state.
   *
   * @param analysis - Current audio analysis data
   * @param mappings - Audio-to-property mappings
   */
  public setAudio(analysis: AudioAnalysis, mappings: AudioReactiveMapping[]): void {
    this.context.audio = {
      analysis,
      mappings,
      isEnabled: true,
    };
  }

  /**
   * Update audio analysis data.
   *
   * @param analysis - New audio analysis frame
   */
  public updateAudioAnalysis(analysis: AudioAnalysis): void {
    if (this.context.audio) {
      this.context.audio.analysis = analysis;
    }
  }

  /**
   * Update audio mappings.
   *
   * @param mappings - New audio-to-property mappings
   */
  public updateAudioMappings(mappings: AudioReactiveMapping[]): void {
    if (this.context.audio) {
      this.context.audio.mappings = mappings;
    }
  }

  /**
   * Enable or disable audio reactivity.
   *
   * @param enabled - Whether audio reactivity is enabled
   */
  public setAudioEnabled(enabled: boolean): void {
    if (this.context.audio) {
      this.context.audio.isEnabled = enabled;
    }
  }

  /**
   * Clear audio state.
   */
  public clearAudio(): void {
    this.context.audio = undefined;
  }

  // ==========================================================================
  // WebGL Management
  // ==========================================================================

  /**
   * Set the WebGL particle renderer.
   *
   * @param renderer - WebGL particle renderer instance
   */
  public setWebGLRenderer(renderer: ParticleRendererInterface | null): void {
    this.context.webglParticles = {
      renderer,
      isEnabled: renderer !== null,
    };
  }

  /**
   * Enable or disable WebGL particles.
   *
   * @param enabled - Whether WebGL particles are enabled
   */
  public setWebGLEnabled(enabled: boolean): void {
    if (this.context.webglParticles) {
      this.context.webglParticles.isEnabled = enabled;
    }
  }

  /**
   * Clear WebGL state.
   */
  public clearWebGL(): void {
    // Dispose renderer if present
    if (this.context.webglParticles?.renderer) {
      this.context.webglParticles.renderer.dispose();
    }
    this.context.webglParticles = undefined;
  }

  // ==========================================================================
  // Export Mode Management
  // ==========================================================================

  /**
   * Set export mode state.
   *
   * @param mode - Export mode configuration
   */
  public setExportMode(mode: ExportContextState | null): void {
    if (mode === null) {
      this.context.exportMode = undefined;
    } else {
      this.context.exportMode = mode;
    }
  }

  /**
   * Update export progress.
   *
   * @param frame - Current frame being exported
   */
  public updateExportFrame(frame: number): void {
    if (this.context.exportMode) {
      this.context.exportMode.frame = frame;
    }
  }

  /**
   * Start export mode.
   *
   * @param format - Export format
   * @param totalFrames - Total frames to export
   */
  public startExport(format: 'webm' | 'gif' | 'apng', totalFrames: number): void {
    this.context.exportMode = {
      isExporting: true,
      format,
      frame: 0,
      totalFrames,
    };
  }

  /**
   * End export mode.
   */
  public endExport(): void {
    this.context.exportMode = undefined;
  }

  // ==========================================================================
  // Mouse Tracking
  // ==========================================================================

  /**
   * Update mouse position.
   *
   * @param x - Normalized X position (-1 to 1)
   * @param y - Normalized Y position (-1 to 1)
   */
  public setMousePosition(x: number, y: number): void {
    this.context.mouseX = x;
    this.context.mouseY = y;
  }

  /**
   * Update hover state.
   *
   * @param isHovering - Whether mouse is over the canvas
   */
  public setHovering(isHovering: boolean): void {
    this.context.isHovering = isHovering;
  }

  // ==========================================================================
  // Playback Control
  // ==========================================================================

  /**
   * Start playback.
   */
  public play(): void {
    this.context.isPlaying = true;
    if (this.context.timeline) {
      this.context.timeline.state.isPlaying = true;
    }
  }

  /**
   * Pause playback.
   */
  public pause(): void {
    this.context.isPlaying = false;
    if (this.context.timeline) {
      this.context.timeline.state.isPlaying = false;
    }
  }

  /**
   * Seek to a specific time.
   *
   * @param timeMs - Time in milliseconds
   */
  public seek(timeMs: number): void {
    this.accumulatedTimeMs = Math.max(0, Math.min(timeMs, this.context.durationMs));
    this.context.timeMs = this.accumulatedTimeMs;
    this.context.t = this.context.durationMs > 0
      ? this.accumulatedTimeMs / this.context.durationMs
      : 0;

    if (this.context.timeline) {
      this.context.timeline.state.currentTime = this.accumulatedTimeMs;
    }
  }

  /**
   * Reset to the beginning.
   */
  public restart(): void {
    this.seek(0);
  }

  // ==========================================================================
  // Context Access
  // ==========================================================================

  /**
   * Get the current animation context.
   *
   * @returns The current AnimationContextV2
   */
  public getContext(): AnimationContextV2 {
    return this.context;
  }

  /**
   * Get a readonly snapshot of the context.
   *
   * @returns Readonly context snapshot
   */
  public getContextSnapshot(): Readonly<AnimationContextV2> {
    return { ...this.context };
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Reset the context to initial state.
   */
  public reset(): void {
    const { canvasWidth, canvasHeight, durationMs } = this.context;

    // Clear extended state
    this.clearTimeline();
    this.clearAudio();
    this.clearWebGL();
    this.endExport();

    // Reset to default context
    this.context = createAnimationContextV2(durationMs, canvasWidth, canvasHeight);
    this.accumulatedTimeMs = 0;
    this.lastUpdateTime = 0;
  }

  /**
   * Resize the canvas dimensions.
   *
   * @param width - New canvas width
   * @param height - New canvas height
   */
  public resize(width: number, height: number): void {
    this.context.canvasWidth = width;
    this.context.canvasHeight = height;

    // Resize WebGL renderer if present
    if (this.context.webglParticles?.renderer) {
      this.context.webglParticles.renderer.resize(width, height);
    }
  }

  /**
   * Dispose of all resources.
   */
  public dispose(): void {
    this.clearWebGL();
    this.initialized = false;
  }
}
