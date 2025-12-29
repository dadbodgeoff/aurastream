/**
 * AuraStream Shadow Tokens
 * Premium Enterprise Design System
 * 
 * 5-tier elevation system based on Premium UI Spec
 * Updated: December 2025
 */

export const shadows = {
  // No shadow
  none: 'none',
  
  // Elevation 0 - Base/Flat (no shadow)
  // Use: Main background, base surfaces
  
  // Elevation 1 - Raised (Cards, panels, low-prominence content)
  sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
  
  // Elevation 2 - Floating (Interactive overlays, hovered cards, popovers)
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  
  // Elevation 3 - Modal/Dialog (Modals, drawers, menus with scrim)
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  
  // Elevation 4 - Toast/Floating Action (Notifications, FABs, highest priority)
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  
  // Elevation 5 - Maximum (Rare, for extreme emphasis)
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  
  // Focus Ring Tokens - Premium spec aligned
  ring: {
    default: '0 0 0 2px #21808D',
    offset: '0 0 0 2px #1F2121, 0 0 0 4px #21808D',
    // Focus ring with opacity for subtle effect
    subtle: '0 0 0 2px rgba(33, 128, 141, 0.4)',
  },
  
  // Inset shadow for depth on dark surfaces
  inset: {
    subtle: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    strong: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
  },
} as const;

// Elevation mapping for semantic usage
export const elevation = {
  0: shadows.none,      // Base layer
  1: shadows.sm,        // Cards, panels
  2: shadows.md,        // Floating overlays, hover states
  3: shadows.lg,        // Modals, drawers
  4: shadows.xl,        // Toasts, FABs
  5: shadows['2xl'],    // Maximum emphasis
} as const;

// Z-Index scale aligned with elevation
export const elevationZIndex = {
  base: 0,
  raised: 10,
  floating: 20,
  sticky: 30,
  backdrop: 90,
  modal: 100,
  toast: 200,
  tooltip: 250,
} as const;

// Type exports for TypeScript
export type Shadows = typeof shadows;
export type ShadowKey = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type RingKey = keyof typeof shadows.ring;
export type InsetKey = keyof typeof shadows.inset;
export type ElevationLevel = keyof typeof elevation;
