/**
 * Asset Placement System Types
 * 
 * Defines the data structures for precise asset positioning on generation canvases.
 * Supports percentage-based and pixel-based positioning with layer ordering.
 */

import type { MediaAsset } from '@aurastream/api-client';

/**
 * Anchor point for positioning reference
 */
export type PositionAnchor = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Size unit type
 */
export type SizeUnit = 'percent' | 'px';

/**
 * Human-readable region names for prompt generation
 */
export type CanvasRegion = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

/**
 * Position data for an asset on the canvas
 */
export interface AssetPosition {
  /** X position as percentage (0-100) from left edge */
  x: number;
  /** Y position as percentage (0-100) from top edge */
  y: number;
  /** Reference point for the position */
  anchor: PositionAnchor;
}

/**
 * Size data for an asset on the canvas
 */
export interface AssetSize {
  /** Width value */
  width: number;
  /** Height value */
  height: number;
  /** Unit type - percentage of canvas or absolute pixels */
  unit: SizeUnit;
  /** Whether to maintain original aspect ratio when resizing */
  maintainAspectRatio: boolean;
}

/**
 * Complete placement data for a single asset
 */
export interface AssetPlacement {
  /** Reference to the media asset */
  assetId: string;
  /** The media asset data */
  asset: MediaAsset;
  /** Position on canvas */
  position: AssetPosition;
  /** Size on canvas */
  size: AssetSize;
  /** Layer order (higher = on top) */
  zIndex: number;
  /** Rotation in degrees (0-360) */
  rotation: number;
  /** Opacity (0-100) */
  opacity: number;
}

/**
 * Canvas dimensions for different asset types
 */
export interface CanvasDimensions {
  width: number;
  height: number;
  label: string;
}

/**
 * Placement state for the entire canvas
 */
export interface PlacementState {
  /** All asset placements */
  placements: AssetPlacement[];
  /** Currently selected asset ID (for editing) */
  selectedAssetId: string | null;
  /** Canvas dimensions based on asset type */
  canvasDimensions: CanvasDimensions;
}

// Note: SerializedPlacement for API transmission is defined in @aurastream/api-client
// Use serializePlacements() from api-client to convert AssetPlacement[] for API calls

/**
 * Props for the placement canvas component
 */
export interface PlacementCanvasProps {
  /** Asset type being created (determines canvas size) */
  assetType: string;
  /** Media assets to place */
  assets: MediaAsset[];
  /** Current placements */
  placements: AssetPlacement[];
  /** Callback when placements change */
  onPlacementsChange: (placements: AssetPlacement[]) => void;
  /** Optional className */
  className?: string;
}

/**
 * Props for the placement modal
 */
export interface PlacementModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Asset type being created */
  assetType: string;
  /** Media assets to place */
  assets: MediaAsset[];
  /** Initial placements (if editing) */
  initialPlacements?: AssetPlacement[];
  /** Save handler */
  onSave: (placements: AssetPlacement[]) => void;
}

/**
 * Drag state for tracking mouse interactions
 */
export interface DragState {
  isDragging: boolean;
  isResizing: boolean;
  resizeHandle: string | null;
  startX: number;
  startY: number;
  startPosition: AssetPosition;
  startSize: AssetSize;
}
