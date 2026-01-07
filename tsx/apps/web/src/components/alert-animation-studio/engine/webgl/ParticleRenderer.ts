/**
 * WebGL Particle Renderer
 *
 * High-performance GPU-accelerated particle renderer using WebGL2 instanced rendering.
 * Capable of rendering 10,000+ particles at 60fps.
 */

import type {
  WebGLParticleConfig,
  ParticleUniforms,
  ParticleRendererInterface,
  ParticleData,
  BlendMode,
} from './types';
import { DEFAULT_WEBGL_CONFIG, DEFAULT_UNIFORMS, WebGLParticleError } from './types';
import { createParticleProgram, getUniformLocations } from './shaders';
import {
  createInstanceBuffer,
  createParticleVAO,
  createParticleDataArray,
  FLOATS_PER_PARTICLE,
  deleteBuffer,
  deleteVAO,
} from './buffers';
import { createDefaultTexture, deleteTexture } from './textures';

// ============================================================================
// WebGL Particle Renderer Class
// ============================================================================

/**
 * High-performance WebGL particle renderer using instanced rendering.
 *
 * Features:
 * - WebGL2 instanced rendering for 10,000+ particles
 * - Procedural SDF shapes (circle, star, heart, etc.)
 * - Multiple blend modes (additive, normal, multiply, screen)
 * - GPU-based physics (gravity, wind, turbulence)
 * - Automatic lifetime fade and size scaling
 */
export class WebGLParticleRenderer implements ParticleRendererInterface {
  // WebGL resources
  private gl: WebGL2RenderingContext;
  private program!: WebGLProgram;
  private vao!: WebGLVertexArrayObject;
  private instanceBuffer!: WebGLBuffer;
  private defaultTexture!: WebGLTexture;
  private uniformLocations!: Map<string, WebGLUniformLocation>;

  // Configuration
  private config: WebGLParticleConfig;

  // Particle data
  private particleData!: Float32Array;
  private _particleCount: number = 0;
  private _isReady: boolean = false;


  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new WebGL particle renderer.
   *
   * @param canvas - HTML canvas element to render to
   * @param config - Optional configuration overrides
   * @throws WebGLParticleError if WebGL2 is not supported
   */
  constructor(
    canvas: HTMLCanvasElement,
    config: Partial<WebGLParticleConfig> = {}
  ) {
    this.config = { ...DEFAULT_WEBGL_CONFIG, ...config };

    // Get WebGL2 context
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      throw new WebGLParticleError(
        'WebGL2 is not supported in this browser. Please use a modern browser.',
        'WEBGL2_NOT_SUPPORTED'
      );
    }

    this.gl = gl;

    // Initialize WebGL resources
    this.initShaders();
    this.initBuffers();
    this.initTextures();
    this.initBlending();

    // Set initial viewport
    this.resize(canvas.width, canvas.height);

    this._isReady = true;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize shader program and cache uniform locations.
   */
  private initShaders(): void {
    this.program = createParticleProgram(this.gl);
    this.uniformLocations = getUniformLocations(this.gl, this.program);
  }

  /**
   * Initialize vertex buffers and VAO.
   */
  private initBuffers(): void {
    // Create instance buffer for particle data
    this.instanceBuffer = createInstanceBuffer(this.gl, this.config.maxParticles);

    // Create VAO with attribute bindings
    this.vao = createParticleVAO(this.gl, this.program, this.instanceBuffer);

    // Pre-allocate CPU-side array
    this.particleData = createParticleDataArray(this.config.maxParticles);
  }

  /**
   * Initialize textures.
   */
  private initTextures(): void {
    this.defaultTexture = createDefaultTexture(this.gl);
  }

  /**
   * Initialize blending mode.
   */
  private initBlending(): void {
    const gl = this.gl;

    gl.enable(gl.BLEND);
    this.setBlendMode(this.config.blendMode);

    // Enable point sprites
    // Note: In WebGL2, gl_PointCoord is always available in fragment shaders
  }

  /**
   * Set the blend mode for particle rendering.
   */
  private setBlendMode(mode: BlendMode): void {
    const gl = this.gl;

    switch (mode) {
      case 'additive':
        // Additive blending: bright particles add together
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        break;
      case 'multiply':
        // Multiply blending: darkens underlying colors
        gl.blendFunc(gl.DST_COLOR, gl.ZERO);
        break;
      case 'screen':
        // Screen blending: lightens underlying colors
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
        break;
      case 'normal':
      default:
        // Normal alpha blending
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        break;
    }
  }


  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Update particle data from CPU particle system.
   * This bridges the existing particle system with WebGL rendering.
   *
   * @param particles - Array of particles from the CPU particle system
   */
  update(particles: ParticleData[]): void {
    const count = Math.min(particles.length, this.config.maxParticles);
    this._particleCount = count;

    if (count === 0) return;

    // Pack particle data into Float32Array
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const offset = i * FLOATS_PER_PARTICLE;

      // Position (3 floats)
      this.particleData[offset + 0] = p.x;
      this.particleData[offset + 1] = p.y;
      this.particleData[offset + 2] = 0; // z (2D particles)

      // Velocity (3 floats)
      this.particleData[offset + 3] = p.vx;
      this.particleData[offset + 4] = p.vy;
      this.particleData[offset + 5] = 0; // vz

      // Color (4 floats) - parse from CSS color string
      const color = this.parseColor(p.color);
      this.particleData[offset + 6] = color.r;
      this.particleData[offset + 7] = color.g;
      this.particleData[offset + 8] = color.b;
      this.particleData[offset + 9] = p.opacity;

      // Properties (4 floats)
      this.particleData[offset + 10] = p.size;
      this.particleData[offset + 11] = p.rotation;
      this.particleData[offset + 12] = p.lifetime / p.maxLifetime; // Normalized lifetime
      this.particleData[offset + 13] = (p.id % 1000) / 1000; // Seed from ID
    }

    // Upload to GPU
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      this.particleData.subarray(0, count * FLOATS_PER_PARTICLE)
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Render particles with the given uniforms.
   *
   * @param uniforms - Uniform values for the shader
   * @param shapeType - Shape type index (0=circle, 1=square, etc.)
   */
  render(uniforms: ParticleUniforms = DEFAULT_UNIFORMS, shapeType: number = 0): void {
    if (this._particleCount === 0) return;

    const gl = this.gl;

    // Use shader program
    gl.useProgram(this.program);

    // Bind VAO
    gl.bindVertexArray(this.vao);

    // Set uniforms
    this.setUniforms(uniforms, shapeType);

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.defaultTexture);

    // Draw instanced points
    gl.drawArraysInstanced(gl.POINTS, 0, 1, this._particleCount);

    // Cleanup
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * Set shader uniforms.
   */
  private setUniforms(uniforms: ParticleUniforms, shapeType: number): void {
    const gl = this.gl;
    const loc = this.uniformLocations;

    const uTime = loc.get('uTime');
    if (uTime) gl.uniform1f(uTime, uniforms.uTime);

    const uDeltaTime = loc.get('uDeltaTime');
    if (uDeltaTime) gl.uniform1f(uDeltaTime, uniforms.uDeltaTime);

    const uResolution = loc.get('uResolution');
    if (uResolution) gl.uniform2fv(uResolution, uniforms.uResolution);

    const uGravity = loc.get('uGravity');
    if (uGravity) gl.uniform1f(uGravity, uniforms.uGravity);

    const uWind = loc.get('uWind');
    if (uWind) gl.uniform2fv(uWind, uniforms.uWind);

    const uTurbulence = loc.get('uTurbulence');
    if (uTurbulence) gl.uniform1f(uTurbulence, uniforms.uTurbulence);

    const uGlobalOpacity = loc.get('uGlobalOpacity');
    if (uGlobalOpacity) gl.uniform1f(uGlobalOpacity, uniforms.uGlobalOpacity);

    const uTexture = loc.get('uTexture');
    if (uTexture) gl.uniform1i(uTexture, 0);

    const uShapeType = loc.get('uShapeType');
    if (uShapeType) gl.uniform1i(uShapeType, shapeType);
  }


  // ============================================================================
  // Color Parsing
  // ============================================================================

  /**
   * Parse a CSS color string to RGB values (0-1 range).
   *
   * Supports:
   * - Hex: #RGB, #RRGGBB, #RRGGBBAA
   * - RGB: rgb(r, g, b), rgba(r, g, b, a)
   * - Named colors (limited support)
   *
   * @param color - CSS color string
   * @returns RGB values in 0-1 range
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    // Hex color
    if (color.startsWith('#')) {
      return this.parseHexColor(color);
    }

    // RGB/RGBA color
    if (color.startsWith('rgb')) {
      return this.parseRgbColor(color);
    }

    // Named colors (basic support)
    const namedColors: Record<string, string> = {
      white: '#ffffff',
      black: '#000000',
      red: '#ff0000',
      green: '#00ff00',
      blue: '#0000ff',
      yellow: '#ffff00',
      cyan: '#00ffff',
      magenta: '#ff00ff',
      orange: '#ffa500',
      pink: '#ffc0cb',
      gold: '#ffd700',
    };

    const namedHex = namedColors[color.toLowerCase()];
    if (namedHex) {
      return this.parseHexColor(namedHex);
    }

    // Default to white
    return { r: 1, g: 1, b: 1 };
  }

  /**
   * Parse a hex color string.
   */
  private parseHexColor(hex: string): { r: number; g: number; b: number } {
    let h = hex.slice(1);

    // Expand shorthand (#RGB -> #RRGGBB)
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }

    // Handle 8-character hex (with alpha)
    if (h.length === 8) {
      h = h.slice(0, 6);
    }

    const num = parseInt(h, 16);

    return {
      r: ((num >> 16) & 255) / 255,
      g: ((num >> 8) & 255) / 255,
      b: (num & 255) / 255,
    };
  }

  /**
   * Parse an rgb/rgba color string.
   */
  private parseRgbColor(rgb: string): { r: number; g: number; b: number } {
    const match = rgb.match(/(\d+)/g);

    if (match && match.length >= 3) {
      return {
        r: parseInt(match[0], 10) / 255,
        g: parseInt(match[1], 10) / 255,
        b: parseInt(match[2], 10) / 255,
      };
    }

    return { r: 1, g: 1, b: 1 };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Resize the renderer to match canvas dimensions.
   *
   * @param width - New width in pixels
   * @param height - New height in pixels
   */
  resize(width: number, height: number): void {
    this.gl.viewport(0, 0, width, height);
  }

  /**
   * Clean up all WebGL resources.
   * Call this when the renderer is no longer needed.
   */
  dispose(): void {
    const gl = this.gl;

    deleteBuffer(gl, this.instanceBuffer);
    deleteVAO(gl, this.vao);
    deleteTexture(gl, this.defaultTexture);
    gl.deleteProgram(this.program);

    this._isReady = false;
    this._particleCount = 0;
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Whether the renderer is ready to render.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * Current number of particles being rendered.
   */
  get particleCount(): number {
    return this._particleCount;
  }

  /**
   * Maximum number of particles supported.
   */
  get maxParticles(): number {
    return this.config.maxParticles;
  }

  /**
   * Current blend mode.
   */
  get blendMode(): BlendMode {
    return this.config.blendMode;
  }

  /**
   * Set blend mode.
   */
  set blendMode(mode: BlendMode) {
    this.config.blendMode = mode;
    this.setBlendMode(mode);
  }
}
