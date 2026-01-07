/**
 * Depth Effect Dispatcher
 *
 * Routes effect requests to the appropriate handler.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { DepthEffectConfig, DepthEffectState } from './types';
import { mergeDepthConfig } from './types';
import { parallax } from './parallax';
import { tilt } from './tilt';
import { popOut } from './popOut';
import { float3D } from './float3d';

/**
 * Apply depth effect based on config type.
 *
 * @param config Effect configuration (will be merged with defaults)
 * @param context Runtime context
 * @param transform Current transform state
 * @param state Depth effect state (mouse position, trigger progress, etc.)
 * @returns Updated transform
 */
export function applyDepthEffect(
  config: DepthEffectConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  state: DepthEffectState
): AnimationTransform {
  // Merge with defaults
  const mergedConfig = mergeDepthConfig(config);

  switch (mergedConfig.type) {
    case 'parallax':
      return parallax(mergedConfig, context, transform, state);

    case 'tilt':
      return tilt(mergedConfig, context, transform, state);

    case 'pop_out':
      return popOut(mergedConfig, context, transform, state);

    case 'float_3d':
      return float3D(mergedConfig, context, transform, state);

    default:
      // Type guard - should never reach here
      const _exhaustive: never = mergedConfig;
      console.warn(`Unknown depth effect type: ${(mergedConfig as any).type}`);
      return transform;
  }
}

/**
 * Check if depth effect should be active based on trigger type.
 *
 * @param config Effect configuration
 * @param state Depth effect state
 * @returns True if effect should be applied
 */
export function shouldApplyDepthEffect(
  config: DepthEffectConfig,
  state: DepthEffectState
): boolean {
  const trigger = config.trigger ?? 'mouse';

  switch (trigger) {
    case 'always':
      return true;

    case 'mouse':
      return state.isHovering || Math.abs(state.mouseX) > 0.01 || Math.abs(state.mouseY) > 0.01;

    case 'on_enter':
      return state.triggerProgress > 0;

    case 'auto':
      return true;

    default:
      return true;
  }
}
