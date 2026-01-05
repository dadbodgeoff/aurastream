/**
 * Send to Coach Hook
 * 
 * Orchestrates the Canvas Studio → Coach workflow:
 * 1. Export canvas to PNG
 * 2. Generate canvas description
 * 3. Upload snapshot via /canvas-snapshot endpoint
 * 4. Prepare Coach context with community asset metadata
 */

'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@aurastream/api-client';
import type { AssetPlacement } from '../../placement/types';
import type { AnySketchElement } from '../../canvas-export/types';
import type { CanvasDimensions } from '../types';
import type { CanvasRendererHandle } from '../../canvas-export';
import type { 
  SendToCoachState, 
  CanvasCoachContext,
  CanvasDescription,
} from './types';
import { 
  generateCanvasDescription, 
  formatDescriptionForApi,
  buildCompactCanvasContext,
} from './describeCanvas';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UseSendToCoachProps {
  canvasRendererRef: React.RefObject<CanvasRendererHandle | null>;
  placements: AssetPlacement[];
  sketchElements: AnySketchElement[];
  dimensions: CanvasDimensions;
  assetType: string;
  brandKitId?: string | null;
}

interface UseSendToCoachReturn {
  /** Current state */
  state: SendToCoachState;
  /** Trigger send to coach flow */
  sendToCoach: () => Promise<CanvasCoachContext | null>;
  /** Reset state */
  reset: () => void;
  /** Canvas description (available after generation) */
  description: CanvasDescription | null;
}

/**
 * Upload canvas snapshot to the dedicated endpoint
 */
async function uploadCanvasSnapshot(
  base64: string,
  width: number,
  height: number,
  assetType: string,
  description: string,
  includedAssets: string[],
): Promise<{ url: string; snapshotId: string }> {
  const token = apiClient.getAccessToken();
  
  const response = await fetch(`${API_BASE}/api/v1/canvas-snapshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      image_base64: base64,
      mime_type: 'image/png',
      width,
      height,
      asset_type: assetType,
      description,
      included_assets: includedAssets,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to upload canvas snapshot');
  }
  
  const data = await response.json();
  return { url: data.url, snapshotId: data.snapshot_id };
}

/**
 * Extract community asset metadata from placements
 */
function extractCommunityAssets(placements: AssetPlacement[]): Array<{
  asset_id: string;
  display_name: string;
  asset_type: string;
  url: string;
  is_community_asset: boolean;
  game_category?: string;
  game_name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  return placements
    .filter(p => {
      // Check if it's a community asset by ID prefix or metadata
      const isCommunity = p.assetId.startsWith('community_') || 
        (p.asset.metadata?.source === 'community_hub');
      return isCommunity;
    })
    .map(p => ({
      asset_id: p.assetId,
      display_name: p.asset.displayName,
      asset_type: p.asset.assetType,
      url: p.asset.url,
      is_community_asset: true,
      game_category: p.asset.metadata?.gameCategory as string | undefined,
      game_name: getGameName(p.asset.metadata?.gameCategory as string | undefined),
      x: p.position.x,
      y: p.position.y,
      width: p.size.width,
      height: p.size.height,
    }));
}

/**
 * Get human-readable game name from category slug
 */
function getGameName(category?: string): string | undefined {
  if (!category) return undefined;
  const gameNames: Record<string, string> = {
    'fortnite': 'Fortnite',
    'arc_raiders': 'Arc Raiders',
    'valorant': 'Valorant',
    'apex_legends': 'Apex Legends',
    'call_of_duty': 'Call of Duty',
    'minecraft': 'Minecraft',
    'league_of_legends': 'League of Legends',
  };
  return gameNames[category] || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Hook for sending canvas to Coach
 */
export function useSendToCoach({
  canvasRendererRef,
  placements,
  sketchElements,
  dimensions,
  assetType,
  brandKitId,
}: UseSendToCoachProps): UseSendToCoachReturn {
  const [state, setState] = useState<SendToCoachState>({
    isProcessing: false,
    step: 'idle',
    error: null,
    context: null,
  });
  
  const [description, setDescription] = useState<CanvasDescription | null>(null);
  
  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      step: 'idle',
      error: null,
      context: null,
    });
    setDescription(null);
  }, []);
  
  const sendToCoach = useCallback(async (): Promise<CanvasCoachContext | null> => {
    // Validate
    if (!canvasRendererRef.current) {
      setState(prev => ({ ...prev, error: 'Canvas not ready', step: 'error' }));
      return null;
    }
    
    if (placements.length === 0 && sketchElements.length === 0) {
      setState(prev => ({ ...prev, error: 'Canvas is empty', step: 'error' }));
      return null;
    }
    
    try {
      // Step 1: Export canvas
      setState({ isProcessing: true, step: 'exporting', error: null, context: null });
      
      const exportResult = await canvasRendererRef.current.export();
      
      // Step 2: Generate description
      const canvasDescription = generateCanvasDescription(
        placements,
        sketchElements,
        dimensions,
        assetType
      );
      setDescription(canvasDescription);
      
      // Step 2b: Build compact context for backend classification
      const compactContext = buildCompactCanvasContext(
        sketchElements,
        dimensions,
        assetType
      );
      
      // Step 3: Upload snapshot via dedicated endpoint
      setState(prev => ({ ...prev, step: 'uploading' }));
      
      // Convert blob to base64
      const base64 = await blobToBase64(exportResult.blob);
      
      // Get included asset names for the snapshot
      const includedAssets = placements.map(p => p.asset.displayName);
      
      // Upload to canvas-snapshot endpoint
      const { url: snapshotUrl } = await uploadCanvasSnapshot(
        base64,
        dimensions.width,
        dimensions.height,
        assetType,
        canvasDescription.summary,
        includedAssets,
      );
      
      // Step 4: Extract community assets for coach context
      const communityAssets = extractCommunityAssets(placements);
      
      // Step 5: Build context
      const context: CanvasCoachContext = {
        snapshotUrl,
        description: canvasDescription,
        compactContext,  // NEW: Compact context for backend classification
        assetType,
        brandKitId,
        communityAssets: communityAssets.length > 0 ? communityAssets : undefined,
      };
      
      // Add snapshot URL to compact context
      context.compactContext.snapshot_url = snapshotUrl;
      
      setState({
        isProcessing: false,
        step: 'ready',
        error: null,
        context,
      });
      
      return context;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to prepare canvas';
      setState({
        isProcessing: false,
        step: 'error',
        error: message,
        context: null,
      });
      return null;
    }
  }, [
    canvasRendererRef,
    placements,
    sketchElements,
    dimensions,
    assetType,
    brandKitId,
  ]);
  
  return {
    state,
    sendToCoach,
    reset,
    description,
  };
}

/**
 * Convert Blob to base64 string
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (data:image/png;base64,)
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Build StartCoachRequest from canvas context
 * 
 * This creates a properly typed request for the Coach API
 * that includes the canvas snapshot and community asset metadata for AI context.
 * 
 * NEW: Also includes compact canvas_context for backend classification system.
 */
export function buildCoachRequest(context: CanvasCoachContext) {
  const descriptionText = formatDescriptionForApi(context.description);
  
  // Build a comprehensive description that includes canvas context
  const fullDescription = `I've designed a ${context.assetType.replace(/_/g, ' ')} in Canvas Studio. ${context.description.summary}`;
  
  // Build media_asset_placements from community assets if present
  const mediaAssetPlacements = context.communityAssets?.map(asset => ({
    asset_id: asset.asset_id,
    display_name: asset.display_name,
    asset_type: asset.asset_type,
    url: asset.url,
    is_community_asset: asset.is_community_asset,
    game_category: asset.game_category,
    game_name: asset.game_name,
    x: asset.x,
    y: asset.y,
    width: asset.width,
    height: asset.height,
    size_unit: 'percent' as const,
    z_index: 1,
    rotation: 0,
    opacity: 100,
  }));
  
  return {
    asset_type: context.assetType as any, // AssetTypeEnum
    mood: 'custom' as const,
    custom_mood: 'based on my canvas design - help me make it professional',
    description: fullDescription,
    canvas_snapshot_url: context.snapshotUrl,
    canvas_snapshot_description: descriptionText,
    // NEW: Compact canvas context for backend classification system
    // This triggers the token-conscious element classification
    canvas_context: context.compactContext,
    // Include community asset placements for game-specific styling tips
    media_asset_placements: mediaAssetPlacements?.length ? mediaAssetPlacements : undefined,
    brand_context: context.brandKitId ? { 
      brand_kit_id: context.brandKitId,
      colors: [],
      tone: 'professional',
    } : {
      brand_kit_id: null,
      colors: [],
      tone: 'professional',
    },
  };
}
