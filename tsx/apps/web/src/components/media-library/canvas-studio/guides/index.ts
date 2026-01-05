/**
 * Canvas Studio Guides
 * 
 * Visual guides and helpers for the canvas editor.
 */

export { DropZones } from './DropZones';
export { SnapGuides, calculateSnappedPosition } from './SnapGuides';
export { SlotHighlight, findCompatibleSlot, getCompatibleSlots } from './SlotHighlight';
export { 
  SafeZone, 
  getSafeZonePadding, 
  isWithinSafeZone, 
  getSafeZoneBounds, 
  clampToSafeZone,
  PRESET_DESCRIPTIONS,
} from './SafeZone';
export {
  GuidedTour,
  useTourState,
  CANVAS_STUDIO_TOUR_STEPS,
} from './GuidedTour';

// Re-export types
export type { SafeZonePreset } from './SafeZone';
export type { TourStep } from './GuidedTour';
