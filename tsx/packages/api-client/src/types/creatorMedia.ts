/**
 * Creator Media Library Types
 * 
 * TypeScript interfaces for the unified media library.
 * All user-uploaded assets that can be injected into generation prompts.
 */

// ============================================================================
// Asset Type Definitions
// ============================================================================

// ============================================================================
// Constants
// ============================================================================

export const TOTAL_ASSET_LIMIT = 25;
export const MAX_PROMPT_INJECTION_ASSETS = 2;
export const ALLOWED_TIERS = ['pro', 'studio'] as const;

// Asset types that should have background removed by default
export const BG_REMOVAL_DEFAULT_TYPES: MediaAssetType[] = [
  'face', 'logo', 'character', 'object', 'emote', 'badge', 'game_skin'
];

// Asset types that should NEVER have background removed
export const BG_REMOVAL_EXCLUDED_TYPES: MediaAssetType[] = [
  'background', 'reference', 'panel', 'overlay', 'alert', 'facecam_frame', 'stinger'
];

export function shouldRemoveBackgroundByDefault(assetType: MediaAssetType): boolean {
  return BG_REMOVAL_DEFAULT_TYPES.includes(assetType);
}

export function canRemoveBackground(assetType: MediaAssetType): boolean {
  return !BG_REMOVAL_EXCLUDED_TYPES.includes(assetType);
}

export type MediaAssetType =
  | 'logo'
  | 'face'
  | 'character'
  | 'game_skin'
  | 'object'
  | 'background'
  | 'reference'
  | 'overlay'
  | 'emote'
  | 'badge'
  | 'panel'
  | 'alert'
  | 'facecam_frame'
  | 'stinger';

export const MEDIA_ASSET_TYPES: MediaAssetType[] = [
  'logo', 'face', 'character', 'game_skin', 'object', 'background',
  'reference', 'overlay', 'emote', 'badge', 'panel', 'alert',
  'facecam_frame', 'stinger'
];

export const ASSET_TYPE_LABELS: Record<MediaAssetType, string> = {
  logo: 'Logos',
  face: 'Faces',
  character: 'Characters',
  game_skin: 'Game Skins',
  object: 'Objects',
  background: 'Backgrounds',
  reference: 'References',
  overlay: 'Overlays',
  emote: 'Emotes',
  badge: 'Badges',
  panel: 'Panels',
  alert: 'Alerts',
  facecam_frame: 'Facecam Frames',
  stinger: 'Stingers',
};

export const ASSET_TYPE_DESCRIPTIONS: Record<MediaAssetType, string> = {
  logo: 'Brand logos (primary, secondary, icon, etc.)',
  face: 'User faces for thumbnail recreation',
  character: 'Character/avatar representations',
  game_skin: 'Game character skins',
  object: 'Props and items to include in generations',
  background: 'Custom backgrounds',
  reference: 'Style reference images',
  overlay: 'Stream overlays',
  emote: 'Channel emotes',
  badge: 'Subscriber badges',
  panel: 'Channel panels',
  alert: 'Alert images',
  facecam_frame: 'Facecam borders',
  stinger: 'Transition animations',
};

// ============================================================================
// Core Types
// ============================================================================

export interface MediaAsset {
  id: string;
  userId: string;
  assetType: MediaAssetType;
  displayName: string;
  description?: string | null;
  url: string;
  storagePath: string;
  thumbnailUrl?: string | null;
  processedUrl?: string | null;  // Background-removed version
  processedStoragePath?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  tags: string[];
  isFavorite: boolean;
  isPrimary: boolean;
  hasBackgroundRemoved: boolean;
  metadata: Record<string, any>;
  usageCount: number;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaSummary {
  assetType: MediaAssetType;
  totalCount: number;
  favoriteCount: number;
  latestUpload?: string | null;
}

export interface MediaForPrompt {
  id: string;
  assetType: MediaAssetType;
  displayName: string;
  url: string;
  metadata: Record<string, any>;
}

// ============================================================================
// Request Types
// ============================================================================

export interface UploadMediaRequest {
  assetType: MediaAssetType;
  displayName: string;
  description?: string;
  imageBase64: string;
  tags?: string[];
  isFavorite?: boolean;
  setAsPrimary?: boolean;
  removeBackground?: boolean;  // null = use default based on asset type
  metadata?: Record<string, any>;
}

export interface UpdateMediaRequest {
  displayName?: string;
  description?: string;
  tags?: string[];
  isFavorite?: boolean;
  isPrimary?: boolean;
  metadata?: Record<string, any>;
}

export interface ListMediaParams {
  assetType?: MediaAssetType;
  tags?: string[];
  favoritesOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'usage_count' | 'display_name';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Response Types
// ============================================================================

export interface MediaAccessResponse {
  hasAccess: boolean;
  tier: string;
  totalLimit: number;
  maxPerPrompt: number;
  upgradeMessage: string | null;
}

export interface UploadMediaResponse {
  asset: MediaAsset;
  message: string;
}

export interface ListMediaResponse {
  assets: MediaAsset[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface MediaLibrarySummaryResponse {
  summaries: MediaSummary[];
  totalAssets: number;
  storageUsedBytes: number;
}

export interface DeleteMediaResponse {
  success: boolean;
  message: string;
}

export interface BulkDeleteMediaResponse {
  deletedCount: number;
  failedIds: string[];
  message: string;
}

export interface AssetTypesResponse {
  types: MediaAssetType[];
  descriptions: Record<MediaAssetType, string>;
}

// ============================================================================
// Prompt Injection Types
// ============================================================================

export interface SelectedMediaForGeneration {
  faceId?: string;
  logoId?: string;
  characterId?: string;
  backgroundId?: string;
  referenceIds?: string[];
  objectIds?: string[];
  gameSkinId?: string;
}

// ============================================================================
// Type-Specific Metadata
// ============================================================================

export interface LogoMetadata {
  logoVariant?: 'primary' | 'secondary' | 'icon' | 'monochrome' | 'watermark';
  transparent?: boolean;
  brandKitId?: string;
}

export interface FaceMetadata {
  expression?: string;
  angle?: 'front' | 'side' | 'three_quarter';
  processed?: boolean;
  processedUrl?: string;
}

export interface CharacterMetadata {
  style?: string;
  outfit?: string;
  pose?: string;
  colorScheme?: string[];
}

export interface GameSkinMetadata {
  game?: string;
  characterName?: string;
  skinName?: string;
  rarity?: string;
}

export interface ObjectMetadata {
  category?: string;
  transparent?: boolean;
}

export interface BackgroundMetadata {
  style?: string;
  mood?: string;
  colors?: string[];
}

export interface ReferenceMetadata {
  source?: string;
  videoId?: string;
  originalCreator?: string;
  notes?: string;
}


// ============================================================================
// Asset Placement Types
// ============================================================================

/**
 * Anchor point for positioning reference
 */
export type PositionAnchor = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Size unit type
 */
export type SizeUnit = 'percent' | 'px';

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
 * Serialized placement data for API transmission
 */
export interface SerializedPlacement {
  assetId: string;
  displayName: string;
  assetType: MediaAssetType;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sizeUnit: SizeUnit;
  zIndex: number;
  rotation: number;
  opacity: number;
}

/**
 * Serialize placements for API transmission
 */
export function serializePlacements(placements: AssetPlacement[]): SerializedPlacement[] {
  return placements.map(p => ({
    assetId: p.assetId,
    displayName: p.asset.displayName,
    assetType: p.asset.assetType,
    url: p.asset.processedUrl || p.asset.url,
    x: p.position.x,
    y: p.position.y,
    width: p.size.width,
    height: p.size.height,
    sizeUnit: p.size.unit,
    zIndex: p.zIndex,
    rotation: p.rotation,
    opacity: p.opacity,
  }));
}
