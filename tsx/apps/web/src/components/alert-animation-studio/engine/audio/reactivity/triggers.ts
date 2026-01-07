/**
 * Audio Reactive Trigger Logic
 *
 * Functions for determining when audio reactive mappings
 * should be applied based on trigger mode.
 */

import type { AudioAnalysis, AudioReactiveMapping, TriggerMode } from '../types';
import type { MappingState } from './types';

// ============================================================================
// Trigger Detection
// ============================================================================

/**
 * Determine if a mapping should trigger based on its mode.
 *
 * @param mapping - The audio reactive mapping
 * @param sourceValue - Current source value
 * @param state - Current mapping state
 * @param audio - Full audio analysis (for beat detection)
 * @returns Whether the mapping should trigger
 */
export function shouldTrigger(
  mapping: AudioReactiveMapping,
  sourceValue: number,
  state: MappingState,
  audio: AudioAnalysis
): boolean {
  if (!mapping.enabled) {
    return false;
  }

  switch (mapping.triggerMode) {
    case 'continuous':
      return true;

    case 'onBeat':
      return checkBeatTrigger(audio, state);

    case 'onThreshold':
      return checkThresholdTrigger(sourceValue, mapping.threshold ?? 0.5);

    case 'onRise':
      return checkRiseTrigger(sourceValue, state.previousSourceValue);

    case 'onFall':
      return checkFallTrigger(sourceValue, state.previousSourceValue);

    default:
      return true;
  }
}

/**
 * Check if a beat was detected recently.
 */
function checkBeatTrigger(audio: AudioAnalysis, state: MappingState): boolean {
  // Consider triggered if a beat occurred in the last 50ms
  const beatWindow = 50;
  return audio.timeSinceLastBeat < beatWindow;
}

/**
 * Check if value exceeds threshold.
 */
function checkThresholdTrigger(value: number, threshold: number): boolean {
  return value >= threshold;
}

/**
 * Check if value is rising.
 */
function checkRiseTrigger(current: number, previous: number): boolean {
  const minDelta = 0.01; // Minimum change to count as rising
  return current - previous > minDelta;
}

/**
 * Check if value is falling.
 */
function checkFallTrigger(current: number, previous: number): boolean {
  const minDelta = 0.01; // Minimum change to count as falling
  return previous - current > minDelta;
}

// ============================================================================
// Trigger State Management
// ============================================================================

/**
 * Update mapping state after trigger check.
 *
 * @param state - Current mapping state
 * @param sourceValue - Current source value
 * @param triggered - Whether trigger fired
 * @returns Updated mapping state
 */
export function updateTriggerState(
  state: MappingState,
  sourceValue: number,
  triggered: boolean
): MappingState {
  return {
    ...state,
    previousSourceValue: sourceValue,
    isTriggered: triggered,
    lastTriggerTime: triggered ? performance.now() : state.lastTriggerTime,
  };
}

/**
 * Get trigger intensity based on how strongly the trigger condition is met.
 *
 * @param mapping - The audio reactive mapping
 * @param sourceValue - Current source value
 * @param state - Current mapping state
 * @param audio - Full audio analysis
 * @returns Trigger intensity (0-1)
 */
export function getTriggerIntensity(
  mapping: AudioReactiveMapping,
  sourceValue: number,
  state: MappingState,
  audio: AudioAnalysis
): number {
  switch (mapping.triggerMode) {
    case 'continuous':
      return 1;

    case 'onBeat': {
      // Intensity based on beat strength
      if (audio.beats.length === 0) return 0;
      const lastBeat = audio.beats[audio.beats.length - 1];
      // Decay intensity over time since beat
      const decay = Math.exp(-audio.timeSinceLastBeat / 100);
      return lastBeat.strength * decay;
    }

    case 'onThreshold': {
      const threshold = mapping.threshold ?? 0.5;
      if (sourceValue < threshold) return 0;
      // Intensity based on how much value exceeds threshold
      return Math.min(1, (sourceValue - threshold) / (1 - threshold));
    }

    case 'onRise': {
      const delta = sourceValue - state.previousSourceValue;
      if (delta <= 0) return 0;
      // Intensity based on rate of rise
      return Math.min(1, delta * 10);
    }

    case 'onFall': {
      const delta = state.previousSourceValue - sourceValue;
      if (delta <= 0) return 0;
      // Intensity based on rate of fall
      return Math.min(1, delta * 10);
    }

    default:
      return 1;
  }
}

// ============================================================================
// Trigger Helpers
// ============================================================================

/**
 * Check if enough time has passed since last trigger.
 *
 * @param state - Mapping state
 * @param minInterval - Minimum interval in ms
 * @returns Whether enough time has passed
 */
export function canRetrigger(state: MappingState, minInterval: number): boolean {
  const now = performance.now();
  return now - state.lastTriggerTime >= minInterval;
}

/**
 * Get time since last trigger in milliseconds.
 */
export function getTimeSinceTrigger(state: MappingState): number {
  return performance.now() - state.lastTriggerTime;
}

/**
 * Create a debounced trigger checker.
 *
 * @param minInterval - Minimum interval between triggers in ms
 * @returns Debounced trigger function
 */
export function createDebouncedTrigger(minInterval: number): {
  check: (shouldTrigger: boolean) => boolean;
  reset: () => void;
} {
  let lastTriggerTime = 0;

  return {
    check(shouldTrigger: boolean): boolean {
      if (!shouldTrigger) return false;

      const now = performance.now();
      if (now - lastTriggerTime < minInterval) {
        return false;
      }

      lastTriggerTime = now;
      return true;
    },
    reset(): void {
      lastTriggerTime = 0;
    },
  };
}
