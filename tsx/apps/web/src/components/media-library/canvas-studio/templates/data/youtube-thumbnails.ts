/**
 * YouTube Thumbnail Templates
 * 
 * Pre-designed templates optimized for YouTube thumbnail creation.
 * All positions and sizes are percentages (0-100) of the canvas.
 */

import type { MediaAssetType } from '@aurastream/api-client';
import type { CanvasTemplate, TemplateSlot } from './types';

// ============================================================================
// YouTube Thumbnail Templates (5 Starter Templates)
// ============================================================================

/**
 * Reaction Template
 * Face center, logo corner, text bottom
 * Best for: Reaction videos, commentary, reviews
 */
export const YT_REACTION_TEMPLATE: CanvasTemplate = {
  id: 'yt_reaction',
  name: 'Reaction',
  description: 'Perfect for reaction videos with your face as the main focus',
  category: 'youtube_thumbnail',
  targetCanvas: ['youtube_thumbnail'],
  isPremium: false,
  colorScheme: 'vibrant',
  tags: ['reaction', 'commentary', 'review', 'face', 'expressive'],
  slots: [
    {
      id: 'main_face',
      label: 'Your Face',
      acceptedTypes: ['face', 'character'] as MediaAssetType[],
      required: true,
      position: { x: 50, y: 45 },
      size: { width: 55, height: 70 },
      zIndex: 10,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Add your reaction face here',
    },
    {
      id: 'logo',
      label: 'Logo',
      acceptedTypes: ['logo', 'badge'] as MediaAssetType[],
      required: false,
      position: { x: 88, y: 12 },
      size: { width: 15, height: 18 },
      zIndex: 20,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Optional: Add your channel logo',
    },
    {
      id: 'background',
      label: 'Background',
      acceptedTypes: ['background', 'overlay'] as MediaAssetType[],
      required: false,
      position: { x: 50, y: 50 },
      size: { width: 100, height: 100 },
      zIndex: 1,
      defaultOpacity: 100,
      autoFit: 'cover',
      hint: 'Optional: Custom background',
    },
    {
      id: 'decorative',
      label: 'Decorative Element',
      acceptedTypes: ['emote', 'object', 'badge'] as MediaAssetType[],
      required: false,
      position: { x: 15, y: 20 },
      size: { width: 12, height: 15 },
      zIndex: 15,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Optional: Add emotes or decorations',
    },
  ],
};

/**
 * Gaming Template
 * Character left, game skin right, text top
 * Best for: Gaming content, let's plays, game reviews
 */
export const YT_GAMING_TEMPLATE: CanvasTemplate = {
  id: 'yt_gaming',
  name: 'Gaming',
  description: 'Showcase your gaming content with character and game elements',
  category: 'youtube_thumbnail',
  targetCanvas: ['youtube_thumbnail'],
  isPremium: false,
  colorScheme: 'dark',
  tags: ['gaming', 'lets play', 'game', 'character', 'esports'],
  slots: [
    {
      id: 'character',
      label: 'Character/Avatar',
      acceptedTypes: ['character', 'face', 'game_skin'] as MediaAssetType[],
      required: true,
      position: { x: 25, y: 55 },
      size: { width: 40, height: 75 },
      zIndex: 10,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Add your character or avatar',
    },
    {
      id: 'game_element',
      label: 'Game Element',
      acceptedTypes: ['game_skin', 'object', 'character'] as MediaAssetType[],
      required: false,
      position: { x: 75, y: 55 },
      size: { width: 38, height: 65 },
      zIndex: 8,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Add game character or item',
    },
    {
      id: 'logo',
      label: 'Channel Logo',
      acceptedTypes: ['logo', 'badge'] as MediaAssetType[],
      required: false,
      position: { x: 50, y: 10 },
      size: { width: 20, height: 15 },
      zIndex: 20,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Optional: Your channel logo',
    },
    {
      id: 'background',
      label: 'Background',
      acceptedTypes: ['background', 'overlay'] as MediaAssetType[],
      required: false,
      position: { x: 50, y: 50 },
      size: { width: 100, height: 100 },
      zIndex: 1,
      defaultOpacity: 100,
      autoFit: 'cover',
      hint: 'Optional: Game-themed background',
    },
  ],
};

/**
 * Versus Template
 * Two faces left/right, VS text center
 * Best for: Comparison videos, debates, versus content
 */
export const YT_VERSUS_TEMPLATE: CanvasTemplate = {
  id: 'yt_versus',
  name: 'Versus',
  description: 'Compare two subjects side by side - perfect for debates and comparisons',
  category: 'youtube_thumbnail',
  targetCanvas: ['youtube_thumbnail'],
  isPremium: false,
  colorScheme: 'vibrant',
  tags: ['versus', 'vs', 'comparison', 'debate', 'battle', 'face-off'],
  slots: [
    {
      id: 'left_subject',
      label: 'Left Subject',
      acceptedTypes: ['face', 'character', 'game_skin', 'object'] as MediaAssetType[],
      required: true,
      position: { x: 22, y: 50 },
      size: { width: 38, height: 80 },
      zIndex: 10,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'First subject (left side)',
    },
    {
      id: 'right_subject',
      label: 'Right Subject',
      acceptedTypes: ['face', 'character', 'game_skin', 'object'] as MediaAssetType[],
      required: true,
      position: { x: 78, y: 50 },
      size: { width: 38, height: 80 },
      zIndex: 10,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Second subject (right side)',
    },
    {
      id: 'background',
      label: 'Background',
      acceptedTypes: ['background', 'overlay'] as MediaAssetType[],
      required: false,
      position: { x: 50, y: 50 },
      size: { width: 100, height: 100 },
      zIndex: 1,
      defaultOpacity: 100,
      autoFit: 'cover',
      hint: 'Optional: Split or dramatic background',
    },
    {
      id: 'logo',
      label: 'Logo',
      acceptedTypes: ['logo', 'badge'] as MediaAssetType[],
      required: false,
      position: { x: 50, y: 88 },
      size: { width: 12, height: 10 },
      zIndex: 20,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Optional: Channel logo at bottom',
    },
  ],
};

/**
 * Minimal Template
 * Face center, text bottom
 * Best for: Clean, professional thumbnails, vlogs
 */
export const YT_MINIMAL_TEMPLATE: CanvasTemplate = {
  id: 'yt_minimal',
  name: 'Minimal',
  description: 'Clean and simple design that lets your face do the talking',
  category: 'youtube_thumbnail',
  targetCanvas: ['youtube_thumbnail'],
  isPremium: false,
  colorScheme: 'light',
  tags: ['minimal', 'clean', 'simple', 'vlog', 'professional', 'modern'],
  slots: [
    {
      id: 'main_face',
      label: 'Your Face',
      acceptedTypes: ['face', 'character'] as MediaAssetType[],
      required: true,
      position: { x: 50, y: 45 },
      size: { width: 50, height: 65 },
      zIndex: 10,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Add your face as the main focus',
    },
    {
      id: 'background',
      label: 'Background',
      acceptedTypes: ['background'] as MediaAssetType[],
      required: false,
      position: { x: 50, y: 50 },
      size: { width: 100, height: 100 },
      zIndex: 1,
      defaultOpacity: 100,
      autoFit: 'cover',
      hint: 'Optional: Simple, clean background',
    },
    {
      id: 'accent',
      label: 'Accent Element',
      acceptedTypes: ['logo', 'emote', 'badge'] as MediaAssetType[],
      required: false,
      position: { x: 85, y: 85 },
      size: { width: 10, height: 12 },
      zIndex: 15,
      defaultOpacity: 80,
      autoFit: 'contain',
      hint: 'Optional: Small accent or logo',
    },
  ],
};

/**
 * Announcement Template
 * Logo center, text large
 * Best for: Channel updates, announcements, milestones
 */
export const YT_ANNOUNCEMENT_TEMPLATE: CanvasTemplate = {
  id: 'yt_announcement',
  name: 'Announcement',
  description: 'Make big announcements with your logo front and center',
  category: 'youtube_thumbnail',
  targetCanvas: ['youtube_thumbnail'],
  isPremium: false,
  colorScheme: 'brand',
  tags: ['announcement', 'news', 'update', 'milestone', 'celebration', 'logo'],
  slots: [
    {
      id: 'main_logo',
      label: 'Main Logo',
      acceptedTypes: ['logo', 'badge'] as MediaAssetType[],
      required: true,
      position: { x: 50, y: 40 },
      size: { width: 45, height: 50 },
      zIndex: 10,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Your logo as the main focus',
    },
    {
      id: 'background',
      label: 'Background',
      acceptedTypes: ['background', 'overlay'] as MediaAssetType[],
      required: false,
      position: { x: 50, y: 50 },
      size: { width: 100, height: 100 },
      zIndex: 1,
      defaultOpacity: 100,
      autoFit: 'cover',
      hint: 'Optional: Celebratory background',
    },
    {
      id: 'decorative_left',
      label: 'Left Decoration',
      acceptedTypes: ['emote', 'object', 'badge'] as MediaAssetType[],
      required: false,
      position: { x: 12, y: 20 },
      size: { width: 15, height: 18 },
      zIndex: 15,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Optional: Decorative element',
    },
    {
      id: 'decorative_right',
      label: 'Right Decoration',
      acceptedTypes: ['emote', 'object', 'badge'] as MediaAssetType[],
      required: false,
      position: { x: 88, y: 20 },
      size: { width: 15, height: 18 },
      zIndex: 15,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Optional: Decorative element',
    },
  ],
};

// ============================================================================
// Export All YouTube Templates
// ============================================================================

export const YOUTUBE_THUMBNAIL_TEMPLATES: CanvasTemplate[] = [
  YT_REACTION_TEMPLATE,
  YT_GAMING_TEMPLATE,
  YT_VERSUS_TEMPLATE,
  YT_MINIMAL_TEMPLATE,
  YT_ANNOUNCEMENT_TEMPLATE,
];
