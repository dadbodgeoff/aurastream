/**
 * Entry Animation Dispatcher
 *
 * Routes animation requests to the appropriate handler.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { EntryAnimationConfig } from './types';
import { mergeEntryConfig } from './types';
import { popIn } from './popIn';
import { slideIn } from './slideIn';
import { fadeIn } from './fadeIn';
import { burst } from './burst';
import { bounceIn } from './bounce';
import { glitch } from './glitch';
import { spinIn } from './spinIn';
import { dropIn } from './dropIn';

/**
 * Apply entry animation based on config type.
 *
 * @param config Animation configuration (will be merged with defaults)
 * @param context Runtime context
 * @param transform Current transform state
 * @returns Updated transform
 */
export function applyEntryAnimation(
  config: EntryAnimationConfig,
  context: AnimationContext,
  transform: AnimationTransform
): AnimationTransform {
  // Merge with defaults
  const mergedConfig = mergeEntryConfig(config);

  switch (mergedConfig.type) {
    case 'pop_in':
      return popIn(mergedConfig, context, transform);

    case 'slide_in':
      return slideIn(mergedConfig, context, transform);

    case 'fade_in':
      return fadeIn(mergedConfig, context, transform);

    case 'burst':
      return burst(mergedConfig, context, transform);

    case 'bounce':
      return bounceIn(mergedConfig, context, transform);

    case 'glitch':
      return glitch(mergedConfig, context, transform);

    case 'spin_in':
      return spinIn(mergedConfig, context, transform);

    case 'drop_in':
      return dropIn(mergedConfig, context, transform);

    default:
      // Type guard - should never reach here
      const _exhaustive: never = mergedConfig;
      console.warn(`Unknown entry animation type: ${(mergedConfig as any).type}`);
      return transform;
  }
}

/**
 * Check if entry animation is complete.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @returns True if entry animation has finished
 */
export function isEntryComplete(
  config: EntryAnimationConfig,
  context: AnimationContext
): boolean {
  const entryDuration = config.durationMs / context.durationMs;
  return context.t >= entryDuration;
}

/**
 * Get entry animation progress (0-1).
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @returns Progress value clamped to 0-1
 */
export function getEntryProgress(
  config: EntryAnimationConfig,
  context: AnimationContext
): number {
  const entryDuration = config.durationMs / context.durationMs;
  return Math.min(context.t / entryDuration, 1);
}
