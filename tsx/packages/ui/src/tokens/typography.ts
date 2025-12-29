/**
 * AuraStream Typography Tokens
 * Premium Enterprise Design System
 * 
 * Based on Premium UI Spec - System fonts, professional weights
 * Updated: December 2025
 */

export const typography = {
  // Font Families - Premium spec system stack
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    mono: '"Berkeley Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  
  // Font Sizes - Premium spec scale
  fontSize: {
    micro: '0.6875rem',  // 11px - Tooltips, hints
    xs: '0.75rem',       // 12px - Labels, tags, captions
    sm: '0.875rem',      // 14px - Body small, helper text
    base: '1rem',        // 16px - Body default
    lg: '1.125rem',      // 18px - H6, emphasis
    xl: '1.25rem',       // 20px - H5
    '2xl': '1.5rem',     // 24px - H4
    '3xl': '1.875rem',   // 30px - H3, Display mobile
    '4xl': '2.25rem',    // 36px - H2, Display
    '5xl': '3rem',       // 48px - H1
    '6xl': '3.75rem',    // 60px - Hero
  },
  
  // Font Weights - Premium spec with 550 semibold
  fontWeight: {
    normal: '400',     // Body, default text
    medium: '500',     // Labels, small headings
    semibold: '550',   // Subheadings, emphasized labels (Premium spec)
    bold: '600',       // Primary headings, strong emphasis
    extrabold: '700',  // Display headings
  },
  
  // Line Heights - Premium spec
  lineHeight: {
    none: '1',
    tight: '1.2',      // Headings
    snug: '1.3',       // Labels, tags
    normal: '1.5',     // Body text
    relaxed: '1.6',    // Monospace, loose body
    loose: '1.625',
  },
  
  // Letter Spacing - Premium spec
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',   // Headings
    normal: '0',         // Body
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',     // Overlines, uppercase labels
  },
  
  // Typography Presets - Premium spec aligned
  presets: {
    // Display / Hero
    display: {
      fontSize: '2.25rem',     // 36px desktop, 24-28px mobile
      fontWeight: '600',
      lineHeight: '1.2',
      letterSpacing: '-0.025em',
    },
    // Heading 1
    h1: {
      fontSize: '1.5rem',      // 24px desktop, 20px mobile
      fontWeight: '600',
      lineHeight: '1.3',
      letterSpacing: '-0.025em',
    },
    // Heading 2
    h2: {
      fontSize: '1.25rem',     // 20px desktop, 18px mobile
      fontWeight: '600',
      lineHeight: '1.4',
      letterSpacing: '-0.025em',
    },
    // Heading 3
    h3: {
      fontSize: '1.125rem',    // 18px desktop, 16px mobile
      fontWeight: '550',
      lineHeight: '1.4',
      letterSpacing: '0',
    },
    // Body / Paragraph
    body: {
      fontSize: '1rem',        // 16px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0',
    },
    // Body Small
    bodySmall: {
      fontSize: '0.875rem',    // 14px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0',
    },
    // Caption / Small
    caption: {
      fontSize: '0.875rem',    // 14px desktop, 13px mobile
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0',
    },
    // Label / Tag
    label: {
      fontSize: '0.75rem',     // 12px fixed
      fontWeight: '500',
      lineHeight: '1.3',
      letterSpacing: '0',
    },
    // Micro / Tooltip
    micro: {
      fontSize: '0.6875rem',   // 11px fixed
      fontWeight: '400',
      lineHeight: '1.3',
      letterSpacing: '0',
    },
    // Overline
    overline: {
      fontSize: '0.75rem',     // 12px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
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
