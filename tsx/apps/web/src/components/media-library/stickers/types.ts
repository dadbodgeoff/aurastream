/**
 * Sticker Types
 * 
 * Quick-add elements: emojis, shapes, icons, effects.
 */

/**
 * Sticker categories
 */
export type StickerCategory =
  | 'emoji'       // 😀 🔥 ⭐ 💯
  | 'arrows'      // → ↗ ⬆ curved arrows
  | 'shapes'      // Stars, hearts, badges
  | 'effects'     // Sparkles, explosions, speed lines
  | 'gaming'      // Controllers, health bars, XP
  | 'social'      // Like, subscribe, bell icons
  | 'text'        // "NEW!", "LIVE", "WIN"
  | 'custom';     // User-uploaded stickers

/**
 * Sticker type (how it's rendered)
 */
export type StickerType = 'svg' | 'emoji' | 'image';

/**
 * A sticker definition
 */
export interface Sticker {
  /** Unique ID */
  id: string;
  /** Display name */
  name: string;
  /** Category for organization */
  category: StickerCategory;
  /** How to render this sticker */
  type: StickerType;
  /** Content: SVG string, emoji character, or image URL */
  content: string;
  /** Default size as percentage of canvas */
  defaultSize: { width: number; height: number };
  /** Can user change the color? */
  colorizable: boolean;
  /** Search tags */
  tags: string[];
}

/**
 * A placed sticker on the canvas
 */
export interface PlacedSticker {
  /** Unique instance ID */
  id: string;
  /** Reference to sticker definition */
  stickerId: string;
  /** Position as percentage (0-100) */
  x: number;
  y: number;
  /** Size as percentage */
  width: number;
  height: number;
  /** Rotation in degrees */
  rotation: number;
  /** Color override (for colorizable stickers) */
  color?: string;
  /** Layer order */
  zIndex: number;
}
