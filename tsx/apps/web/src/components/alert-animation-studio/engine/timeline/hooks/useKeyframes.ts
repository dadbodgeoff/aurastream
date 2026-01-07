/**
 * useKeyframes Hook
 *
 * Manages keyframe selection, manipulation, and batch operations.
 */

import { useState, useCallback, useMemo } from 'react';
import type { EasingName } from '../../animations/core/types';
import type {
  Timeline,
  Track,
  Keyframe,
  BezierHandle,
  AnimatableProperty,
} from '../types';
import {
  addKeyframe as addKeyframeToTrack,
  removeKeyframe as removeKeyframeFromTrack,
  removeKeyframes as removeKeyframesFromTrack,
  moveKeyframe as moveKeyframeInTrack,
  updateKeyframeValue as updateKeyframeValueInTrack,
  updateKeyframeHandles as updateKeyframeHandlesInTrack,
  updateKeyframeEasing as updateKeyframeEasingInTrack,
} from '../core/track';
import { updateTrackInTimeline, findTrackById } from '../core/timeline';
import { cloneKeyframe, cloneKeyframeAtTime } from '../core/keyframe';

/**
 * Keyframe selection state.
 */
export interface KeyframeSelection {
  /** Set of selected keyframe IDs */
  selectedKeyframes: Set<string>;
  /** Set of selected track IDs */
  selectedTracks: Set<string>;
}

/**
 * Keyframe operations interface.
 */
export interface KeyframeOperations {
  /** Add a keyframe to a track */
  addKeyframe: (trackId: string, time: number, value: number, easing?: EasingName) => void;
  /** Remove a keyframe from a track */
  removeKeyframe: (trackId: string, keyframeId: string) => void;
  /** Move a keyframe to a new time */
  moveKeyframe: (trackId: string, keyframeId: string, newTime: number) => void;
  /** Update a keyframe's value */
  updateKeyframeValue: (trackId: string, keyframeId: string, value: number) => void;
  /** Update a keyframe's bezier handles */
  updateKeyframeHandles: (
    trackId: string,
    keyframeId: string,
    handleIn?: BezierHandle,
    handleOut?: BezierHandle
  ) => void;
  /** Update a keyframe's easing */
  updateKeyframeEasing: (trackId: string, keyframeId: string, easing: EasingName) => void;
  /** Duplicate selected keyframes */
  duplicateSelected: (timeOffset: number) => void;
  /** Delete selected keyframes */
  deleteSelected: () => void;
  /** Copy selected keyframes to clipboard */
  copySelected: () => void;
  /** Paste keyframes from clipboard */
  pasteKeyframes: (time: number) => void;
}

/**
 * Selection operations interface.
 */
export interface SelectionOperations {
  /** Select a keyframe */
  selectKeyframe: (keyframeId: string, addToSelection?: boolean) => void;
  /** Deselect a keyframe */
  deselectKeyframe: (keyframeId: string) => void;
  /** Select a track */
  selectTrack: (trackId: string, addToSelection?: boolean) => void;
  /** Deselect a track */
  deselectTrack: (trackId: string) => void;
  /** Clear all selection */
  clearSelection: () => void;
  /** Select all keyframes in a track */
  selectAllInTrack: (trackId: string) => void;
  /** Select all keyframes in timeline */
  selectAll: () => void;
  /** Select keyframes in a time range */
  selectInRange: (startTime: number, endTime: number, trackIds?: string[]) => void;
  /** Invert selection */
  invertSelection: () => void;
}

/**
 * useKeyframes hook options.
 */
export interface UseKeyframesOptions {
  /** The timeline to operate on */
  timeline: Timeline;
  /** Callback to update the timeline */
  onTimelineChange: (timeline: Timeline) => void;
}

/**
 * useKeyframes hook return type.
 */
export interface UseKeyframesReturn
  extends KeyframeSelection,
    KeyframeOperations,
    SelectionOperations {
  /** Get selected keyframes with their track info */
  getSelectedKeyframesWithTracks: () => Array<{ track: Track; keyframe: Keyframe }>;
  /** Check if a keyframe is selected */
  isKeyframeSelected: (keyframeId: string) => boolean;
  /** Check if a track is selected */
  isTrackSelected: (trackId: string) => boolean;
  /** Number of selected keyframes */
  selectionCount: number;
}

/**
 * Clipboard data for copy/paste operations.
 */
interface ClipboardData {
  keyframes: Array<{
    property: AnimatableProperty;
    keyframe: Keyframe;
    relativeTime: number;
  }>;
  baseTime: number;
}

// Module-level clipboard (persists across hook instances)
let clipboard: ClipboardData | null = null;

/**
 * Hook for managing keyframe selection and manipulation.
 *
 * @param options - Hook options
 * @returns Keyframe state and operations
 */
export function useKeyframes(options: UseKeyframesOptions): UseKeyframesReturn {
  const { timeline, onTimelineChange } = options;

  // Selection state
  const [selectedKeyframes, setSelectedKeyframes] = useState<Set<string>>(new Set());
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());

  // Helper to update a track in the timeline
  const updateTrack = useCallback(
    (trackId: string, updater: (track: Track) => Track) => {
      onTimelineChange(updateTrackInTimeline(timeline, trackId, updater));
    },
    [timeline, onTimelineChange]
  );

  // ============================================================================
  // Keyframe Operations
  // ============================================================================

  const addKeyframe = useCallback(
    (trackId: string, time: number, value: number, easing?: EasingName) => {
      updateTrack(trackId, (track) => addKeyframeToTrack(track, time, value, easing));
    },
    [updateTrack]
  );

  const removeKeyframe = useCallback(
    (trackId: string, keyframeId: string) => {
      updateTrack(trackId, (track) => removeKeyframeFromTrack(track, keyframeId));
      // Remove from selection
      setSelectedKeyframes((prev) => {
        const next = new Set(prev);
        next.delete(keyframeId);
        return next;
      });
    },
    [updateTrack]
  );

  const moveKeyframe = useCallback(
    (trackId: string, keyframeId: string, newTime: number) => {
      updateTrack(trackId, (track) => moveKeyframeInTrack(track, keyframeId, newTime));
    },
    [updateTrack]
  );

  const updateKeyframeValue = useCallback(
    (trackId: string, keyframeId: string, value: number) => {
      updateTrack(trackId, (track) => updateKeyframeValueInTrack(track, keyframeId, value));
    },
    [updateTrack]
  );

  const updateKeyframeHandles = useCallback(
    (
      trackId: string,
      keyframeId: string,
      handleIn?: BezierHandle,
      handleOut?: BezierHandle
    ) => {
      updateTrack(trackId, (track) =>
        updateKeyframeHandlesInTrack(track, keyframeId, handleIn, handleOut)
      );
    },
    [updateTrack]
  );

  const updateKeyframeEasing = useCallback(
    (trackId: string, keyframeId: string, easing: EasingName) => {
      updateTrack(trackId, (track) =>
        updateKeyframeEasingInTrack(track, keyframeId, easing)
      );
    },
    [updateTrack]
  );

  // ============================================================================
  // Selection Operations
  // ============================================================================

  const selectKeyframe = useCallback((keyframeId: string, addToSelection = false) => {
    setSelectedKeyframes((prev) => {
      if (addToSelection) {
        const next = new Set(prev);
        next.add(keyframeId);
        return next;
      }
      return new Set([keyframeId]);
    });
  }, []);

  const deselectKeyframe = useCallback((keyframeId: string) => {
    setSelectedKeyframes((prev) => {
      const next = new Set(prev);
      next.delete(keyframeId);
      return next;
    });
  }, []);

  const selectTrack = useCallback((trackId: string, addToSelection = false) => {
    setSelectedTracks((prev) => {
      if (addToSelection) {
        const next = new Set(prev);
        next.add(trackId);
        return next;
      }
      return new Set([trackId]);
    });
  }, []);

  const deselectTrack = useCallback((trackId: string) => {
    setSelectedTracks((prev) => {
      const next = new Set(prev);
      next.delete(trackId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedKeyframes(new Set());
    setSelectedTracks(new Set());
  }, []);

  const selectAllInTrack = useCallback(
    (trackId: string) => {
      const track = findTrackById(timeline, trackId);
      if (!track) return;

      setSelectedKeyframes((prev) => {
        const next = new Set(prev);
        for (const kf of track.keyframes) {
          next.add(kf.id);
        }
        return next;
      });
    },
    [timeline]
  );

  const selectAll = useCallback(() => {
    const allIds = new Set<string>();
    for (const track of timeline.tracks) {
      for (const kf of track.keyframes) {
        allIds.add(kf.id);
      }
    }
    setSelectedKeyframes(allIds);
  }, [timeline]);

  const selectInRange = useCallback(
    (startTime: number, endTime: number, trackIds?: string[]) => {
      const tracksToSearch = trackIds
        ? timeline.tracks.filter((t) => trackIds.includes(t.id))
        : timeline.tracks;

      const idsInRange = new Set<string>();
      for (const track of tracksToSearch) {
        for (const kf of track.keyframes) {
          if (kf.time >= startTime && kf.time <= endTime) {
            idsInRange.add(kf.id);
          }
        }
      }

      setSelectedKeyframes(idsInRange);
    },
    [timeline]
  );

  const invertSelection = useCallback(() => {
    const allIds = new Set<string>();
    for (const track of timeline.tracks) {
      for (const kf of track.keyframes) {
        allIds.add(kf.id);
      }
    }

    setSelectedKeyframes((prev) => {
      const next = new Set<string>();
      for (const id of allIds) {
        if (!prev.has(id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [timeline]);

  // ============================================================================
  // Batch Operations
  // ============================================================================

  const getSelectedKeyframesWithTracks = useCallback(() => {
    const result: Array<{ track: Track; keyframe: Keyframe }> = [];

    for (const track of timeline.tracks) {
      for (const kf of track.keyframes) {
        if (selectedKeyframes.has(kf.id)) {
          result.push({ track, keyframe: kf });
        }
      }
    }

    return result;
  }, [timeline, selectedKeyframes]);

  const deleteSelected = useCallback(() => {
    let newTimeline = timeline;

    for (const track of timeline.tracks) {
      const idsToRemove = new Set<string>();
      for (const kf of track.keyframes) {
        if (selectedKeyframes.has(kf.id)) {
          idsToRemove.add(kf.id);
        }
      }

      if (idsToRemove.size > 0) {
        newTimeline = updateTrackInTimeline(newTimeline, track.id, (t) =>
          removeKeyframesFromTrack(t, idsToRemove)
        );
      }
    }

    onTimelineChange(newTimeline);
    clearSelection();
  }, [timeline, selectedKeyframes, onTimelineChange, clearSelection]);

  const duplicateSelected = useCallback(
    (timeOffset: number) => {
      let newTimeline = timeline;
      const newSelectedIds = new Set<string>();

      for (const track of timeline.tracks) {
        const keyframesToDuplicate = track.keyframes.filter((kf) =>
          selectedKeyframes.has(kf.id)
        );

        if (keyframesToDuplicate.length > 0) {
          newTimeline = updateTrackInTimeline(newTimeline, track.id, (t) => {
            let updatedTrack = t;
            for (const kf of keyframesToDuplicate) {
              const newKf = cloneKeyframeAtTime(kf, kf.time + timeOffset);
              newSelectedIds.add(newKf.id);
              updatedTrack = addKeyframeToTrack(
                updatedTrack,
                newKf.time,
                newKf.value,
                newKf.easing
              );
            }
            return updatedTrack;
          });
        }
      }

      onTimelineChange(newTimeline);
      setSelectedKeyframes(newSelectedIds);
    },
    [timeline, selectedKeyframes, onTimelineChange]
  );

  const copySelected = useCallback(() => {
    const selected = getSelectedKeyframesWithTracks();
    if (selected.length === 0) return;

    // Find the earliest time as base
    const baseTime = Math.min(...selected.map((s) => s.keyframe.time));

    clipboard = {
      keyframes: selected.map((s) => ({
        property: s.track.property,
        keyframe: cloneKeyframe(s.keyframe),
        relativeTime: s.keyframe.time - baseTime,
      })),
      baseTime,
    };
  }, [getSelectedKeyframesWithTracks]);

  const pasteKeyframes = useCallback(
    (time: number) => {
      if (!clipboard || clipboard.keyframes.length === 0) return;

      let newTimeline = timeline;
      const newSelectedIds = new Set<string>();

      for (const item of clipboard.keyframes) {
        const track = timeline.tracks.find((t) => t.property === item.property);
        if (!track) continue;

        const newTime = time + item.relativeTime;
        const newKf = cloneKeyframeAtTime(item.keyframe, newTime);
        newSelectedIds.add(newKf.id);

        newTimeline = updateTrackInTimeline(newTimeline, track.id, (t) =>
          addKeyframeToTrack(t, newKf.time, newKf.value, newKf.easing)
        );
      }

      onTimelineChange(newTimeline);
      setSelectedKeyframes(newSelectedIds);
    },
    [timeline, onTimelineChange]
  );

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isKeyframeSelected = useCallback(
    (keyframeId: string) => selectedKeyframes.has(keyframeId),
    [selectedKeyframes]
  );

  const isTrackSelected = useCallback(
    (trackId: string) => selectedTracks.has(trackId),
    [selectedTracks]
  );

  const selectionCount = useMemo(() => selectedKeyframes.size, [selectedKeyframes]);

  return {
    // Selection state
    selectedKeyframes,
    selectedTracks,
    // Keyframe operations
    addKeyframe,
    removeKeyframe,
    moveKeyframe,
    updateKeyframeValue,
    updateKeyframeHandles,
    updateKeyframeEasing,
    duplicateSelected,
    deleteSelected,
    copySelected,
    pasteKeyframes,
    // Selection operations
    selectKeyframe,
    deselectKeyframe,
    selectTrack,
    deselectTrack,
    clearSelection,
    selectAllInTrack,
    selectAll,
    selectInRange,
    invertSelection,
    // Helpers
    getSelectedKeyframesWithTracks,
    isKeyframeSelected,
    isTrackSelected,
    selectionCount,
  };
}
