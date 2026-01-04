/**
 * Sketch Editor Module
 * 
 * Provides drawing and annotation tools for the canvas.
 * Enables users to sketch compositions, add labels, and annotate assets.
 */

export { SketchEditor } from './SketchEditor';
export { SketchCanvas } from './SketchCanvas';
export { SketchToolbar } from './SketchToolbar';
export { SketchToolPanel } from './SketchToolPanel';
export { useSketchStore, resetSketchStore } from './useSketchStore';

// Easy mode components for beginners
export { RegionLabel, type LabeledRegion } from './RegionLabel';
export { EasySketchMode } from './EasySketchMode';

// Description generator
export { 
  generateSketchDescription, 
  generatePromptDescription,
} from './generateSketchDescription';

export * from './types';
export * from './constants';
