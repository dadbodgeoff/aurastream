'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const HERO_BACKGROUND_URL = 'https://qgyvdadgdomnubngfpun.supabase.co/storage/v1/object/public/streamer-studio-assets/landing/hero-background.jpeg';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use state to avoid hydration mismatch with server date
  const [year, setYear] = useState<number | null>(null);
  
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-base p-4 relative overflow-hidden">
      {/* Hero background image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${HERO_BACKGROUND_URL})`,
          opacity: 0.5,
        }}
      />
      
      {/* Overlay for text readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-background-base/40 via-background-base/50 to-background-base/70 pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo and tagline */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-interactive-600">
              Aurastream
            </h1>
          </Link>
          <p className="text-text-secondary mt-2">AI-powered streaming assets</p>
        </div>
        
        {/* Auth card */}
        <div className="bg-background-surface/90 rounded-xl p-8 shadow-lg border border-border-default backdrop-blur-md">
          {children}
        </div>
        
        {/* Footer */}
        <div className="text-center mt-6 text-text-tertiary text-sm">
          <p>
            © {year ?? '2025'} Aurastream. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
