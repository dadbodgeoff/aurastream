/**
 * Asset Type Information for Coach
 * 
 * Provides context-aware tips and descriptions for each asset type.
 */

import type { AssetTypeInfo } from './types';

/**
 * Asset type information map
 */
export const ASSET_TYPE_INFO: Record<string, AssetTypeInfo> = {
  youtube_thumbnail: {
    displayName: 'YouTube Thumbnail',
    description: 'Eye-catching thumbnail to maximize click-through rate',
    tips: [
      'High contrast colors grab attention',
      'Faces with expressions perform best',
      'Text should be readable at small sizes',
      'Keep to 3 focal points maximum',
    ],
    considerations: [
      'Will be viewed at various sizes (mobile to TV)',
      'Competes with other thumbnails in search/recommendations',
      'Should convey video content at a glance',
    ],
  },
  
  thumbnail: {
    displayName: 'Thumbnail',
    description: 'General purpose thumbnail image',
    tips: [
      'Clear focal point',
      'Readable text if included',
      'Brand colors for recognition',
    ],
    considerations: [
      'Context depends on platform',
      'May be cropped differently on different devices',
    ],
  },
  
  twitch_emote: {
    displayName: 'Twitch Emote',
    description: 'Chat emote for Twitch channel (auto-creates 112, 56, 28px sizes)',
    tips: [
      'Keep it simple - emotes are viewed at tiny sizes',
      'Use bold colors and high contrast',
      'Exaggerate expressions for visibility',
      'Avoid fine details that disappear at 28px',
      'Test readability at smallest size',
    ],
    considerations: [
      'Viewed primarily in chat at tiny sizes',
      'Should be instantly recognizable',
      'Transparent background auto-applied',
      'Creates 3 sizes: 112×112, 56×56, 28×28',
    ],
  },
  
  tiktok_emote: {
    displayName: 'TikTok Emote',
    description: 'TikTok emote (auto-creates 300, 200, 100px sizes)',
    tips: [
      'TikTok emotes can have more detail than Twitch',
      'Use vibrant, eye-catching colors',
      'Expressions and reactions work best',
      'Consider how it looks on dark backgrounds',
      'Bold outlines help visibility',
    ],
    considerations: [
      'Larger than Twitch emotes - more detail possible',
      'Transparent background auto-applied',
      'Creates 3 sizes: 300×300, 200×200, 100×100',
      'Used in TikTok comments and reactions',
    ],
  },
  
  twitch_badge: {
    displayName: 'Twitch Badge',
    description: 'Subscriber or loyalty badge',
    tips: [
      'Even simpler than emotes',
      'Works at 18x18, 36x36, 72x72 pixels',
      'Clear silhouette',
      'Tier progression should be visually distinct',
    ],
    considerations: [
      'Displayed next to usernames in chat',
      'Must be recognizable at 18px',
    ],
  },
  
  twitch_banner: {
    displayName: 'Twitch Banner',
    description: 'Channel profile banner',
    tips: [
      'Brand colors prominently featured',
      'Clean, uncluttered composition',
      'Text readable on all devices',
      'Leave space for profile picture overlay',
    ],
    considerations: [
      'Different crops on mobile vs desktop',
      'Profile picture overlaps on some views',
    ],
  },
  
  twitch_panel: {
    displayName: 'Twitch Panel',
    description: 'Info panel for channel page',
    tips: [
      'Consistent style across all panels',
      'Clear, readable text',
      'Icons help quick scanning',
    ],
    considerations: [
      'Part of a set - maintain consistency',
      'Viewed below the stream',
    ],
  },
  
  twitch_offline: {
    displayName: 'Twitch Offline Screen',
    description: 'Displayed when stream is offline',
    tips: [
      'Include schedule or social links',
      'Brand identity prominent',
      'Call to action (follow, subscribe)',
    ],
    considerations: [
      'First impression for new visitors',
      'Should encourage return visits',
    ],
  },
  
  overlay: {
    displayName: 'Stream Overlay',
    description: 'On-screen graphics during stream',
    tips: [
      'Don\'t obstruct important game areas',
      'Transparent backgrounds where needed',
      'Consistent with brand identity',
    ],
    considerations: [
      'Viewed during live content',
      'Should enhance, not distract',
    ],
  },
  
  banner: {
    displayName: 'Banner',
    description: 'General purpose banner image',
    tips: [
      'Wide format composition',
      'Key content in center (safe zone)',
      'Brand colors and identity',
    ],
    considerations: [
      'May be cropped on different platforms',
      'Text should be in safe zones',
    ],
  },
  
  story_graphic: {
    displayName: 'Story Graphic',
    description: 'Vertical format for stories',
    tips: [
      'Vertical 9:16 composition',
      'Bold, attention-grabbing',
      'Text in upper/lower thirds',
    ],
    considerations: [
      'Viewed briefly (stories auto-advance)',
      'Swipe-up area at bottom',
    ],
  },
  
  instagram_story: {
    displayName: 'Instagram Story',
    description: 'Instagram story format',
    tips: [
      'Leave space for UI elements',
      'Bold colors and text',
      'Engaging call to action',
    ],
    considerations: [
      'Username at top, reply bar at bottom',
      '15 second view time typical',
    ],
  },
  
  instagram_reel: {
    displayName: 'Instagram Reel',
    description: 'Instagram Reels cover/thumbnail',
    tips: [
      'Vertical format',
      'Eye-catching first frame',
      'Text overlay for context',
    ],
    considerations: [
      'Competes in feed and Reels tab',
      'Sound-off viewing common',
    ],
  },
  
  tiktok_story: {
    displayName: 'TikTok Story',
    description: 'TikTok story or video cover',
    tips: [
      'Vertical 9:16 format',
      'Bold, trendy aesthetic',
      'Hook viewers immediately',
    ],
    considerations: [
      'Fast-scrolling environment',
      'Young audience expectations',
    ],
  },
  
  clip_cover: {
    displayName: 'Clip Cover',
    description: 'Cover image for video clips',
    tips: [
      'Capture the highlight moment',
      'Clear subject focus',
      'Optional text overlay',
    ],
    considerations: [
      'Represents the clip content',
      'Should entice clicks',
    ],
  },
};

/**
 * Get asset type info with fallback
 */
export function getAssetTypeInfo(assetType: string): AssetTypeInfo {
  return ASSET_TYPE_INFO[assetType] || {
    displayName: assetType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: 'Custom asset',
    tips: ['Clear composition', 'Brand consistency'],
    considerations: ['Platform requirements may vary'],
  };
}

/**
 * Get display name for asset type
 */
export function getAssetTypeDisplayName(assetType: string): string {
  return getAssetTypeInfo(assetType).displayName;
}
