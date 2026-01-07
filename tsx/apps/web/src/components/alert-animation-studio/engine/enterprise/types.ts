/**
 * Enterprise Animation System - Core Types
 * 
 * Single responsibility: Type definitions for the enterprise animation layer.
 * All types are strict, validated, and designed for type-safety.
 */

// ============================================================================
// Configuration Tier
// ============================================================================

/**
 * Animation quality tiers that can be selected by users or set by subscription.
 */
export type AnimationTier = 'standard' | 'professional' | 'enterprise';

/**
 * Global configuration for the enterprise animation system.
 */
export interface EnterpriseAnimationConfig {
  /** Current animation tier */
  tier: AnimationTier;
  /** Whether to use GPU acceleration when available */
  useGPU: boolean;
  /** Maximum particle count (tier-dependent) */
  maxParticles: number;
  /** Enable motion blur effects */
  motionBlur: boolean;
  /** Enable particle trails */
  particleTrails: boolean;
  /** Quality multiplier (0.5 = half, 1 = full, 2 = double) */
  qualityMultiplier: number;
}

// ============================================================================
// Motion Design Types
// ============================================================================

/**
 * Professional motion curve with anticipation and overshoot.
 */
export interface MotionCurve {
  /** Anticipation amount (0-1, portion of duration for wind-up) */
  anticipation: number;
  /** Anticipation distance (how far to pull back, 0-1) */
  anticipationDistance: number;
  /** Overshoot amount (0-1, how far past target) */
  overshoot: number;
  /** Number of settle oscillations after overshoot */
  settleOscillations: number;
  /** Settle damping (how quickly oscillations decay, 0-1) */
  settleDamping: number;
}

/**
 * Squash and stretch parameters for organic motion.
 */
export interface SquashStretch {
  /** Enable squash/stretch effect */
  enabled: boolean;
  /** Maximum squash ratio (< 1, e.g., 0.8 = 20% squash) */
  squashRatio: number;
  /** Maximum stretch ratio (> 1, e.g., 1.2 = 20% stretch) */
  stretchRatio: number;
  /** Axis of squash/stretch ('x' | 'y' | 'velocity') */
  axis: 'x' | 'y' | 'velocity';
}

/**
 * Secondary motion parameters for follow-through effects.
 */
export interface SecondaryMotion {
  /** Enable secondary motion */
  enabled: boolean;
  /** Delay factor (0-1, how much secondary lags behind primary) */
  delay: number;
  /** Damping (how quickly secondary catches up, 0-1) */
  damping: number;
  /** Rotation influence (how much position affects rotation) */
  rotationInfluence: number;
}

// ============================================================================
// Organic Motion Types
// ============================================================================

/**
 * Layered frequency configuration for organic loop animations.
 */
export interface FrequencyLayer {
  /** Frequency multiplier relative to base */
  frequency: number;
  /** Amplitude multiplier relative to base */
  amplitude: number;
  /** Phase offset in radians */
  phase: number;
}

/**
 * Noise injection parameters for organic feel.
 */
export interface NoiseConfig {
  /** Enable noise injection */
  enabled: boolean;
  /** Noise type */
  type: 'perlin' | 'simplex' | 'fbm' | 'value';
  /** Noise frequency (higher = more detail) */
  frequency: number;
  /** Noise amplitude (strength of effect) */
  amplitude: number;
  /** Number of octaves for fbm noise */
  octaves: number;
  /** Persistence for fbm (amplitude decay per octave) */
  persistence: number;
  /** Seed for deterministic noise */
  seed: number;
}

/**
 * Micro-jitter for "always alive" feel.
 */
export interface MicroJitter {
  /** Enable micro-jitter */
  enabled: boolean;
  /** Position jitter amplitude (pixels) */
  positionAmplitude: number;
  /** Rotation jitter amplitude (degrees) */
  rotationAmplitude: number;
  /** Scale jitter amplitude (ratio) */
  scaleAmplitude: number;
  /** Jitter frequency (Hz) */
  frequency: number;
}

// ============================================================================
// Particle Enhancement Types
// ============================================================================

/**
 * Particle trail configuration.
 */
export interface ParticleTrailConfig {
  /** Enable trails */
  enabled: boolean;
  /** Number of trail segments */
  length: number;
  /** Trail opacity decay (0-1 per segment) */
  opacityDecay: number;
  /** Trail size decay (0-1 per segment) */
  sizeDecay: number;
  /** Trail update frequency (frames between updates) */
  updateFrequency: number;
}

/**
 * Color evolution over particle lifetime.
 */
export interface ColorEvolution {
  /** Enable color evolution */
  enabled: boolean;
  /** Color stops (position 0-1, color as hex) */
  stops: Array<{ position: number; color: string }>;
  /** Interpolation mode */
  interpolation: 'linear' | 'smooth' | 'step';
}

/**
 * Size evolution over particle lifetime.
 */
export interface SizeEvolution {
  /** Enable size evolution */
  enabled: boolean;
  /** Size curve keyframes (position 0-1, scale multiplier) */
  curve: Array<{ position: number; scale: number }>;
  /** Interpolation mode */
  interpolation: 'linear' | 'smooth' | 'step';
}

/**
 * Emission curve for particle spawning patterns.
 */
export interface EmissionCurve {
  /** Emission pattern type */
  type: 'constant' | 'burst' | 'wave' | 'decay' | 'custom';
  /** For burst: number of particles per burst */
  burstCount?: number;
  /** For burst: interval between bursts (ms) */
  burstInterval?: number;
  /** For wave: wave frequency */
  waveFrequency?: number;
  /** For decay: decay rate */
  decayRate?: number;
  /** For custom: keyframes (time 0-1, rate multiplier) */
  customCurve?: Array<{ time: number; rate: number }>;
}

// ============================================================================
// Enhanced Animation Configs
// ============================================================================

/**
 * Enterprise entry animation configuration.
 * Extends base config with motion design principles.
 */
export interface EnterpriseEntryConfig {
  /** Motion curve for professional feel */
  motionCurve: MotionCurve;
  /** Squash and stretch for organic motion */
  squashStretch: SquashStretch;
  /** Secondary motion for follow-through */
  secondaryMotion: SecondaryMotion;
  /** Stagger delay for multi-element animations (ms) */
  staggerDelay: number;
  /** Stagger direction */
  staggerDirection: 'forward' | 'reverse' | 'center' | 'random';
}

/**
 * Enterprise loop animation configuration.
 * Extends base config with organic motion.
 */
export interface EnterpriseLoopConfig {
  /** Additional frequency layers for complexity */
  frequencyLayers: FrequencyLayer[];
  /** Noise injection for organic feel */
  noise: NoiseConfig;
  /** Micro-jitter for "always alive" feel */
  microJitter: MicroJitter;
  /** Phase randomization range (radians) */
  phaseRandomization: number;
}

/**
 * Enterprise particle configuration.
 * Extends base config with advanced physics and visuals.
 */
export interface EnterpriseParticleConfig {
  /** Particle trails */
  trails: ParticleTrailConfig;
  /** Color evolution over lifetime */
  colorEvolution: ColorEvolution;
  /** Size evolution over lifetime */
  sizeEvolution: SizeEvolution;
  /** Emission curve */
  emissionCurve: EmissionCurve;
  /** Enhanced turbulence using proper noise */
  turbulenceNoise: NoiseConfig;
  /** Drag coefficient (0 = no drag, 1 = full drag) */
  drag: number;
  /** Air resistance (affects velocity decay) */
  airResistance: number;
}

// ============================================================================
// Validation Result
// ============================================================================

/**
 * Result of configuration validation.
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** Validation errors if any */
  errors: ValidationError[];
  /** Warnings (non-fatal issues) */
  warnings: ValidationWarning[];
}

export interface ValidationError {
  /** Field path that failed validation */
  field: string;
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code: string;
}

export interface ValidationWarning {
  /** Field path with warning */
  field: string;
  /** Warning message */
  message: string;
  /** Suggested fix */
  suggestion?: string;
}
