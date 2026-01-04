/**
 * Built-in Stickers
 * 
 * Quick-add elements for canvas compositions.
 */

import type { Sticker, StickerCategory } from './types';

/**
 * Emoji stickers - most popular
 */
const EMOJI_STICKERS: Sticker[] = [
  { id: 'emoji-fire', name: 'Fire', category: 'emoji', type: 'emoji', content: '🔥', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['hot', 'trending', 'lit', 'flame'] },
  { id: 'emoji-star', name: 'Star', category: 'emoji', type: 'emoji', content: '⭐', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['rating', 'favorite', 'best', 'gold'] },
  { id: 'emoji-100', name: '100', category: 'emoji', type: 'emoji', content: '💯', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['perfect', 'score', 'hundred'] },
  { id: 'emoji-crown', name: 'Crown', category: 'emoji', type: 'emoji', content: '👑', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['king', 'winner', 'best', 'royal'] },
  { id: 'emoji-rocket', name: 'Rocket', category: 'emoji', type: 'emoji', content: '🚀', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['launch', 'fast', 'growth', 'moon'] },
  { id: 'emoji-trophy', name: 'Trophy', category: 'emoji', type: 'emoji', content: '🏆', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['winner', 'champion', 'first', 'gold'] },
  { id: 'emoji-lightning', name: 'Lightning', category: 'emoji', type: 'emoji', content: '⚡', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['fast', 'power', 'electric', 'energy'] },
  { id: 'emoji-eyes', name: 'Eyes', category: 'emoji', type: 'emoji', content: '👀', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['look', 'watch', 'see', 'attention'] },
  { id: 'emoji-skull', name: 'Skull', category: 'emoji', type: 'emoji', content: '💀', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['dead', 'rip', 'funny', 'lol'] },
  { id: 'emoji-money', name: 'Money', category: 'emoji', type: 'emoji', content: '💰', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['cash', 'rich', 'profit', 'gold'] },
];

/**
 * Arrow stickers - colorizable SVGs
 */
const ARROW_STICKERS: Sticker[] = [
  {
    id: 'arrow-right',
    name: 'Arrow Right',
    category: 'arrows',
    type: 'svg',
    content: '<svg viewBox="0 0 100 50"><path d="M10 25 L70 25 M55 10 L70 25 L55 40" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    defaultSize: { width: 15, height: 8 },
    colorizable: true,
    tags: ['point', 'direction', 'right', 'next'],
  },
  {
    id: 'arrow-curved',
    name: 'Curved Arrow',
    category: 'arrows',
    type: 'svg',
    content: '<svg viewBox="0 0 100 100"><path d="M20 80 Q50 20 80 50" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round"/><polygon points="75,40 90,55 70,60" fill="currentColor"/></svg>',
    defaultSize: { width: 12, height: 12 },
    colorizable: true,
    tags: ['point', 'curve', 'look here', 'attention'],
  },
  {
    id: 'arrow-down',
    name: 'Arrow Down',
    category: 'arrows',
    type: 'svg',
    content: '<svg viewBox="0 0 50 100"><path d="M25 10 L25 70 M10 55 L25 70 L40 55" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    defaultSize: { width: 8, height: 15 },
    colorizable: true,
    tags: ['point', 'down', 'below', 'scroll'],
  },
];

/**
 * Effect stickers
 */
const EFFECT_STICKERS: Sticker[] = [
  {
    id: 'effect-sparkles',
    name: 'Sparkles',
    category: 'effects',
    type: 'svg',
    content: '<svg viewBox="0 0 100 100"><path d="M50 10 L53 40 L80 50 L53 60 L50 90 L47 60 L20 50 L47 40 Z" fill="currentColor"/><circle cx="25" cy="25" r="4" fill="currentColor"/><circle cx="75" cy="75" r="3" fill="currentColor"/><circle cx="80" cy="20" r="2" fill="currentColor"/></svg>',
    defaultSize: { width: 15, height: 15 },
    colorizable: true,
    tags: ['magic', 'shine', 'special', 'star'],
  },
  {
    id: 'effect-burst',
    name: 'Burst',
    category: 'effects',
    type: 'svg',
    content: '<svg viewBox="0 0 100 100"><polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35" fill="currentColor"/></svg>',
    defaultSize: { width: 15, height: 15 },
    colorizable: true,
    tags: ['explosion', 'boom', 'impact', 'star'],
  },
];

/**
 * Gaming stickers
 */
const GAMING_STICKERS: Sticker[] = [
  { id: 'gaming-controller', name: 'Controller', category: 'gaming', type: 'emoji', content: '🎮', defaultSize: { width: 12, height: 10 }, colorizable: false, tags: ['game', 'play', 'console', 'gaming'] },
  { id: 'gaming-sword', name: 'Sword', category: 'gaming', type: 'emoji', content: '⚔️', defaultSize: { width: 12, height: 12 }, colorizable: false, tags: ['battle', 'fight', 'rpg', 'weapon'] },
  { id: 'gaming-target', name: 'Target', category: 'gaming', type: 'emoji', content: '🎯', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['aim', 'goal', 'bullseye', 'fps'] },
  { id: 'gaming-dice', name: 'Dice', category: 'gaming', type: 'emoji', content: '🎲', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['random', 'luck', 'chance', 'roll'] },
];

/**
 * Social stickers
 */
const SOCIAL_STICKERS: Sticker[] = [
  {
    id: 'social-subscribe',
    name: 'Subscribe',
    category: 'social',
    type: 'svg',
    content: '<svg viewBox="0 0 100 40"><rect rx="5" fill="#EF4444" width="100" height="40"/><text x="50" y="28" text-anchor="middle" fill="white" font-size="16" font-weight="bold" font-family="system-ui">SUBSCRIBE</text></svg>',
    defaultSize: { width: 18, height: 7 },
    colorizable: false,
    tags: ['youtube', 'follow', 'cta', 'button'],
  },
  {
    id: 'social-like',
    name: 'Like',
    category: 'social',
    type: 'emoji',
    content: '👍',
    defaultSize: { width: 10, height: 10 },
    colorizable: false,
    tags: ['thumbs up', 'approve', 'good', 'yes'],
  },
  {
    id: 'social-bell',
    name: 'Bell',
    category: 'social',
    type: 'emoji',
    content: '🔔',
    defaultSize: { width: 10, height: 10 },
    colorizable: false,
    tags: ['notification', 'alert', 'subscribe', 'ring'],
  },
];

/**
 * Text badge stickers
 */
const TEXT_STICKERS: Sticker[] = [
  {
    id: 'text-new',
    name: 'NEW Badge',
    category: 'text',
    type: 'svg',
    content: '<svg viewBox="0 0 60 30"><rect rx="4" fill="#22C55E" width="60" height="30"/><text x="30" y="22" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="system-ui">NEW!</text></svg>',
    defaultSize: { width: 10, height: 5 },
    colorizable: false,
    tags: ['badge', 'label', 'announcement', 'fresh'],
  },
  {
    id: 'text-live',
    name: 'LIVE Badge',
    category: 'text',
    type: 'svg',
    content: '<svg viewBox="0 0 60 30"><rect rx="4" fill="#EF4444" width="60" height="30"/><circle cx="12" cy="15" r="5" fill="white"/><text x="38" y="22" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="system-ui">LIVE</text></svg>',
    defaultSize: { width: 10, height: 5 },
    colorizable: false,
    tags: ['streaming', 'live', 'broadcast', 'now'],
  },
  {
    id: 'text-win',
    name: 'WIN Badge',
    category: 'text',
    type: 'svg',
    content: '<svg viewBox="0 0 60 30"><rect rx="4" fill="#EAB308" width="60" height="30"/><text x="30" y="22" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="system-ui">WIN!</text></svg>',
    defaultSize: { width: 10, height: 5 },
    colorizable: false,
    tags: ['victory', 'winner', 'success', 'champion'],
  },
];

/**
 * All built-in stickers
 */
export const BUILT_IN_STICKERS: Sticker[] = [
  ...EMOJI_STICKERS,
  ...ARROW_STICKERS,
  ...EFFECT_STICKERS,
  ...GAMING_STICKERS,
  ...SOCIAL_STICKERS,
  ...TEXT_STICKERS,
];

/**
 * Get stickers by category
 */
export function getStickersByCategory(category: StickerCategory): Sticker[] {
  return BUILT_IN_STICKERS.filter(s => s.category === category);
}

/**
 * Get a sticker by ID
 */
export function getStickerById(id: string): Sticker | undefined {
  return BUILT_IN_STICKERS.find(s => s.id === id);
}

/**
 * Sticker category metadata
 */
export const STICKER_CATEGORIES = [
  { id: 'emoji' as StickerCategory, label: 'Emoji', emoji: '😀' },
  { id: 'arrows' as StickerCategory, label: 'Arrows', emoji: '→' },
  { id: 'effects' as StickerCategory, label: 'Effects', emoji: '✨' },
  { id: 'gaming' as StickerCategory, label: 'Gaming', emoji: '🎮' },
  { id: 'social' as StickerCategory, label: 'Social', emoji: '📱' },
  { id: 'text' as StickerCategory, label: 'Badges', emoji: '💬' },
];
