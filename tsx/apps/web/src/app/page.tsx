'use client';

// =============================================================================
// AuraStream Landing Page
// Enterprise-grade modular landing with animations
// =============================================================================

import {
  BackgroundEffects,
  LandingNav,
  ProductHero,
  AssetShowcase,
  CTASection,
  LandingFooter,
} from '@/components/landing';

// Import animations
import '@/components/landing/animations.css';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background-base relative overflow-x-hidden">
      {/* Background layer effects */}
      <BackgroundEffects 
        enableNoise={true}
        enableOrbs={true}
        enableGrid={true}
      />

      {/* Navigation */}
      <LandingNav />

      {/* Hero section */}
      <ProductHero />

      {/* Asset showcase gallery */}
      <AssetShowcase />

      {/* Call to action */}
      <CTASection />

      {/* Footer */}
      <LandingFooter />
    </main>
  );
}
