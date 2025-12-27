/**
 * Streamer Studio Shadow Tokens
 * Enterprise Design System
 * 
 * Standard elevation shadows only - no glow effects
 */

export const shadows = {
  // No shadow
  none: 'none',
  
  // Standard Elevation Shadows
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  
  // Focus Ring Tokens
  ring: {
    default: '0 0 0 2px #2563EB',
    offset: '0 0 0 2px #0F172A, 0 0 0 4px #2563EB',
  },
} as const;

// Type exports for TypeScript
export type Shadows = typeof shadows;
export type ShadowKey = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type RingKey = keyof typeof shadows.ring;
