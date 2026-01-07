/**
 * Float 3D Effect
 *
 * Gentle 3D floating motion.
 * Creates an ethereal, weightless feel.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { Float3DConfig, DepthEffectState } from './types';
import { degToRad } from '../core/types';

/**
 * Apply float 3D effect.
 *
 * @param config Effect configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @param state Depth effect state (time, etc.)
 * @returns Updated transform
 */
export function float3D(
  config: Float3DConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  state: DepthEffectState
): AnimationTransform {
  const intensity = config.intensity ?? 0.5;
  const rotationIntensity = config.rotationIntensity ?? 5;
  const zIntensity = config.zIntensity ?? 0.02;

  // Slow, organic 3D rotation using different frequencies
  const rotX = Math.sin(state.time * 0.5) * degToRad(rotationIntensity) * intensity;
  const rotY = Math.cos(state.time * 0.3) * degToRad(rotationIntensity) * intensity;
  const posZ = Math.sin(state.time * 0.4) * zIntensity * intensity;

  return {
    ...transform,
    rotationX: transform.rotationX + rotX,
    rotationY: transform.rotationY + rotY,
    positionZ: transform.positionZ + posZ,
  };
}
