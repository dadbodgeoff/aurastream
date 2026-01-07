/**
 * Keyframe Operations
 *
 * Functions for creating and manipulating keyframes.
 */

import type { EasingName } from '../../animations/core/types';

/**
 * Generate a unique ID for keyframes.
 * Uses crypto.randomUUID() for secure random IDs.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
import type { Keyframe, BezierHandle, KeyframeUpdate } from '../types';

/**
 * Create a new keyframe.
 *
 * @param time - Time position in milliseconds
 * @param value - The value at this keyframe
 * @param easing - Easing function to this keyframe (default: 'power2.out')
 * @returns A new Keyframe object
 */
export function createKeyframe(
  time: number,
  value: number,
  easing: EasingName = 'power2.out'
): Keyframe {
  return {
    id: generateId(),
    time: Math.max(0, time),
    value,
    easing,
    selected: false,
    locked: false,
  };
}

/**
 * Create a keyframe with bezier handles for custom easing.
 *
 * @param time - Time position in milliseconds
 * @param value - The value at this keyframe
 * @param handleIn - Incoming bezier handle
 * @param handleOut - Outgoing bezier handle
 * @returns A new Keyframe object with handles
 */
export function createKeyframeWithHandles(
  time: number,
  value: number,
  handleIn?: BezierHandle,
  handleOut?: BezierHandle
): Keyframe {
  return {
    id: generateId(),
    time: Math.max(0, time),
    value,
    easing: 'linear', // Bezier handles override easing
    handleIn,
    handleOut,
    selected: false,
    locked: false,
  };
}

/**
 * Update a keyframe with partial updates.
 * Returns a new keyframe object (immutable).
 *
 * @param keyframe - The keyframe to update
 * @param updates - Partial updates to apply
 * @returns A new updated Keyframe object
 */
export function updateKeyframe(
  keyframe: Keyframe,
  updates: KeyframeUpdate
): Keyframe {
  return {
    ...keyframe,
    ...updates,
    // Ensure time is never negative
    time: updates.time !== undefined ? Math.max(0, updates.time) : keyframe.time,
  };
}

/**
 * Clone a keyframe with a new ID.
 *
 * @param keyframe - The keyframe to clone
 * @returns A new Keyframe object with a new ID
 */
export function cloneKeyframe(keyframe: Keyframe): Keyframe {
  return {
    ...keyframe,
    id: generateId(),
    // Deep clone handles if present
    handleIn: keyframe.handleIn ? { ...keyframe.handleIn } : undefined,
    handleOut: keyframe.handleOut ? { ...keyframe.handleOut } : undefined,
    // Reset selection state on clone
    selected: false,
  };
}

/**
 * Clone a keyframe at a new time position.
 *
 * @param keyframe - The keyframe to clone
 * @param newTime - The new time position
 * @returns A new Keyframe object at the new time
 */
export function cloneKeyframeAtTime(keyframe: Keyframe, newTime: number): Keyframe {
  return {
    ...cloneKeyframe(keyframe),
    time: Math.max(0, newTime),
  };
}

/**
 * Set bezier handles on a keyframe.
 *
 * @param keyframe - The keyframe to update
 * @param handleIn - Incoming bezier handle (optional)
 * @param handleOut - Outgoing bezier handle (optional)
 * @returns A new Keyframe object with updated handles
 */
export function setKeyframeHandles(
  keyframe: Keyframe,
  handleIn?: BezierHandle,
  handleOut?: BezierHandle
): Keyframe {
  return {
    ...keyframe,
    handleIn: handleIn ?? keyframe.handleIn,
    handleOut: handleOut ?? keyframe.handleOut,
  };
}

/**
 * Clear bezier handles from a keyframe.
 *
 * @param keyframe - The keyframe to update
 * @returns A new Keyframe object without handles
 */
export function clearKeyframeHandles(keyframe: Keyframe): Keyframe {
  return {
    ...keyframe,
    handleIn: undefined,
    handleOut: undefined,
  };
}

/**
 * Toggle keyframe selection state.
 *
 * @param keyframe - The keyframe to toggle
 * @returns A new Keyframe object with toggled selection
 */
export function toggleKeyframeSelection(keyframe: Keyframe): Keyframe {
  return {
    ...keyframe,
    selected: !keyframe.selected,
  };
}

/**
 * Toggle keyframe lock state.
 *
 * @param keyframe - The keyframe to toggle
 * @returns A new Keyframe object with toggled lock
 */
export function toggleKeyframeLock(keyframe: Keyframe): Keyframe {
  return {
    ...keyframe,
    locked: !keyframe.locked,
  };
}

/**
 * Check if a keyframe has custom bezier handles.
 *
 * @param keyframe - The keyframe to check
 * @returns True if the keyframe has bezier handles
 */
export function hasCustomHandles(keyframe: Keyframe): boolean {
  return keyframe.handleIn !== undefined || keyframe.handleOut !== undefined;
}

/**
 * Create default bezier handles for smooth interpolation.
 * Creates handles that approximate a smooth ease-in-out curve.
 *
 * @returns Default bezier handles
 */
export function createDefaultHandles(): { handleIn: BezierHandle; handleOut: BezierHandle } {
  return {
    handleIn: { x: 0.33, y: 0 },
    handleOut: { x: 0.67, y: 1 },
  };
}

/**
 * Create linear bezier handles (no easing).
 *
 * @returns Linear bezier handles
 */
export function createLinearHandles(): { handleIn: BezierHandle; handleOut: BezierHandle } {
  return {
    handleIn: { x: 0.33, y: 0.33 },
    handleOut: { x: 0.67, y: 0.67 },
  };
}

/**
 * Create ease-in bezier handles.
 *
 * @returns Ease-in bezier handles
 */
export function createEaseInHandles(): { handleIn: BezierHandle; handleOut: BezierHandle } {
  return {
    handleIn: { x: 0.42, y: 0 },
    handleOut: { x: 1, y: 1 },
  };
}

/**
 * Create ease-out bezier handles.
 *
 * @returns Ease-out bezier handles
 */
export function createEaseOutHandles(): { handleIn: BezierHandle; handleOut: BezierHandle } {
  return {
    handleIn: { x: 0, y: 0 },
    handleOut: { x: 0.58, y: 1 },
  };
}

/**
 * Sort keyframes by time.
 *
 * @param keyframes - Array of keyframes to sort
 * @returns A new sorted array of keyframes
 */
export function sortKeyframesByTime(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.time - b.time);
}

/**
 * Find keyframe by ID.
 *
 * @param keyframes - Array of keyframes to search
 * @param id - Keyframe ID to find
 * @returns The keyframe or undefined if not found
 */
export function findKeyframeById(
  keyframes: Keyframe[],
  id: string
): Keyframe | undefined {
  return keyframes.find((kf) => kf.id === id);
}

/**
 * Find keyframe index by ID.
 *
 * @param keyframes - Array of keyframes to search
 * @param id - Keyframe ID to find
 * @returns The index or -1 if not found
 */
export function findKeyframeIndexById(keyframes: Keyframe[], id: string): number {
  return keyframes.findIndex((kf) => kf.id === id);
}
