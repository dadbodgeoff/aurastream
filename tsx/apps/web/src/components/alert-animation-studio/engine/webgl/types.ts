/**
 * WebGL Particle System Types
 *
 * Type definitions for the GPU-accelerated particle rendering system.
 * Designed for 10,000+ particles at 60fps using WebGL2 instanced rendering.
 */

// ============================================================================
// Particle GPU Data
// ============================================================================

/**
 * Single particle instance data for GPU buffer.
 * Packed for efficient memory layout (56 bytes per particle).
 *
 * Layout:
 * - Position: 12 bytes (3 floats)
 * - Velocity: 12 bytes (3 floats)
 * - Color: 16 bytes (4 floats)
 * - Properties: 16 bytes (4 floats: size, rotation, lifetime, seed)
 */
export interface ParticleGPUData {
  // Position (12 bytes)
  x: number;
  y: number;
  z: number;

  // Velocity (12 bytes)
  vx: number;
  vy: number;
  vz: number;

  // Color (16 bytes)
  r: number;
  g: number;
  b: number;
  a: number;

  // Properties (16 bytes)
  size: number;
  rotation: number;
  lifetime: number; // 0-1 progress through life
  seed: number; // For per-particle variation
}

// ============================================================================
// Renderer Configuration
// ============================================================================

/**
 * WebGL renderer configuration.
 */
export interface WebGLParticleConfig {
  /** Maximum number of particles (buffer size). Default: 10000 */
  maxParticles: number;
  /** Blend mode for particle rendering */
  blendMode: BlendMode;
  /** Optional texture atlas URL for particle shapes */
  textureAtlas: string | null;
  /** Use GL_POINTS (true) or instanced quads (false) */
  usePointSprites: boolean;
  /** Sort particles by depth for proper transparency */
  sortByDepth: boolean;
  /** Enable GPU-based physics computation (WebGL2 only) */
  gpuPhysics: boolean;
}

/**
 * Default configuration values.
 */
export const DEFAULT_WEBGL_CONFIG: WebGLParticleConfig = {
  maxParticles: 10000,
  blendMode: 'additive',
  textureAtlas: null,
  usePointSprites: true,
  sortByDepth: false,
  gpuPhysics: false,
};

/**
 * Blend modes for particle rendering.
 */
export type BlendMode = 'normal' | 'additive' | 'multiply' | 'screen';

// ============================================================================
// Shader Uniforms
// ============================================================================

/**
 * Uniform values passed to shaders each frame.
 */
export interface ParticleUniforms {
  /** Current time in seconds */
  uTime: number;
  /** Delta time since last frame in seconds */
  uDeltaTime: number;
  /** Canvas resolution [width, height] */
  uResolution: [number, number];
  /** Gravity strength (positive = downward) */
  uGravity: number;
  /** Wind direction and strength [x, y] */
  uWind: [number, number];
  /** Turbulence intensity (0-1) */
  uTurbulence: number;
  /** Global opacity multiplier (0-1) */
  uGlobalOpacity: number;
}

/**
 * Default uniform values.
 */
export const DEFAULT_UNIFORMS: ParticleUniforms = {
  uTime: 0,
  uDeltaTime: 0.016,
  uResolution: [512, 512],
  uGravity: 0,
  uWind: [0, 0],
  uTurbulence: 0,
  uGlobalOpacity: 1,
};

// ============================================================================
// Texture Atlas
// ============================================================================

/**
 * Texture atlas for particle shapes.
 */
export interface ParticleTextureAtlas {
  /** WebGL texture object */
  texture: WebGLTexture;
  /** Map of shape names to UV regions */
  regions: Map<ParticleShape, TextureRegion>;
  /** Atlas width in pixels */
  width: number;
  /** Atlas height in pixels */
  height: number;
}

/**
 * UV region within a texture atlas.
 */
export interface TextureRegion {
  /** U coordinate (0-1) */
  u: number;
  /** V coordinate (0-1) */
  v: number;
  /** Width in UV space (0-1) */
  width: number;
  /** Height in UV space (0-1) */
  height: number;
}

// ============================================================================
// Particle Shapes
// ============================================================================

/**
 * Available particle shapes.
 * These can be rendered procedurally via SDF or from texture atlas.
 */
export type ParticleShape =
  | 'circle'
  | 'square'
  | 'star'
  | 'heart'
  | 'sparkle'
  | 'smoke'
  | 'fire'
  | 'snow'
  | 'confetti';

/**
 * Shape type indices for shader uniform.
 * Must match the switch statement in particle.frag.
 */
export const SHAPE_TYPE_INDEX: Record<ParticleShape, number> = {
  circle: 0,
  square: 1,
  star: 2,
  heart: 3,
  sparkle: 4,
  smoke: 5,
  fire: 6,
  snow: 7,
  confetti: 8,
};

// ============================================================================
// Attribute Layout
// ============================================================================

/**
 * Vertex attribute layout for instanced rendering.
 */
export interface AttributeLayout {
  /** Attribute name in shader */
  name: string;
  /** Number of components (1-4) */
  size: number;
  /** Data type (FLOAT, INT, etc.) */
  type: number;
  /** Whether to normalize integer values */
  normalized: boolean;
  /** Byte offset within vertex */
  offset: number;
  /** Divisor for instanced rendering (0 = per-vertex, 1 = per-instance) */
  divisor: number;
}

/**
 * Standard attribute layout for particle instances.
 * Total stride: 56 bytes (14 floats × 4 bytes)
 */
export const PARTICLE_ATTRIBUTE_LAYOUT: AttributeLayout[] = [
  { name: 'aPosition', size: 3, type: 0x1406, normalized: false, offset: 0, divisor: 1 },
  { name: 'aVelocity', size: 3, type: 0x1406, normalized: false, offset: 12, divisor: 1 },
  { name: 'aColor', size: 4, type: 0x1406, normalized: false, offset: 24, divisor: 1 },
  { name: 'aSize', size: 1, type: 0x1406, normalized: false, offset: 40, divisor: 1 },
  { name: 'aRotation', size: 1, type: 0x1406, normalized: false, offset: 44, divisor: 1 },
  { name: 'aLifetime', size: 1, type: 0x1406, normalized: false, offset: 48, divisor: 1 },
  { name: 'aSeed', size: 1, type: 0x1406, normalized: false, offset: 52, divisor: 1 },
];

// ============================================================================
// Renderer Interface
// ============================================================================

/**
 * Common interface for particle renderers.
 * Allows swapping between WebGL and CSS fallback implementations.
 */
export interface ParticleRendererInterface {
  /** Update particle data from CPU particle system */
  update(particles: ParticleData[]): void;
  /** Render particles with given uniforms */
  render(uniforms: ParticleUniforms, shapeType?: number): void;
  /** Resize renderer to match canvas dimensions */
  resize(width: number, height: number): void;
  /** Clean up WebGL resources */
  dispose(): void;
  /** Whether the renderer is ready */
  readonly isReady: boolean;
  /** Current particle count */
  readonly particleCount: number;
}

/**
 * Minimal particle data interface for renderer compatibility.
 * Matches the existing Particle interface from particles/types.ts.
 */
export interface ParticleData {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  lifetime: number;
  maxLifetime: number;
  type: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * WebGL-specific error for better debugging.
 */
export class WebGLParticleError extends Error {
  constructor(
    message: string,
    public readonly code: WebGLErrorCode,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'WebGLParticleError';
  }
}

/**
 * Error codes for WebGL particle system.
 */
export type WebGLErrorCode =
  | 'WEBGL2_NOT_SUPPORTED'
  | 'SHADER_COMPILE_ERROR'
  | 'PROGRAM_LINK_ERROR'
  | 'BUFFER_CREATE_ERROR'
  | 'TEXTURE_CREATE_ERROR'
  | 'CONTEXT_LOST';
