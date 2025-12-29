/**
 * AuraStream Spacing Tokens
 * Premium Enterprise Design System
 * 
 * 8px Grid System with half-steps - Premium spec aligned
 * Updated: December 2025
 */

export const spacing = {
  // Spacing Scale (8px base) with half-steps
  0: '0',
  0.5: '0.125rem',   // 2px - Micro spacing
  1: '0.25rem',      // 4px - Tight spacing
  1.5: '0.375rem',   // 6px - Sub-unit (rare)
  2: '0.5rem',       // 8px - Base unit
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px - Breathing room
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px - Standard padding
  5: '1.25rem',      // 20px - Emphasis
  6: '1.5rem',       // 24px - Larger section padding
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px - Major section breaks
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px - Page-level spacing
  11: '2.75rem',     // 44px - Touch target minimum
  12: '3rem',        // 48px - Hero sections
  14: '3.5rem',      // 56px - Nav height desktop
  16: '4rem',        // 64px - Large layout blocks
  20: '5rem',        // 80px - Full-page margins
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
} as const;

// Component Spacing Standards - Premium spec aligned
export const componentSpacing = {
  // Button padding
  button: {
    xs: { x: '0.5rem', y: '0.25rem' },     // 8px, 4px - Extra small
    sm: { x: '0.75rem', y: '0.375rem' },   // 12px, 6px - Small
    md: { x: '1rem', y: '0.5rem' },        // 16px, 8px - Default
    lg: { x: '1.25rem', y: '0.625rem' },   // 20px, 10px - Large
  },
  // Input padding
  input: {
    sm: { x: '0.75rem', y: '0.5rem' },     // 12px, 8px
    md: { x: '1rem', y: '0.5rem' },        // 16px, 8px
    lg: { x: '1rem', y: '0.75rem' },       // 16px, 12px
  },
  // Card padding
  card: {
    compact: '0.5rem',   // 8px - Dense data tables
    sm: '1rem',          // 16px
    md: '1.5rem',        // 24px - Default
    lg: '2rem',          // 32px - Spacious
  },
  // Section spacing
  section: {
    sm: '2rem',          // 32px
    md: '3rem',          // 48px
    lg: '4rem',          // 64px
  },
  // Stack gap (vertical spacing between elements)
  stack: {
    xs: '0.25rem',       // 4px
    sm: '0.5rem',        // 8px
    md: '1rem',          // 16px
    lg: '1.5rem',        // 24px
    xl: '2rem',          // 32px
  },
  // Inline gap (horizontal spacing between elements)
  inline: {
    xs: '0.25rem',       // 4px
    sm: '0.5rem',        // 8px
    md: '1rem',          // 16px
    lg: '1.5rem',        // 24px
    xl: '2rem',          // 32px
  },
  // Container padding (page-level)
  container: {
    mobile: '1rem',      // 16px
    desktop: '1.5rem',   // 24px
  },
} as const;

// Border Radius - Premium spec scale
export const radius = {
  none: '0',
  sm: '0.375rem',    // 6px - Subtle, small components
  md: '0.5rem',      // 8px - Default (buttons, inputs)
  lg: '0.625rem',    // 10px - Medium (larger cards)
  xl: '0.75rem',     // 12px - Large (modals, panels)
  '2xl': '1rem',     // 16px - Extra large (hero sections)
  '3xl': '1.5rem',   // 24px - Very large (rare)
  full: '9999px',    // Pills, circular badges
} as const;

// Z-Index Scale - Premium spec aligned
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  modal: 1200,
  popover: 1300,
  tooltip: 1400,
  toast: 1500,
} as const;

// Breakpoints - Standard responsive
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Layout constants - Premium spec
export const layout = {
  maxContentWidth: '1280px',
  sidebarWidth: '256px',
  sidebarCollapsedWidth: '64px',
  navHeight: {
    desktop: '56px',
    mobile: '48px',
  },
  columnGap: '16px',
  rowGap: '12px',
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
export type Layout = typeof layout;
