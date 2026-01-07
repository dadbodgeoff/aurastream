/**
 * Easing Functions
 *
 * Industry-standard easing curves for animations.
 * Based on GSAP/CSS easing conventions.
 */

export type EasingFunction = (t: number) => number;

// ============================================================================
// Basic Easings
// ============================================================================

export const linear: EasingFunction = (t) => t;

// ============================================================================
// Power Easings (Quadratic, Cubic, Quartic, Quintic)
// ============================================================================

export const power1 = {
  in: (t: number) => t * t,
  out: (t: number) => 1 - Math.pow(1 - t, 2),
  inOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};

export const power2 = {
  in: (t: number) => t * t * t,
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  inOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

export const power3 = {
  in: (t: number) => t * t * t * t,
  out: (t: number) => 1 - Math.pow(1 - t, 4),
  inOut: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
};

export const power4 = {
  in: (t: number) => t * t * t * t * t,
  out: (t: number) => 1 - Math.pow(1 - t, 5),
  inOut: (t: number) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
};

// ============================================================================
// Sine Easings
// ============================================================================

export const sine = {
  in: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  out: (t: number) => Math.sin((t * Math.PI) / 2),
  inOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
};

// ============================================================================
// Exponential Easings
// ============================================================================

export const expo = {
  in: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  out: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOut: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
};

// ============================================================================
// Circular Easings
// ============================================================================

export const circ = {
  in: (t: number) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
  out: (t: number) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  inOut: (t: number) => t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
};

// ============================================================================
// Back Easings (Overshoot)
// ============================================================================

export const back = {
  in: (t: number, overshoot = 1.70158) => {
    const c3 = overshoot + 1;
    return c3 * t * t * t - overshoot * t * t;
  },
  out: (t: number, overshoot = 1.70158) => {
    const c3 = overshoot + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
  },
  inOut: (t: number, overshoot = 1.70158) => {
    const c2 = overshoot * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
};

// ============================================================================
// Elastic Easings
// ============================================================================

export const elastic = {
  in: (t: number, amplitude = 1, period = 0.3) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const s = period / (2 * Math.PI) * Math.asin(1 / amplitude);
    return -(amplitude * Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1 - s) * (2 * Math.PI) / period));
  },
  out: (t: number, amplitude = 1, period = 0.3) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const s = period / (2 * Math.PI) * Math.asin(1 / amplitude);
    return amplitude * Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / period) + 1;
  },
  inOut: (t: number, amplitude = 1, period = 0.45) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const s = period / (2 * Math.PI) * Math.asin(1 / amplitude);
    if (t < 0.5) {
      return -(amplitude * Math.pow(2, 10 * (2 * t - 1)) * Math.sin((2 * t - 1 - s) * (2 * Math.PI) / period)) / 2;
    }
    return amplitude * Math.pow(2, -10 * (2 * t - 1)) * Math.sin((2 * t - 1 - s) * (2 * Math.PI) / period) / 2 + 1;
  },
};

// ============================================================================
// Bounce Easings
// ============================================================================

export const bounce = {
  out: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  in: (t: number) => 1 - bounce.out(1 - t),
  inOut: (t: number) => t < 0.5
    ? (1 - bounce.out(1 - 2 * t)) / 2
    : (1 + bounce.out(2 * t - 1)) / 2,
};

// ============================================================================
// Easing Resolver (string -> function)
// ============================================================================

const easingMap: Record<string, EasingFunction> = {
  'linear': linear,
  'power1.in': power1.in,
  'power1.out': power1.out,
  'power1.inOut': power1.inOut,
  'power2.in': power2.in,
  'power2.out': power2.out,
  'power2.inOut': power2.inOut,
  'power3.in': power3.in,
  'power3.out': power3.out,
  'power3.inOut': power3.inOut,
  'power4.in': power4.in,
  'power4.out': power4.out,
  'power4.inOut': power4.inOut,
  'sine.in': sine.in,
  'sine.out': sine.out,
  'sine.inOut': sine.inOut,
  'expo.in': expo.in,
  'expo.out': expo.out,
  'expo.inOut': expo.inOut,
  'circ.in': circ.in,
  'circ.out': circ.out,
  'circ.inOut': circ.inOut,
  'back.in': back.in,
  'back.out': back.out,
  'back.inOut': back.inOut,
  'back.out(1.7)': (t) => back.out(t, 1.7),
  'elastic.in': elastic.in,
  'elastic.out': elastic.out,
  'elastic.inOut': elastic.inOut,
  'elastic.out(1, 0.3)': (t) => elastic.out(t, 1, 0.3),
  'bounce.in': bounce.in,
  'bounce.out': bounce.out,
  'bounce.inOut': bounce.inOut,
};

/**
 * Get easing function by name
 */
export function getEasing(name: string): EasingFunction {
  return easingMap[name] || power2.out;
}

/**
 * List all available easing names
 */
export function getAvailableEasings(): string[] {
  return Object.keys(easingMap);
}
