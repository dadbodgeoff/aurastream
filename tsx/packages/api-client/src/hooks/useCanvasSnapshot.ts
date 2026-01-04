/**
 * Canvas Snapshot Upload Hook
 * 
 * Uploads canvas snapshots for single-image generation mode.
 * Replaces multiple asset attachments with one composite image.
 * 
 * @module hooks/useCanvasSnapshot
 */

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';

// ============================================================================
// API Configuration
// ============================================================================

const API_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8000') + '/api/v1';

const getToken = () => apiClient.getAccessToken();
const authHeaders = (token: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

// ============================================================================
// Types
// ============================================================================

export interface CanvasSnapshotUploadRequest {
  /** Base64 encoded image data (without data URL prefix) */
  imageBase64: string;
  /** MIME type of the image */
  mimeType: string;
  /** Width of the canvas in pixels */
  width: number;
  /** Height of the canvas in pixels */
  height: number;
  /** Asset type being generated (for context) */
  assetType: string;
  /** Optional description of canvas contents for AI context */
  description?: string;
  /** Optional list of asset names included in the snapshot */
  includedAssets?: string[];
  /** Optional sketch annotations description */
  sketchAnnotations?: string;
}

export interface CanvasSnapshotUploadResponse {
  /** URL of the uploaded snapshot */
  url: string;
  /** Storage path for the snapshot */
  storagePath: string;
  /** File size in bytes */
  fileSize: number;
  /** Snapshot ID for reference */
  snapshotId: string;
  /** Expiration time (snapshots are temporary) */
  expiresAt: string;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Upload a canvas snapshot for generation.
 * 
 * Canvas snapshots are temporary files used for single-image generation mode.
 * They expire after 1 hour and are automatically cleaned up.
 * 
 * @example
 * ```tsx
 * const { mutateAsync: uploadSnapshot, isPending } = useUploadCanvasSnapshot();
 * 
 * // Export canvas and upload
 * const exportResult = await canvasRef.current.export();
 * const base64 = exportResult.dataUrl.split(',')[1];
 * 
 * const snapshot = await uploadSnapshot({
 *   imageBase64: base64,
 *   mimeType: 'image/png',
 *   width: 2560,
 *   height: 1440,
 *   assetType: 'thumbnail',
 *   description: 'User face in bottom-right, logo in top-left',
 * });
 * 
 * // Use snapshot URL in generation request
 * generateAsset({
 *   assetType: 'thumbnail',
 *   canvasSnapshotUrl: snapshot.url,
 *   customPrompt: 'Epic gaming moment',
 * });
 * ```
 */
export function useUploadCanvasSnapshot() {
  return useMutation({
    mutationFn: async (request: CanvasSnapshotUploadRequest): Promise<CanvasSnapshotUploadResponse> => {
      const token = getToken();
      
      const body = {
        image_base64: request.imageBase64,
        mime_type: request.mimeType,
        width: request.width,
        height: request.height,
        asset_type: request.assetType,
        description: request.description,
        included_assets: request.includedAssets,
        sketch_annotations: request.sketchAnnotations,
      };
      
      const response = await fetch(`${API_BASE}/canvas-snapshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Canvas snapshot upload failed');
      }
      
      const data = await response.json();
      
      return {
        url: data.url,
        storagePath: data.storage_path,
        fileSize: data.file_size,
        snapshotId: data.snapshot_id,
        expiresAt: data.expires_at,
      };
    },
  });
}

/**
 * Helper to convert Blob to base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Helper to convert data URL to base64 string
 */
export function dataUrlToBase64(dataUrl: string): string {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : dataUrl;
}

export default useUploadCanvasSnapshot;
