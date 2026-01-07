/**
 * WebGL Buffer Management
 *
 * Functions for creating and managing vertex buffers for instanced particle rendering.
 */

import { WebGLParticleError, PARTICLE_ATTRIBUTE_LAYOUT } from './types';

// ============================================================================
// Constants
// ============================================================================

/** Number of float values per particle instance */
export const FLOATS_PER_PARTICLE = 14;

/** Bytes per particle instance (14 floats × 4 bytes) */
export const BYTES_PER_PARTICLE = FLOATS_PER_PARTICLE * 4; // 56 bytes

// ============================================================================
// Buffer Creation
// ============================================================================

/**
 * Create an instance buffer for particle data.
 *
 * @param gl - WebGL2 rendering context
 * @param maxParticles - Maximum number of particles to support
 * @returns WebGL buffer object
 * @throws WebGLParticleError if buffer creation fails
 */
export function createInstanceBuffer(
  gl: WebGL2RenderingContext,
  maxParticles: number
): WebGLBuffer {
  const buffer = gl.createBuffer();

  if (!buffer) {
    throw new WebGLParticleError(
      'Failed to create instance buffer',
      'BUFFER_CREATE_ERROR'
    );
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  // Allocate buffer with DYNAMIC_DRAW hint (data will be updated frequently)
  const bufferSize = maxParticles * BYTES_PER_PARTICLE;
  gl.bufferData(gl.ARRAY_BUFFER, bufferSize, gl.DYNAMIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return buffer;
}

/**
 * Update instance buffer with new particle data.
 *
 * @param gl - WebGL2 rendering context
 * @param buffer - Instance buffer to update
 * @param data - Float32Array containing particle data
 * @param particleCount - Number of particles to upload
 */
export function updateInstanceBuffer(
  gl: WebGL2RenderingContext,
  buffer: WebGLBuffer,
  data: Float32Array,
  particleCount: number
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  // Only upload the data we need (not the entire buffer)
  const bytesToUpload = particleCount * BYTES_PER_PARTICLE;

  // Use bufferSubData for partial updates (more efficient than bufferData)
  gl.bufferSubData(
    gl.ARRAY_BUFFER,
    0,
    data.subarray(0, particleCount * FLOATS_PER_PARTICLE)
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

// ============================================================================
// Vertex Array Object (VAO) Setup
// ============================================================================

/**
 * Create and configure a VAO for particle rendering.
 *
 * @param gl - WebGL2 rendering context
 * @param program - Shader program
 * @param instanceBuffer - Instance buffer containing particle data
 * @returns Configured VAO
 * @throws WebGLParticleError if VAO creation fails
 */
export function createParticleVAO(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  instanceBuffer: WebGLBuffer
): WebGLVertexArrayObject {
  const vao = gl.createVertexArray();

  if (!vao) {
    throw new WebGLParticleError(
      'Failed to create vertex array object',
      'BUFFER_CREATE_ERROR'
    );
  }

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);

  // Set up vertex attributes based on layout
  setupVertexAttributes(gl, program);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return vao;
}

/**
 * Set up vertex attribute pointers for particle instances.
 *
 * @param gl - WebGL2 rendering context
 * @param program - Shader program
 */
export function setupVertexAttributes(
  gl: WebGL2RenderingContext,
  program: WebGLProgram
): void {
  const stride = BYTES_PER_PARTICLE;

  for (const attr of PARTICLE_ATTRIBUTE_LAYOUT) {
    const location = gl.getAttribLocation(program, attr.name);

    if (location === -1) {
      console.warn(`Attribute ${attr.name} not found in shader program`);
      continue;
    }

    gl.enableVertexAttribArray(location);

    gl.vertexAttribPointer(
      location,
      attr.size,
      gl.FLOAT, // All attributes are floats
      attr.normalized,
      stride,
      attr.offset
    );

    // Set divisor for instanced rendering (1 = per-instance)
    gl.vertexAttribDivisor(location, attr.divisor);
  }
}

// ============================================================================
// Buffer Utilities
// ============================================================================

/**
 * Pre-allocate a Float32Array for particle data.
 *
 * @param maxParticles - Maximum number of particles
 * @returns Pre-allocated Float32Array
 */
export function createParticleDataArray(maxParticles: number): Float32Array {
  return new Float32Array(maxParticles * FLOATS_PER_PARTICLE);
}

/**
 * Pack a single particle's data into the Float32Array.
 *
 * @param data - Target Float32Array
 * @param index - Particle index
 * @param particle - Particle data to pack
 */
export function packParticle(
  data: Float32Array,
  index: number,
  particle: {
    x: number;
    y: number;
    z?: number;
    vx: number;
    vy: number;
    vz?: number;
    r: number;
    g: number;
    b: number;
    a: number;
    size: number;
    rotation: number;
    lifetime: number;
    seed: number;
  }
): void {
  const offset = index * FLOATS_PER_PARTICLE;

  // Position (3 floats)
  data[offset + 0] = particle.x;
  data[offset + 1] = particle.y;
  data[offset + 2] = particle.z ?? 0;

  // Velocity (3 floats)
  data[offset + 3] = particle.vx;
  data[offset + 4] = particle.vy;
  data[offset + 5] = particle.vz ?? 0;

  // Color (4 floats)
  data[offset + 6] = particle.r;
  data[offset + 7] = particle.g;
  data[offset + 8] = particle.b;
  data[offset + 9] = particle.a;

  // Properties (4 floats)
  data[offset + 10] = particle.size;
  data[offset + 11] = particle.rotation;
  data[offset + 12] = particle.lifetime;
  data[offset + 13] = particle.seed;
}

/**
 * Delete a buffer and clean up resources.
 *
 * @param gl - WebGL2 rendering context
 * @param buffer - Buffer to delete
 */
export function deleteBuffer(
  gl: WebGL2RenderingContext,
  buffer: WebGLBuffer | null
): void {
  if (buffer) {
    gl.deleteBuffer(buffer);
  }
}

/**
 * Delete a VAO and clean up resources.
 *
 * @param gl - WebGL2 rendering context
 * @param vao - VAO to delete
 */
export function deleteVAO(
  gl: WebGL2RenderingContext,
  vao: WebGLVertexArrayObject | null
): void {
  if (vao) {
    gl.deleteVertexArray(vao);
  }
}
