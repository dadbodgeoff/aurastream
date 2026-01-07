/**
 * Timeline Editor Engine - Master Exports
 *
 * After Effects-style keyframe animation control system.
 *
 * Architecture:
 * - types.ts     : Type definitions for keyframes, tracks, and timeline
 * - core/        : Core operations for keyframes, tracks, timeline, and interpolation
 * - hooks/       : React hooks for state management and playback
 *
 * Usage:
 * ```typescript
 * import { useTimeline, createTimeline, PROPERTY_METADATA } from './timeline';
 *
 * function AnimationEditor() {
 *   const {
 *     timeline,
 *     uiState,
 *     currentValues,
 *     play,
 *     pause,
 *     addTrack,
 *     addKeyframe,
 *   } = useTimeline();
 *
 *   // Add a scale track
 *   addTrack('scaleX');
 *
 *   // Add keyframes
 *   addKeyframe(trackId, 0, 0);      // Start at 0
 *   addKeyframe(trackId, 1000, 1);   // End at 1 after 1 second
 *
 *   // currentValues will contain interpolated values at uiState.currentTime
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Keyframe types
  Keyframe,
  BezierHandle,
  KeyframeUpdate,
  // Track types
  Track,
  TrackUpdate,
  AnimatableProperty,
  PropertyCategory,
  PropertyMeta,
  // Timeline types
  Timeline,
  TimelineMarker,
  AudioTrackInfo,
  // UI types
  TimelineUIState,
  DragType,
  TimelineValues,
} from './types';

export { PROPERTY_METADATA } from './types';

// ============================================================================
// Core Module
// ============================================================================

export {
  // Keyframe operations
  createKeyframe,
  createKeyframeWithHandles,
  updateKeyframe,
  cloneKeyframe,
  cloneKeyframeAtTime,
  setKeyframeHandles,
  clearKeyframeHandles,
  toggleKeyframeSelection,
  toggleKeyframeLock,
  hasCustomHandles,
  createDefaultHandles,
  createLinearHandles,
  createEaseInHandles,
  createEaseOutHandles,
  sortKeyframesByTime,
  findKeyframeById,
  findKeyframeIndexById,
  // Track operations
  getTrackColor,
  createTrack,
  createTrackWithKeyframes,
  addKeyframe,
  removeKeyframe,
  removeKeyframes,
  moveKeyframe,
  updateKeyframeValue,
  updateKeyframeHandles,
  updateKeyframeEasing,
  updateTrack,
  toggleTrackVisibility,
  toggleTrackLock,
  toggleTrackSolo,
  toggleTrackMute,
  toggleTrackExpanded,
  selectAllKeyframes,
  deselectAllKeyframes,
  getSelectedKeyframes,
  getTrackTimeRange,
  hasKeyframes,
  getTrackDefaultValue,
  // Timeline operations
  createTimeline,
  createTimelineWithTracks,
  addTrack,
  removeTrack,
  updateTrackInTimeline,
  findTrackById,
  findTrackByProperty,
  reorderTracks,
  addMarker,
  removeMarker,
  setTimelineDuration,
  setTimelineFps,
  setTimelineLoop,
  setTimelineName,
  snapToFrame,
  snapToKeyframe,
  snapToMarker,
  snapToBeat,
  applySnapping,
  createTimelineUIState,
  getAllKeyframeIds,
  getTimelineKeyframeRange,
  // Interpolation
  cubicBezier,
  solveCubicBezier,
  interpolateKeyframes,
  findPreviousKeyframe,
  findNextKeyframe,
  findKeyframeAtTime,
  findSurroundingKeyframes,
  evaluateTrack,
  evaluateTimeline,
  evaluateTimelineWithSolo,
  timelineToTransform,
  getCompleteValues,
  sampleTrackCurve,
  sampleBezierSegment,
} from './core';

// ============================================================================
// Hooks Module
// ============================================================================

export {
  // Main timeline hook
  useTimeline,
  type UseTimelineReturn,
  type UseTimelineOptions,
  // Playback hook
  usePlayback,
  type PlaybackState,
  type PlaybackControls,
  type UsePlaybackOptions,
  type UsePlaybackReturn,
  PLAYBACK_SPEEDS,
  getNextPlaybackSpeed,
  getPreviousPlaybackSpeed,
  // Keyframes hook
  useKeyframes,
  type KeyframeSelection,
  type KeyframeOperations,
  type SelectionOperations,
  type UseKeyframesOptions,
  type UseKeyframesReturn,
} from './hooks';
