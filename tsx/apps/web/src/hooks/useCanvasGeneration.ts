/**
 * useCanvasGeneration Hook
 * 
 * Integrates canvas export with generation flow.
 * Handles exporting canvas to image and uploading for single-image generation mode.
 * 
 * @module hooks/useCanvasGeneration
 */

import { useCallback, useState } from 'react';
import { 
  useUploadCanvasSnapshot, 
  dataUrlToBase64,
  type CanvasSnapshotUploadResponse,
} from '@aurastream/api-client';
import { useCanvasExport } from '../components/media-library/canvas-export';
import { generateSketchDescription, generatePromptDescription } from '../components/media-library/sketch';
import type { AssetPlacement } from '../components/media-library/placement/types';
import type { AnySketchElement } from '../components/media-library/canvas-export/types';
import type { LabeledRegion } from '../components/media-library/sketch/RegionLabel';

interface UseCanvasGenerationOptions {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Asset type being generated */
  assetType: string;
}

interface CanvasGenerationResult {
  /** URL of uploaded canvas snapshot */
  snapshotUrl: string;
  /** Description of canvas contents for AI */
  description: string;
  /** Snapshot metadata */
  snapshot: CanvasSnapshotUploadResponse;
}

interface UseCanvasGenerationReturn {
  /** Prepare canvas for generation (export + upload) */
  prepareCanvasForGeneration: (
    placements: AssetPlacement[],
    sketchElements?: AnySketchElement[],
    labeledRegions?: LabeledRegion[]
  ) => Promise<CanvasGenerationResult>;
  /** Whether preparation is in progress */
  isPreparing: boolean;
  /** Last error */
  error: Error | null;
}

/**
 * Hook for preparing canvas for single-image generation mode.
 * 
 * Exports the canvas at 2x resolution and uploads as a snapshot,
 * returning the URL and description for use in generation requests.
 * 
 * @example
 * ```tsx
 * const { prepareCanvasForGeneration, isPreparing } = useCanvasGeneration({
 *   width: 1280,
 *   height: 720,
 *   assetType: 'thumbnail',
 * });
 * 
 * const handleGenerate = async () => {
 *   // Prepare canvas snapshot
 *   const { snapshotUrl, description } = await prepareCanvasForGeneration(
 *     placements,
 *     sketchElements
 *   );
 *   
 *   // Use in generation request
 *   generateAsset({
 *     assetType: 'thumbnail',
 *     customPrompt: 'Epic gaming moment',
 *     canvasSnapshotUrl: snapshotUrl,
 *     canvasSnapshotDescription: description,
 *   });
 * };
 * ```
 */
export function useCanvasGeneration({
  width,
  height,
  assetType,
}: UseCanvasGenerationOptions): UseCanvasGenerationReturn {
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { exportCanvas } = useCanvasExport({ width, height, config: { scale: 2 } });
  const { mutateAsync: uploadSnapshot } = useUploadCanvasSnapshot();
  
  const prepareCanvasForGeneration = useCallback(async (
    placements: AssetPlacement[],
    sketchElements?: AnySketchElement[],
    labeledRegions?: LabeledRegion[]
  ): Promise<CanvasGenerationResult> => {
    setIsPreparing(true);
    setError(null);
    
    try {
      // Step 1: Export canvas to image
      const exportResult = await exportCanvas(placements, sketchElements);
      
      // Step 2: Convert to base64
      const base64 = dataUrlToBase64(exportResult.dataUrl);
      
      // Step 3: Build description using smart generator
      // Focus on VISUAL descriptions that Gemini can understand
      const assetDescriptions = placements.map(p => {
        const region = getRegionName(p.position.x, p.position.y);
        // Use asset type for visual description, not the name
        const visualType = getVisualDescription(p.asset.assetType);
        return `a ${visualType} in the ${region}`;
      });
      
      // Extract asset names for metadata
      const assetNames = placements.map(p => p.asset.displayName);
      
      let description = '';
      
      if (placements.length > 0) {
        description = `The canvas shows: ${assetDescriptions.join(', ')}. COPY THIS EXACT LAYOUT.`;
      }
      
      // Add sketch/region descriptions using smart generator
      if ((sketchElements && sketchElements.length > 0) || (labeledRegions && labeledRegions.length > 0)) {
        const sketchDesc = generateSketchDescription(sketchElements || [], labeledRegions);
        if (sketchDesc.description && sketchDesc.description !== 'No sketch annotations provided.') {
          description += ' COMPOSITION GUIDE: ' + sketchDesc.description;
        }
      }
      
      // Step 4: Upload snapshot
      const snapshot = await uploadSnapshot({
        imageBase64: base64,
        mimeType: 'image/png',
        width: exportResult.width,
        height: exportResult.height,
        assetType,
        description: description || 'Canvas composition',
        includedAssets: assetNames,
      });
      
      return {
        snapshotUrl: snapshot.url,
        description,
        snapshot,
      };
      
    } catch (err) {
      const prepError = err instanceof Error ? err : new Error('Canvas preparation failed');
      setError(prepError);
      throw prepError;
    } finally {
      setIsPreparing(false);
    }
  }, [exportCanvas, uploadSnapshot, assetType]);
  
  return {
    prepareCanvasForGeneration,
    isPreparing,
    error,
  };
}

/**
 * Get human-readable region name from position
 */
function getRegionName(x: number, y: number): string {
  const col = x < 33 ? 'left' : x > 66 ? 'right' : 'center';
  const row = y < 33 ? 'top' : y > 66 ? 'bottom' : 'middle';
  
  if (row === 'middle' && col === 'center') return 'center';
  if (row === 'middle') return col;
  if (col === 'center') return row;
  return `${row}-${col}`;
}

/**
 * Get visual description for asset type (what Gemini can understand)
 */
function getVisualDescription(assetType: string): string {
  const typeMap: Record<string, string> = {
    'logo': 'logo/brand mark',
    'reference': 'image',
    'character': 'character/person',
    'object': 'object',
    'game_skin': 'game character',
    'overlay': 'overlay element',
    'face': 'face/portrait',
    'background': 'background',
  };
  return typeMap[assetType] || 'element';
}

export default useCanvasGeneration;
