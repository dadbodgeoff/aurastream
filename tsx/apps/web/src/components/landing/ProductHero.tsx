'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { HeroShowcase } from './HeroShowcase';
import { PlayIcon, ArrowRightIcon, TwitchIcon, YouTubeIcon, TikTokIcon, KickIcon } from './icons';
import { useIsMobile, useTouchDevice } from '@/hooks';
import { useReducedMotion, useEnterpriseAnalytics } from '@aurastream/shared';

// =============================================================================
// Product Hero Section
// Enterprise-grade sizing, staggered fade-in, mouse-tracking parallax
// =============================================================================

const PLATFORMS = [
  { name: 'Twitch', icon: TwitchIcon },
  { name: 'YouTube', icon: YouTubeIcon },
  { name: 'TikTok', icon: TikTokIcon },
  { name: 'Kick', icon: KickIcon },
];

export function ProductHero() {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement>(null);
  const lastUpdateRef = useRef<number>(0);
  
  // Mobile and accessibility hooks
  const isMobile = useIsMobile();
  const isTouch = useTouchDevice();
  const prefersReducedMotion = useReducedMotion();
  const { trackFunnel } = useEnterpriseAnalytics();

  // Track CTA click
  const handleCtaClick = () => {
    trackFunnel('cta_click', { location: 'hero' });
  };

  // Staggered fade-in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Mouse tracking for parallax - throttled and disabled on touch/mobile
  useEffect(() => {
    // Skip on touch devices, mobile, or reduced motion
    if (isTouch || isMobile || prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Throttle to 60fps (16ms)
      const now = Date.now();
      if (now - lastUpdateRef.current < 16) return;
      lastUpdateRef.current = now;

      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isTouch, isMobile, prefersReducedMotion]);

  return (
    <section 
      ref={heroRef}
      id="main-content"
      className="relative min-h-screen flex flex-col overflow-hidden"
    >
      {/* Main hero content */}
      <div className="flex-1 flex items-center pt-24 sm:pt-28 lg:pt-32 px-4 sm:px-6 lg:px-8">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-interactive-600/5 via-transparent to-transparent pointer-events-none" />
        
        {/* Mouse-tracking gradient orb - responsive and motion-aware */}
        {!prefersReducedMotion && (
          <div 
            className="absolute w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] rounded-full blur-[60px] sm:blur-[100px] opacity-30 pointer-events-none will-change-transform"
            style={{
              background: 'radial-gradient(circle, rgba(33, 128, 141, 0.3) 0%, transparent 70%)',
              top: '20%',
              right: '10%',
              transform: isTouch || isMobile 
                ? 'none' 
                : `translate(${mousePos.x * 40}px, ${mousePos.y * 30}px)`,
              transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
        )}
        
        <div className="relative max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left side - Text content with enterprise sizing */}
            <div className="text-center lg:text-left space-y-8">
              {/* Badge */}
              <div className="flex justify-center lg:justify-start">
                <div 
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-interactive-600/10 border border-interactive-600/20",
                    "transition-all duration-700 ease-out",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-interactive-500 animate-pulse" />
                  <span className="text-sm font-medium text-interactive-400">Now in public beta</span>
                </div>
              </div>

              {/* Headline - Enterprise sized */}
              <h1 
                className={cn(
                  "text-5xl sm:text-6xl lg:text-7xl font-bold text-text-primary tracking-tight leading-[1.05]",
                  "transition-all duration-700 ease-out delay-100",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
              >
                Your stream.
                <br />
                Your brand.
                <br />
                <span className="relative inline-block">
                  <span className="text-interactive-400">Every platform.</span>
                  {/* Animated underline SVG */}
                  <svg 
                    className="absolute -bottom-2 left-0 w-full h-3 overflow-visible"
                    viewBox="0 0 300 12"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0,6 Q75,0 150,6 T300,6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-interactive-500/50"
                      style={{
                        strokeDasharray: 400,
                        strokeDashoffset: isVisible ? 0 : 400,
                        transition: 'stroke-dashoffset 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.5s',
                      }}
                    />
                  </svg>
                </span>
              </h1>

              {/* Subhead - Enterprise sized */}
              <p 
                className={cn(
                  "text-lg sm:text-xl lg:text-2xl text-text-secondary max-w-2xl mx-auto lg:mx-0 leading-relaxed",
                  "transition-all duration-700 ease-out delay-200",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
              >
                Thumbnails, overlays, banners, and more — all matching your style, ready in seconds.
                No templates. No Photoshop. Just you.
              </p>

              {/* CTAs - Enterprise sized with proper spacing */}
              <div 
                className={cn(
                  "flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2",
                  "transition-all duration-700 ease-out delay-300",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
              >
                <Link
                  href="/signup"
                  onClick={handleCtaClick}
                  className={cn(
                    'w-full sm:w-auto inline-flex items-center justify-center gap-2',
                    'px-8 py-4 rounded-xl font-semibold text-base',
                    'bg-interactive-600 text-white',
                    'hover:bg-interactive-500 hover:scale-[1.02] active:scale-[0.98]',
                    'transition-all duration-300',
                    'shadow-lg shadow-interactive-600/30',
                    'hover:shadow-xl hover:shadow-interactive-600/40'
                  )}
                >
                  <PlayIcon className="w-5 h-5" />
                  Try It Free
                </Link>
                <Link
                  href="#how-it-works"
                  className={cn(
                    'w-full sm:w-auto inline-flex items-center justify-center gap-2',
                    'px-8 py-4 rounded-xl font-semibold text-base',
                    'text-text-primary hover:text-interactive-400',
                    'border border-border-default hover:border-interactive-500/50',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    'transition-all duration-300'
                  )}
                >
                  See It Work
                  <ArrowRightIcon className="w-5 h-5" />
                </Link>
              </div>

              {/* Trust indicator */}
              <div 
                className={cn(
                  "flex items-center justify-center lg:justify-start gap-2 text-sm text-text-tertiary",
                  "transition-all duration-700 ease-out delay-400",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>No credit card required</span>
              </div>

              {/* Platform logos */}
              <div 
                className={cn(
                  "flex items-center justify-center lg:justify-start gap-6",
                  "transition-all duration-700 ease-out delay-500",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
              >
                <span className="text-xs text-text-muted uppercase tracking-wider font-medium">Works with</span>
                <div className="flex items-center gap-6 scroll-reveal-stagger">
                  {PLATFORMS.map(({ name, icon: Icon }) => (
                    <Icon 
                      key={name} 
                      className="w-6 h-6 text-text-tertiary hover:text-text-secondary transition-colors duration-300 hover:scale-110" 
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right side - Live Demo with parallax */}
            <div 
              className={cn(
                "relative transition-all duration-700 ease-out delay-300",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={
                !isTouch && !isMobile && !prefersReducedMotion
                  ? {
                      transform: `translate(${mousePos.x * 10}px, ${mousePos.y * 8}px)`,
                      transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    }
                  : undefined
              }
            >
              <HeroShowcase />
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll indicator at bottom - aligned with fold */}
      <div className="pb-10 flex flex-col items-center gap-3 scroll-reveal-fade">
        <span className="text-xs text-text-muted uppercase tracking-widest font-medium">Explore</span>
        <div className="relative w-8 h-12 rounded-full border-2 border-border-subtle flex items-start justify-center p-2 overflow-hidden">
          <div className="w-1.5 h-3 rounded-full bg-text-tertiary animate-scroll-bounce" />
        </div>
      </div>
    </section>
  );
}

export default ProductHero;
