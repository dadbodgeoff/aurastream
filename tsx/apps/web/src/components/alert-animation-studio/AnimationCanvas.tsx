'use client';

/**
 * Animation Canvas
 *
 * Renders the animated preview using CSS animations.
 * A full Three.js implementation with depth parallax can be added later.
 */

import { useEffect, useRef, useState } from 'react';
import type { AnimationConfig } from '@aurastream/api-client';

interface AnimationCanvasProps {
  sourceUrl: string;
  depthMapUrl: string | null;
  config: AnimationConfig;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  isPlaying?: boolean;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
}

export function AnimationCanvas({
  sourceUrl,
  depthMapUrl,
  config,
  canvasRef,
  isPlaying = false,
  currentTime = 0,
  onTimeUpdate,
}: AnimationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    startTimeRef.current = performance.now() - currentTime;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;

      const elapsed = timestamp - startTimeRef.current;
      const loopedTime = elapsed % config.durationMs;

      onTimeUpdate?.(loopedTime);
      applyAnimations(imageRef.current, config, loopedTime);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, config, onTimeUpdate]);

  // Apply animations based on current time
  useEffect(() => {
    if (!isPlaying && imageRef.current) {
      applyAnimations(imageRef.current, config, currentTime);
    }
  }, [currentTime, config, isPlaying]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
    >
      {/* Hidden canvas for export */}
      <canvas
        ref={canvasRef}
        width={512}
        height={512}
        className="hidden"
      />

      {/* Animated Image */}
      <div className="relative">
        <img
          ref={imageRef}
          src={sourceUrl}
          alt="Animation preview"
          onLoad={() => setImageLoaded(true)}
          className="max-h-[400px] max-w-[400px] object-contain"
          style={{
            willChange: 'transform, opacity',
          }}
        />

        {/* Particle overlay placeholder */}
        {config.particles && (
          <ParticleOverlay config={config.particles} isPlaying={isPlaying} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Animation Application
// ============================================================================

function applyAnimations(
  element: HTMLImageElement | null,
  config: AnimationConfig,
  timeMs: number
): void {
  if (!element) return;

  const t = timeMs / config.durationMs; // Normalized time 0-1
  let transform = '';
  let opacity = 1;

  // Entry animation
  if (config.entry) {
    const entryDuration = config.entry.durationMs / config.durationMs;
    const entryT = Math.min(t / entryDuration, 1);
    const easedT = easeOutElastic(entryT);

    switch (config.entry.type) {
      case 'pop_in': {
        const scaleFrom = config.entry.scaleFrom ?? 0;
        const scale = scaleFrom + (1 - scaleFrom) * easedT;
        transform += `scale(${scale}) `;
        break;
      }
      case 'fade_in': {
        opacity = entryT;
        const scaleFrom = config.entry.scaleFrom ?? 0.9;
        const scale = scaleFrom + (1 - scaleFrom) * entryT;
        transform += `scale(${scale}) `;
        break;
      }
      case 'slide_in': {
        const distance = (config.entry.distancePercent ?? 120) / 100;
        const direction = config.entry.direction ?? 'left';
        const offset = distance * 100 * (1 - entryT);

        if (direction === 'left') transform += `translateX(-${offset}%) `;
        else if (direction === 'right') transform += `translateX(${offset}%) `;
        else if (direction === 'top') transform += `translateY(-${offset}%) `;
        else if (direction === 'bottom') transform += `translateY(${offset}%) `;
        break;
      }
      case 'burst': {
        const scaleFrom = config.entry.scaleFrom ?? 2.5;
        const scale = scaleFrom + (1 - scaleFrom) * easedT;
        opacity = Math.min(entryT * 3, 1);
        const rotation = (config.entry.rotationFrom ?? 15) * (1 - easedT);
        transform += `scale(${scale}) rotate(${rotation}deg) `;
        break;
      }
    }
  }

  // Loop animation (after entry)
  if (config.loop && config.entry) {
    const entryDuration = config.entry.durationMs / config.durationMs;
    if (t > entryDuration) {
      const loopT = (t - entryDuration) / (1 - entryDuration);
      const frequency = config.loop.frequency ?? 1;
      const osc = Math.sin(loopT * frequency * Math.PI * 2);

      switch (config.loop.type) {
        case 'float': {
          const ampY = config.loop.amplitudeY ?? 8;
          const ampX = config.loop.amplitudeX ?? 2;
          transform += `translateY(${osc * ampY}px) translateX(${Math.cos(loopT * frequency * Math.PI * 2) * ampX}px) `;
          break;
        }
        case 'pulse': {
          const scaleMin = config.loop.scaleMin ?? 0.97;
          const scaleMax = config.loop.scaleMax ?? 1.03;
          const scale = scaleMin + (scaleMax - scaleMin) * ((osc + 1) / 2);
          transform += `scale(${scale}) `;
          break;
        }
        case 'wiggle': {
          const angleMax = config.loop.angleMax ?? 3;
          transform += `rotate(${osc * angleMax}deg) `;
          break;
        }
      }
    }
  } else if (config.loop && !config.entry) {
    // Loop without entry
    const frequency = config.loop.frequency ?? 1;
    const osc = Math.sin(t * frequency * Math.PI * 2);

    switch (config.loop.type) {
      case 'float': {
        const ampY = config.loop.amplitudeY ?? 8;
        const ampX = config.loop.amplitudeX ?? 2;
        transform += `translateY(${osc * ampY}px) translateX(${Math.cos(t * frequency * Math.PI * 2) * ampX}px) `;
        break;
      }
      case 'pulse': {
        const scaleMin = config.loop.scaleMin ?? 0.97;
        const scaleMax = config.loop.scaleMax ?? 1.03;
        const scale = scaleMin + (scaleMax - scaleMin) * ((osc + 1) / 2);
        transform += `scale(${scale}) `;
        break;
      }
      case 'wiggle': {
        const angleMax = config.loop.angleMax ?? 3;
        transform += `rotate(${osc * angleMax}deg) `;
        break;
      }
    }
  }

  element.style.transform = transform || 'none';
  element.style.opacity = String(opacity);
}

// Elastic easing function
function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

// ============================================================================
// Particle Overlay (CSS-based placeholder)
// ============================================================================

interface ParticleOverlayProps {
  config: AnimationConfig['particles'];
  isPlaying: boolean;
}

function ParticleOverlay({ config, isPlaying }: ParticleOverlayProps) {
  if (!config) return null;

  const count = config.count ?? 20;
  const particles = Array.from({ length: Math.min(count, 30) }, (_, i) => i);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((i) => (
        <Particle
          key={i}
          type={config.type}
          color={config.color ?? '#ffd700'}
          index={i}
          isPlaying={isPlaying}
        />
      ))}
    </div>
  );
}

interface ParticleProps {
  type: string;
  color: string;
  index: number;
  isPlaying: boolean;
}

function Particle({ type, color, index, isPlaying }: ParticleProps) {
  const delay = index * 0.1;
  const duration = 2 + Math.random() * 2;
  const left = Math.random() * 100;
  const size = 4 + Math.random() * 8;

  const emoji = type === 'hearts' ? '💕' : type === 'confetti' ? '🎊' : type === 'fire' ? '🔥' : '✨';

  return (
    <span
      className={`absolute ${isPlaying ? 'animate-float-up' : ''}`}
      style={{
        left: `${left}%`,
        bottom: '-20px',
        fontSize: `${size}px`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        opacity: isPlaying ? 1 : 0,
      }}
    >
      {emoji}
    </span>
  );
}
