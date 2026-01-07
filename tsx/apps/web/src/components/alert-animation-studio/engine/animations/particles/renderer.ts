/**
 * Particle Renderer
 *
 * CSS-based particle rendering.
 * Generates CSS styles and elements for particles.
 *
 * Note: This is a CSS-based renderer for compatibility.
 * A WebGL renderer can be added for better performance with many particles.
 */

import type { Particle, ParticleEffectType } from './types';

// ============================================================================
// Particle Shapes
// ============================================================================

/**
 * Get CSS shape for a particle type.
 */
export function getParticleShape(type: ParticleEffectType): string {
  switch (type) {
    case 'sparkles':
      return '✨';
    case 'confetti':
      return '🎊';
    case 'hearts':
      return '💕';
    case 'fire':
      return '🔥';
    case 'snow':
      return '❄️';
    case 'bubbles':
      return '🫧';
    case 'stars':
      return '⭐';
    case 'pixels':
      return '▪️';
    default:
      return '✨';
  }
}

/**
 * Get CSS class for particle type.
 */
export function getParticleClass(type: ParticleEffectType): string {
  return `particle-${type}`;
}

// ============================================================================
// CSS Generation
// ============================================================================

/**
 * Generate inline styles for a particle.
 */
export function getParticleStyles(particle: Particle): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${particle.x}px`,
    top: `${particle.y}px`,
    fontSize: `${particle.size}px`,
    opacity: particle.opacity,
    transform: `rotate(${particle.rotation}rad)`,
    pointerEvents: 'none',
    userSelect: 'none',
    willChange: 'transform, opacity',
    // Use GPU acceleration
    backfaceVisibility: 'hidden',
    perspective: 1000,
  };
}

/**
 * Generate CSS for particle container.
 */
export function getContainerStyles(): React.CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 10,
  };
}

// ============================================================================
// Custom Shapes (Non-Emoji)
// ============================================================================

/**
 * SVG path for a heart shape.
 */
export const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

/**
 * SVG path for a star shape.
 */
export const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

/**
 * SVG path for a sparkle shape.
 */
export const SPARKLE_PATH = 'M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z';

/**
 * Get SVG element for custom particle shape.
 */
export function getParticleSVG(
  type: ParticleEffectType,
  color: string,
  size: number
): string {
  let path: string;

  switch (type) {
    case 'hearts':
      path = HEART_PATH;
      break;
    case 'stars':
      path = STAR_PATH;
      break;
    case 'sparkles':
      path = SPARKLE_PATH;
      break;
    default:
      return '';
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
      <path d="${path}" />
    </svg>
  `;
}

// ============================================================================
// Render Helpers
// ============================================================================

/**
 * Determine if particle should use emoji or custom shape.
 */
export function shouldUseEmoji(type: ParticleEffectType): boolean {
  // For now, use emoji for all types
  // Can be changed to use SVG for specific types
  return true;
}

/**
 * Get render content for a particle.
 */
export function getParticleContent(particle: Particle): string {
  if (shouldUseEmoji(particle.type)) {
    return getParticleShape(particle.type);
  }

  return getParticleSVG(particle.type, particle.color, particle.size);
}

// ============================================================================
// Performance Helpers
// ============================================================================

/**
 * Check if particle is visible on screen.
 */
export function isParticleVisible(
  particle: Particle,
  canvasWidth: number,
  canvasHeight: number,
  margin: number = 50
): boolean {
  return (
    particle.x >= -margin &&
    particle.x <= canvasWidth + margin &&
    particle.y >= -margin &&
    particle.y <= canvasHeight + margin &&
    particle.opacity > 0.01
  );
}

/**
 * Filter particles to only visible ones.
 */
export function getVisibleParticles(
  particles: readonly Particle[],
  canvasWidth: number,
  canvasHeight: number
): Particle[] {
  return particles.filter(p => isParticleVisible(p, canvasWidth, canvasHeight));
}
