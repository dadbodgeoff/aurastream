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
      {/* Slides Container - Fixed height ensures consistent sizing */}
      <div
        className="flex transition-transform duration-500 ease-standard h-[180px] md:h-[220px]"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner) => (
          <div
            key={banner.id}
            className={cn(
              'flex-shrink-0 w-full h-full relative overflow-hidden',
              banner.image ? 'bg-background-base' : banner.bgGradient
            )}
          >
            {/* Background Image - object-cover fills container, centered positioning */}
            {banner.image && (
              <img 
                src={banner.image} 
                alt={banner.title}
                className="absolute inset-0 w-full h-full object-cover object-center" 
              />
            )}
            
            {/* Content - for gradient banners without images */}
            {!banner.image && (
              <div className="absolute inset-0 p-4 md:p-6 flex flex-col justify-center">
                <div className="max-w-lg">
                  {banner.badge && (
                    <span className="inline-block px-2 py-0.5 text-micro font-semibold bg-white/20 backdrop-blur-sm rounded-full mb-2">
                      {banner.badge}
                    </span>
                  )}
                  <h2 className="text-lg md:text-xl font-bold text-white mb-1 leading-tight">
                    {banner.title}
                  </h2>
                  {banner.subtitle && (
                    <p className="text-white/80 text-xs mb-3 line-clamp-2">{banner.subtitle}</p>
                  )}
                  <a
                    href={banner.ctaHref}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-text-primary text-xs font-semibold rounded-lg hover:bg-white/90 transition-colors"
                  >
                    {banner.ctaText}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
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
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
            aria-label="Previous slide"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
            aria-label="Next slide"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all',
                idx === currentIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/70'
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
