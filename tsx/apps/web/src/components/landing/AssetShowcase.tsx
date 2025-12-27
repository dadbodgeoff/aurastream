'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SHOWCASE_ASSETS } from './constants';

// =============================================================================
// Asset Showcase Section
// Infinite scrolling gallery with hover effects
// =============================================================================

export function AssetShowcase() {
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Select a mix of assets for the gallery
  const galleryAssets = [
    SHOWCASE_ASSETS[4],  // Thumbnail
    SHOWCASE_ASSETS[0],  // Emote
    SHOWCASE_ASSETS[5],  // Thumbnail
    SHOWCASE_ASSETS[9],  // Logo
    SHOWCASE_ASSETS[12], // Story
    SHOWCASE_ASSETS[6],  // Thumbnail
    SHOWCASE_ASSETS[1],  // Emote
    SHOWCASE_ASSETS[10], // Logo
  ];

  return (
    <section 
      ref={sectionRef}
      className="py-20 sm:py-28 border-t border-border-subtle overflow-hidden relative"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-600/[0.02] to-transparent pointer-events-none" />

      <div 
        className={cn(
          "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 transition-all duration-700 ease-out",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
      >
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Assets that look like you
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Every thumbnail, overlay, and banner stays on-brand. Your style, applied everywhere.
          </p>
        </div>
      </div>

      {/* Scrolling gallery */}
      <div 
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background-base to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background-base to-transparent z-10 pointer-events-none" />

        <div 
          className={cn(
            "flex gap-6",
            isPaused ? "animate-scroll-paused" : "animate-scroll"
          )}
        >
          {[...galleryAssets, ...galleryAssets].map((asset, index) => (
            <div
              key={index}
              className={cn(
                'flex-shrink-0 rounded-2xl overflow-hidden shadow-xl',
                'transition-all duration-500 ease-out',
                'hover:scale-105 hover:shadow-2xl hover:shadow-interactive-600/10',
                'group cursor-pointer',
                asset.type === 'Story' ? 'w-36 h-64' : 
                asset.type === 'Emote' || asset.type === 'Logo' ? 'w-44 h-44' : 
                'w-80 h-44'
              )}
            >
              <div className="relative w-full h-full">
                <img
                  src={asset.src}
                  alt={asset.label}
                  loading="lazy"
                  decoding="async"
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                    asset.hasGreenBg && "green-screen-remove"
                  )}
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <span className="text-white text-sm font-medium">{asset.label}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AssetShowcase;
