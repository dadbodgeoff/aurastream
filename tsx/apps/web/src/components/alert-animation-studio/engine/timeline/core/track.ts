/**
 * Track Operations
 *
 * Functions for creating and manipulating animation tracks.
 */

import type { EasingName } from '../../animations/core/types';

/**
 * Generate a unique ID for tracks.
 * Uses crypto.randomUUID() for secure random IDs.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
import type {
  Track,
  Keyframe,
  AnimatableProperty,
  BezierHandle,
  PropertyCategory,
  TrackUpdate,
  PROPERTY_METADATA,
} from '../types';
import {
  createKeyframe,
  sortKeyframesByTime,
  findKeyframeIndexById,
} from './keyframe';

// Re-import PROPERTY_METADATA for runtime access
import { PROPERTY_METADATA as PropertyMetadata } from '../types';

/**
 * Get track color based on property category.
 *
 * @param category - The property category
 * @returns A hex color string
 */
export function getTrackColor(category: PropertyCategory): string {
  switch (category) {
    case 'transform':
      return '#3b82f6'; // Blue
    case 'effects':
      return '#8b5cf6'; // Purple
    case 'depth':
      return '#06b6d4'; // Cyan
    case 'particles':
      return '#f59e0b'; // Amber
    default:
      return '#6b7280'; // Gray
  }
}

/**
 * Create a new track for a property.
 *
 * @param property - The animatable property for this track
 * @returns A new Track object
 */
export function createTrack(property: AnimatableProperty): Track {
  const meta = PropertyMetadata[property];
  const category = meta?.category ?? 'transform';

  return {
    id: generateId(),
    property,
    keyframes: [],
    visible: true,
    locked: false,
    solo: false,
    muted: false,
    color: getTrackColor(category),
    expanded: false,
  };
}

/**
 * Create a track with initial keyframes.
 *
 * @param property - The animatable property for this track
 * @param keyframes - Initial keyframes
 * @returns A new Track object with keyframes
 */
export function createTrackWithKeyframes(
  property: AnimatableProperty,
  keyframes: Keyframe[]
): Track {
  const track = createTrack(property);
  return {
    ...track,
    keyframes: sortKeyframesByTime(keyframes),
  };
}

/**
 * Add a keyframe to a track.
 * If a keyframe exists at the same time, update it instead.
 *
 * @param track - The track to add the keyframe to
 * @param time - Time position in milliseconds
 * @param value - The value at this keyframe
 * @param easing - Optional easing function
 * @returns A new Track object with the added keyframe
 */
export function addKeyframe(
  track: Track,
  time: number,
  value: number,
  easing?: EasingName
): Track {
  // Check if keyframe exists at this time
  const existingIndex = track.keyframes.findIndex((kf) => kf.time === time);

  if (existingIndex >= 0) {
    // Update existing keyframe
    const updated = [...track.keyframes];
    updated[existingIndex] = {
      ...updated[existingIndex],
      value,
      easing: easing ?? updated[existingIndex].easing,
    };
    return { ...track, keyframes: updated };
  }

  // Add new keyframe
  const newKeyframe = createKeyframe(time, value, easing);
  const keyframes = sortKeyframesByTime([...track.keyframes, newKeyframe]);

  return { ...track, keyframes };
}

/**
 * Remove a keyframe from a track.
 *
 * @param track - The track to remove the keyframe from
 * @param keyframeId - The ID of the keyframe to remove
 * @returns A new Track object without the keyframe
 */
export function removeKeyframe(track: Track, keyframeId: string): Track {
  return {
    ...track,
    keyframes: track.keyframes.filter((kf) => kf.id !== keyframeId),
  };
}

/**
 * Remove multiple keyframes from a track.
 *
 * @param track - The track to remove keyframes from
 * @param keyframeIds - Set of keyframe IDs to remove
 * @returns A new Track object without the keyframes
 */
export function removeKeyframes(track: Track, keyframeIds: Set<string>): Track {
  return {
    ...track,
    keyframes: track.keyframes.filter((kf) => !keyframeIds.has(kf.id)),
  };
}

/**
 * Move a keyframe to a new time.
 *
 * @param track - The track containing the keyframe
 * @param keyframeId - The ID of the keyframe to move
 * @param newTime - The new time position in milliseconds
 * @returns A new Track object with the moved keyframe
 */
export function moveKeyframe(
  track: Track,
  keyframeId: string,
  newTime: number
): Track {
  const keyframes = track.keyframes.map((kf) =>
    kf.id === keyframeId ? { ...kf, time: Math.max(0, newTime) } : kf
  );

  return { ...track, keyframes: sortKeyframesByTime(keyframes) };
}

/**
 * Update a keyframe's value.
 *
 * @param track - The track containing the keyframe
 * @param keyframeId - The ID of the keyframe to update
 * @param value - The new value
 * @returns A new Track object with the updated keyframe
 */
export function updateKeyframeValue(
  track: Track,
  keyframeId: string,
  value: number
): Track {
  const keyframes = track.keyframes.map((kf) =>
    kf.id === keyframeId ? { ...kf, value } : kf
  );

  return { ...track, keyframes };
}

/**
 * Update a keyframe's bezier handles.
 *
 * @param track - The track containing the keyframe
 * @param keyframeId - The ID of the keyframe to update
 * @param handleIn - Optional incoming handle
 * @param handleOut - Optional outgoing handle
 * @returns A new Track object with the updated keyframe
 */
export function updateKeyframeHandles(
  track: Track,
  keyframeId: string,
  handleIn?: BezierHandle,
  handleOut?: BezierHandle
): Track {
  const keyframes = track.keyframes.map((kf) =>
    kf.id === keyframeId
      ? {
          ...kf,
          handleIn: handleIn ?? kf.handleIn,
          handleOut: handleOut ?? kf.handleOut,
        }
      : kf
  );

  return { ...track, keyframes };
}

/**
 * Update a keyframe's easing function.
 *
 * @param track - The track containing the keyframe
 * @param keyframeId - The ID of the keyframe to update
 * @param easing - The new easing function
 * @returns A new Track object with the updated keyframe
 */
export function updateKeyframeEasing(
  track: Track,
  keyframeId: string,
  easing: EasingName
): Track {
  const keyframes = track.keyframes.map((kf) =>
    kf.id === keyframeId ? { ...kf, easing } : kf
  );

  return { ...track, keyframes };
}

/**
 * Update track properties.
 *
 * @param track - The track to update
 * @param updates - Partial updates to apply
 * @returns A new Track object with updates applied
 */
export function updateTrack(track: Track, updates: TrackUpdate): Track {
  return { ...track, ...updates };
}

/**
 * Toggle track visibility.
 *
 * @param track - The track to toggle
 * @returns A new Track object with toggled visibility
 */
export function toggleTrackVisibility(track: Track): Track {
  return { ...track, visible: !track.visible };
}

/**
 * Toggle track lock state.
 *
 * @param track - The track to toggle
 * @returns A new Track object with toggled lock
 */
export function toggleTrackLock(track: Track): Track {
  return { ...track, locked: !track.locked };
}

/**
 * Toggle track solo state.
 *
 * @param track - The track to toggle
 * @returns A new Track object with toggled solo
 */
export function toggleTrackSolo(track: Track): Track {
  return { ...track, solo: !track.solo };
}

/**
 * Toggle track mute state.
 *
 * @param track - The track to toggle
 * @returns A new Track object with toggled mute
 */
export function toggleTrackMute(track: Track): Track {
  return { ...track, muted: !track.muted };
}

/**
 * Toggle track expanded state.
 *
 * @param track - The track to toggle
 * @returns A new Track object with toggled expanded
 */
export function toggleTrackExpanded(track: Track): Track {
  return { ...track, expanded: !track.expanded };
}

/**
 * Select all keyframes in a track.
 *
 * @param track - The track to select keyframes in
 * @returns A new Track object with all keyframes selected
 */
export function selectAllKeyframes(track: Track): Track {
  return {
    ...track,
    keyframes: track.keyframes.map((kf) => ({ ...kf, selected: true })),
  };
}

/**
 * Deselect all keyframes in a track.
 *
 * @param track - The track to deselect keyframes in
 * @returns A new Track object with all keyframes deselected
 */
export function deselectAllKeyframes(track: Track): Track {
  return {
    ...track,
    keyframes: track.keyframes.map((kf) => ({ ...kf, selected: false })),
  };
}

/**
 * Get selected keyframes from a track.
 *
 * @param track - The track to get selected keyframes from
 * @returns Array of selected keyframes
 */
export function getSelectedKeyframes(track: Track): Keyframe[] {
  return track.keyframes.filter((kf) => kf.selected);
}

/**
 * Get the time range of a track (first to last keyframe).
 *
 * @param track - The track to get the range of
 * @returns Object with start and end times, or null if no keyframes
 */
export function getTrackTimeRange(
  track: Track
): { start: number; end: number } | null {
  if (track.keyframes.length === 0) {
    return null;
  }

  const sorted = sortKeyframesByTime(track.keyframes);
  return {
    start: sorted[0].time,
    end: sorted[sorted.length - 1].time,
  };
}

/**
 * Check if a track has any keyframes.
 *
 * @param track - The track to check
 * @returns True if the track has keyframes
 */
export function hasKeyframes(track: Track): boolean {
  return track.keyframes.length > 0;
}

/**
 * Get the default value for a track's property.
 *
 * @param track - The track to get the default value for
 * @returns The default value
 */
export function getTrackDefaultValue(track: Track): number {
  return PropertyMetadata[track.property]?.defaultValue ?? 0;
}
