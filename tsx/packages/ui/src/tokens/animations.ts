/**
 * AuraStream Animation Tokens
 * Premium Enterprise Design System
 * 
 * Based on Premium UI Spec - Purposeful, subtle motion
 * Updated: December 2025
 */

export const animations = {
  // Duration Scale - Premium spec
  duration: {
    quick: '100ms',    // Micro-interactions: button presses, icon changes
    fast: '150ms',     // Modular interactions: menu opens, transitions
    normal: '200ms',   // Standard interactions: page transitions, modal opens (Premium default)
    slow: '300ms',     // Large-scale animations: full-page layout shifts
    slower: '400ms',   // Hero animations (use sparingly)
    slowest: '600ms',  // Very rare, special emphasis only
  },
  
  // Easing Functions - Premium spec cubic-bezier
  easing: {
    // Standard (most common) - Starts quickly, eases to end
    // Feels natural, "bouncy" but professional
    standard: 'cubic-bezier(0.16, 1, 0.3, 1)',
    
    // Default alias for standard
    default: 'cubic-bezier(0.16, 1, 0.3, 1)',
    
    // Linear - Constant speed (spinners, progress bars)
    linear: 'linear',
    
    // Ease-in - Slow start, fast end (exits, dismissals)
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    
    // Ease-out - Fast start, slow end (entrances, appears)
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    
    // Ease-in-out - Smooth both ends
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    
    // Spring - Slight overshoot (special emphasis)
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// CSS Transition Helpers - Premium spec patterns
export const transitions = {
  // Quick micro-interactions
  quick: `all ${animations.duration.quick} ${animations.easing.standard}`,
  
  // Fast modular interactions
  fast: `all ${animations.duration.fast} ${animations.easing.standard}`,
  
  // Standard interactions (default)
  normal: `all ${animations.duration.normal} ${animations.easing.standard}`,
  
  // Slow large-scale animations
  slow: `all ${animations.duration.slow} ${animations.easing.standard}`,
  
  // Spring effect
  spring: `all ${animations.duration.normal} ${animations.easing.spring}`,
  
  // Color-only transitions (buttons, links)
  colors: `background-color ${animations.duration.fast} ${animations.easing.standard}, color ${animations.duration.fast} ${animations.easing.standard}, border-color ${animations.duration.fast} ${animations.easing.standard}`,
  
  // Transform-only transitions (hover effects)
  transform: `transform ${animations.duration.fast} ${animations.easing.standard}`,
  
  // Opacity transitions (fade effects)
  opacity: `opacity ${animations.duration.normal} ${animations.easing.standard}`,
  
  // Shadow transitions (elevation changes)
  shadow: `box-shadow ${animations.duration.normal} ${animations.easing.standard}`,
} as const;

// Animation Patterns - Premium spec recommended
export const animationPatterns = {
  // Button hover: background color shift
  buttonHover: {
    duration: animations.duration.fast,
    easing: animations.easing.standard,
  },
  
  // Button press: slight scale
  buttonPress: {
    duration: animations.duration.quick,
    easing: animations.easing.linear,
    transform: 'scale(0.98)',
  },
  
  // Menu open: fade in + slide down
  menuOpen: {
    duration: animations.duration.normal,
    easing: animations.easing.standard,
  },
  
  // Menu close: fade out + slide up
  menuClose: {
    duration: animations.duration.fast,
    easing: animations.easing.in,
  },
  
  // Modal appear: fade in + scale up
  modalAppear: {
    duration: animations.duration.normal,
    easing: animations.easing.standard,
  },
  
  // Modal dismiss: fade out + scale down
  modalDismiss: {
    duration: animations.duration.normal,
    easing: animations.easing.in,
  },
  
  // Tooltip appear: fade in only
  tooltipAppear: {
    duration: animations.duration.quick,
    easing: animations.easing.linear,
  },
  
  // Card hover: shadow elevation + slight scale
  cardHover: {
    duration: animations.duration.normal,
    easing: animations.easing.standard,
    transform: 'scale(1.01)',
  },
  
  // Success feedback: checkmark animation
  successFeedback: {
    duration: animations.duration.slow,
    easing: animations.easing.standard,
  },
  
  // Page load: progressive content fade
  pageLoad: {
    duration: animations.duration.normal,
    easing: animations.easing.standard,
  },
} as const;

// Type exports for TypeScript
export type Animations = typeof animations;
export type DurationKey = keyof typeof animations.duration;
export type EasingKey = keyof typeof animations.easing;
export type TransitionKey = keyof typeof transitions;
export type AnimationPatternKey = keyof typeof animationPatterns;
