/**
 * Constants for the Create flow.
 * @module create/constants
 */

import type { AssetType, Platform } from './types';
import type { LogoPosition, LogoSize } from '@aurastream/api-client';

export const ASSET_TYPES: AssetType[] = [
  // Thumbnails & Covers
  { id: 'thumbnail', label: 'Thumbnail', description: 'Video preview images', dimensions: '1280×720', platform: ['general', 'youtube'], category: 'thumbnails' },
  { id: 'clip_cover', label: 'Clip Cover', description: 'Square clip covers', dimensions: '1080×1080', platform: ['general'], category: 'thumbnails' },
  
  // Stream Overlays
  { id: 'overlay', label: 'Stream Overlay', description: 'Live stream frames', dimensions: '1920×1080', platform: ['general', 'twitch', 'youtube'], category: 'overlays' },
  { id: 'twitch_offline', label: 'Offline Screen', description: 'Offline placeholder', dimensions: '1920×1080', platform: ['twitch'], category: 'overlays' },
  
  // Social & Stories
  { id: 'story_graphic', label: 'Story', description: 'Vertical stories', dimensions: '1080×1920', platform: ['general', 'tiktok'], category: 'social' },
  
  // Channel Branding
  { id: 'banner', label: 'Banner', description: 'Channel headers', dimensions: '1200×480', platform: ['general', 'twitch', 'youtube'], category: 'channel' },
  { id: 'twitch_panel', label: 'Panel', description: 'Info panels', dimensions: '320×160', platform: ['twitch'], category: 'channel' },
  
  // Twitch Specific
  { id: 'twitch_emote', label: 'Emote', description: 'Chat emotes', dimensions: '512×512', platform: ['twitch'], category: 'channel' },
  { id: 'twitch_badge', label: 'Badge', description: 'Sub badges', dimensions: '72×72', platform: ['twitch'], category: 'channel' },
];

export const PLATFORMS: { id: Platform; label: string; icon: string }[] = [
  { id: 'general', label: 'All Platforms', icon: '🌐' },
  { id: 'twitch', label: 'Twitch', icon: '💜' },
  { id: 'youtube', label: 'YouTube', icon: '🔴' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
];

export const LOGO_POSITIONS: { id: LogoPosition; label: string }[] = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-right', label: 'Bottom Right' },
  { id: 'center', label: 'Center' },
];

export const LOGO_SIZES: { id: LogoSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];
