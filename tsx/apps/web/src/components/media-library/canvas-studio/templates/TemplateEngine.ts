/**
 * Template Engine
 * 
 * Applies templates to the canvas by converting template slots
 * to placements and sketch elements.
 */

import type { MediaAsset } from '@aurastream/api-client';
import type { AssetPlacement } from '../../placement/types';
import type { AnySketchElement, ImageElement } from '../../canvas-export/types';
import type { CanvasTemplate, TemplateSlot } from './data';

// ============================================================================
// Types
// ============================================================================

export interface SlotAssignment {
  slotId: string;
  asset: MediaAsset;
}

export interface AppliedTemplate {
  template: CanvasTemplate;
  placements: AssetPlacement[];
  sketchElements: AnySketchElement[];
  unfilledSlots: TemplateSlot[];
}

// ============================================================================
// Template Application
// ============================================================================

/**
 * Apply a template with the given slot assignments.
 * Converts template slots + assets into placements and sketch elements.
 */
export function applyTemplate(
  template: CanvasTemplate,
  assignments: SlotAssignment[]
): AppliedTemplate {
  const placements: AssetPlacement[] = [];
  const sketchElements: AnySketchElement[] = [];
  const filledSlotIds = new Set(assignments.map(a => a.slotId));
  
  // Process each assignment
  for (const assignment of assignments) {
    const slot = template.slots.find(s => s.id === assignment.slotId);
    if (!slot) continue;
    
    // Create placement from slot + asset
    const placement = slotToPlacement(slot, assignment.asset);
    placements.push(placement);
    
    // Also create image element for sketch canvas
    const imageElement = placementToImageElement(placement);
    sketchElements.push(imageElement);
  }
  
  // Find unfilled slots
  const unfilledSlots = template.slots.filter(s => !filledSlotIds.has(s.id));
  
  return {
    template,
    placements,
    sketchElements,
    unfilledSlots,
  };
}

/**
 * Convert a template slot + asset into an AssetPlacement
 */
export function slotToPlacement(
  slot: TemplateSlot,
  asset: MediaAsset
): AssetPlacement {
  return {
    assetId: asset.id,
    asset,
    position: {
      x: slot.position.x,
      y: slot.position.y,
      anchor: 'center',
    },
    size: {
      width: slot.size.width,
      height: slot.size.height,
      unit: 'percent',
      maintainAspectRatio: slot.autoFit === 'contain',
    },
    rotation: 0,
    opacity: slot.defaultOpacity,
    zIndex: slot.zIndex,
  };
}

/**
 * Convert an AssetPlacement to an ImageElement for the sketch canvas
 */
export function placementToImageElement(placement: AssetPlacement): ImageElement {
  return {
    id: `image-${placement.assetId}`,
    type: 'image',
    x: placement.position.x,
    y: placement.position.y,
    width: placement.size.width,
    height: placement.size.height,
    src: placement.asset.url,
    thumbnailSrc: placement.asset.thumbnailUrl || undefined,
    assetId: placement.assetId,
    displayName: placement.asset.displayName,
    rotation: placement.rotation,
    maintainAspectRatio: placement.size.maintainAspectRatio,
    zIndex: placement.zIndex,
    opacity: placement.opacity,
    color: 'transparent',
    strokeWidth: 0,
  };
}

// ============================================================================
// Slot Matching
// ============================================================================

/**
 * Find the best slot for an asset based on its type
 */
export function findBestSlotForAsset(
  template: CanvasTemplate,
  asset: MediaAsset,
  excludeSlotIds: string[] = []
): TemplateSlot | null {
  // Filter to slots that accept this asset type and aren't excluded
  const compatibleSlots = template.slots.filter(
    slot =>
      slot.acceptedTypes.includes(asset.assetType) &&
      !excludeSlotIds.includes(slot.id)
  );
  
  if (compatibleSlots.length === 0) return null;
  
  // Prioritize required slots first
  const requiredSlots = compatibleSlots.filter(s => s.required);
  if (requiredSlots.length > 0) {
    return requiredSlots[0];
  }
  
  // Then optional slots
  return compatibleSlots[0];
}

/**
 * Auto-assign assets to template slots based on asset types
 */
export function autoAssignAssets(
  template: CanvasTemplate,
  assets: MediaAsset[]
): SlotAssignment[] {
  const assignments: SlotAssignment[] = [];
  const usedSlotIds: string[] = [];
  const usedAssetIds: string[] = [];
  
  // First pass: assign to required slots
  for (const slot of template.slots.filter(s => s.required)) {
    const matchingAsset = assets.find(
      a =>
        slot.acceptedTypes.includes(a.assetType) &&
        !usedAssetIds.includes(a.id)
    );
    
    if (matchingAsset) {
      assignments.push({ slotId: slot.id, asset: matchingAsset });
      usedSlotIds.push(slot.id);
      usedAssetIds.push(matchingAsset.id);
    }
  }
  
  // Second pass: assign remaining assets to optional slots
  for (const asset of assets) {
    if (usedAssetIds.includes(asset.id)) continue;
    
    const slot = findBestSlotForAsset(template, asset, usedSlotIds);
    if (slot) {
      assignments.push({ slotId: slot.id, asset });
      usedSlotIds.push(slot.id);
      usedAssetIds.push(asset.id);
    }
  }
  
  return assignments;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if all required slots are filled
 */
export function validateTemplate(
  template: CanvasTemplate,
  assignments: SlotAssignment[]
): { isValid: boolean; missingSlots: TemplateSlot[] } {
  const filledSlotIds = new Set(assignments.map(a => a.slotId));
  const missingSlots = template.slots.filter(
    s => s.required && !filledSlotIds.has(s.id)
  );
  
  return {
    isValid: missingSlots.length === 0,
    missingSlots,
  };
}

/**
 * Get a summary of template slot status
 */
export function getTemplateStatus(
  template: CanvasTemplate,
  assignments: SlotAssignment[]
): {
  totalSlots: number;
  filledSlots: number;
  requiredSlots: number;
  filledRequiredSlots: number;
  isComplete: boolean;
} {
  const filledSlotIds = new Set(assignments.map(a => a.slotId));
  const requiredSlots = template.slots.filter(s => s.required);
  const filledRequiredSlots = requiredSlots.filter(s => filledSlotIds.has(s.id));
  
  return {
    totalSlots: template.slots.length,
    filledSlots: assignments.length,
    requiredSlots: requiredSlots.length,
    filledRequiredSlots: filledRequiredSlots.length,
    isComplete: filledRequiredSlots.length === requiredSlots.length,
  };
}
