/**
 * AuraStream Branding Configuration
 * 
 * Centralized configuration for brand assets loaded from Supabase storage.
 * All logo URLs should reference this config to ensure consistency.
 */

// Supabase storage base URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qgyvdadgdomnubngfpun.supabase.co';
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public`;

/**
 * AuraStream brand assets configuration
 */
export const AURASTREAM_BRANDING = {
  /**
   * Main logo - transparent PNG (669x373)
   * Use for headers, navigation, and general branding
   */
  logo: {
    url: `${STORAGE_BASE}/public-assets/branding/aurastream-logo.png`,
    width: 669,
    height: 373,
    alt: 'AuraStream',
  },
  
  /**
   * Logo sizes for different contexts
   * Maintains aspect ratio (669:373 ≈ 1.79:1)
   */
  logoSizes: {
    /** Small - for compact headers, mobile nav (32px height) */
    sm: { width: 57, height: 32 },
    /** Medium - for standard headers (40px height) */
    md: { width: 72, height: 40 },
    /** Large - for hero sections, splash screens (64px height) */
    lg: { width: 115, height: 64 },
    /** Extra large - for marketing, about pages (96px height) */
    xl: { width: 172, height: 96 },
  },
  
  /**
   * Brand name for text fallbacks
   */
  name: 'AuraStream',
  
  /**
   * Brand tagline
   */
  tagline: 'Your stream. Your brand. Every platform.',
  
  /**
   * Brand colors (for fallback/reference)
   */
  colors: {
    primary: '#7C3AED', // Purple
    secondary: '#06B6D4', // Cyan
    accent: '#F59E0B', // Amber
  },
} as const;

/**
 * Get logo URL with optional cache-busting
 */
export function getLogoUrl(bustCache = false): string {
  const url = AURASTREAM_BRANDING.logo.url;
  return bustCache ? `${url}?v=${Date.now()}` : url;
}

/**
 * Get logo dimensions for a specific size
 */
export function getLogoDimensions(size: keyof typeof AURASTREAM_BRANDING.logoSizes) {
  return AURASTREAM_BRANDING.logoSizes[size];
}

export default AURASTREAM_BRANDING;
