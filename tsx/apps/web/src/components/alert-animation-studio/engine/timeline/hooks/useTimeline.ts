/**
 * useTimeline Hook
 *
 * Main timeline state management hook combining playback, keyframes,
 * and track operations into a unified interface.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { EasingName } from '../../animations/core/types';
import type {
  Timeline,
  Track,
  Keyframe,
  TimelineUIState,
  AnimatableProperty,
  BezierHandle,
} from '../types';
import {
  createTimeline,
  createTimelineUIState,
  addTrack as addTrackToTimeline,
  removeTrack as removeTrackFromTimeline,
  updateTrackInTimeline,
  setTimelineDuration,
  setTimelineFps,
  setTimelineLoop,
  applySnapping,
} from '../core/timeline';
import {
  toggleTrackVisibility,
  toggleTrackLock,
  toggleTrackMute,
  toggleTrackSolo,
  addKeyframe as addKeyframeToTrack,
  removeKeyframe as removeKeyframeFromTrack,
  moveKeyframe as moveKeyframeInTrack,
  updateKeyframeValue as updateKeyframeValueInTrack,
  updateKeyframeHandles as updateKeyframeHandlesInTrack,
} from '../core/track';
import { evaluateTimeline, timelineToTransform } from '../core/interpolation';

/**
 * useTimeline hook return type.
 */
export interface UseTimelineReturn {
  // State
  /** The timeline data */
  timeline: Timeline;
  /** UI state (playhead, selection, zoom, etc.) */
  uiState: TimelineUIState;
  /** Current interpolated values for all tracks */
  currentValues: Record<string, number>;

  // Playback
  /** Start playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Stop playback and reset to start */
  stop: () => void;
  /** Seek to a specific time */
  seek: (time: number) => void;
  /** Set playback speed */
  setPlaybackSpeed: (speed: number) => void;

  // Track operations
  /** Add a track for a property */
  addTrack: (property: AnimatableProperty) => void;
  /** Remove a track */
  removeTrack: (trackId: string) => void;
  /** Toggle track visibility */
  toggleTrackVisibility: (trackId: string) => void;
  /** Toggle track lock */
  toggleTrackLock: (trackId: string) => void;
  /** Toggle track mute */
  toggleTrackMute: (trackId: string) => void;
  /** Toggle track solo */
  toggleTrackSolo: (trackId: string) => void;

  // Keyframe operations
  /** Add a keyframe to a track */
  addKeyframe: (trackId: string, time: number, value: number, easing?: EasingName) => void;
  /** Remove a keyframe */
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

  // Selection
  /** Select a keyframe */
  selectKeyframe: (keyframeId: string, addToSelection?: boolean) => void;
  /** Select a track */
  selectTrack: (trackId: string, addToSelection?: boolean) => void;
  /** Clear all selection */
  clearSelection: () => void;
  /** Delete selected keyframes */
  deleteSelected: () => void;

  // View
  /** Set zoom level */
  setZoom: (zoom: number) => void;
  /** Set scroll position */
  setScroll: (x: number, y: number) => void;

  // Snapping
  /** Toggle snap to frames */
  toggleSnapToFrames: () => void;
  /** Toggle snap to keyframes */
  toggleSnapToKeyframes: () => void;
  /** Toggle snap to beats */
  toggleSnapToBeats: () => void;
  /** Toggle snap to markers */
  toggleSnapToMarkers: () => void;

  // Timeline settings
  /** Set timeline duration */
  setDuration: (duration: number) => void;
  /** Set timeline FPS */
  setFps: (fps: number) => void;
  /** Set timeline loop */
  setLoop: (loop: boolean) => void;

  // Utilities
  /** Apply snapping to a time value */
  snapTime: (time: number) => number;
  /** Set the entire timeline */
  setTimeline: (timeline: Timeline) => void;
  /** Set the entire UI state */
  setUIState: (uiState: TimelineUIState) => void;
}

/**
 * useTimeline hook options.
 */
export interface UseTimelineOptions {
  /** Initial timeline (optional) */
  initialTimeline?: Timeline;
  /** Callback when time updates during playback */
  onTimeUpdate?: (time: number) => void;
  /** Callback when timeline changes */
  onTimelineChange?: (timeline: Timeline) => void;
}

/**
 * Main hook for timeline state management.
 *
 * @param options - Hook options
 * @returns Timeline state and operations
 */
export function useTimeline(options: UseTimelineOptions = {}): UseTimelineReturn {
  const { initialTimeline, onTimeUpdate, onTimelineChange } = options;

  // Timeline data state
  const [timeline, setTimelineState] = useState<Timeline>(
    initialTimeline ?? createTimeline()
  );

  // UI state
  const [uiState, setUIState] = useState<TimelineUIState>(createTimelineUIState());

  // Animation frame refs
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Notify parent of timeline changes
  useEffect(() => {
    onTimelineChange?.(timeline);
  }, [timeline, onTimelineChange]);

  // Calculate current values based on playhead position
  const currentValues = useMemo(
    () => evaluateTimeline(timeline.tracks, uiState.currentTime),
    [timeline.tracks, uiState.currentTime]
  );

  // ============================================================================
  // Animation Loop
  // ============================================================================

  useEffect(() => {
    if (!uiState.isPlaying) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    lastFrameTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      const deltaMs = (timestamp - lastFrameTimeRef.current) * uiState.playbackSpeed;
      lastFrameTimeRef.current = timestamp;

      setUIState((prev) => {
        let newTime = prev.currentTime + deltaMs;

        // Handle looping
        if (newTime >= timeline.duration) {
          newTime = timeline.loop ? newTime % timeline.duration : timeline.duration;

          if (!timeline.loop) {
            return { ...prev, currentTime: newTime, isPlaying: false };
          }
        }

        // Handle negative time (reverse playback)
        if (newTime < 0) {
          newTime = timeline.loop
            ? timeline.duration + (newTime % timeline.duration)
            : 0;
        }

        onTimeUpdate?.(newTime);
        return { ...prev, currentTime: newTime };
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    uiState.isPlaying,
    uiState.playbackSpeed,
    timeline.duration,
    timeline.loop,
    onTimeUpdate,
  ]);

  // ============================================================================
  // Playback Controls
  // ============================================================================

  const play = useCallback(() => {
    setUIState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setUIState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const stop = useCallback(() => {
    setUIState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    onTimeUpdate?.(0);
  }, [onTimeUpdate]);

  const seek = useCallback(
    (time: number) => {
      const clampedTime = Math.max(0, Math.min(timeline.duration, time));
      setUIState((prev) => ({ ...prev, currentTime: clampedTime }));
      onTimeUpdate?.(clampedTime);
    },
    [timeline.duration, onTimeUpdate]
  );

  const setPlaybackSpeed = useCallback((speed: number) => {
    setUIState((prev) => ({ ...prev, playbackSpeed: speed }));
  }, []);

  // ============================================================================
  // Track Operations
  // ============================================================================

  const addTrack = useCallback((property: AnimatableProperty) => {
    setTimelineState((prev) => addTrackToTimeline(prev, property));
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    setTimelineState((prev) => removeTrackFromTimeline(prev, trackId));
    // Clear selection for removed track
    setUIState((prev) => {
      const selectedTracks = new Set(prev.selectedTracks);
      selectedTracks.delete(trackId);
      return { ...prev, selectedTracks };
    });
  }, []);

  const handleToggleTrackVisibility = useCallback((trackId: string) => {
    setTimelineState((prev) =>
      updateTrackInTimeline(prev, trackId, toggleTrackVisibility)
    );
  }, []);

  const handleToggleTrackLock = useCallback((trackId: string) => {
    setTimelineState((prev) =>
      updateTrackInTimeline(prev, trackId, toggleTrackLock)
    );
  }, []);

  const handleToggleTrackMute = useCallback((trackId: string) => {
    setTimelineState((prev) =>
      updateTrackInTimeline(prev, trackId, toggleTrackMute)
    );
  }, []);

  const handleToggleTrackSolo = useCallback((trackId: string) => {
    setTimelineState((prev) =>
      updateTrackInTimeline(prev, trackId, toggleTrackSolo)
    );
  }, []);

  // ============================================================================
  // Keyframe Operations
  // ============================================================================

  const addKeyframe = useCallback(
    (trackId: string, time: number, value: number, easing?: EasingName) => {
      setTimelineState((prev) =>
        updateTrackInTimeline(prev, trackId, (track) =>
          addKeyframeToTrack(track, time, value, easing)
        )
      );
    },
    []
  );

  const removeKeyframe = useCallback((trackId: string, keyframeId: string) => {
    setTimelineState((prev) =>
      updateTrackInTimeline(prev, trackId, (track) =>
        removeKeyframeFromTrack(track, keyframeId)
      )
    );
    // Remove from selection
    setUIState((prev) => {
      const selectedKeyframes = new Set(prev.selectedKeyframes);
      selectedKeyframes.delete(keyframeId);
      return { ...prev, selectedKeyframes };
    });
  }, []);

  const moveKeyframe = useCallback(
    (trackId: string, keyframeId: string, newTime: number) => {
      setTimelineState((prev) =>
        updateTrackInTimeline(prev, trackId, (track) =>
          moveKeyframeInTrack(track, keyframeId, newTime)
        )
      );
    },
    []
  );

  const updateKeyframeValue = useCallback(
    (trackId: string, keyframeId: string, value: number) => {
      setTimelineState((prev) =>
        updateTrackInTimeline(prev, trackId, (track) =>
          updateKeyframeValueInTrack(track, keyframeId, value)
        )
      );
    },
    []
  );

  const updateKeyframeHandles = useCallback(
    (
      trackId: string,
      keyframeId: string,
      handleIn?: BezierHandle,
      handleOut?: BezierHandle
    ) => {
      setTimelineState((prev) =>
        updateTrackInTimeline(prev, trackId, (track) =>
          updateKeyframeHandlesInTrack(track, keyframeId, handleIn, handleOut)
        )
      );
    },
    []
  );

  // ============================================================================
  // Selection
  // ============================================================================

  const selectKeyframe = useCallback(
    (keyframeId: string, addToSelection = false) => {
      setUIState((prev) => {
        const selectedKeyframes = addToSelection
          ? new Set([...prev.selectedKeyframes, keyframeId])
          : new Set([keyframeId]);
        return { ...prev, selectedKeyframes };
      });
    },
    []
  );

  const selectTrack = useCallback((trackId: string, addToSelection = false) => {
    setUIState((prev) => {
      const selectedTracks = addToSelection
        ? new Set([...prev.selectedTracks, trackId])
        : new Set([trackId]);
      return { ...prev, selectedTracks };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setUIState((prev) => ({
      ...prev,
      selectedKeyframes: new Set(),
      selectedTracks: new Set(),
    }));
  }, []);

  const deleteSelected = useCallback(() => {
    const selectedIds = uiState.selectedKeyframes;
    if (selectedIds.size === 0) return;

    setTimelineState((prev) => {
      let newTimeline = prev;
      for (const track of prev.tracks) {
        const idsToRemove = track.keyframes
          .filter((kf) => selectedIds.has(kf.id))
          .map((kf) => kf.id);

        for (const id of idsToRemove) {
          newTimeline = updateTrackInTimeline(newTimeline, track.id, (t) =>
            removeKeyframeFromTrack(t, id)
          );
        }
      }
      return newTimeline;
    });

    clearSelection();
  }, [uiState.selectedKeyframes, clearSelection]);

  // ============================================================================
  // View Controls
  // ============================================================================

  const setZoom = useCallback((zoom: number) => {
    setUIState((prev) => ({
      ...prev,
      zoom: Math.max(10, Math.min(500, zoom)),
    }));
  }, []);

  const setScroll = useCallback((x: number, y: number) => {
    setUIState((prev) => ({
      ...prev,
      scrollX: Math.max(0, x),
      scrollY: Math.max(0, y),
    }));
  }, []);

  // ============================================================================
  // Snapping
  // ============================================================================

  const toggleSnapToFrames = useCallback(() => {
    setUIState((prev) => ({ ...prev, snapToFrames: !prev.snapToFrames }));
  }, []);

  const toggleSnapToKeyframes = useCallback(() => {
    setUIState((prev) => ({ ...prev, snapToKeyframes: !prev.snapToKeyframes }));
  }, []);

  const toggleSnapToBeats = useCallback(() => {
    setUIState((prev) => ({ ...prev, snapToBeats: !prev.snapToBeats }));
  }, []);

  const toggleSnapToMarkers = useCallback(() => {
    setUIState((prev) => ({ ...prev, snapToMarkers: !prev.snapToMarkers }));
  }, []);

  const snapTime = useCallback(
    (time: number) => applySnapping(time, timeline, uiState),
    [timeline, uiState]
  );

  // ============================================================================
  // Timeline Settings
  // ============================================================================

  const setDuration = useCallback((duration: number) => {
    setTimelineState((prev) => setTimelineDuration(prev, duration));
  }, []);

  const setFps = useCallback((fps: number) => {
    setTimelineState((prev) => setTimelineFps(prev, fps));
  }, []);

  const setLoop = useCallback((loop: boolean) => {
    setTimelineState((prev) => setTimelineLoop(prev, loop));
  }, []);

  const setTimeline = useCallback((newTimeline: Timeline) => {
    setTimelineState(newTimeline);
  }, []);

  return {
    // State
    timeline,
    uiState,
    currentValues,
    // Playback
    play,
    pause,
    stop,
    seek,
    setPlaybackSpeed,
    // Track operations
    addTrack,
    removeTrack,
    toggleTrackVisibility: handleToggleTrackVisibility,
    toggleTrackLock: handleToggleTrackLock,
    toggleTrackMute: handleToggleTrackMute,
    toggleTrackSolo: handleToggleTrackSolo,
    // Keyframe operations
    addKeyframe,
    removeKeyframe,
    moveKeyframe,
    updateKeyframeValue,
    updateKeyframeHandles,
    // Selection
    selectKeyframe,
    selectTrack,
    clearSelection,
    deleteSelected,
    // View
    setZoom,
    setScroll,
    // Snapping
    toggleSnapToFrames,
    toggleSnapToKeyframes,
    toggleSnapToBeats,
    toggleSnapToMarkers,
    // Timeline settings
    setDuration,
    setFps,
    setLoop,
    // Utilities
    snapTime,
    setTimeline,
    setUIState,
  };
}
