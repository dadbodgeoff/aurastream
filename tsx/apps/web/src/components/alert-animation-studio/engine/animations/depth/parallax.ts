/**
 * Parallax Effect
 *
 * Depth layers move at different speeds based on mouse position.
 * Creates a sense of depth and dimension.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { ParallaxConfig, DepthEffectState } from './types';

/**
 * Apply parallax effect.
 *
 * This effect primarily updates shader uniforms for depth-based displacement.
 *
 * @param config Effect configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @param state Depth effect state (mouse position, etc.)
 * @returns Updated transform
 */
export function parallax(
  config: ParallaxConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  state: DepthEffectState
): AnimationTransform {
  const intensity = config.intensity ?? 0.5;
  const depthScale = (config.depthScale ?? 30) / 100;
  const invert = config.invert ?? false;

  const multiplier = invert ? -1 : 1;

  // Update shader uniforms for depth-based displacement
  if (context.material?.uniforms) {
    const uniforms = context.material.uniforms;

    if (uniforms.uParallaxIntensity) {
      uniforms.uParallaxIntensity.value = intensity;
    }

    if (uniforms.uDepthScale) {
      uniforms.uDepthScale.value = depthScale;
    }

    if (uniforms.uMouse) {
      // Convert mouse position to UV space (0-1)
      uniforms.uMouse.value.set(
        0.5 + state.mouseX * 0.5 * multiplier,
        0.5 + state.mouseY * 0.5 * multiplier
      );
    }
  }

  // Transform unchanged - parallax is shader-based
  return transform;
}
