/**
 * Loop Animation Dispatcher
 *
 * Routes animation requests to the appropriate handler.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { LoopAnimationConfig } from './types';
import { mergeLoopConfig } from './types';
import { float } from './float';
import { pulse } from './pulse';
import { wiggle } from './wiggle';
import { glow } from './glow';
import { rgbGlow } from './rgbGlow';
import { breathe } from './breathe';
import { shake } from './shake';
import { swing } from './swing';

/**
 * Apply loop animation based on config type.
 *
 * @param config Animation configuration (will be merged with defaults)
 * @param context Runtime context
 * @param transform Current transform state
 * @param loopT Loop time in seconds (time since loop started)
 * @returns Updated transform
 */
export function applyLoopAnimation(
  config: LoopAnimationConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  // Merge with defaults
  const mergedConfig = mergeLoopConfig(config);

  switch (mergedConfig.type) {
    case 'float':
      return float(mergedConfig, context, transform, loopT);

    case 'pulse':
      return pulse(mergedConfig, context, transform, loopT);

    case 'wiggle':
      return wiggle(mergedConfig, context, transform, loopT);

    case 'glow':
      return glow(mergedConfig, context, transform, loopT);

    case 'rgb_glow':
      return rgbGlow(mergedConfig, context, transform, loopT);

    case 'breathe':
      return breathe(mergedConfig, context, transform, loopT);

    case 'shake':
      return shake(mergedConfig, context, transform, loopT);

    case 'swing':
      return swing(mergedConfig, context, transform, loopT);

    default:
      // Type guard - should never reach here
      const _exhaustive: never = mergedConfig;
      console.warn(`Unknown loop animation type: ${(mergedConfig as any).type}`);
      return transform;
  }
}

/**
 * Calculate loop time based on entry animation completion.
 *
 * @param context Runtime context
 * @param entryDurationMs Entry animation duration in milliseconds
 * @returns Loop time in seconds (0 if entry not complete)
 */
export function calculateLoopTime(
  context: AnimationContext,
  entryDurationMs: number
): number {
  const entryDuration = entryDurationMs / context.durationMs;

  if (context.t < entryDuration) {
    return 0; // Entry not complete
  }

  // Calculate time since entry completed
  const loopStartT = entryDuration;
  const loopT = context.t - loopStartT;

  // Convert to seconds
  return loopT * context.durationMs / 1000;
}
