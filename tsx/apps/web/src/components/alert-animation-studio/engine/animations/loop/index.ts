/**
 * Loop Animations Module
 *
 * Continuous animations that play after the entry animation.
 */

// Types
export * from './types';

// Individual animations
export { float } from './float';
export { pulse } from './pulse';
export { wiggle } from './wiggle';
export { glow } from './glow';
export { rgbGlow } from './rgbGlow';
export { breathe } from './breathe';
export { shake } from './shake';
export { swing } from './swing';

// Dispatcher
export {
  applyLoopAnimation,
  calculateLoopTime,
} from './dispatcher';
