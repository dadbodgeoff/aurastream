/**
 * Streamer Studio Spacing Tokens
 * Enterprise Design System
 * 
 * 8px Grid System with half-step values
 */

export const spacing = {
  // Spacing Scale (8px base) with half-steps
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
} as const;

// Component Spacing Standards
export const componentSpacing = {
  // Button padding
  button: {
    sm: { x: '0.75rem', y: '0.375rem' },   // 12px, 6px
    md: { x: '1rem', y: '0.5rem' },         // 16px, 8px
    lg: { x: '1.5rem', y: '0.75rem' },      // 24px, 12px
  },
  // Input padding
  input: {
    sm: { x: '0.75rem', y: '0.375rem' },   // 12px, 6px
    md: { x: '1rem', y: '0.5rem' },         // 16px, 8px
    lg: { x: '1rem', y: '0.75rem' },        // 16px, 12px
  },
  // Card padding
  card: {
    sm: '1rem',        // 16px
    md: '1.5rem',      // 24px
    lg: '2rem',        // 32px
  },
  // Section spacing
  section: {
    sm: '2rem',        // 32px
    md: '3rem',        // 48px
    lg: '4rem',        // 64px
  },
  // Stack gap (vertical spacing between elements)
  stack: {
    xs: '0.25rem',     // 4px
    sm: '0.5rem',      // 8px
    md: '1rem',        // 16px
    lg: '1.5rem',      // 24px
    xl: '2rem',        // 32px
  },
  // Inline gap (horizontal spacing between elements)
  inline: {
    xs: '0.25rem',     // 4px
    sm: '0.5rem',      // 8px
    md: '1rem',        // 16px
    lg: '1.5rem',      // 24px
    xl: '2rem',        // 32px
  },
} as const;

// Border Radius
export const radius = {
  none: '0',
  sm: '0.25rem',    // 4px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// Z-Index Scale
export const zIndex = {
  dropdown: 1000,
  sticky: 1100,
  modal: 1200,
  popover: 1300,
  tooltip: 1400,
  toast: 1500,
} as const;

// Breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Type exports for TypeScript
export type Spacing = typeof spacing;
export type SpacingKey = keyof typeof spacing;
export type ComponentSpacing = typeof componentSpacing;
export type Radius = typeof radius;
export type RadiusKey = keyof typeof radius;
export type ZIndex = typeof zIndex;
export type ZIndexKey = keyof typeof zIndex;
export type Breakpoints = typeof breakpoints;
export type BreakpointKey = keyof typeof breakpoints;
