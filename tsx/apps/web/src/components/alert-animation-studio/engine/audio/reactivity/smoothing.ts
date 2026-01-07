/**
 * Value Smoothing Utilities
 *
 * Functions for smoothing audio-reactive values to create
 * fluid animations without jitter.
 */

// ============================================================================
// Smoothing Functions
// ============================================================================

/**
 * Apply linear interpolation smoothing between current and target values.
 *
 * @param current - Current value
 * @param target - Target value
 * @param smoothing - Smoothing factor (0-1, higher = smoother/slower)
 * @returns Smoothed value
 */
export function smoothValue(
  current: number,
  target: number,
  smoothing: number
): number {
  // Clamp smoothing to valid range
  const s = Math.max(0, Math.min(1, smoothing));

  // Linear interpolation
  return current * s + target * (1 - s);
}

/**
 * Apply exponential smoothing (EMA - Exponential Moving Average).
 *
 * More responsive to changes than linear smoothing.
 *
 * @param current - Current value
 * @param target - Target value
 * @param factor - Smoothing factor (0-1, lower = smoother)
 * @returns Smoothed value
 */
export function exponentialSmoothing(
  current: number,
  target: number,
  factor: number
): number {
  const f = Math.max(0.001, Math.min(1, factor));
  return current + (target - current) * f;
}

/**
 * Apply spring-based smoothing for bouncy effects.
 *
 * @param current - Current value
 * @param target - Target value
 * @param velocity - Current velocity (modified in place conceptually)
 * @param stiffness - Spring stiffness (higher = faster)
 * @param damping - Damping factor (higher = less bounce)
 * @param deltaTime - Time since last frame in seconds
 * @returns Object with new value and velocity
 */
export function springSmoothing(
  current: number,
  target: number,
  velocity: number,
  stiffness: number = 100,
  damping: number = 10,
  deltaTime: number = 1 / 60
): { value: number; velocity: number } {
  // Spring force
  const springForce = (target - current) * stiffness;

  // Damping force
  const dampingForce = -velocity * damping;

  // Acceleration
  const acceleration = springForce + dampingForce;

  // Update velocity and position
  const newVelocity = velocity + acceleration * deltaTime;
  const newValue = current + newVelocity * deltaTime;

  return { value: newValue, velocity: newVelocity };
}

/**
 * Apply attack/release envelope smoothing.
 *
 * Different smoothing for rising vs falling values,
 * useful for audio-reactive effects.
 *
 * @param current - Current value
 * @param target - Target value
 * @param attackTime - Time to reach target when rising (seconds)
 * @param releaseTime - Time to reach target when falling (seconds)
 * @param deltaTime - Time since last frame in seconds
 * @returns Smoothed value
 */
export function envelopeSmoothing(
  current: number,
  target: number,
  attackTime: number,
  releaseTime: number,
  deltaTime: number = 1 / 60
): number {
  const isRising = target > current;
  const time = isRising ? attackTime : releaseTime;

  if (time <= 0) {
    return target;
  }

  // Calculate smoothing factor based on time constant
  const factor = 1 - Math.exp(-deltaTime / time);

  return current + (target - current) * factor;
}

/**
 * Apply peak hold with decay.
 *
 * Holds peak values and decays slowly, useful for
 * visualizing audio peaks.
 *
 * @param current - Current peak value
 * @param input - New input value
 * @param decayRate - Decay rate per frame (0-1)
 * @returns New peak value
 */
export function peakHoldDecay(
  current: number,
  input: number,
  decayRate: number = 0.98
): number {
  if (input >= current) {
    return input;
  }
  return current * decayRate;
}

/**
 * Apply hysteresis to prevent jitter around threshold.
 *
 * @param current - Current state (true/false as 1/0)
 * @param value - Input value
 * @param thresholdOn - Threshold to turn on
 * @param thresholdOff - Threshold to turn off (should be < thresholdOn)
 * @returns New state (1 or 0)
 */
export function hysteresis(
  current: number,
  value: number,
  thresholdOn: number,
  thresholdOff: number
): number {
  if (current > 0.5) {
    // Currently on, check if should turn off
    return value < thresholdOff ? 0 : 1;
  } else {
    // Currently off, check if should turn on
    return value > thresholdOn ? 1 : 0;
  }
}

/**
 * Apply dead zone to ignore small values.
 *
 * @param value - Input value
 * @param deadZone - Values below this are treated as 0
 * @param maxValue - Maximum expected value for normalization
 * @returns Value with dead zone applied
 */
export function applyDeadZone(
  value: number,
  deadZone: number,
  maxValue: number = 1
): number {
  if (Math.abs(value) < deadZone) {
    return 0;
  }

  // Remap remaining range to 0-1
  const sign = value < 0 ? -1 : 1;
  const absValue = Math.abs(value);
  const range = maxValue - deadZone;

  if (range <= 0) {
    return sign;
  }

  return sign * ((absValue - deadZone) / range);
}

/**
 * Smooth an array of values (e.g., frequency bands).
 *
 * @param current - Current values array
 * @param target - Target values array
 * @param smoothing - Smoothing factor
 * @returns New smoothed array
 */
export function smoothArray(
  current: number[],
  target: number[],
  smoothing: number
): number[] {
  const length = Math.min(current.length, target.length);
  const result = new Array(length);

  for (let i = 0; i < length; i++) {
    result[i] = smoothValue(current[i], target[i], smoothing);
  }

  return result;
}
