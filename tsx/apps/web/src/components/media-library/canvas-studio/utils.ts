/**
 * Canvas Studio Utilities
 * 
 * Conversion functions between placements and sketch elements.
 */

import type { MediaAsset } from '@aurastream/api-client';
import type { AssetPlacement } from '../placement/types';
import type { AnySketchElement, ImageElement } from '../canvas-export/types';

/**
 * Convert asset placements to ImageElement sketch elements.
 * This allows assets to be manipulated directly on the sketch canvas.
 */
export function placementsToImageElements(placements: AssetPlacement[]): ImageElement[] {
  return placements.map((placement) => ({
    id: `image-${placement.assetId}`,
    type: 'image' as const,
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
  }));
}

/**
 * Extract image elements from sketch elements and convert back to placements.
 */
export function imageElementsToPlacements(
  elements: AnySketchElement[],
  assets: MediaAsset[]
): AssetPlacement[] {
  const imageElements = elements.filter((el): el is ImageElement => el.type === 'image');
  
  const results: AssetPlacement[] = [];
  
  for (const el of imageElements) {
    const asset = assets.find(a => a.id === el.assetId);
    if (!asset) continue;
    
    results.push({
      assetId: el.assetId || asset.id,
      asset,
      position: {
        x: el.x,
        y: el.y,
        anchor: 'center',
      },
      size: {
        width: el.width,
        height: el.height,
        unit: 'percent',
        maintainAspectRatio: el.maintainAspectRatio,
      },
      rotation: el.rotation,
      opacity: el.opacity,
      zIndex: el.zIndex,
    });
  }
  
  return results;
}
