/**
 * Streamer Studio Typography Tokens
 * Enterprise Design System
 */

export const typography = {
  // Font Families (no display font)
  fontFamily: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
  
  // Font Sizes
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
  },
  
  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Line Heights
  lineHeight: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
  },
  
  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
  
  // Typography Presets
  presets: {
    h1: {
      fontSize: '3rem',        // 48px
      fontWeight: '700',
      lineHeight: '1.25',
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2.25rem',     // 36px
      fontWeight: '700',
      lineHeight: '1.25',
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.875rem',    // 30px
      fontWeight: '600',
      lineHeight: '1.375',
      letterSpacing: '-0.025em',
    },
    h4: {
      fontSize: '1.5rem',      // 24px
      fontWeight: '600',
      lineHeight: '1.375',
      letterSpacing: '0',
    },
    h5: {
      fontSize: '1.25rem',     // 20px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0',
    },
    h6: {
      fontSize: '1.125rem',    // 18px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0',
    },
    body: {
      fontSize: '1rem',        // 16px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0',
    },
    bodySmall: {
      fontSize: '0.875rem',    // 14px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0',
    },
    caption: {
      fontSize: '0.75rem',     // 12px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0',
    },
    overline: {
      fontSize: '0.75rem',     // 12px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
    },
    label: {
      fontSize: '0.875rem',    // 14px
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0',
    },
  },
} as const;

// Type exports for TypeScript
export type Typography = typeof typography;
export type FontFamily = keyof typeof typography.fontFamily;
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type LineHeight = keyof typeof typography.lineHeight;
export type LetterSpacing = keyof typeof typography.letterSpacing;
export type TypographyPreset = keyof typeof typography.presets;
