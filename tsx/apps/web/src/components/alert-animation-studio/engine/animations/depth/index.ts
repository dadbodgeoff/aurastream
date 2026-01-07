/**
 * Depth Effects Module
 *
 * 3D depth-based effects using depth maps.
 */

// Types
export * from './types';

// Individual effects
export { parallax } from './parallax';
export { tilt } from './tilt';
export { popOut } from './popOut';
export { float3D } from './float3d';

// Dispatcher
export {
  applyDepthEffect,
  shouldApplyDepthEffect,
} from './dispatcher';
