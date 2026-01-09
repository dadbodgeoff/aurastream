/**
 * Stream Packs - Type Definitions
 * 
 * Types for the template-first stream package creation system.
 */

// ============================================================================
// Social Platforms
// ============================================================================

export type SocialPlatform = 
  | 'twitch'
  | 'youtube'
  | 'kick'
  | 'instagram'
  | 'tiktok'
  | 'twitter'
  | 'facebook'
  | 'discord';

export interface SocialPlatformInfo {
  id: SocialPlatform;
  name: string;
  icon: string;
  color: string;
}

export const SOCIAL_PLATFORMS: SocialPlatformInfo[] = [
  { id: 'twitch', name: 'Twitch', icon: '🟣', color: '#9146FF' },
  { id: 'youtube', name: 'YouTube', icon: '🔴', color: '#FF0000' },
  { id: 'kick', name: 'Kick', icon: '🟢', color: '#53FC18' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E4405F' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#000000' },
  { id: 'twitter', name: 'X', icon: '𝕏', color: '#000000' },
  { id: 'facebook', name: 'Facebook', icon: '🔵', color: '#1877F2' },
  { id: 'discord', name: 'Discord', icon: '💬', color: '#5865F2' },
];

// ============================================================================
// Color Schemes
// ============================================================================

export interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  preview: string[]; // Gradient colors for preview
}

export const DEFAULT_COLOR_SCHEMES: ColorScheme[] = [
  { id: 'original', name: 'Original', primary: '', secondary: '', accent: '', preview: [] },
  { id: 'purple-cyan', name: 'Purple & Cyan', primary: '#8B5CF6', secondary: '#06B6D4', accent: '#F59E0B', preview: ['#8B5CF6', '#06B6D4'] },
  { id: 'red-gold', name: 'Red & Gold', primary: '#EF4444', secondary: '#F59E0B', accent: '#FBBF24', preview: ['#EF4444', '#F59E0B'] },
  { id: 'green-lime', name: 'Green & Lime', primary: '#22C55E', secondary: '#84CC16', accent: '#10B981', preview: ['#22C55E', '#84CC16'] },
  { id: 'pink-purple', name: 'Pink & Purple', primary: '#EC4899', secondary: '#8B5CF6', accent: '#F472B6', preview: ['#EC4899', '#8B5CF6'] },
  { id: 'blue-teal', name: 'Blue & Teal', primary: '#3B82F6', secondary: '#14B8A6', accent: '#0EA5E9', preview: ['#3B82F6', '#14B8A6'] },
  { id: 'orange-red', name: 'Orange & Red', primary: '#F97316', secondary: '#EF4444', accent: '#FB923C', preview: ['#F97316', '#EF4444'] },
  { id: 'custom', name: 'Custom', primary: '', secondary: '', accent: '', preview: [] },
];

// ============================================================================
// Stream Pack Templates
// ============================================================================

export type PackCategory = 
  | 'all'
  | 'gaming'
  | 'irl'
  | 'creative'
  | 'music'
  | 'sports'
  | 'minimal'
  | 'animated';

export type PackAssetType = 
  | 'starting_soon'
  | 'be_right_back'
  | 'ending_soon'
  | 'offline'
  | 'webcam_overlay'
  | 'chat_overlay'
  | 'alert_follow'
  | 'alert_sub'
  | 'alert_donation'
  | 'panel';

export interface PackAsset {
  type: PackAssetType;
  label: string;
  previewUrl: string;
  dimensions: { width: number; height: number };
}

export interface StreamPack {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Theme/style description for AI */
  themeDescription: string;
  /** Category */
  category: PackCategory;
  /** Preview image URL (main thumbnail) */
  thumbnailUrl: string;
  /** All assets in this pack */
  assets: PackAsset[];
  /** Original color scheme */
  originalColors: ColorScheme;
  /** Tags for search */
  tags: string[];
  /** Whether this is a premium pack */
  isPremium: boolean;
  /** Creator attribution */
  creator?: string;
  /** Number of times used */
  usageCount?: number;
}

// ============================================================================
// Customization
// ============================================================================

export interface PackCustomization {
  /** User's channel/streamer name */
  channelName: string;
  /** Selected social platforms to display */
  socialPlatforms: SocialPlatform[];
  /** Color scheme selection */
  colorScheme: ColorScheme;
  /** Custom colors (if colorScheme.id === 'custom') */
  customColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  /** Optional tagline/slogan */
  tagline?: string;
  /** Optional schedule text */
  scheduleText?: string;
}

// ============================================================================
// Generation
// ============================================================================

export interface PackGenerationRequest {
  /** Pack template ID */
  packId: string;
  /** User customizations */
  customization: PackCustomization;
  /** Which assets to generate (defaults to all) */
  assetsToGenerate?: PackAssetType[];
}

export interface PackGenerationJob {
  id: string;
  packId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  assets: Array<{
    type: PackAssetType;
    status: 'pending' | 'generating' | 'completed' | 'failed';
    url?: string;
    error?: string;
  }>;
  createdAt: string;
  completedAt?: string;
}

// ============================================================================
// Component Props
// ============================================================================

export interface StreamPacksGalleryProps {
  className?: string;
}

export interface PackCardProps {
  pack: StreamPack;
  onSelect: (pack: StreamPack) => void;
  className?: string;
}

export interface PackCustomizerProps {
  pack: StreamPack;
  customization: PackCustomization;
  onCustomizationChange: (customization: PackCustomization) => void;
  onGenerate: () => void;
  onBack: () => void;
  isGenerating: boolean;
  className?: string;
}

export interface PackPreviewProps {
  pack: StreamPack;
  customization: PackCustomization;
  selectedAsset: PackAssetType;
  onAssetSelect: (type: PackAssetType) => void;
  className?: string;
}
