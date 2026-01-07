/**
 * WebGL Particle System
 *
 * GPU-accelerated particle rendering for the Animation Studio.
 * Supports 10,000+ particles at 60fps using WebGL2 instanced rendering.
 *
 * @module webgl
 */

// ============================================================================
// Main Exports
// ============================================================================

export { WebGLParticleRenderer } from './ParticleRenderer';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  ParticleGPUData,
  WebGLParticleConfig,
  BlendMode,
  ParticleUniforms,
  ParticleTextureAtlas,
  TextureRegion,
  ParticleShape,
  AttributeLayout,
  ParticleRendererInterface,
  ParticleData,
  WebGLErrorCode,
} from './types';

export {
  DEFAULT_WEBGL_CONFIG,
  DEFAULT_UNIFORMS,
  SHAPE_TYPE_INDEX,
  PARTICLE_ATTRIBUTE_LAYOUT,
  WebGLParticleError,
} from './types';

// ============================================================================
// Shader Exports
// ============================================================================

export {
  compileShader,
  createProgram,
  createParticleProgram,
  getUniformLocations,
  getAttributeLocations,
  PARTICLE_VERTEX_SHADER,
  PARTICLE_FRAGMENT_SHADER,
} from './shaders';

// ============================================================================
// Buffer Exports
// ============================================================================

export {
  createInstanceBuffer,
  updateInstanceBuffer,
  createParticleVAO,
  setupVertexAttributes,
  createParticleDataArray,
  packParticle,
  deleteBuffer,
  deleteVAO,
  FLOATS_PER_PARTICLE,
  BYTES_PER_PARTICLE,
} from './buffers';

// ============================================================================
// Texture Exports
// ============================================================================

export {
  createDefaultTexture,
  createParticleTextureAtlas,
  getTextureRegion,
  getShapeTypeIndex,
  deleteTexture,
  loadTexture,
} from './textures';


// ============================================================================
// Factory Functions
// ============================================================================

import { WebGLParticleRenderer } from './ParticleRenderer';
import type { ParticleRendererInterface, WebGLParticleConfig, ParticleUniforms, ParticleData } from './types';
import { DEFAULT_UNIFORMS } from './types';

/**
 * Check if WebGL2 is supported in the current browser.
 *
 * @returns true if WebGL2 is supported
 */
export function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return gl !== null;
  } catch {
    return false;
  }
}

/**
 * CSS fallback renderer for browsers without WebGL2 support.
 * This is a minimal implementation that matches the ParticleRendererInterface.
 */
class CSSParticleRenderer implements ParticleRendererInterface {
  private _isReady = true;
  private _particleCount = 0;

  constructor(_canvas: HTMLCanvasElement) {
    // Canvas not used in CSS fallback - existing CSS particle system handles rendering
  }

  update(particles: ParticleData[]): void {
    this._particleCount = particles.length;
  }

  render(_uniforms: ParticleUniforms = DEFAULT_UNIFORMS, _shapeType: number = 0): void {
    // CSS fallback doesn't render - the existing CSS particle system handles this
    // This is just a placeholder to satisfy the interface
  }

  resize(_width: number, _height: number): void {
    // No-op for CSS renderer
  }

  dispose(): void {
    this._isReady = false;
    this._particleCount = 0;
  }

  get isReady(): boolean {
    return this._isReady;
  }

  get particleCount(): number {
    return this._particleCount;
  }
}

/**
 * Factory function to create the appropriate particle renderer.
 *
 * Attempts to create a WebGL renderer first, falling back to CSS if:
 * - WebGL2 is not supported
 * - WebGL renderer creation fails
 * - preferWebGL is false
 *
 * @param canvas - HTML canvas element to render to
 * @param preferWebGL - Whether to prefer WebGL over CSS (default: true)
 * @param config - Optional WebGL configuration
 * @returns Particle renderer instance
 */
export function createParticleRenderer(
  canvas: HTMLCanvasElement,
  preferWebGL: boolean = true,
  config?: Partial<WebGLParticleConfig>
): ParticleRendererInterface {
  if (preferWebGL && isWebGL2Supported()) {
    try {
      return new WebGLParticleRenderer(canvas, config);
    } catch (error) {
      console.warn('WebGL particle renderer failed, falling back to CSS:', error);
    }
  }

  // Fall back to CSS renderer
  return new CSSParticleRenderer(canvas);
}

/**
 * Get renderer capabilities information.
 *
 * @returns Object with capability flags
 */
export function getRendererCapabilities(): {
  webgl2: boolean;
  maxTextureSize: number;
  maxVertexAttribs: number;
  maxInstancedArrays: number;
} {
  const result = {
    webgl2: false,
    maxTextureSize: 0,
    maxVertexAttribs: 0,
    maxInstancedArrays: 0,
  };

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');

    if (gl) {
      result.webgl2 = true;
      result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      result.maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
      // WebGL2 doesn't have a specific limit for instanced arrays
      result.maxInstancedArrays = 1000000; // Practical limit
    }
  } catch {
    // WebGL2 not available
  }

  return result;
}

/**
 * Map particle effect type to shape type index.
 *
 * @param effectType - Particle effect type from the existing system
 * @returns Shape type index for the shader
 */
export function effectTypeToShapeIndex(effectType: string): number {
  const mapping: Record<string, number> = {
    sparkles: 4,   // sparkle
    confetti: 8,   // confetti
    hearts: 3,     // heart
    fire: 6,       // fire
    snow: 7,       // snow
    bubbles: 0,    // circle
    stars: 2,      // star
    pixels: 1,     // square
  };

  return mapping[effectType] ?? 0;
}
