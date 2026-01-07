/**
 * Entry Animations Module
 *
 * Animations that play when the alert first appears.
 */

// Types
export * from './types';

// Individual animations
export { popIn } from './popIn';
export { slideIn } from './slideIn';
export { fadeIn } from './fadeIn';
export { burst } from './burst';
export { bounceIn } from './bounce';
export { glitch, glitchWithSlices, type GlitchSlice } from './glitch';
export { spinIn } from './spinIn';
export { dropIn } from './dropIn';

// Dispatcher
export {
  applyEntryAnimation,
  isEntryComplete,
  getEntryProgress,
} from './dispatcher';
