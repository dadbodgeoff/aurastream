/**
 * Canvas Bounds System - Type Definitions
 * 
 * Defines streaming-standard canvas sizes and safe zones for OBS integration.
 * Ensures animations stay within bounds that streamers can resize/position.
 */

// ============================================================================
// Standard Streaming Resolutions
// ============================================================================

/**
 * Common streaming canvas presets.
 */
export type CanvasPreset = 
  | '1080p'      // 1920x1080 - Full HD (most common)
  | '720p'       // 1280x720 - HD
  | '4k'         // 3840x2160 - 4K UHD
  | '1440p'      // 2560x1440 - QHD
  | 'square'     // 1080x1080 - Square (alerts, emotes)
  | 'vertical'   // 1080x1920 - Vertical (TikTok, Shorts)
  | 'custom';    // User-defined

/**
 * Canvas dimensions in pixels.
 */
export interface CanvasDimensions {
  width: number;
  height: number;
}

/**
 * Standard preset dimensions.
 */
export const CANVAS_PRESETS: Record<Exclude<CanvasPreset, 'custom'>, CanvasDimensions> = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '4k': { width: 3840, height: 2160 },
  '1440p': { width: 2560, height: 1440 },
  'square': { width: 1080, height: 1080 },
  'vertical': { width: 1080, height: 1920 },
};

// ============================================================================
// Safe Zones
// ============================================================================

/**
 * Safe zone margins as percentage of canvas dimensions.
 * Content within safe zones won't be cut off on different displays.
 */
export interface SafeZoneMargins {
  /** Top margin as percentage (0-1) */
  top: number;
  /** Right margin as percentage (0-1) */
  right: number;
  /** Bottom margin as percentage (0-1) */
  bottom: number;
  /** Left margin as percentage (0-1) */
  left: number;
}

/**
 * Standard safe zone presets.
 */
export const SAFE_ZONE_PRESETS = {
  /** No margins - full canvas */
  none: { top: 0, right: 0, bottom: 0, left: 0 },
  /** Broadcast safe (5% margins) - standard TV safe area */
  broadcast: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
  /** Action safe (3.5% margins) - where action should stay */
  action: { top: 0.035, right: 0.035, bottom: 0.035, left: 0.035 },
  /** Title safe (10% margins) - where text should stay */
  title: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
  /** OBS overlay safe (15% margins) - accounts for webcam/chat overlays */
  overlay: { top: 0.15, right: 0.15, bottom: 0.15, left: 0.15 },
} as const;

export type SafeZonePreset = keyof typeof SAFE_ZONE_PRESETS;

// ============================================================================
// Bounds Configuration
// ============================================================================

/**
 * Complete bounds configuration for an animation canvas.
 */
export interface CanvasBoundsConfig {
  /** Canvas preset or 'custom' */
  preset: CanvasPreset;
  /** Canvas dimensions (required if preset is 'custom') */
  dimensions: CanvasDimensions;
  /** Safe zone preset or custom margins */
  safeZone: SafeZonePreset | SafeZoneMargins;
  /** Whether to enforce bounds (clamp animations to safe zone) */
  enforceBounds: boolean;
  /** Padding inside safe zone in pixels */
  innerPadding: number;
  /** Background color (CSS color or 'transparent') */
  backgroundColor: string;
}

/**
 * Default bounds configuration - 1080p with broadcast safe zone.
 */
export const DEFAULT_BOUNDS_CONFIG: CanvasBoundsConfig = {
  preset: '1080p',
  dimensions: CANVAS_PRESETS['1080p'],
  safeZone: 'broadcast',
  enforceBounds: true,
  innerPadding: 20,
  backgroundColor: 'transparent',
};

// ============================================================================
// Computed Bounds
// ============================================================================

/**
 * Computed bounds in pixels, ready for use in animations.
 */
export interface ComputedBounds {
  /** Full canvas dimensions */
  canvas: CanvasDimensions;
  /** Safe zone rectangle in pixels */
  safeZone: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Center point of safe zone */
  center: {
    x: number;
    y: number;
  };
  /** Maximum animation extents (how far animations can move) */
  maxExtent: {
    x: number;
    y: number;
  };
  /** Aspect ratio */
  aspectRatio: number;
  /** Scale factor relative to 1080p (for consistent animation sizing) */
  scaleFactor: number;
}

// ============================================================================
// Animation Constraint Types
// ============================================================================

/**
 * How to handle animations that exceed bounds.
 */
export type BoundsOverflowBehavior = 
  | 'clamp'      // Hard stop at boundary
  | 'bounce'     // Bounce back from boundary
  | 'wrap'       // Wrap to opposite side
  | 'fade'       // Fade out as approaching boundary
  | 'none';      // Allow overflow (for particles, etc.)

/**
 * Constraint configuration for a specific animation property.
 */
export interface PropertyConstraint {
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Overflow behavior */
  overflow: BoundsOverflowBehavior;
  /** Fade distance (for 'fade' overflow) as percentage of range */
  fadeDistance?: number;
}

/**
 * Complete constraint set for animation transforms.
 */
export interface AnimationConstraints {
  /** Position X constraint (in pixels from center) */
  positionX: PropertyConstraint;
  /** Position Y constraint (in pixels from center) */
  positionY: PropertyConstraint;
  /** Scale constraint */
  scale: PropertyConstraint;
  /** Rotation constraint (in radians) */
  rotation: PropertyConstraint;
}

// ============================================================================
// Element Placement
// ============================================================================

/**
 * Anchor point for element positioning.
 */
export type AnchorPoint = 
  | 'center'
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

/**
 * Element placement within the canvas.
 */
export interface ElementPlacement {
  /** Anchor point for positioning */
  anchor: AnchorPoint;
  /** Offset from anchor in pixels */
  offsetX: number;
  offsetY: number;
  /** Element dimensions */
  width: number;
  height: number;
  /** Z-index for layering */
  zIndex: number;
}

/**
 * Default element placement - centered.
 */
export const DEFAULT_PLACEMENT: ElementPlacement = {
  anchor: 'center',
  offsetX: 0,
  offsetY: 0,
  width: 512,
  height: 512,
  zIndex: 0,
};
