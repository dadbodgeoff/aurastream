/**
 * Animation Engine Core Types
 *
 * Foundation interfaces for the enterprise animation system.
 * All types are designed for type-safety and extensibility.
 */

import type * as THREE from 'three';

// ============================================================================
// Transform State
// ============================================================================

/**
 * Complete transform state for an animated element.
 * All values are in normalized units unless otherwise specified.
 */
export interface AnimationTransform {
  /** Scale on X axis (1 = 100%) */
  scaleX: number;
  /** Scale on Y axis (1 = 100%) */
  scaleY: number;
  /** Scale on Z axis (1 = 100%) */
  scaleZ: number;
  /** Rotation around X axis (radians) */
  rotationX: number;
  /** Rotation around Y axis (radians) */
  rotationY: number;
  /** Rotation around Z axis (radians) */
  rotationZ: number;
  /** Position offset X (normalized, -1 to 1 = full canvas width) */
  positionX: number;
  /** Position offset Y (normalized, -1 to 1 = full canvas height) */
  positionY: number;
  /** Position offset Z (normalized depth) */
  positionZ: number;
  /** Opacity (0 = invisible, 1 = fully visible) */
  opacity: number;
}

/**
 * Default transform state - identity transform.
 */
export const DEFAULT_TRANSFORM: Readonly<AnimationTransform> = Object.freeze({
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  opacity: 1,
});

/**
 * Create a fresh copy of the default transform.
 */
export function createDefaultTransform(): AnimationTransform {
  return { ...DEFAULT_TRANSFORM };
}

// ============================================================================
// Animation Context
// ============================================================================

/**
 * Runtime context passed to all animation functions.
 * Contains timing info, references, and state.
 */
export interface AnimationContext {
  /** Normalized time 0-1 within the animation's total duration */
  t: number;
  /** Raw time in milliseconds since animation start */
  timeMs: number;
  /** Total animation duration in milliseconds */
  durationMs: number;
  /** Delta time since last frame (seconds) */
  deltaTime: number;
  /** Whether animation is currently playing */
  isPlaying: boolean;
  /** Three.js mesh reference (may be null during init) */
  mesh: THREE.Mesh | null;
  /** Shader material reference (may be null during init) */
  material: THREE.ShaderMaterial | null;
  /** Canvas dimensions */
  canvasWidth: number;
  canvasHeight: number;
  /** Mouse position normalized (-1 to 1) */
  mouseX: number;
  mouseY: number;
  /** Whether mouse is over the canvas */
  isHovering: boolean;
}

/**
 * Create a default animation context for initialization.
 */
export function createDefaultContext(
  durationMs: number = 3000,
  canvasWidth: number = 512,
  canvasHeight: number = 512
): AnimationContext {
  return {
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
  };
}

// ============================================================================
// Animation Function Signature
// ============================================================================

/**
 * Generic animation function signature.
 * Takes config, context, and current transform, returns new transform.
 */
export type AnimationFunction<TConfig> = (
  config: TConfig,
  context: AnimationContext,
  currentTransform: AnimationTransform
) => AnimationTransform;

/**
 * Animation function with additional state parameter.
 * Used for animations that need to track state between frames.
 */
export type StatefulAnimationFunction<TConfig, TState> = (
  config: TConfig,
  context: AnimationContext,
  currentTransform: AnimationTransform,
  state: TState
) => AnimationTransform;

// ============================================================================
// Easing Types
// ============================================================================

/**
 * Easing function signature.
 * Takes progress (0-1) and returns eased value (0-1, may overshoot).
 */
export type EasingFunction = (t: number) => number;

/**
 * Available easing names for type-safe easing selection.
 */
export type EasingName =
  | 'linear'
  | 'power1.in' | 'power1.out' | 'power1.inOut'
  | 'power2.in' | 'power2.out' | 'power2.inOut'
  | 'power3.in' | 'power3.out' | 'power3.inOut'
  | 'power4.in' | 'power4.out' | 'power4.inOut'
  | 'sine.in' | 'sine.out' | 'sine.inOut'
  | 'expo.in' | 'expo.out' | 'expo.inOut'
  | 'circ.in' | 'circ.out' | 'circ.inOut'
  | 'back.in' | 'back.out' | 'back.inOut'
  | 'elastic.in' | 'elastic.out' | 'elastic.inOut'
  | 'bounce.in' | 'bounce.out' | 'bounce.inOut';

// ============================================================================
// Direction Types
// ============================================================================

/**
 * Slide direction for entry animations.
 */
export type SlideDirection = 'left' | 'right' | 'top' | 'bottom';

/**
 * Trigger type for depth effects.
 */
export type TriggerType = 'mouse' | 'auto' | 'on_enter' | 'always';

/**
 * Spawn area for particles.
 */
export type SpawnArea = 'around' | 'above' | 'below' | 'center' | 'edges';

// ============================================================================
// Animation Type Enums
// ============================================================================

/**
 * Entry animation types.
 */
export type EntryAnimationType =
  | 'pop_in'
  | 'slide_in'
  | 'fade_in'
  | 'burst'
  | 'bounce'
  | 'glitch'
  | 'spin_in'
  | 'drop_in';

/**
 * Loop animation types.
 */
export type LoopAnimationType =
  | 'float'
  | 'pulse'
  | 'wiggle'
  | 'glow'
  | 'rgb_glow'
  | 'breathe'
  | 'shake'
  | 'swing';

/**
 * Depth effect types.
 */
export type DepthEffectType =
  | 'parallax'
  | 'tilt'
  | 'pop_out'
  | 'float_3d';

/**
 * Particle effect types.
 */
export type ParticleEffectType =
  | 'sparkles'
  | 'confetti'
  | 'hearts'
  | 'fire'
  | 'snow'
  | 'bubbles'
  | 'stars'
  | 'pixels';

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Convert degrees to radians.
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees.
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Normalize a value from one range to another.
 */
export function normalize(
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number = 0,
  toMax: number = 1
): number {
  const normalized = (value - fromMin) / (fromMax - fromMin);
  return toMin + normalized * (toMax - toMin);
}
