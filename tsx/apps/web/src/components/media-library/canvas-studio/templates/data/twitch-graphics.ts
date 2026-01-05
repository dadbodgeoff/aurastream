/**
 * Twitch Graphics Templates
 * 
 * Pre-designed templates for Twitch channel graphics including
 * offline screens, panels, banners, emotes, and badges.
 * All positions and sizes are percentages (0-100) of the canvas.
 */

import type { MediaAssetType } from '@aurastream/api-client';
import type { CanvasTemplate } from './types';

// ============================================================================
// Twitch Graphics Templates (5 Starter Templates)
// ============================================================================

/**
 * Offline Gaming Template
 * Character center, logo top, schedule bottom
 * Best for: Gaming streamers' offline screens
 */
export const TW_OFFLINE_GAMING_TEMPLATE: CanvasTemplate = {
  id: 'tw_offline_gaming',
  name: 'Gaming Offline Screen',
  description: 'Professional offline screen for gaming channels with character focus',
  category: 'twitch_graphic',
  targetCanvas: ['twitch_offline'],
  isPremium: false,
  colorScheme: 'dark',
  tags: ['offline', 'gaming', 'stream', 'character', 'schedule', 'brb'],
  slots: [
    {
      id: 'main_character',
      label: 'Character/Avatar',
      acceptedTypes: ['character', 'face', 'game_skin'] as MediaAssetType[],
      required: true,
      position: { x: 50, y: 50 },
      size: { width: 45, height: 60 },
      zIndex: 10,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Your character or avatar as the main focus',
    },
    {
      id: 'logo',
      label: 'Channel Logo',
      acceptedTypes: ['logo', 'badge'] as MediaAssetType[],
      required: false,
      position: { x: 50, y: 10 },
      size: { width: 25, height: 12 },
      zIndex: 20,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Your channel logo at the top',
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
      hint: 'Optional: Gaming-themed background',
    },
    {
      id: 'decorative_left',
      label: 'Left Decoration',
      acceptedTypes: ['emote', 'badge', 'object'] as MediaAssetType[],
      required: false,
      position: { x: 15, y: 50 },
      size: { width: 10, height: 12 },
      zIndex: 15,
      defaultOpacity: 80,
      autoFit: 'contain',
      hint: 'Optional: Decorative emote or badge',
    },
    {
      id: 'decorative_right',
      label: 'Right Decoration',
      acceptedTypes: ['emote', 'badge', 'object'] as MediaAssetType[],
      required: false,
      position: { x: 85, y: 50 },
      size: { width: 10, height: 12 },
      zIndex: 15,
      defaultOpacity: 80,
      autoFit: 'contain',
      hint: 'Optional: Decorative emote or badge',
    },
  ],
};

/**
 * Panel About Template
 * Face left, text area right
 * Best for: About me panels, info panels
 */
export const TW_PANEL_ABOUT_TEMPLATE: CanvasTemplate = {
  id: 'tw_panel_about',
  name: 'About Panel',
  description: 'Info panel with your face and space for text',
  category: 'twitch_graphic',
  targetCanvas: ['twitch_panel'],
  isPremium: false,
  colorScheme: 'brand',
  tags: ['panel', 'about', 'info', 'face', 'bio', 'introduction'],
  slots: [
    {
      id: 'face',
      label: 'Your Face',
      acceptedTypes: ['face', 'character', 'logo'] as MediaAssetType[],
      required: true,
      position: { x: 25, y: 50 },
      size: { width: 40, height: 80 },
      zIndex: 10,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Your face or avatar on the left',
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
      hint: 'Optional: Panel background',
    },
    {
      id: 'accent',
      label: 'Accent Element',
      acceptedTypes: ['badge', 'emote', 'logo'] as MediaAssetType[],
      required: false,
      position: { x: 85, y: 15 },
      size: { width: 15, height: 25 },
      zIndex: 15,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Optional: Small accent or badge',
    },
  ],
};

/**
 * Banner Gaming Template
 * Character left, logo center, decorative right
 * Best for: Channel banners for gaming streamers
 */
export const TW_BANNER_GAMING_TEMPLATE: CanvasTemplate = {
  id: 'tw_banner_gaming',
  name: 'Gaming Banner',
  description: 'Dynamic banner showcasing your gaming persona',
  category: 'twitch_graphic',
  targetCanvas: ['twitch_banner'],
  isPremium: false,
  colorScheme: 'dark',
  tags: ['banner', 'gaming', 'header', 'character', 'profile'],
  slots: [
    {
      id: 'character',
      label: 'Character/Avatar',
      acceptedTypes: ['character', 'face', 'game_skin'] as MediaAssetType[],
      required: true,
      position: { x: 20, y: 50 },
      size: { width: 30, height: 85 },
      zIndex: 10,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Your character on the left side',
    },
    {
      id: 'logo',
      label: 'Channel Logo',
      acceptedTypes: ['logo'] as MediaAssetType[],
      required: false,
      position: { x: 50, y: 50 },
      size: { width: 25, height: 50 },
      zIndex: 15,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Your logo in the center',
    },
    {
      id: 'game_element',
      label: 'Game Element',
      acceptedTypes: ['game_skin', 'object', 'character'] as MediaAssetType[],
      required: false,
      position: { x: 80, y: 50 },
      size: { width: 28, height: 75 },
      zIndex: 8,
      defaultOpacity: 90,
      autoFit: 'contain',
      hint: 'Optional: Game character or item',
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
      hint: 'Optional: Gaming-themed background',
    },
  ],
};

/**
 * Emote POG Template
 * Face full, expression overlay
 * Best for: Hype/excitement emotes
 */
export const TW_EMOTE_POG_TEMPLATE: CanvasTemplate = {
  id: 'tw_emote_pog',
  name: 'POG Emote',
  description: 'Create a hype emote with your excited face',
  category: 'twitch_graphic',
  targetCanvas: ['twitch_emote', 'discord_emoji'],
  isPremium: false,
  colorScheme: 'vibrant',
  tags: ['emote', 'pog', 'hype', 'excited', 'face', 'expression'],
  slots: [
    {
      id: 'face',
      label: 'Your Face',
      acceptedTypes: ['face', 'character'] as MediaAssetType[],
      required: true,
      position: { x: 50, y: 50 },
      size: { width: 90, height: 90 },
      zIndex: 10,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Your excited/surprised face',
    },
    {
      id: 'effect_overlay',
      label: 'Effect Overlay',
      acceptedTypes: ['overlay', 'emote'] as MediaAssetType[],
      required: false,
      position: { x: 50, y: 50 },
      size: { width: 100, height: 100 },
      zIndex: 20,
      defaultOpacity: 80,
      autoFit: 'cover',
      hint: 'Optional: Add sparkles or effects',
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
      hint: 'Optional: Solid color or gradient',
    },
  ],
};

/**
 * Badge Tier 1 Template
 * Logo center, border style
 * Best for: Subscriber badges
 */
export const TW_BADGE_TIER1_TEMPLATE: CanvasTemplate = {
  id: 'tw_badge_tier1',
  name: 'Tier 1 Badge',
  description: 'Create a subscriber badge featuring your logo',
  category: 'twitch_graphic',
  targetCanvas: ['twitch_badge'],
  isPremium: false,
  colorScheme: 'brand',
  tags: ['badge', 'subscriber', 'tier', 'logo', 'loyalty', 'sub'],
  slots: [
    {
      id: 'logo',
      label: 'Logo/Icon',
      acceptedTypes: ['logo', 'badge', 'emote'] as MediaAssetType[],
      required: true,
      position: { x: 50, y: 50 },
      size: { width: 70, height: 70 },
      zIndex: 10,
      defaultOpacity: 100,
      autoFit: 'contain',
      hint: 'Your logo or icon centered',
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
      hint: 'Optional: Badge background color',
    },
    {
      id: 'border_overlay',
      label: 'Border/Frame',
      acceptedTypes: ['overlay', 'facecam_frame'] as MediaAssetType[],
      required: false,
      position: { x: 50, y: 50 },
      size: { width: 100, height: 100 },
      zIndex: 20,
      defaultOpacity: 100,
      autoFit: 'cover',
      hint: 'Optional: Decorative border',
    },
  ],
};

// ============================================================================
// Export All Twitch Templates
// ============================================================================

export const TWITCH_GRAPHICS_TEMPLATES: CanvasTemplate[] = [
  TW_OFFLINE_GAMING_TEMPLATE,
  TW_PANEL_ABOUT_TEMPLATE,
  TW_BANNER_GAMING_TEMPLATE,
  TW_EMOTE_POG_TEMPLATE,
  TW_BADGE_TIER1_TEMPLATE,
];
