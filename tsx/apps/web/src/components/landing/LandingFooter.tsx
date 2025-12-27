'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AURASTREAM_BRANDING } from '@aurastream/shared';

// =============================================================================
// Landing Footer
// Gradient accent, hover transitions
// =============================================================================

export function LandingFooter() {
  const [logoError, setLogoError] = useState(false);
  
  return (
    <footer className="relative py-12 px-4 sm:px-6 lg:px-8 border-t border-border-subtle overflow-hidden">
      {/* Gradient accent at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-interactive-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <Link 
          href="/"
          className="flex items-center gap-3 transition-all duration-300 hover:scale-105"
        >
          {logoError ? (
            <div className="w-8 h-8 rounded-lg bg-interactive-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
          ) : (
            <Image
              src={AURASTREAM_BRANDING.logo.url}
              alt={AURASTREAM_BRANDING.logo.alt}
              width={AURASTREAM_BRANDING.logoSizes.md.width}
              height={AURASTREAM_BRANDING.logoSizes.md.height}
              className="object-contain opacity-80 hover:opacity-100 transition-opacity duration-300"
              onError={() => setLogoError(true)}
            />
          )}
        </Link>

        <div className="flex items-center gap-8 text-sm text-text-tertiary">
          <Link 
            href="/privacy" 
            className="hover:text-text-primary transition-colors duration-300"
          >
            Privacy
          </Link>
          <Link 
            href="/terms" 
            className="hover:text-text-primary transition-colors duration-300"
          >
            Terms
          </Link>
          <a 
            href="mailto:support@aurastream.app" 
            className="hover:text-text-primary transition-colors duration-300"
          >
            Contact
          </a>
        </div>

        <p className="text-sm text-text-muted">
          © {new Date().getFullYear()} 1v1Bro LLC
        </p>
      </div>
    </footer>
  );
}

export default LandingFooter;
