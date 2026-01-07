/**
 * Timeline Editor Engine - Type Definitions
 *
 * After Effects-style keyframe animation control types.
 * Supports bezier curve handles, multiple tracks, and property animation.
 */

import type { EasingName } from '../animations/core/types';

// ============================================================================
// Keyframe Types
// ============================================================================

/**
 * Bezier handle for custom easing curves.
 * Values are relative to keyframe position.
 */
export interface BezierHandle {
  /** Time offset (0-1 normalized to segment) */
  x: number;
  /** Value offset (can exceed 0-1 for overshoot) */
  y: number;
}

/**
 * A single keyframe on a property track.
 */
export interface Keyframe {
  /** Unique identifier */
  id: string;
  /** Time position in milliseconds from start */
  time: number;
  /** The value at this keyframe */
  value: number;
  /** Easing function TO this keyframe */
  easing: EasingName;
  /** Incoming tangent (from previous keyframe) */
  handleIn?: BezierHandle;
  /** Outgoing tangent (to next keyframe) */
  handleOut?: BezierHandle;
  /** Whether keyframe is selected in UI */
  selected?: boolean;
  /** Whether keyframe is locked from editing */
  locked?: boolean;
}

// ============================================================================
// Track Types
// ============================================================================

/**
 * All properties that can be animated via keyframes.
 * Includes transform, effects, depth, and particle properties.
 */
export type AnimatableProperty =
  // Transform - Scale
  | 'scaleX'
  | 'scaleY'
  | 'scaleZ'
  | 'scaleUniform'
  // Transform - Position
  | 'positionX'
  | 'positionY'
  | 'positionZ'
  // Transform - Rotation
  | 'rotationX'
  | 'rotationY'
  | 'rotationZ'
  // Transform - Anchor
  | 'anchorX'
  | 'anchorY'
  // Transform - Opacity
  | 'opacity'
  // Effects - Glow
  | 'glowIntensity'
  | 'glowRadius'
  | 'glowColorH'
  | 'glowColorS'
  | 'glowColorL'
  // Effects - Blur
  | 'blurAmount'
  // Effects - RGB Split
  | 'rgbSplitAmount'
  // Depth
  | 'depthIntensity'
  | 'depthScale'
  // Particles
  | 'particleSpawnRate'
  | 'particleSpeed'
  | 'particleSize'
  | 'particleOpacity';

/**
 * Property category for grouping in UI.
 */
export type PropertyCategory = 'transform' | 'effects' | 'depth' | 'particles';

/**
 * Property metadata for UI and validation.
 */
export interface PropertyMeta {
  /** The property identifier */
  property: AnimatableProperty;
  /** Human-readable display name */
  displayName: string;
  /** Category for grouping */
  category: PropertyCategory;
  /** Default value when no keyframes exist */
  defaultValue: number;
  /** Minimum allowed value */
  min: number;
  /** Maximum allowed value */
  max: number;
  /** Step increment for UI controls */
  step: number;
  /** Unit label (e.g., '%', 'px', '°') */
  unit?: string;
}

/**
 * Complete property metadata for all animatable properties.
 */
export const PROPERTY_METADATA: Record<AnimatableProperty, PropertyMeta> = {
  // Transform - Scale
  scaleX: {
    property: 'scaleX',
    displayName: 'Scale X',
    category: 'transform',
    defaultValue: 1,
    min: 0,
    max: 5,
    step: 0.01,
    unit: 'x',
  },
  scaleY: {
    property: 'scaleY',
    displayName: 'Scale Y',
    category: 'transform',
    defaultValue: 1,
    min: 0,
    max: 5,
    step: 0.01,
    unit: 'x',
  },
  scaleZ: {
    property: 'scaleZ',
    displayName: 'Scale Z',
    category: 'transform',
    defaultValue: 1,
    min: 0,
    max: 5,
    step: 0.01,
    unit: 'x',
  },
  scaleUniform: {
    property: 'scaleUniform',
    displayName: 'Scale',
    category: 'transform',
    defaultValue: 1,
    min: 0,
    max: 5,
    step: 0.01,
    unit: 'x',
  },
  // Transform - Position
  positionX: {
    property: 'positionX',
    displayName: 'Position X',
    category: 'transform',
    defaultValue: 0,
    min: -1,
    max: 1,
    step: 0.01,
  },
  positionY: {
    property: 'positionY',
    displayName: 'Position Y',
    category: 'transform',
    defaultValue: 0,
    min: -1,
    max: 1,
    step: 0.01,
  },
  positionZ: {
    property: 'positionZ',
    displayName: 'Position Z',
    category: 'transform',
    defaultValue: 0,
    min: -1,
    max: 1,
    step: 0.01,
  },
  // Transform - Rotation
  rotationX: {
    property: 'rotationX',
    displayName: 'Rotation X',
    category: 'transform',
    defaultValue: 0,
    min: -360,
    max: 360,
    step: 1,
    unit: '°',
  },
  rotationY: {
    property: 'rotationY',
    displayName: 'Rotation Y',
    category: 'transform',
    defaultValue: 0,
    min: -360,
    max: 360,
    step: 1,
    unit: '°',
  },
  rotationZ: {
    property: 'rotationZ',
    displayName: 'Rotation Z',
    category: 'transform',
    defaultValue: 0,
    min: -360,
    max: 360,
    step: 1,
    unit: '°',
  },
  // Transform - Anchor
  anchorX: {
    property: 'anchorX',
    displayName: 'Anchor X',
    category: 'transform',
    defaultValue: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
  },
  anchorY: {
    property: 'anchorY',
    displayName: 'Anchor Y',
    category: 'transform',
    defaultValue: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
  },
  // Transform - Opacity
  opacity: {
    property: 'opacity',
    displayName: 'Opacity',
    category: 'transform',
    defaultValue: 1,
    min: 0,
    max: 1,
    step: 0.01,
    unit: '%',
  },
  // Effects - Glow
  glowIntensity: {
    property: 'glowIntensity',
    displayName: 'Glow Intensity',
    category: 'effects',
    defaultValue: 0,
    min: 0,
    max: 1,
    step: 0.01,
  },
  glowRadius: {
    property: 'glowRadius',
    displayName: 'Glow Radius',
    category: 'effects',
    defaultValue: 10,
    min: 0,
    max: 100,
    step: 1,
    unit: 'px',
  },
  glowColorH: {
    property: 'glowColorH',
    displayName: 'Glow Hue',
    category: 'effects',
    defaultValue: 0,
    min: 0,
    max: 360,
    step: 1,
    unit: '°',
  },
  glowColorS: {
    property: 'glowColorS',
    displayName: 'Glow Saturation',
    category: 'effects',
    defaultValue: 1,
    min: 0,
    max: 1,
    step: 0.01,
  },
  glowColorL: {
    property: 'glowColorL',
    displayName: 'Glow Lightness',
    category: 'effects',
    defaultValue: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
  },
  // Effects - Blur
  blurAmount: {
    property: 'blurAmount',
    displayName: 'Blur',
    category: 'effects',
    defaultValue: 0,
    min: 0,
    max: 50,
    step: 0.5,
    unit: 'px',
  },
  // Effects - RGB Split
  rgbSplitAmount: {
    property: 'rgbSplitAmount',
    displayName: 'RGB Split',
    category: 'effects',
    defaultValue: 0,
    min: 0,
    max: 20,
    step: 0.5,
    unit: 'px',
  },
  // Depth
  depthIntensity: {
    property: 'depthIntensity',
    displayName: 'Depth Intensity',
    category: 'depth',
    defaultValue: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
  },
  depthScale: {
    property: 'depthScale',
    displayName: 'Depth Scale',
    category: 'depth',
    defaultValue: 30,
    min: 0,
    max: 100,
    step: 1,
  },
  // Particles
  particleSpawnRate: {
    property: 'particleSpawnRate',
    displayName: 'Spawn Rate',
    category: 'particles',
    defaultValue: 10,
    min: 0,
    max: 100,
    step: 1,
    unit: '/s',
  },
  particleSpeed: {
    property: 'particleSpeed',
    displayName: 'Particle Speed',
    category: 'particles',
    defaultValue: 1,
    min: 0,
    max: 5,
    step: 0.1,
    unit: 'x',
  },
  particleSize: {
    property: 'particleSize',
    displayName: 'Particle Size',
    category: 'particles',
    defaultValue: 1,
    min: 0.1,
    max: 5,
    step: 0.1,
    unit: 'x',
  },
  particleOpacity: {
    property: 'particleOpacity',
    displayName: 'Particle Opacity',
    category: 'particles',
    defaultValue: 1,
    min: 0,
    max: 1,
    step: 0.01,
  },
};

/**
 * A track contains keyframes for a single animatable property.
 */
export interface Track {
  /** Unique identifier */
  id: string;
  /** The property this track animates */
  property: AnimatableProperty;
  /** Keyframes on this track */
  keyframes: Keyframe[];
  /** Show in timeline UI */
  visible: boolean;
  /** Prevent editing */
  locked: boolean;
  /** Only this track affects output */
  solo: boolean;
  /** Exclude from output */
  muted: boolean;
  /** Track color in UI */
  color: string;
  /** Show curve editor */
  expanded: boolean;
}

// ============================================================================
// Timeline Types
// ============================================================================

/**
 * Audio track information for sync.
 */
export interface AudioTrackInfo {
  /** Audio file URL */
  url: string;
  /** Waveform data for visualization */
  waveform: Float32Array;
  /** Audio duration in milliseconds */
  duration: number;
  /** Detected or manual BPM */
  bpm?: number;
  /** Beat timestamps in milliseconds */
  beats?: number[];
}

/**
 * Timeline marker for navigation.
 */
export interface TimelineMarker {
  /** Unique identifier */
  id: string;
  /** Time position in milliseconds */
  time: number;
  /** Marker label */
  label: string;
  /** Marker color */
  color: string;
}

/**
 * Complete timeline state.
 */
export interface Timeline {
  /** Unique identifier */
  id: string;
  /** Timeline name */
  name: string;
  /** Total duration in milliseconds */
  duration: number;
  /** All tracks in the timeline */
  tracks: Track[];
  /** Frame rate for snapping */
  fps: number;
  /** Whether to loop playback */
  loop: boolean;
  /** Optional audio track for sync */
  audioTrack?: AudioTrackInfo;
  /** Navigation markers */
  markers: TimelineMarker[];
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Drag operation type.
 */
export type DragType = 'keyframe' | 'handle' | 'playhead' | 'selection' | null;

/**
 * Timeline UI state (separate from data).
 */
export interface TimelineUIState {
  /** Playhead position in milliseconds */
  currentTime: number;
  /** Whether playback is active */
  isPlaying: boolean;
  /** Playback speed multiplier (0.25, 0.5, 1, 2, etc.) */
  playbackSpeed: number;
  /** Set of selected keyframe IDs */
  selectedKeyframes: Set<string>;
  /** Set of selected track IDs */
  selectedTracks: Set<string>;
  /** Zoom level (pixels per second) */
  zoom: number;
  /** Horizontal scroll position */
  scrollX: number;
  /** Vertical scroll position */
  scrollY: number;
  /** Whether a drag operation is in progress */
  isDragging: boolean;
  /** Type of current drag operation */
  dragType: DragType;
  /** Starting position of drag operation */
  dragStartPos: { x: number; y: number } | null;
  /** Snap to frame boundaries */
  snapToFrames: boolean;
  /** Snap to other keyframes */
  snapToKeyframes: boolean;
  /** Snap to markers */
  snapToMarkers: boolean;
  /** Snap to audio beats */
  snapToBeats: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Partial keyframe update.
 */
export type KeyframeUpdate = Partial<Omit<Keyframe, 'id'>>;

/**
 * Partial track update.
 */
export type TrackUpdate = Partial<Omit<Track, 'id' | 'property'>>;

/**
 * Timeline values at a point in time.
 */
export type TimelineValues = Record<AnimatableProperty, number>;
