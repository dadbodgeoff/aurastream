/**
 * Tilt Effect
 *
 * 3D card rotation following mouse position.
 * Creates an interactive, tactile feel.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { TiltConfig, DepthEffectState } from './types';
import { degToRad } from '../core/types';

/**
 * Apply tilt effect.
 *
 * @param config Effect configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @param state Depth effect state (mouse position, etc.)
 * @returns Updated transform
 */
export function tilt(
  config: TiltConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  state: DepthEffectState
): AnimationTransform {
  const maxAngleX = degToRad(config.maxAngleX ?? 15);
  const maxAngleY = degToRad(config.maxAngleY ?? 15);
  const scaleOnHover = config.scaleOnHover ?? 1.05;
  const invert = config.invert ?? false;
  const intensity = config.intensity ?? 0.5;

  const multiplier = invert ? -1 : 1;

  // Calculate rotation based on mouse position
  const rotationY = state.mouseX * maxAngleY * multiplier * intensity;
  const rotationX = -state.mouseY * maxAngleX * multiplier * intensity;

  // Scale up slightly when hovering
  const hoverIntensity = Math.sqrt(state.mouseX ** 2 + state.mouseY ** 2);
  const isHovering = hoverIntensity > 0.01 || state.isHovering;
  const scale = isHovering ? scaleOnHover : 1;

  // Update perspective uniform if available
  if (context.material?.uniforms?.uPerspective) {
    context.material.uniforms.uPerspective.value = config.perspective ?? 1000;
  }

  return {
    ...transform,
    rotationX: transform.rotationX + rotationX,
    rotationY: transform.rotationY + rotationY,
    scaleX: transform.scaleX * scale,
    scaleY: transform.scaleY * scale,
    scaleZ: transform.scaleZ * scale,
  };
}
