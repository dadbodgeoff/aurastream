'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { AURASTREAM_BRANDING } from '@aurastream/shared';

// =============================================================================
// Landing Navigation
// Scroll-aware styling with backdrop blur and glow effects
// =============================================================================

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Skip to content - accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-interactive-600 focus:text-white focus:rounded-lg"
      >
        Skip to content
      </a>

      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled 
            ? 'bg-background-base/80 backdrop-blur-2xl border-b border-border-subtle shadow-lg shadow-interactive-600/5' 
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link 
              href="/" 
              className="flex items-center gap-3 transition-transform duration-300 hover:scale-105"
            >
              {logoError ? (
                <>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-interactive-500 to-accent-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">A</span>
                  </div>
                  <span className="font-bold text-xl text-text-primary">{AURASTREAM_BRANDING.name}</span>
                </>
              ) : (
                <Image
                  src={AURASTREAM_BRANDING.logo.url}
                  alt={AURASTREAM_BRANDING.logo.alt}
                  width={AURASTREAM_BRANDING.logoSizes.lg.width}
                  height={AURASTREAM_BRANDING.logoSizes.lg.height}
                  className="object-contain"
                  onError={() => setLogoError(true)}
                  priority
                />
              )}
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-300"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={cn(
                  'text-sm font-semibold px-6 py-3 rounded-lg transition-all duration-300',
                  'bg-interactive-600 text-white',
                  'hover:bg-interactive-500 hover:scale-[1.02] active:scale-[0.98]',
                  'shadow-lg shadow-interactive-600/25 hover:shadow-xl hover:shadow-interactive-600/35'
                )}
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default LandingNav;
