'use client';

import { useEffect, useState, useRef } from 'react';
import { useIsMobile } from '@/hooks';
import { useReducedMotion } from '@aurastream/shared';

// =============================================================================
// Background Effects Component
// Noise texture, parallax orbs, animated grid
// Mobile-optimized with reduced motion support
// =============================================================================

interface BackgroundEffectsProps {
  enableNoise?: boolean;
  enableOrbs?: boolean;
  enableGrid?: boolean;
  heroBackgroundUrl?: string;
}

export function BackgroundEffects({
  enableNoise = true,
  enableOrbs = true,
  enableGrid = true,
  heroBackgroundUrl = 'https://qgyvdadgdomnubngfpun.supabase.co/storage/v1/object/public/streamer-studio-assets/landing/hero-background.jpeg',
}: BackgroundEffectsProps) {
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const lastUpdateRef = useRef<number>(0);

  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  // Throttled scroll and mouse tracking
  useEffect(() => {
    // Skip expensive effects on mobile or reduced motion
    if (isMobile || prefersReducedMotion) return;

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastUpdateRef.current < 16) return; // 60fps throttle
      lastUpdateRef.current = now;
      setScrollY(window.scrollY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdateRef.current < 16) return; // 60fps throttle
      lastUpdateRef.current = now;
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isMobile, prefersReducedMotion]);

  // Organic motion using sin/cos - only calculate if not mobile
  const orb1X = isMobile || prefersReducedMotion ? 0 : Math.sin(scrollY * 0.002) * 50 + mousePos.x * 30;
  const orb1Y = isMobile || prefersReducedMotion ? 0 : Math.cos(scrollY * 0.002) * 30 + mousePos.y * 20;
  const orb2X = isMobile || prefersReducedMotion ? 0 : Math.cos(scrollY * 0.0015) * 40 - mousePos.x * 25;
  const orb2Y = isMobile || prefersReducedMotion ? 0 : Math.sin(scrollY * 0.0015) * 35 - mousePos.y * 15;

  // Don't render orbs on mobile for performance
  const shouldRenderOrbs = enableOrbs && !isMobile && !prefersReducedMotion;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Hero background image - main visual */}
      {heroBackgroundUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${heroBackgroundUrl})`,
            opacity: 0.5,
          }}
        />
      )}
      
      {/* Subtle overlay for text readability - keeps image visible */}
      <div className="absolute inset-0 bg-gradient-to-b from-background-base/40 via-background-base/30 to-background-base/70" />
      
      {/* Noise texture overlay - lightweight, keep on mobile */}
      {enableNoise && (
        <svg className="absolute inset-0 w-full h-full opacity-[0.015]" xmlns="http://www.w3.org/2000/svg">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)"/>
        </svg>
      )}

      {/* Parallax gradient orbs - disabled on mobile for performance */}
      {shouldRenderOrbs && (
        <>
          <div
            className="absolute w-[800px] h-[800px] rounded-full blur-[120px] will-change-transform"
            style={{
              background: 'radial-gradient(circle, rgba(33, 128, 141, 0.15) 0%, transparent 70%)',
              top: '10%',
              right: '-10%',
              transform: `translate(${orb1X}px, ${orb1Y}px)`,
              transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
          <div
            className="absolute w-[600px] h-[600px] rounded-full blur-[100px] will-change-transform"
            style={{
              background: 'radial-gradient(circle, rgba(33, 128, 141, 0.12) 0%, transparent 70%)',
              bottom: '20%',
              left: '-5%',
              transform: `translate(${orb2X}px, ${orb2Y}px)`,
              transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
        </>
      )}

      {/* Animated grid pattern - disable animation on mobile/reduced motion */}
      {enableGrid && (
        <div
          className="absolute inset-0 opacity-[0.03] parallax-slow"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            transform: isMobile || prefersReducedMotion ? 'none' : `translateY(${scrollY * 0.1}px)`,
          }}
        />
      )}
    </div>
  );
}

export default BackgroundEffects;
