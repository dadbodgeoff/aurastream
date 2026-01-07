/**
 * WebGL Texture Management
 *
 * Functions for creating and managing textures for particle rendering.
 * Includes procedural texture generation for particle shapes.
 */

import type { ParticleTextureAtlas, TextureRegion, ParticleShape } from './types';
import { WebGLParticleError, SHAPE_TYPE_INDEX } from './types';

// ============================================================================
// Constants
// ============================================================================

/** Default texture atlas size */
const ATLAS_SIZE = 512;

/** Size of each shape in the atlas */
const SHAPE_SIZE = 64;

// ============================================================================
// Texture Creation
// ============================================================================

/**
 * Create a 1x1 white texture for use when no texture is needed.
 *
 * @param gl - WebGL2 rendering context
 * @returns WebGL texture object
 */
export function createDefaultTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture();

  if (!texture) {
    throw new WebGLParticleError(
      'Failed to create default texture',
      'TEXTURE_CREATE_ERROR'
    );
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);

  // 1x1 white pixel
  const pixel = new Uint8Array([255, 255, 255, 255]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

  // Set texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}


/**
 * Create a particle texture atlas with procedurally generated shapes.
 *
 * @param gl - WebGL2 rendering context
 * @returns Texture atlas with shape regions
 */
export function createParticleTextureAtlas(
  gl: WebGL2RenderingContext
): ParticleTextureAtlas {
  const texture = gl.createTexture();

  if (!texture) {
    throw new WebGLParticleError(
      'Failed to create texture atlas',
      'TEXTURE_CREATE_ERROR'
    );
  }

  // Create canvas for procedural generation
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new WebGLParticleError(
      'Failed to get 2D context for texture generation',
      'TEXTURE_CREATE_ERROR'
    );
  }

  // Clear canvas
  ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

  // Generate shapes and track regions
  const regions = new Map<ParticleShape, TextureRegion>();
  const shapes: ParticleShape[] = [
    'circle', 'square', 'star', 'heart', 'sparkle',
    'smoke', 'fire', 'snow', 'confetti'
  ];

  const shapesPerRow = Math.floor(ATLAS_SIZE / SHAPE_SIZE);

  shapes.forEach((shape, index) => {
    const col = index % shapesPerRow;
    const row = Math.floor(index / shapesPerRow);
    const x = col * SHAPE_SIZE;
    const y = row * SHAPE_SIZE;

    // Draw shape
    drawShape(ctx, shape, x, y, SHAPE_SIZE);

    // Store region
    regions.set(shape, {
      u: x / ATLAS_SIZE,
      v: y / ATLAS_SIZE,
      width: SHAPE_SIZE / ATLAS_SIZE,
      height: SHAPE_SIZE / ATLAS_SIZE,
    });
  });

  // Upload to WebGL
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

  // Generate mipmaps for better quality at small sizes
  gl.generateMipmap(gl.TEXTURE_2D);

  // Set texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindTexture(gl.TEXTURE_2D, null);

  return {
    texture,
    regions,
    width: ATLAS_SIZE,
    height: ATLAS_SIZE,
  };
}

/**
 * Draw a shape onto the canvas at the specified position.
 */
function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ParticleShape,
  x: number,
  y: number,
  size: number
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.4;

  ctx.save();
  ctx.fillStyle = 'white';

  switch (shape) {
    case 'circle':
      drawCircle(ctx, cx, cy, r);
      break;
    case 'square':
      drawSquare(ctx, cx, cy, r);
      break;
    case 'star':
      drawStar(ctx, cx, cy, r, 5);
      break;
    case 'heart':
      drawHeart(ctx, cx, cy, r);
      break;
    case 'sparkle':
      drawSparkle(ctx, cx, cy, r);
      break;
    case 'smoke':
      drawSmoke(ctx, cx, cy, r);
      break;
    case 'fire':
      drawFire(ctx, cx, cy, r);
      break;
    case 'snow':
      drawSnowflake(ctx, cx, cy, r);
      break;
    case 'confetti':
      drawConfetti(ctx, cx, cy, r);
      break;
  }

  ctx.restore();
}

function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.5)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawSquare(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, points: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? r : r * 0.4;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.3);
  ctx.bezierCurveTo(cx - r, cy - r * 0.5, cx - r, cy + r * 0.5, cx, cy + r);
  ctx.bezierCurveTo(cx + r, cy + r * 0.5, cx + r, cy - r * 0.5, cx, cy + r * 0.3);
  ctx.fill();
}

function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  drawStar(ctx, cx, cy, r, 4);
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.5);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawSmoke(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawFire(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + r * 0.8, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx - r * 0.8, cy, cx, cy - r);
  ctx.fill();
}

function drawSnowflake(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'white';
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.stroke();
  }
}

function drawConfetti(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.fillRect(cx - r * 0.3, cy - r, r * 0.6, r * 2);
}

// ============================================================================
// Texture Region Utilities
// ============================================================================

/**
 * Get the texture region for a particle shape.
 *
 * @param atlas - Texture atlas
 * @param shape - Particle shape
 * @returns Texture region or undefined if not found
 */
export function getTextureRegion(
  atlas: ParticleTextureAtlas,
  shape: ParticleShape
): TextureRegion | undefined {
  return atlas.regions.get(shape);
}

/**
 * Get the shape type index for shader uniform.
 *
 * @param shape - Particle shape
 * @returns Shape type index
 */
export function getShapeTypeIndex(shape: ParticleShape): number {
  return SHAPE_TYPE_INDEX[shape] ?? 0;
}

/**
 * Delete a texture and clean up resources.
 *
 * @param gl - WebGL2 rendering context
 * @param texture - Texture to delete
 */
export function deleteTexture(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture | null
): void {
  if (texture) {
    gl.deleteTexture(texture);
  }
}

/**
 * Load a texture from a URL.
 *
 * @param gl - WebGL2 rendering context
 * @param url - Image URL
 * @returns Promise resolving to WebGL texture
 */
export async function loadTexture(
  gl: WebGL2RenderingContext,
  url: string
): Promise<WebGLTexture> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      const texture = gl.createTexture();

      if (!texture) {
        reject(new WebGLParticleError(
          'Failed to create texture from image',
          'TEXTURE_CREATE_ERROR'
        ));
        return;
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_2D);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.bindTexture(gl.TEXTURE_2D, null);

      resolve(texture);
    };

    image.onerror = () => {
      reject(new WebGLParticleError(
        `Failed to load texture from URL: ${url}`,
        'TEXTURE_CREATE_ERROR'
      ));
    };

    image.src = url;
  });
}
