/**
 * Canvas Studio Template Types
 * 
 * Type definitions for the template system that powers the "3 Clicks to Pro" experience.
 * Templates define pre-configured layouts with slots for different asset types.
 */

import type { MediaAssetType } from '@aurastream/api-client';

// ============================================================================
// Template Categories
// ============================================================================

/**
 * Categories for organizing templates in the selector
 */
export type TemplateCategory =
  | 'youtube_thumbnail'
  | 'twitch_graphic'
  | 'story_graphic'
  | 'profile_picture'
  | 'emote';

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  youtube_thumbnail: 'YouTube Thumbnails',
  twitch_graphic: 'Twitch Graphics',
  story_graphic: 'Story Graphics',
  profile_picture: 'Profile Pictures',
  emote: 'Emotes',
};

export const TEMPLATE_CATEGORY_ICONS: Record<TemplateCategory, string> = {
  youtube_thumbnail: '📺',
  twitch_graphic: '🎮',
  story_graphic: '📱',
  profile_picture: '👤',
  emote: '😊',
};

// ============================================================================
// Template Slot Types
// ============================================================================

/**
 * How an asset should fit within its slot
 */
export type SlotFitMode = 'contain' | 'cover' | 'fill';

/**
 * A slot defines a placeholder area in a template where an asset can be placed
 */
export interface TemplateSlot {
  /** Unique identifier for this slot */
  id: string;
  
  /** Human-readable label shown in the UI (e.g., "Main Subject", "Logo") */
  label: string;
  
  /** Asset types that can be placed in this slot */
  acceptedTypes: MediaAssetType[];
  
  /** Whether this slot must be filled for the template to work */
  required: boolean;
  
  /** Position as percentage of canvas (0-100) */
  position: {
    /** X position from left edge (0-100) */
    x: number;
    /** Y position from top edge (0-100) */
    y: number;
  };
  
  /** Size as percentage of canvas (0-100) */
  size: {
    /** Width as percentage of canvas width (0-100) */
    width: number;
    /** Height as percentage of canvas height (0-100) */
    height: number;
  };
  
  /** Layer order - higher values appear on top */
  zIndex: number;
  
  /** Default opacity for assets placed in this slot (0-100) */
  defaultOpacity: number;
  
  /** How the asset should fit within the slot bounds */
  autoFit: SlotFitMode;
  
  /** Optional hint text shown when slot is empty */
  hint?: string;
}

// ============================================================================
// Color Scheme Types
// ============================================================================

/**
 * Pre-defined color schemes for templates
 */
export type TemplateColorScheme = 'brand' | 'dark' | 'light' | 'vibrant';

export const COLOR_SCHEME_DESCRIPTIONS: Record<TemplateColorScheme, string> = {
  brand: 'Uses colors from your brand kit',
  dark: 'Dark background with light accents',
  light: 'Light background with dark accents',
  vibrant: 'Bold, high-contrast colors',
};

// ============================================================================
// Canvas Template Types
// ============================================================================

/**
 * Output canvas types that templates can target
 */
export type CanvasType =
  // YouTube
  | 'youtube_thumbnail'
  | 'youtube_banner'
  | 'youtube_profile'
  // Twitch
  | 'twitch_emote'
  | 'twitch_badge'
  | 'twitch_panel'
  | 'twitch_banner'
  | 'twitch_offline'
  | 'twitch_overlay'
  | 'twitch_schedule'
  // TikTok
  | 'tiktok_emote'
  | 'tiktok_story'
  | 'tiktok_profile'
  // Instagram
  | 'instagram_story'
  | 'instagram_reel'
  | 'instagram_post'
  | 'instagram_profile'
  // Discord
  | 'discord_emoji'
  | 'discord_banner'
  | 'discord_icon'
  // General
  | 'profile_picture'
  | 'clip_cover'
  | 'story_graphic'
  | 'custom';

/**
 * A complete template definition
 */
export interface CanvasTemplate {
  /** Unique identifier for this template */
  id: string;
  
  /** Display name shown in the template selector */
  name: string;
  
  /** Brief description of what this template is best for */
  description: string;
  
  /** Category for organizing in the selector */
  category: TemplateCategory;
  
  /** Canvas types this template is designed for */
  targetCanvas: CanvasType[];
  
  /** URL to preview thumbnail (optional, can be generated) */
  thumbnail?: string;
  
  /** Whether this template requires Pro/Studio subscription */
  isPremium: boolean;
  
  /** Slot definitions for asset placement */
  slots: TemplateSlot[];
  
  /** Recommended color scheme */
  colorScheme: TemplateColorScheme;
  
  /** Tags for search and filtering */
  tags: string[];
  
  /** Usage count for popularity sorting (optional) */
  useCount?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a template is compatible with a given canvas type
 */
export function isTemplateCompatible(
  template: CanvasTemplate,
  canvasType: CanvasType
): boolean {
  return template.targetCanvas.includes(canvasType);
}

/**
 * Get templates filtered by category
 */
export function filterTemplatesByCategory(
  templates: CanvasTemplate[],
  category: TemplateCategory
): CanvasTemplate[] {
  return templates.filter(t => t.category === category);
}

/**
 * Get templates compatible with a canvas type
 */
export function filterTemplatesByCanvasType(
  templates: CanvasTemplate[],
  canvasType: CanvasType
): CanvasTemplate[] {
  return templates.filter(t => isTemplateCompatible(t, canvasType));
}

/**
 * Search templates by name, description, or tags
 */
export function searchTemplates(
  templates: CanvasTemplate[],
  query: string
): CanvasTemplate[] {
  const lowerQuery = query.toLowerCase();
  return templates.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get required slots from a template
 */
export function getRequiredSlots(template: CanvasTemplate): TemplateSlot[] {
  return template.slots.filter(slot => slot.required);
}

/**
 * Get optional slots from a template
 */
export function getOptionalSlots(template: CanvasTemplate): TemplateSlot[] {
  return template.slots.filter(slot => !slot.required);
}
