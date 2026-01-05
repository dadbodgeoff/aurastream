/**
 * Coach Integration Types
 * 
 * Types for Canvas Studio → Coach workflow.
 */

import type { AssetPlacement } from '../../placement/types';
import type { AnySketchElement } from '../../canvas-export/types';
import type { CanvasDimensions } from '../types';

/**
 * Position description for AI context
 */
export type PositionDescription = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

/**
 * Single element description for AI context
 */
export interface ElementDescription {
  /** Element type (image, text, arrow, etc.) */
  type: string;
  /** Human-readable description */
  description: string;
  /** Position on canvas */
  position: PositionDescription;
  /** Size description (small, medium, large, full) */
  size: 'small' | 'medium' | 'large' | 'full';
  /** Layer order */
  zIndex: number;
}

/**
 * Complete canvas description for Coach AI context
 */
export interface CanvasDescription {
  /** Brief summary (e.g., "A 1280x720 YouTube thumbnail") */
  summary: string;
  /** Detailed element descriptions */
  elements: ElementDescription[];
  /** All text content for spell-checking */
  textContent: string[];
  /** Composition description */
  composition: string;
  /** Asset type being created */
  assetType: string;
  /** Canvas dimensions */
  dimensions: CanvasDimensions;
}

/**
 * Community asset metadata for Coach context
 */
export interface CommunityAssetInfo {
  /** Asset ID (starts with 'community_' for community hub assets) */
  asset_id: string;
  /** Display name of the asset */
  display_name: string;
  /** Asset type (background, reference, etc.) */
  asset_type: string;
  /** URL of the asset */
  url: string;
  /** Whether this is a community hub asset */
  is_community_asset: boolean;
  /** Game category slug (e.g., 'fortnite', 'arc_raiders') */
  game_category?: string;
  /** Human-readable game name */
  game_name?: string;
  /** X position (percentage 0-100) */
  x: number;
  /** Y position (percentage 0-100) */
  y: number;
  /** Width (percentage or pixels) */
  width: number;
  /** Height (percentage or pixels) */
  height: number;
}

// =============================================================================
// Compact Canvas Context (Token-Conscious Format for Backend Classification)
// =============================================================================

/**
 * Compact asset entry for canvas_context
 * Matches backend's expected format in canvas.py
 */
export interface CompactCanvasAsset {
  id: string;
  name: string;
  type: 'background' | 'character' | 'object' | 'logo' | 'face';
  pos: string; // "x,y" percentage or "full"
  size?: string; // "wxh" percentage
  z?: number;
}

/**
 * Compact text entry for canvas_context
 */
export interface CompactCanvasText {
  id: string;
  content: string;
  pos: string; // "x,y" percentage
  style?: 'large' | 'medium' | 'small' | 'note';
}

/**
 * Compact drawing entry for canvas_context
 */
export interface CompactCanvasDrawing {
  id: string;
  type: 'arrow' | 'rectangle' | 'circle' | 'freehand' | 'line';
  from?: string; // "x,y" for arrows/lines
  to?: string; // "x,y" for arrows/lines
  pos?: string; // "x,y" for shapes
  size?: string; // "wxh" for shapes
  filled?: boolean;
  color?: string;
}

/**
 * Compact canvas context for backend classification
 * This is the token-conscious format that triggers the classification system
 */
export interface CompactCanvasContext {
  canvas: {
    type: string; // youtube_thumbnail, twitch_banner, etc.
    size: [number, number]; // [width, height]
  };
  assets: CompactCanvasAsset[];
  texts: CompactCanvasText[];
  drawings: CompactCanvasDrawing[];
  snapshot_url?: string;
}

/**
 * Coach request context from Canvas Studio
 */
export interface CanvasCoachContext {
  /** Canvas snapshot URL (uploaded image) */
  snapshotUrl: string;
  /** Canvas description for AI (legacy verbose format) */
  description: CanvasDescription;
  /** Compact canvas context for backend classification (NEW) */
  compactContext: CompactCanvasContext;
  /** Asset type */
  assetType: string;
  /** Brand kit ID if available */
  brandKitId?: string | null;
  /** Community assets used in the canvas (for game-specific styling tips) */
  communityAssets?: CommunityAssetInfo[];
}

/**
 * Asset type display names and tips for Coach
 */
export interface AssetTypeInfo {
  /** Display name */
  displayName: string;
  /** Short description */
  description: string;
  /** Tips for professional results */
  tips: string[];
  /** Key considerations */
  considerations: string[];
}

/**
 * Snapshot upload result
 */
export interface SnapshotUploadResult {
  /** URL of uploaded snapshot */
  url: string;
  /** When the URL expires (if temporary) */
  expiresAt?: Date;
}

/**
 * Send to Coach state
 */
export interface SendToCoachState {
  /** Whether currently processing */
  isProcessing: boolean;
  /** Current step */
  step: 'idle' | 'exporting' | 'uploading' | 'ready' | 'error';
  /** Error message if any */
  error: string | null;
  /** Canvas context ready for Coach */
  context: CanvasCoachContext | null;
}
