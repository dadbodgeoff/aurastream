/**
 * Thumbnail Recreation TypeScript Types
 * 
 * Types for the thumbnail recreation feature.
 */

import type { ThumbnailAnalysis } from './thumbnailIntel';
import type { SerializedPlacement } from './creatorMedia';

// ============================================================================
// Recreation Request/Response
// ============================================================================

export interface RecreateRequest {
  /** YouTube video ID of reference thumbnail */
  videoId: string;
  /** URL of reference thumbnail to recreate */
  thumbnailUrl: string;
  /** Pre-analyzed thumbnail data from Gemini */
  analysis: ThumbnailAnalysis;
  /** Base64 encoded face image (new upload) */
  faceImageBase64?: string;
  /** ID of saved face asset to use */
  faceAssetId?: string;
  /** Custom text to replace original */
  customText?: string;
  /** Use brand kit colors instead of reference colors */
  useBrandColors?: boolean;
  /** Brand kit ID if using brand colors */
  brandKitId?: string;
  /** Additional generation instructions */
  additionalInstructions?: string;
  /** Media asset IDs to include (logo, character, object, etc.). Max 2 assets. */
  mediaAssetIds?: string[];
  /** Precise placement data for media assets. Overrides mediaAssetIds if provided. */
  mediaAssetPlacements?: SerializedPlacement[];
  /** Canvas snapshot URL for single-image mode (more cost-effective for complex compositions) */
  canvasSnapshotUrl?: string;
  /** Description of canvas contents for AI context */
  canvasSnapshotDescription?: string;
}

export interface RecreateResponse {
  /** Unique recreation ID */
  recreationId: string;
  /** Generation job ID for polling */
  jobId: string;
  /** Current status */
  status: 'queued' | 'processing' | 'completed' | 'failed';
  /** Estimated time to completion */
  estimatedSeconds: number;
  /** Status message */
  message: string;
}

// ============================================================================
// Recreation Status
// ============================================================================

export interface RecreationStatus {
  recreationId: string;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progressPercent: number;
  /** Generated thumbnail URL (when completed) */
  generatedThumbnailUrl?: string;
  /** Direct download URL (when completed) */
  downloadUrl?: string;
  /** Asset ID (when completed) */
  assetId?: string;
  /** Error message (when failed) */
  errorMessage?: string;
}

// ============================================================================
// Recreation History
// ============================================================================

export interface RecreationHistoryItem {
  id: string;
  referenceVideoId: string;
  referenceThumbnailUrl: string;
  generatedThumbnailUrl?: string;
  customText?: string;
  status: string;
  createdAt: string;
}

export interface RecreationHistory {
  recreations: RecreationHistoryItem[];
  total: number;
}

// ============================================================================
// Face Assets
// ============================================================================

export interface FaceAsset {
  id: string;
  displayName?: string;
  originalUrl: string;
  processedUrl?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface FaceAssetsResponse {
  faces: FaceAsset[];
  total: number;
}

export interface UploadFaceRequest {
  /** Base64 encoded face image */
  imageBase64: string;
  /** Optional name for this face */
  displayName?: string;
  /** Set as primary face */
  setAsPrimary?: boolean;
}

export interface UploadFaceResponse {
  face: FaceAsset;
  message: string;
}
