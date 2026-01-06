'use client';

/**
 * OBS Browser Source Page
 *
 * This page is loaded by OBS as a browser source.
 * It renders the animation in a loop with transparent background.
 *
 * URL format: /obs/alert/{projectId}?token={obsToken}
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

interface AnimationConfig {
  entry: any;
  loop: any;
  depthEffect: any;
  particles: any;
  durationMs: number;
  loopCount: number;
}

interface ProjectData {
  sourceUrl: string;
  depthMapUrl: string | null;
  animationConfig: AnimationConfig;
  width: number;
  height: number;
}

const API_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:8000') + '/api/v1';

export default function OBSAlertPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const token = searchParams.get('token');

  const [project, setProject] = useState<ProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch project data
  useEffect(() => {
    if (!projectId || !token) {
      setError('Invalid or missing parameters');
      setLoading(false);
      return;
    }

    async function fetchProject() {
      try {
        // Use OBS-specific endpoint with token as query param
        const response = await fetch(
          `${API_BASE}/alert-animations/obs/${projectId}?token=${encodeURIComponent(token!)}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.detail?.code === 'TOKEN_EXPIRED') {
            throw new Error('Token expired. Generate a new OBS URL from your dashboard.');
          }
          throw new Error(errorData.detail?.message || 'Failed to load animation');
        }

        const data = await response.json();
        setProject({
          sourceUrl: data.source_url,
          depthMapUrl: data.depth_map_url,
          animationConfig: {
            entry: data.animation_config?.entry,
            loop: data.animation_config?.loop,
            depthEffect: data.animation_config?.depth_effect,
            particles: data.animation_config?.particles,
            durationMs: data.animation_config?.duration_ms || 3000,
            loopCount: data.animation_config?.loop_count || 0,
          },
          width: data.export_width || 512,
          height: data.export_height || 512,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchProject();
  }, [projectId, token]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-transparent">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-transparent">
        <p className="text-red-500">{error || 'Failed to load'}</p>
      </div>
    );
  }

  return (
    <OBSAlertClient
      sourceUrl={project.sourceUrl}
      depthMapUrl={project.depthMapUrl}
      animationConfig={project.animationConfig}
    />
  );
}

// ============================================================================
// Client Animation Component
// ============================================================================

interface OBSAlertClientProps {
  sourceUrl: string;
  depthMapUrl: string | null;
  animationConfig: AnimationConfig;
}

function OBSAlertClient({ sourceUrl, depthMapUrl, animationConfig }: OBSAlertClientProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Animation loop
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;

      const elapsed = timestamp - startTimeRef.current;
      const loopedTime = elapsed % animationConfig.durationMs;

      applyAnimations(imageRef.current, animationConfig, loopedTime);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animationConfig]);

  return (
    <div
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden"
      style={{ background: 'transparent' }}
    >
      {/* Animated Image */}
      <img
        ref={imageRef}
        src={sourceUrl}
        alt="Alert Animation"
        className="max-h-full max-w-full object-contain"
        style={{
          willChange: 'transform, opacity',
        }}
      />

      {/* Particle overlay */}
      {animationConfig.particles && (
        <ParticleOverlay config={animationConfig.particles} />
      )}
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

  const t = timeMs / config.durationMs;
  let transform = '';
  let opacity = 1;

  // Entry animation
  if (config.entry) {
    const entryDuration = (config.entry.duration_ms || 500) / config.durationMs;
    const entryT = Math.min(t / entryDuration, 1);
    const easedT = easeOutElastic(entryT);

    switch (config.entry.type) {
      case 'pop_in': {
        const scaleFrom = config.entry.scale_from ?? 0;
        const scale = scaleFrom + (1 - scaleFrom) * easedT;
        transform += `scale(${scale}) `;
        break;
      }
      case 'fade_in': {
        opacity = entryT;
        const scaleFrom = config.entry.scale_from ?? 0.9;
        const scale = scaleFrom + (1 - scaleFrom) * entryT;
        transform += `scale(${scale}) `;
        break;
      }
      case 'slide_in': {
        const distance = (config.entry.distance_percent ?? 120) / 100;
        const direction = config.entry.direction ?? 'left';
        const offset = distance * 100 * (1 - entryT);

        if (direction === 'left') transform += `translateX(-${offset}%) `;
        else if (direction === 'right') transform += `translateX(${offset}%) `;
        else if (direction === 'top') transform += `translateY(-${offset}%) `;
        else if (direction === 'bottom') transform += `translateY(${offset}%) `;
        break;
      }
      case 'burst': {
        const scaleFrom = config.entry.scale_from ?? 2.5;
        const scale = scaleFrom + (1 - scaleFrom) * easedT;
        opacity = Math.min(entryT * 3, 1);
        const rotation = (config.entry.rotation_from ?? 15) * (1 - easedT);
        transform += `scale(${scale}) rotate(${rotation}deg) `;
        break;
      }
    }
  }

  // Loop animation
  if (config.loop) {
    const entryDuration = config.entry ? (config.entry.duration_ms || 500) / config.durationMs : 0;
    const loopT = config.entry && t > entryDuration
      ? (t - entryDuration) / (1 - entryDuration)
      : t;
    
    const frequency = config.loop.frequency ?? 1;
    const osc = Math.sin(loopT * frequency * Math.PI * 2);

    switch (config.loop.type) {
      case 'float': {
        const ampY = config.loop.amplitude_y ?? 8;
        const ampX = config.loop.amplitude_x ?? 2;
        transform += `translateY(${osc * ampY}px) translateX(${Math.cos(loopT * frequency * Math.PI * 2) * ampX}px) `;
        break;
      }
      case 'pulse': {
        const scaleMin = config.loop.scale_min ?? 0.97;
        const scaleMax = config.loop.scale_max ?? 1.03;
        const scale = scaleMin + (scaleMax - scaleMin) * ((osc + 1) / 2);
        transform += `scale(${scale}) `;
        break;
      }
      case 'wiggle': {
        const angleMax = config.loop.angle_max ?? 3;
        transform += `rotate(${osc * angleMax}deg) `;
        break;
      }
    }
  }

  element.style.transform = transform || 'none';
  element.style.opacity = String(opacity);
}

function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

// ============================================================================
// Particle Overlay
// ============================================================================

interface ParticleOverlayProps {
  config: any;
}

function ParticleOverlay({ config }: ParticleOverlayProps) {
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
        />
      ))}
    </div>
  );
}

interface ParticleProps {
  type: string;
  color: string;
  index: number;
}

function Particle({ type, color, index }: ParticleProps) {
  const delay = index * 0.1;
  const duration = 2 + Math.random() * 2;
  const left = Math.random() * 100;
  const size = 4 + Math.random() * 8;

  const emoji = type === 'hearts' ? '💕' : type === 'confetti' ? '🎊' : type === 'fire' ? '🔥' : '✨';

  return (
    <span
      className="absolute animate-float-up"
      style={{
        left: `${left}%`,
        bottom: '-20px',
        fontSize: `${size}px`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    >
      {emoji}
    </span>
  );
}
