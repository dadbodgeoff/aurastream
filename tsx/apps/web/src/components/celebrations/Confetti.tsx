/**
 * Canvas-based confetti animation component.
 * Renders celebratory particle effects with configurable colors and density.
 *
 * Features:
 * - Pure canvas-based animation (no external libraries)
 * - Configurable particle count and colors
 * - Gravity and drift physics simulation
 * - Respects reduced motion preference
 * - Auto-cleanup after animation completes
 *
 * @module celebrations/Confetti
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useReducedMotion } from '@aurastream/shared';

/**
 * Props for the Confetti component.
 */
export interface ConfettiProps {
  /** Number of confetti particles to render (default: 50) */
  particleCount?: number;
  /** Array of hex color strings for particles */
  colors?: string[];
  /** Duration of the animation in milliseconds (default: 3000) */
  duration?: number;
  /** Callback fired when animation completes */
  onComplete?: () => void;
}

/**
 * Represents a single confetti particle.
 */
interface Particle {
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Horizontal velocity */
  vx: number;
  /** Vertical velocity */
  vy: number;
  /** Rotation angle in radians */
  rotation: number;
  /** Rotation speed */
  rotationSpeed: number;
  /** Particle width */
  width: number;
  /** Particle height */
  height: number;
  /** Particle color */
  color: string;
  /** Opacity (0-1) */
  opacity: number;
}

/** Default confetti colors (festive palette) */
const DEFAULT_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
  '#F38181', // Coral
  '#AA96DA', // Purple
  '#FCBAD3', // Pink
  '#A8D8EA', // Light Blue
];

/** Physics constants */
const GRAVITY = 0.15;
const DRAG = 0.99;
const FADE_START_RATIO = 0.7; // Start fading at 70% of canvas height

/**
 * Creates a new confetti particle with randomized properties.
 *
 * @param canvasWidth - Width of the canvas
 * @param colors - Array of colors to choose from
 * @returns A new Particle object
 */
function createParticle(
  canvasWidth: number,
  colors: string[]
): Particle {
  return {
    x: Math.random() * canvasWidth,
    y: -20 - Math.random() * 100, // Start above the canvas
    vx: (Math.random() - 0.5) * 8, // Random horizontal velocity
    vy: Math.random() * 3 + 2, // Initial downward velocity
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.2,
    width: Math.random() * 8 + 6,
    height: Math.random() * 4 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    opacity: 1,
  };
}

/**
 * Updates a particle's position and properties for the next frame.
 *
 * @param particle - The particle to update
 * @param canvasHeight - Height of the canvas for fade calculation
 */
function updateParticle(particle: Particle, canvasHeight: number): void {
  // Apply gravity
  particle.vy += GRAVITY;

  // Apply drag
  particle.vx *= DRAG;
  particle.vy *= DRAG;

  // Update position
  particle.x += particle.vx;
  particle.y += particle.vy;

  // Update rotation
  particle.rotation += particle.rotationSpeed;

  // Fade out near the bottom
  const fadeThreshold = canvasHeight * FADE_START_RATIO;
  if (particle.y > fadeThreshold) {
    const fadeProgress = (particle.y - fadeThreshold) / (canvasHeight - fadeThreshold);
    particle.opacity = Math.max(0, 1 - fadeProgress);
  }
}

/**
 * Draws a single particle on the canvas.
 *
 * @param ctx - Canvas 2D rendering context
 * @param particle - The particle to draw
 */
function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle): void {
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.rotation);
  ctx.globalAlpha = particle.opacity;
  ctx.fillStyle = particle.color;
  ctx.fillRect(
    -particle.width / 2,
    -particle.height / 2,
    particle.width,
    particle.height
  );
  ctx.restore();
}

/**
 * Confetti - Canvas-based confetti animation component.
 *
 * Renders a celebratory confetti effect using HTML5 Canvas.
 * Particles fall with gravity, drift horizontally, rotate, and fade out.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Confetti onComplete={() => console.log('Animation done!')} />
 *
 * // With custom configuration
 * <Confetti
 *   particleCount={100}
 *   colors={['#FFD700', '#FF6B6B', '#4ECDC4']}
 *   duration={5000}
 *   onComplete={handleComplete}
 * />
 * ```
 */
export function Confetti({
  particleCount = 50,
  colors = DEFAULT_COLORS,
  duration = 3000,
  onComplete,
}: ConfettiProps): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  /**
   * Animation loop that updates and renders all particles.
   */
  const animate = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Initialize start time
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      // Check if animation should end
      const elapsed = timestamp - startTimeRef.current;
      if (elapsed >= duration) {
        // Clear canvas and call completion callback
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onComplete?.();
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        updateParticle(particle, canvas.height);
        drawParticle(ctx, particle);

        // Remove particles that have fallen off screen or faded out
        if (particle.y > canvas.height + 50 || particle.opacity <= 0) {
          particles.splice(i, 1);
        }
      }

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [duration, onComplete]
  );

  /**
   * Initialize canvas and start animation.
   */
  useEffect(() => {
    // Skip animation if user prefers reduced motion
    if (prefersReducedMotion) {
      onComplete?.();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to match window
    const resizeCanvas = (): void => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create initial particles
    particlesRef.current = Array.from({ length: particleCount }, () =>
      createParticle(canvas.width, colors)
    );

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      particlesRef.current = [];
      startTimeRef.current = null;
    };
  }, [particleCount, colors, animate, prefersReducedMotion, onComplete]);

  // Don't render canvas if reduced motion is preferred
  if (prefersReducedMotion) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-40"
      aria-hidden="true"
      data-testid="confetti-canvas"
    />
  );
}

export default Confetti;
