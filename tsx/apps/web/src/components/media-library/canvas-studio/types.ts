/**
 * Canvas Studio Types
 */

import type { MediaAsset } from '@aurastream/api-client';
import type { AssetPlacement } from '../placement/types';
import type { AnySketchElement } from '../canvas-export/types';

export type EditorMode = 'assets' | 'design';

/**
 * Complete project state for saving/loading
 * Like a Photoshop PSD - contains everything needed to reconstruct the project
 */
export interface CanvasProjectState {
  /** Asset placements with positions, sizes, z-index */
  placements: AssetPlacement[];
  /** Sketch elements (drawings, text, shapes, stickers) */
  sketchElements: AnySketchElement[];
  /** Full MediaAsset objects for reconstruction */
  assets: MediaAsset[];
  /** Thumbnail data URL for preview */
  thumbnailUrl?: string;
}

export interface CanvasStudioModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Asset type being created */
  assetType: string;
  /** Media assets to place (initial assets for new project, or saved assets for existing) */
  assets: MediaAsset[];
  /** Initial placements (if editing) */
  initialPlacements?: AssetPlacement[];
  /** Initial sketch elements */
  initialSketchElements?: AnySketchElement[];
  /** Save handler - receives full project state for persistence */
  onSave: (state: CanvasProjectState) => void;
  /** Optional: Export handler for canvas snapshot */
  onExport?: (dataUrl: string, blob: Blob) => void;
  /**
   * Optional project ID for project-scoped operations.
   * When provided, background removal and other asset modifications
   * are isolated to this project only.
   */
  projectId?: string | null;
}

export interface CanvasDimensions {
  width: number;
  height: number;
  label: string;
}

export interface CanvasStudioState {
  mode: EditorMode;
  assets: MediaAsset[];
  selectedPlacementId: string | null;
  isAssetPickerOpen: boolean;
  assetFilterType: string | undefined;
}

export interface CanvasStudioActions {
  setMode: (mode: EditorMode) => void;
  setSelectedPlacementId: (id: string | null) => void;
  setIsAssetPickerOpen: (open: boolean) => void;
  setAssetFilterType: (type: string | undefined) => void;
  handlePlacementsChange: (placements: AssetPlacement[]) => void;
  handleUpdatePlacement: (updates: Partial<AssetPlacement>) => void;
  handleBringForward: () => void;
  handleSendBackward: () => void;
  handleBringToFront: () => void;
  handleSendToBack: () => void;
  handleRemovePlacement: () => void;
  handleAddAsset: (asset: MediaAsset) => void;
  handleRemoveAsset: (assetId: string) => void;
  handleSave: () => void;
  handleCancel: () => void;
  handleExport: () => Promise<void>;
}
