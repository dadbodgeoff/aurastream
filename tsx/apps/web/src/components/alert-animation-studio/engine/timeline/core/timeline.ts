/**
 * Timeline Operations
 *
 * Functions for creating and manipulating timelines.
 */

import type {
  Timeline,
  Track,
  TimelineMarker,
  TimelineUIState,
  AnimatableProperty,
  DragType,
} from '../types';
import { createTrack } from './track';

/**
 * Generate a unique ID for timelines and markers.
 * Uses crypto.randomUUID() for secure random IDs.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a new empty timeline.
 *
 * @param name - Timeline name (default: 'Untitled')
 * @param duration - Total duration in milliseconds (default: 3000)
 * @returns A new Timeline object
 */
export function createTimeline(
  name: string = 'Untitled',
  duration: number = 3000
): Timeline {
  return {
    id: generateId(),
    name,
    duration: Math.max(100, duration), // Minimum 100ms
    tracks: [],
    fps: 30,
    loop: true,
    markers: [],
  };
}

/**
 * Create a timeline with initial tracks.
 *
 * @param name - Timeline name
 * @param duration - Total duration in milliseconds
 * @param properties - Properties to create tracks for
 * @returns A new Timeline object with tracks
 */
export function createTimelineWithTracks(
  name: string,
  duration: number,
  properties: AnimatableProperty[]
): Timeline {
  const timeline = createTimeline(name, duration);
  const tracks = properties.map((property) => createTrack(property));
  return { ...timeline, tracks };
}

/**
 * Add a track to the timeline.
 * If a track for the property already exists, returns unchanged timeline.
 *
 * @param timeline - The timeline to add the track to
 * @param property - The property to create a track for
 * @returns A new Timeline object with the added track
 */
export function addTrack(
  timeline: Timeline,
  property: AnimatableProperty
): Timeline {
  // Check if track already exists
  if (timeline.tracks.some((t) => t.property === property)) {
    return timeline;
  }

  const track = createTrack(property);
  return { ...timeline, tracks: [...timeline.tracks, track] };
}

/**
 * Remove a track from the timeline.
 *
 * @param timeline - The timeline to remove the track from
 * @param trackId - The ID of the track to remove
 * @returns A new Timeline object without the track
 */
export function removeTrack(timeline: Timeline, trackId: string): Timeline {
  return {
    ...timeline,
    tracks: timeline.tracks.filter((t) => t.id !== trackId),
  };
}

/**
 * Update a track in the timeline.
 *
 * @param timeline - The timeline containing the track
 * @param trackId - The ID of the track to update
 * @param updater - Function that returns the updated track
 * @returns A new Timeline object with the updated track
 */
export function updateTrackInTimeline(
  timeline: Timeline,
  trackId: string,
  updater: (track: Track) => Track
): Timeline {
  return {
    ...timeline,
    tracks: timeline.tracks.map((t) => (t.id === trackId ? updater(t) : t)),
  };
}

/**
 * Find a track by ID.
 *
 * @param timeline - The timeline to search
 * @param trackId - The track ID to find
 * @returns The track or undefined if not found
 */
export function findTrackById(
  timeline: Timeline,
  trackId: string
): Track | undefined {
  return timeline.tracks.find((t) => t.id === trackId);
}

/**
 * Find a track by property.
 *
 * @param timeline - The timeline to search
 * @param property - The property to find
 * @returns The track or undefined if not found
 */
export function findTrackByProperty(
  timeline: Timeline,
  property: AnimatableProperty
): Track | undefined {
  return timeline.tracks.find((t) => t.property === property);
}

/**
 * Reorder tracks in the timeline.
 *
 * @param timeline - The timeline to reorder
 * @param fromIndex - The index to move from
 * @param toIndex - The index to move to
 * @returns A new Timeline object with reordered tracks
 */
export function reorderTracks(
  timeline: Timeline,
  fromIndex: number,
  toIndex: number
): Timeline {
  const tracks = [...timeline.tracks];
  const [removed] = tracks.splice(fromIndex, 1);
  tracks.splice(toIndex, 0, removed);
  return { ...timeline, tracks };
}

/**
 * Add a marker to the timeline.
 *
 * @param timeline - The timeline to add the marker to
 * @param time - Time position in milliseconds
 * @param label - Marker label
 * @param color - Marker color (default: '#f59e0b')
 * @returns A new Timeline object with the added marker
 */
export function addMarker(
  timeline: Timeline,
  time: number,
  label: string,
  color: string = '#f59e0b'
): Timeline {
  const marker: TimelineMarker = {
    id: generateId(),
    time: Math.max(0, Math.min(time, timeline.duration)),
    label,
    color,
  };

  const markers = [...timeline.markers, marker].sort((a, b) => a.time - b.time);
  return { ...timeline, markers };
}

/**
 * Remove a marker from the timeline.
 *
 * @param timeline - The timeline to remove the marker from
 * @param markerId - The ID of the marker to remove
 * @returns A new Timeline object without the marker
 */
export function removeMarker(timeline: Timeline, markerId: string): Timeline {
  return {
    ...timeline,
    markers: timeline.markers.filter((m) => m.id !== markerId),
  };
}

/**
 * Update timeline duration.
 *
 * @param timeline - The timeline to update
 * @param duration - New duration in milliseconds
 * @returns A new Timeline object with updated duration
 */
export function setTimelineDuration(
  timeline: Timeline,
  duration: number
): Timeline {
  return { ...timeline, duration: Math.max(100, duration) };
}

/**
 * Update timeline FPS.
 *
 * @param timeline - The timeline to update
 * @param fps - New FPS value
 * @returns A new Timeline object with updated FPS
 */
export function setTimelineFps(timeline: Timeline, fps: number): Timeline {
  return { ...timeline, fps: Math.max(1, Math.min(120, fps)) };
}

/**
 * Update timeline loop setting.
 *
 * @param timeline - The timeline to update
 * @param loop - Whether to loop
 * @returns A new Timeline object with updated loop setting
 */
export function setTimelineLoop(timeline: Timeline, loop: boolean): Timeline {
  return { ...timeline, loop };
}

/**
 * Update timeline name.
 *
 * @param timeline - The timeline to update
 * @param name - New name
 * @returns A new Timeline object with updated name
 */
export function setTimelineName(timeline: Timeline, name: string): Timeline {
  return { ...timeline, name };
}

/**
 * Snap time to nearest frame boundary.
 *
 * @param time - Time in milliseconds
 * @param fps - Frames per second
 * @returns Snapped time in milliseconds
 */
export function snapToFrame(time: number, fps: number): number {
  const frameMs = 1000 / fps;
  return Math.round(time / frameMs) * frameMs;
}

/**
 * Snap time to nearest keyframe within threshold.
 *
 * @param time - Time in milliseconds
 * @param tracks - Tracks to search for keyframes
 * @param threshold - Snap threshold in milliseconds (default: 50)
 * @returns Snapped time in milliseconds
 */
export function snapToKeyframe(
  time: number,
  tracks: Track[],
  threshold: number = 50
): number {
  let closest = time;
  let minDistance = threshold;

  for (const track of tracks) {
    for (const kf of track.keyframes) {
      const distance = Math.abs(kf.time - time);
      if (distance < minDistance) {
        minDistance = distance;
        closest = kf.time;
      }
    }
  }

  return closest;
}

/**
 * Snap time to nearest marker within threshold.
 *
 * @param time - Time in milliseconds
 * @param markers - Markers to snap to
 * @param threshold - Snap threshold in milliseconds (default: 50)
 * @returns Snapped time in milliseconds
 */
export function snapToMarker(
  time: number,
  markers: TimelineMarker[],
  threshold: number = 50
): number {
  let closest = time;
  let minDistance = threshold;

  for (const marker of markers) {
    const distance = Math.abs(marker.time - time);
    if (distance < minDistance) {
      minDistance = distance;
      closest = marker.time;
    }
  }

  return closest;
}

/**
 * Snap time to nearest beat within threshold.
 *
 * @param time - Time in milliseconds
 * @param beats - Beat timestamps in milliseconds
 * @param threshold - Snap threshold in milliseconds (default: 50)
 * @returns Snapped time in milliseconds
 */
export function snapToBeat(
  time: number,
  beats: number[],
  threshold: number = 50
): number {
  let closest = time;
  let minDistance = threshold;

  for (const beat of beats) {
    const distance = Math.abs(beat - time);
    if (distance < minDistance) {
      minDistance = distance;
      closest = beat;
    }
  }

  return closest;
}

/**
 * Apply all enabled snapping to a time value.
 *
 * @param time - Time in milliseconds
 * @param timeline - The timeline
 * @param uiState - The UI state with snap settings
 * @returns Snapped time in milliseconds
 */
export function applySnapping(
  time: number,
  timeline: Timeline,
  uiState: TimelineUIState
): number {
  let snappedTime = time;
  const threshold = 50 / (uiState.zoom / 100); // Adjust threshold based on zoom

  if (uiState.snapToFrames) {
    snappedTime = snapToFrame(snappedTime, timeline.fps);
  }

  if (uiState.snapToKeyframes) {
    snappedTime = snapToKeyframe(snappedTime, timeline.tracks, threshold);
  }

  if (uiState.snapToMarkers) {
    snappedTime = snapToMarker(snappedTime, timeline.markers, threshold);
  }

  if (uiState.snapToBeats && timeline.audioTrack?.beats) {
    snappedTime = snapToBeat(snappedTime, timeline.audioTrack.beats, threshold);
  }

  return snappedTime;
}

/**
 * Create default timeline UI state.
 *
 * @returns A new TimelineUIState object
 */
export function createTimelineUIState(): TimelineUIState {
  return {
    currentTime: 0,
    isPlaying: false,
    playbackSpeed: 1,
    selectedKeyframes: new Set(),
    selectedTracks: new Set(),
    zoom: 100, // 100 pixels per second
    scrollX: 0,
    scrollY: 0,
    isDragging: false,
    dragType: null,
    dragStartPos: null,
    snapToFrames: true,
    snapToKeyframes: true,
    snapToMarkers: true,
    snapToBeats: true,
  };
}

/**
 * Get all keyframe IDs from a timeline.
 *
 * @param timeline - The timeline to get keyframe IDs from
 * @returns Set of all keyframe IDs
 */
export function getAllKeyframeIds(timeline: Timeline): Set<string> {
  const ids = new Set<string>();
  for (const track of timeline.tracks) {
    for (const kf of track.keyframes) {
      ids.add(kf.id);
    }
  }
  return ids;
}

/**
 * Get the total time range of all keyframes in the timeline.
 *
 * @param timeline - The timeline to analyze
 * @returns Object with start and end times, or null if no keyframes
 */
export function getTimelineKeyframeRange(
  timeline: Timeline
): { start: number; end: number } | null {
  let minTime = Infinity;
  let maxTime = -Infinity;
  let hasKeyframes = false;

  for (const track of timeline.tracks) {
    for (const kf of track.keyframes) {
      hasKeyframes = true;
      minTime = Math.min(minTime, kf.time);
      maxTime = Math.max(maxTime, kf.time);
    }
  }

  if (!hasKeyframes) {
    return null;
  }

  return { start: minTime, end: maxTime };
}
