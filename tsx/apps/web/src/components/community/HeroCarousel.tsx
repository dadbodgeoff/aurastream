'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface HeroBanner {
  id: string;
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaHref: string;
  bgGradient: string;
  image?: string;
  badge?: string;
}

interface HeroCarouselProps {
  banners: HeroBanner[];
  autoPlayInterval?: number;
  className?: string;
}

export function HeroCarousel({ banners, autoPlayInterval = 5000, className }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (isPaused || banners.length <= 1) return;
    const timer = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, autoPlayInterval, banners.length]);

  if (banners.length === 0) return null;

  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl', className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      <div
        className="flex transition-transform duration-500 ease-standard"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner) => (
          <div
            key={banner.id}
            className={cn(
              'flex-shrink-0 w-full min-h-[200px] md:min-h-[280px] p-6 md:p-10 flex flex-col justify-center relative overflow-hidden',
              banner.image ? 'bg-background-base' : banner.bgGradient
            )}
          >
            {/* Background Image */}
            {banner.image && (
              <div className="absolute inset-0">
                <img src={banner.image} alt="" className="w-full h-full object-fill" />
              </div>
            )}
            
            {/* Content - hide when image has baked-in content */}
            {!banner.image && (
              <div className="relative z-10 max-w-lg">
                {banner.badge && (
                  <span className="inline-block px-3 py-1 text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full mb-3">
                    {banner.badge}
                  </span>
                )}
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 leading-tight">
                  {banner.title}
                </h2>
                {banner.subtitle && (
                  <p className="text-white/80 text-sm md:text-base mb-4">{banner.subtitle}</p>
                )}
                <a
                  href={banner.ctaHref}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-white/90 transition-colors"
                >
                  {banner.ctaText}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
            aria-label="Previous slide"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
            aria-label="Next slide"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                idx === currentIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/70'
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
