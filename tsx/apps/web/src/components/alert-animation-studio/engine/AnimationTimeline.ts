/**
 * Enterprise Animation Timeline
 *
 * Professional keyframe-based animation system with:
 * - Multi-track timeline
 * - Bezier curve interpolation
 * - Spring physics
 * - Frame-perfect timing
 */

import { Easing } from './DepthParallaxEngine';

// ============================================================================
// Types
// ============================================================================

export type EasingFunction = (t: number) => number;

export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'elasticOut'
  | 'bounceOut'
  | 'backOut'
  | 'backInOut'
  | 'spring'
  | 'smoothStep'
  | 'smootherStep';

export interface Keyframe {
  time: number; // Time in ms
  value: number;
  easing: EasingType;
}

export interface AnimationTrack {
  property: string;
  keyframes: Keyframe[];
}

export interface TimelineConfig {
  duration: number; // Total duration in ms
  loopCount: number; // 0 = infinite
  tracks: AnimationTrack[];
}

export interface AnimationState {
  [property: string]: number;
}

// ============================================================================
// Easing Functions Map
// ============================================================================

const easingFunctions: Record<EasingType, EasingFunction> = {
  linear: Easing.linear,
  easeIn: (t) => t * t * t,
  easeOut: Easing.easeOutCubic,
  easeInOut: Easing.easeInOutCubic,
  elasticOut: Easing.easeOutElastic,
  bounceOut: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  backOut: Easing.easeOutBack,
  backInOut: (t) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  spring: (t) => {
    const stiffness = 180;
    const damping = 12;
    const mass = 1;
    const omega = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    if (zeta < 1) {
      const omegaD = omega * Math.sqrt(1 - zeta * zeta);
      return (
        1 -
        Math.exp(-zeta * omega * t) *
          (Math.cos(omegaD * t) +
            ((zeta * omega) / omegaD) * Math.sin(omegaD * t))
      );
    }
    return 1 - (1 + omega * t) * Math.exp(-omega * t);
  },
  smoothStep: Easing.smoothStep,
  smootherStep: Easing.smootherStep,
};


// ============================================================================
// Animation Timeline Class
// ============================================================================

export class AnimationTimeline {
  private tracks: Map<string, Keyframe[]> = new Map();
  private duration: number;
  private loopCount: number;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private startTimestamp: number = 0;
  private pausedTime: number = 0;
  private animationFrameId: number | null = null;
  private onUpdate: ((state: AnimationState) => void) | null = null;
  private onComplete: (() => void) | null = null;

  constructor(config: TimelineConfig) {
    this.duration = config.duration;
    this.loopCount = config.loopCount;

    // Initialize tracks
    for (const track of config.tracks) {
      this.tracks.set(track.property, [...track.keyframes].sort((a, b) => a.time - b.time));
    }
  }

  /**
   * Add a keyframe to a track
   */
  addKeyframe(property: string, keyframe: Keyframe): void {
    if (!this.tracks.has(property)) {
      this.tracks.set(property, []);
    }
    const track = this.tracks.get(property)!;
    track.push(keyframe);
    track.sort((a, b) => a.time - b.time);
  }

  /**
   * Evaluate all tracks at a given time
   */
  evaluate(timeMs: number): AnimationState {
    const state: AnimationState = {};

    // Handle looping
    let effectiveTime = timeMs;
    if (this.loopCount === 0) {
      // Infinite loop
      effectiveTime = timeMs % this.duration;
    } else if (this.loopCount > 1) {
      const totalDuration = this.duration * this.loopCount;
      if (timeMs >= totalDuration) {
        effectiveTime = this.duration;
      } else {
        effectiveTime = timeMs % this.duration;
      }
    } else {
      effectiveTime = Math.min(timeMs, this.duration);
    }

    // Evaluate each track
    for (const [property, keyframes] of this.tracks) {
      state[property] = this.evaluateTrack(keyframes, effectiveTime);
    }

    return state;
  }

  /**
   * Evaluate a single track at a given time
   */
  private evaluateTrack(keyframes: Keyframe[], timeMs: number): number {
    if (keyframes.length === 0) return 0;
    if (keyframes.length === 1) return keyframes[0].value;

    // Before first keyframe
    if (timeMs <= keyframes[0].time) {
      return keyframes[0].value;
    }

    // After last keyframe
    if (timeMs >= keyframes[keyframes.length - 1].time) {
      return keyframes[keyframes.length - 1].value;
    }

    // Find surrounding keyframes
    for (let i = 0; i < keyframes.length - 1; i++) {
      const k1 = keyframes[i];
      const k2 = keyframes[i + 1];

      if (k1.time <= timeMs && timeMs < k2.time) {
        // Calculate local progress
        const duration = k2.time - k1.time;
        const localT = (timeMs - k1.time) / duration;

        // Apply easing
        const easingFn = easingFunctions[k2.easing] || easingFunctions.easeOut;
        const easedT = easingFn(localT);

        // Interpolate
        return k1.value + (k2.value - k1.value) * easedT;
      }
    }

    return keyframes[keyframes.length - 1].value;
  }

  /**
   * Start playback
   */
  play(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.startTimestamp = performance.now() - this.pausedTime;

    const animate = (timestamp: number) => {
      if (!this.isPlaying) return;

      this.currentTime = timestamp - this.startTimestamp;

      // Check for completion
      const totalDuration =
        this.loopCount === 0 ? Infinity : this.duration * this.loopCount;

      if (this.currentTime >= totalDuration) {
        this.currentTime = totalDuration;
        this.isPlaying = false;
        this.onComplete?.();
      }

      // Evaluate and callback
      const state = this.evaluate(this.currentTime);
      this.onUpdate?.(state);

      if (this.isPlaying) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.isPlaying = false;
    this.pausedTime = this.currentTime;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Stop and reset
   */
  stop(): void {
    this.pause();
    this.currentTime = 0;
    this.pausedTime = 0;
  }

  /**
   * Seek to a specific time
   */
  seek(timeMs: number): void {
    this.currentTime = Math.max(0, Math.min(timeMs, this.duration));
    this.pausedTime = this.currentTime;

    if (!this.isPlaying) {
      const state = this.evaluate(this.currentTime);
      this.onUpdate?.(state);
    }
  }

  /**
   * Get current progress (0-1)
   */
  getProgress(): number {
    return this.currentTime / this.duration;
  }

  /**
   * Get current time in ms
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * Check if playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Set update callback
   */
  setOnUpdate(callback: (state: AnimationState) => void): void {
    this.onUpdate = callback;
  }

  /**
   * Set completion callback
   */
  setOnComplete(callback: () => void): void {
    this.onComplete = callback;
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.stop();
    this.onUpdate = null;
    this.onComplete = null;
  }
}

// ============================================================================
// Timeline Factory
// ============================================================================

export interface EntryAnimationConfig {
  type: 'pop_in' | 'slide_in' | 'fade_in' | 'burst' | 'bounce' | 'glitch';
  durationMs: number;
  scaleFrom?: number;
  opacityFrom?: number;
  rotationFrom?: number;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  distancePercent?: number;
  bounce?: number;
}

export interface LoopAnimationConfig {
  type: 'float' | 'pulse' | 'glow' | 'wiggle' | 'rgb_glow';
  frequency: number;
  amplitudeY?: number;
  amplitudeX?: number;
  scaleMin?: number;
  scaleMax?: number;
  intensityMin?: number;
  intensityMax?: number;
  angleMax?: number;
}

export function createTimelineFromConfig(
  entry: EntryAnimationConfig | null,
  loop: LoopAnimationConfig | null,
  durationMs: number,
  loopCount: number = 1
): AnimationTimeline {
  const tracks: AnimationTrack[] = [];

  // Entry animation tracks
  if (entry) {
    const entryTracks = createEntryTracks(entry);
    tracks.push(...entryTracks);
  }

  // Loop animation tracks
  if (loop) {
    const entryDuration = entry?.durationMs || 0;
    const loopTracks = createLoopTracks(loop, entryDuration, durationMs);
    tracks.push(...loopTracks);
  }

  return new AnimationTimeline({
    duration: durationMs,
    loopCount,
    tracks,
  });
}

function createEntryTracks(config: EntryAnimationConfig): AnimationTrack[] {
  const tracks: AnimationTrack[] = [];
  const duration = config.durationMs;

  // Map entry type to easing
  const easingMap: Record<string, EasingType> = {
    pop_in: 'elasticOut',
    slide_in: 'easeOut',
    fade_in: 'easeInOut',
    burst: 'backOut',
    bounce: 'bounceOut',
    glitch: 'linear',
  };
  const easing = easingMap[config.type] || 'easeOut';

  switch (config.type) {
    case 'pop_in':
      tracks.push({
        property: 'scale',
        keyframes: [
          { time: 0, value: config.scaleFrom ?? 0, easing: 'linear' },
          { time: duration, value: 1, easing },
        ],
      });
      break;

    case 'slide_in': {
      const distance = (config.distancePercent ?? 120) / 100;
      const prop = config.direction === 'left' || config.direction === 'right' ? 'translateX' : 'translateY';
      const start = config.direction === 'left' || config.direction === 'top' ? -distance : distance;

      tracks.push({
        property: prop,
        keyframes: [
          { time: 0, value: start, easing: 'linear' },
          { time: duration, value: 0, easing },
        ],
      });
      break;
    }

    case 'fade_in':
      tracks.push({
        property: 'opacity',
        keyframes: [
          { time: 0, value: config.opacityFrom ?? 0, easing: 'linear' },
          { time: duration, value: 1, easing },
        ],
      });
      if (config.scaleFrom) {
        tracks.push({
          property: 'scale',
          keyframes: [
            { time: 0, value: config.scaleFrom, easing: 'linear' },
            { time: duration, value: 1, easing },
          ],
        });
      }
      break;

    case 'burst':
      tracks.push({
        property: 'scale',
        keyframes: [
          { time: 0, value: config.scaleFrom ?? 2.5, easing: 'linear' },
          { time: duration, value: 1, easing },
        ],
      });
      tracks.push({
        property: 'opacity',
        keyframes: [
          { time: 0, value: 0, easing: 'linear' },
          { time: duration * 0.3, value: 1, easing: 'easeIn' },
        ],
      });
      if (config.rotationFrom) {
        tracks.push({
          property: 'rotation',
          keyframes: [
            { time: 0, value: config.rotationFrom, easing: 'linear' },
            { time: duration, value: 0, easing },
          ],
        });
      }
      break;
  }

  return tracks;
}

function createLoopTracks(
  config: LoopAnimationConfig,
  startTime: number,
  totalDuration: number
): AnimationTrack[] {
  const tracks: AnimationTrack[] = [];
  const loopDuration = 1000 / config.frequency;
  const remainingTime = totalDuration - startTime;
  const numCycles = Math.max(1, Math.floor(remainingTime / loopDuration));

  switch (config.type) {
    case 'float': {
      const ampY = (config.amplitudeY ?? 8) / 100;
      const ampX = (config.amplitudeX ?? 2) / 100;

      const yKeyframes: Keyframe[] = [];
      const xKeyframes: Keyframe[] = [];

      for (let i = 0; i <= numCycles; i++) {
        const t = startTime + i * loopDuration;
        const phase = i % 2 === 0 ? 1 : -1;

        yKeyframes.push({ time: t, value: ampY * phase, easing: 'smoothStep' });
        xKeyframes.push({ time: t, value: ampX * phase * 0.5, easing: 'smoothStep' });
      }

      tracks.push({ property: 'floatY', keyframes: yKeyframes });
      tracks.push({ property: 'floatX', keyframes: xKeyframes });
      break;
    }

    case 'pulse': {
      const scaleMin = config.scaleMin ?? 0.97;
      const scaleMax = config.scaleMax ?? 1.03;

      const keyframes: Keyframe[] = [];
      for (let i = 0; i <= numCycles; i++) {
        const t = startTime + i * loopDuration;
        const value = i % 2 === 0 ? scaleMax : scaleMin;
        keyframes.push({ time: t, value, easing: 'smoothStep' });
      }

      tracks.push({ property: 'pulseScale', keyframes });
      break;
    }

    case 'wiggle': {
      const angleMax = config.angleMax ?? 3;

      const keyframes: Keyframe[] = [];
      for (let i = 0; i <= numCycles * 2; i++) {
        const t = startTime + i * (loopDuration / 2);
        const phase = i % 2 === 0 ? 1 : -1;
        keyframes.push({ time: t, value: angleMax * phase, easing: 'smoothStep' });
      }

      tracks.push({ property: 'wiggleRotation', keyframes });
      break;
    }

    case 'glow': {
      const intensityMin = config.intensityMin ?? 0.2;
      const intensityMax = config.intensityMax ?? 0.8;

      const keyframes: Keyframe[] = [];
      for (let i = 0; i <= numCycles; i++) {
        const t = startTime + i * loopDuration;
        const value = i % 2 === 0 ? intensityMax : intensityMin;
        keyframes.push({ time: t, value, easing: 'smoothStep' });
      }

      tracks.push({ property: 'glowIntensity', keyframes });
      break;
    }
  }

  return tracks;
}
