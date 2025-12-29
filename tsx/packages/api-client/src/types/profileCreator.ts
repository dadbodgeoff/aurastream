/**
 * Types for Profile Creator feature.
 * 
 * @module types/profileCreator
 */

// ============================================================================
// Enums / Literals
// ============================================================================

export type CreationType = 'profile_picture' | 'streamer_logo';

export type StylePreset = 
  | 'gaming'
  | 'minimal'
  | 'vibrant'
  | 'anime'
  | 'retro'
  | 'professional'
  | 'custom';

export type BackgroundType = 'transparent' | 'solid' | 'gradient';

export type OutputSize = 'small' | 'medium' | 'large';

export type OutputFormat = 'png' | 'webp';

export type SessionStatus = 'active' | 'ready' | 'generating' | 'completed' | 'expired';

// ============================================================================
// Brand Context
// ============================================================================

export interface ColorInfo {
  hex: string;
  name: string;
}

export interface BrandContext {
  brandKitId?: string | null;
  brandName?: string | null;
  primaryColors?: ColorInfo[] | null;
  accentColors?: ColorInfo[] | null;
  tone?: string | null;
}

// ============================================================================
// Request Types
// ============================================================================

export interface StartProfileCreatorRequest {
  creationType: CreationType;
  brandContext?: BrandContext | null;
  initialDescription?: string | null;
  stylePreset?: StylePreset | null;
}

export interface ContinueSessionRequest {
  message: string;
}

export interface GenerateFromSessionRequest {
  outputSize?: OutputSize;
  outputFormat?: OutputFormat;
  background?: BackgroundType;
  backgroundColor?: string | null;
}

// ============================================================================
// Response Types
// ============================================================================

export interface ProfileCreatorAccessResponse {
  canUse: boolean;
  used: number;
  limit: number;
  remaining: number;
  tier: string;
  resetsAt: string | null;
}

export interface SessionStateResponse {
  sessionId: string;
  creationType: CreationType;
  status: SessionStatus;
  stylePreset: StylePreset | null;
  refinedDescription: string | null;
  isReady: boolean;
  confidence: number;
  turnsUsed: number;
  turnsRemaining: number;
  createdAt: string;
  expiresAt: string;
}

export interface GenerationResultResponse {
  jobId: string;
  assetId: string | null;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  assetUrl: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface GalleryItem {
  id: string;
  creationType: CreationType;
  assetUrl: string;
  thumbnailUrl: string | null;
  width: number;
  height: number;
  stylePreset: StylePreset | null;
  promptUsed: string | null;
  createdAt: string;
}

export interface GalleryResponse {
  items: GalleryItem[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// SSE Stream Types
// ============================================================================

export type StreamChunkType = 'token' | 'intent_ready' | 'done' | 'error';

export interface StreamChunkMetadata {
  isReady?: boolean;
  confidence?: number;
  refinedDescription?: string;
  sessionId?: string;
  turnsUsed?: number;
  turnsRemaining?: number;
}

export interface StreamChunk {
  type: StreamChunkType;
  content: string;
  metadata?: StreamChunkMetadata;
}

// ============================================================================
// Style Preset Info
// ============================================================================

export interface StylePresetInfo {
  id: StylePreset;
  name: string;
  description: string;
  icon: string;
}

export const STYLE_PRESETS: StylePresetInfo[] = [
  {
    id: 'gaming',
    name: 'Gaming',
    description: 'Bold, dynamic, high-energy gaming aesthetic',
    icon: '🎮',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, simple, modern design',
    icon: '✨',
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Colorful, energetic, eye-catching',
    icon: '🌈',
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Anime/manga inspired style',
    icon: '🎌',
  },
  {
    id: 'retro',
    name: 'Retro',
    description: 'Pixel art, 8-bit nostalgic feel',
    icon: '👾',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clean, corporate, trustworthy look',
    icon: '💼',
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Describe your own style',
    icon: '🎨',
  },
];

// ============================================================================
// Size Info
// ============================================================================

export interface SizeInfo {
  id: OutputSize;
  name: string;
  pixels: number;
  description: string;
}

export const OUTPUT_SIZES: SizeInfo[] = [
  {
    id: 'small',
    name: 'Small',
    pixels: 256,
    description: 'Good for favicons and small icons',
  },
  {
    id: 'medium',
    name: 'Medium',
    pixels: 512,
    description: 'Perfect for most social platforms',
  },
  {
    id: 'large',
    name: 'Large',
    pixels: 1024,
    description: 'High resolution for print and large displays',
  },
];
