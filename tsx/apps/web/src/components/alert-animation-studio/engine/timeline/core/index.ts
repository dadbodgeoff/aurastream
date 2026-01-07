/**
 * Timeline Core Module - Exports
 *
 * Core functionality for timeline operations, keyframe management,
 * and interpolation.
 */

// ============================================================================
// Keyframe Operations
// ============================================================================

export {
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
} from './keyframe';

// ============================================================================
// Track Operations
// ============================================================================

export {
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
} from './track';

// ============================================================================
// Timeline Operations
// ============================================================================

export {
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
} from './timeline';

// ============================================================================
// Interpolation
// ============================================================================

export {
  // Bezier math
  cubicBezier,
  solveCubicBezier,
  // Keyframe interpolation
  interpolateKeyframes,
  findPreviousKeyframe,
  findNextKeyframe,
  findKeyframeAtTime,
  findSurroundingKeyframes,
  // Track evaluation
  evaluateTrack,
  // Timeline evaluation
  evaluateTimeline,
  evaluateTimelineWithSolo,
  timelineToTransform,
  getCompleteValues,
  // Curve sampling
  sampleTrackCurve,
  sampleBezierSegment,
} from './interpolation';
