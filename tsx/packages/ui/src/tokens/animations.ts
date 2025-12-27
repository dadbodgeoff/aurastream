/**
 * Streamer Studio Animation Tokens
 * Based on Master Schema Appendix E
 */

export const animations = {
  // Duration
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  // Easing Functions
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// CSS Transition Helpers
export const transitions = {
  fast: `all ${animations.duration.fast} ${animations.easing.default}`,
  normal: `all ${animations.duration.normal} ${animations.easing.default}`,
  slow: `all ${animations.duration.slow} ${animations.easing.default}`,
  spring: `all ${animations.duration.normal} ${animations.easing.spring}`,
} as const;

// Type exports for TypeScript
export type Animations = typeof animations;
export type DurationKey = keyof typeof animations.duration;
export type EasingKey = keyof typeof animations.easing;
export type TransitionKey = keyof typeof transitions;
