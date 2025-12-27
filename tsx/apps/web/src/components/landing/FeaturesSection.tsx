'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { BrandIcon, GridIcon, ClockIcon } from './icons';
import type { Feature } from './types';

// =============================================================================
// Features Section
// Staggered reveal on scroll, hover effects
// =============================================================================

const FEATURES: Feature[] = [
  {
    title: 'One brand, everywhere',
    description: 'Define your colors, fonts, and style once. Every asset matches automatically.',
    icon: BrandIcon,
  },
  {
    title: 'Every format you need',
    description: 'Thumbnails, overlays, banners, story graphics — all from one place.',
    icon: GridIcon,
  },
  {
    title: 'Ready in seconds',
    description: 'No more hours in Photoshop. Describe what you want, get what you need.',
    icon: ClockIcon,
  },
];

export function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      id="how-it-works" 
      className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-border-subtle relative overflow-hidden"
    >
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-interactive-600/[0.02] to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <div 
          className={cn(
            "text-center mb-16 transition-all duration-700 ease-out",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Why creators love AuraStream
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Stop wasting hours on design. Start creating content that looks professional.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map(({ title, description, icon: Icon }, index) => (
            <div 
              key={title}
              className={cn(
                "relative p-6 rounded-2xl bg-background-surface/50 border border-border-subtle",
                "hover:border-interactive-500/30 hover:bg-background-surface/80",
                "hover:scale-[1.02] hover:shadow-xl hover:shadow-interactive-600/5",
                "transition-all duration-500 ease-out group",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{
                transitionDelay: isVisible ? `${200 + index * 100}ms` : '0ms',
              }}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-interactive-500/5 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-interactive-600/10 flex items-center justify-center mb-4 group-hover:bg-interactive-600/20 group-hover:scale-110 transition-all duration-300">
                  <Icon className="w-6 h-6 text-interactive-500" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-text-secondary leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
