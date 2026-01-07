/**
 * WebGL Particle Overlay
 * 
 * Single responsibility: Render particles using WebGL with proper SDF shapes.
 * Replaces the CSS emoji-based particle overlay.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { ParticleEffectConfig } from '../animations/particles/types';
import {
  initParticleSystem,
  updateParticleSystem,
  spawnBurst,
  getParticles,
} from '../animations/particles/system';
import type { ParticleSystemState } from '../animations/particles/types';
import { WebGLParticleRenderer } from '../webgl/ParticleRenderer';
import type { ParticleUniforms } from '../webgl/types';

interface WebGLParticleOverlayProps {
  config: ParticleEffectConfig;
  isPlaying: boolean;
  width?: number;
  height?: number;
}

/**
 * Map particle effect type to WebGL shape type index.
 * Must match the shader's uShapeType values.
 */
function getShapeType(type: ParticleEffectConfig['type']): number {
  switch (type) {
    case 'sparkles': return 4;  // Sparkle (4-pointed star with glow)
    case 'confetti': return 8;  // Confetti (rectangular)
    case 'hearts': return 3;    // Heart
    case 'fire': return 6;      // Fire (teardrop/flame)
    case 'snow': return 7;      // Snow (hexagonal flake)
    case 'bubbles': return 0;   // Circle (soft glow)
    case 'stars': return 2;     // Star (5-pointed)
    case 'pixels': return 1;    // Square (pixel-style)
    default: return 0;          // Default to circle
  }
}

/**
 * Get blend mode for particle type.
 */
function getBlendMode(type: ParticleEffectConfig['type']): 'additive' | 'normal' {
  switch (type) {
    case 'fire':
    case 'sparkles':
    case 'stars':
      return 'additive'; // Bright particles add together
    default:
      return 'normal';
  }
}

export function WebGLParticleOverlay({
  config,
  isPlaying,
  width = 512,
  height = 512,
}: WebGLParticleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLParticleRenderer | null>(null);
  const systemRef = useRef<ParticleSystemState | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  // Initialize WebGL renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const renderer = new WebGLParticleRenderer(canvasRef.current, {
        maxParticles: Math.min((config.count ?? 50) * 3, 5000), // Allow for trails
        blendMode: getBlendMode(config.type),
      });
      rendererRef.current = renderer;

      // Initialize particle system
      systemRef.current = initParticleSystem();

      // Initial burst of particles
      if (config.count && config.count > 0) {
        systemRef.current = spawnBurst(
          systemRef.current,
          config,
          Math.min(config.count, 30), // Initial burst
          width,
          height
        );
      }
    } catch (err) {
      console.error('[WebGLParticleOverlay] Failed to initialize:', err);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [config.type, width, height]);

  // Update blend mode when particle type changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.blendMode = getBlendMode(config.type);
    }
  }, [config.type]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !rendererRef.current || !systemRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    startTimeRef.current = performance.now();
    lastTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      if (!rendererRef.current || !systemRef.current) return;

      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const currentTimeMs = timestamp - (startTimeRef.current ?? timestamp);

      // Update particle system
      systemRef.current = updateParticleSystem(
        systemRef.current,
        config,
        currentTimeMs,
        deltaTime,
        width,
        height
      );

      // Get particles and convert to renderer format
      const particles = getParticles(systemRef.current);
      const particleData = particles.map(p => ({
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        size: p.size,
        color: p.color,
        opacity: p.opacity,
        rotation: p.rotation,
        rotationSpeed: p.rotationSpeed,
        lifetime: p.lifetime,
        maxLifetime: p.maxLifetime,
        id: p.id,
        type: p.type,
      }));

      // Update renderer
      rendererRef.current.update(particleData);

      // Create uniforms
      const uniforms: ParticleUniforms = {
        uTime: currentTimeMs / 1000,
        uDeltaTime: deltaTime,
        uResolution: [width, height],
        uGravity: (config as any).gravity ?? 0.5,
        uWind: [(config as any).wind ?? 0, 0],
        uTurbulence: (config as any).turbulence ?? 0.3,
        uGlobalOpacity: 1.0,
      };

      // Render
      rendererRef.current.render(uniforms, getShapeType(config.type));

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, config, width, height]);

  // Handle resize
  useEffect(() => {
    rendererRef.current?.resize(width, height);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0 z-20"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

export default WebGLParticleOverlay;
