/**
 * Timeline Hooks Module - Exports
 *
 * React hooks for timeline state management, playback control,
 * and keyframe manipulation.
 */

// ============================================================================
// Main Timeline Hook
// ============================================================================

export {
  useTimeline,
  type UseTimelineReturn,
  type UseTimelineOptions,
} from './useTimeline';

// ============================================================================
// Playback Hook
// ============================================================================

export {
  usePlayback,
  type PlaybackState,
  type PlaybackControls,
  type UsePlaybackOptions,
  type UsePlaybackReturn,
  PLAYBACK_SPEEDS,
  getNextPlaybackSpeed,
  getPreviousPlaybackSpeed,
} from './usePlayback';

// ============================================================================
// Keyframes Hook
// ============================================================================

export {
  useKeyframes,
  type KeyframeSelection,
  type KeyframeOperations,
  type SelectionOperations,
  type UseKeyframesOptions,
  type UseKeyframesReturn,
} from './useKeyframes';
