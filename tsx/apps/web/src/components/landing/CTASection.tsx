'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRightIcon } from './icons';

// =============================================================================
// CTA Section
// Floating particles, gradient backgrounds, glowing button
// =============================================================================

// Generate random particles
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  size: Math.random() * 4 + 2,
  duration: Math.random() * 10 + 14,
  delay: Math.random() * 5,
}));

export function CTASection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const handleCtaClick = () => {
    // CTA click - page navigation handles tracking
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-border-subtle"
    >
      <div className="max-w-4xl mx-auto">
        <div 
          className={cn(
            "relative p-8 sm:p-12 rounded-3xl overflow-hidden",
            "bg-gradient-to-br from-interactive-600/10 via-background-surface to-accent-600/10",
            "border border-border-subtle",
            "transition-all duration-700 ease-out",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {/* Floating particles */}
          {PARTICLES.map((particle) => (
            <div
              key={particle.id}
              className="absolute rounded-full bg-interactive-500/20 animate-float-particle"
              style={{
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
                animationDuration: `${particle.duration}s`,
                animationDelay: `${particle.delay}s`,
              }}
            />
          ))}

          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-interactive-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-500/10 rounded-full blur-3xl" />
          
          <div className="relative text-center">
            <h2 
              className={cn(
                "text-3xl sm:text-4xl font-bold text-text-primary mb-4",
                "transition-all duration-700 ease-out delay-100",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              Ready to look professional?
            </h2>
            <p 
              className={cn(
                "text-lg text-text-secondary mb-8 max-w-xl mx-auto",
                "transition-all duration-700 ease-out delay-200",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              Join thousands of creators who spend less time designing and more time streaming.
            </p>
            <Link
              href="/signup"
              onClick={handleCtaClick}
              className={cn(
                'inline-flex items-center gap-2',
                'px-8 py-4 rounded-xl font-semibold text-base',
                'bg-interactive-600 text-white',
                'hover:bg-interactive-500 hover:scale-105 active:scale-[0.98]',
                'transition-all duration-300',
                'shadow-lg shadow-interactive-600/30',
                'hover:shadow-xl hover:shadow-interactive-600/40',
                "delay-300",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              Start creating — it's free
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <p 
              className={cn(
                "mt-4 text-sm text-text-tertiary",
                "transition-all duration-700 ease-out delay-400",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              No credit card required • Free tier available
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CTASection;
