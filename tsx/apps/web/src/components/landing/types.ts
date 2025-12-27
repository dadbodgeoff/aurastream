// =============================================================================
// Landing Page Types
// =============================================================================

export interface ShowcaseAsset {
  type: 'Emote' | 'Thumbnail' | 'Logo' | 'Story';
  label: string;
  src: string;
  hasGreenBg: boolean;
  prompt: string;
}

export interface Platform {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface Feature {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavProps {
  scrolled: boolean;
}

export interface HeroShowcaseProps {
  assets: ShowcaseAsset[];
  prompts: string[];
}

export interface ScrollIndicatorProps {
  className?: string;
}

export interface ParallaxOrbProps {
  scrollY: number;
  mouseX: number;
  mouseY: number;
}
