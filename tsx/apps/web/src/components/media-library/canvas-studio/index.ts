/**
 * Canvas Studio Module
 * 
 * Re-exports for clean imports.
 */

export { CanvasStudioModal, default } from './CanvasStudioModal';
export { useCanvasStudio } from './useCanvasStudio';
export * from './types';
export * from './utils';
export * from './icons';

// Phase 1: Templates & Modes
export * from './templates';
export * from './modes';

// Phase 2: Magic (Smart Tools)
export * from './magic';

// Phase 3: Guides
export * from './guides';

// Phase 4: Export
export * from './export';

// Phase 5: History & Delight
export * from './history';
export * from './delight';
