import type { QuickTemplate, TemplateCategory, VibeOption } from './types';

export const CATEGORIES: { id: TemplateCategory; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '✨' },
  { id: 'stream', label: 'Stream', emoji: '🎮' },
  { id: 'social', label: 'Social', emoji: '📱' },
  { id: 'twitch', label: 'Twitch', emoji: '💜' },
];

// UI metadata for vibes (gradients, icons, taglines)
// These are purely visual and don't affect generation
const STANDARD_VIBES: VibeOption[] = [
  { id: 'pro', name: 'Pro Aesthetic', tagline: 'Clean, professional, high-end photography style', icon: '🎯', gradient: 'from-slate-600 to-zinc-800' },
  { id: 'anime', name: 'Anime Hype', tagline: 'Dynamic cel-shaded illustration with energy', icon: '⚡', gradient: 'from-primary-600 to-pink-600' },
  { id: 'playful', name: '3D Playful', tagline: 'Colorful 3D toy aesthetic, fun and inviting', icon: '🎨', gradient: 'from-cyan-500 to-primary-600' },
];

const EMOTE_VIBES: VibeOption[] = [
  { id: 'glossy', name: '3D Glossy', tagline: 'Shiny vinyl sticker with bold colors', icon: '✨', gradient: 'from-rose-500 to-orange-500' },
  { id: 'pixel', name: 'Pixel Classic', tagline: 'Retro 16-bit game aesthetic', icon: '👾', gradient: 'from-green-600 to-emerald-500' },
  { id: 'modern-pixel', name: 'Modern 64-Bit', tagline: 'High-fidelity pixel art with anti-aliasing', icon: '🕹️', gradient: 'from-indigo-600 to-purple-500' },
  { id: 'elite-glass', name: 'Elite Glass', tagline: 'Glassmorphism with refraction effects', icon: '💎', gradient: 'from-sky-400 to-blue-600' },
  { id: 'halftone-pop', name: 'Halftone Pop', tagline: 'Comic book pop art style', icon: '💥', gradient: 'from-yellow-500 to-red-500' },
  { id: 'marble-gold', name: 'Marble & Gold', tagline: 'Luxury marble with gold accents', icon: '👑', gradient: 'from-amber-400 to-yellow-600' },
  { id: 'cozy', name: 'Cozy Doodle', tagline: 'Hand-drawn sketch with watercolor warmth', icon: '☕', gradient: 'from-amber-500 to-orange-400' },
  { id: 'retro', name: 'Retro 90s', tagline: 'Holographic iridescent sticker nostalgia', icon: '🌈', gradient: 'from-fuchsia-500 to-cyan-400' },
  { id: 'anime', name: 'Cel-Shaded', tagline: 'Studio-quality anime with expressive eyes', icon: '🎌', gradient: 'from-primary-600 to-pink-600' },
  { id: 'vaporwave', name: 'Vaporwave', tagline: 'Neon wireframe with cyber aesthetics', icon: '🌃', gradient: 'from-primary-600 to-fuchsia-500' },
  { id: 'tactical', name: 'Tactical Patch', tagline: 'Embroidered fabric with realistic threads', icon: '🎖️', gradient: 'from-stone-600 to-zinc-700' },
  { id: 'kawaii', name: 'Kawaii Blob', tagline: 'Ultra-cute squishy blob characters', icon: '🩷', gradient: 'from-pink-400 to-rose-400' },
];

const THUMBNAIL_VIBES: VibeOption[] = [
  { id: 'aesthetic-pro', name: 'Aesthetic Pro', tagline: 'Clean, cinematic gamer-glow', icon: '✨', gradient: 'from-primary-600 to-primary-800' },
  { id: 'viral-hype', name: 'Viral Hype', tagline: 'Maximum CTR energy', icon: '🔥', gradient: 'from-orange-500 to-red-600' },
  { id: 'anime-cinematic', name: 'Anime Cinematic', tagline: 'Studio-quality anime style', icon: '🎌', gradient: 'from-primary-600 to-pink-600' },
  { id: 'playful-3d', name: 'Playful 3D', tagline: 'Cute vinyl toy aesthetic', icon: '🎨', gradient: 'from-cyan-500 to-primary-600' },
  { id: 'after-dark', name: 'After Dark', tagline: 'Tactical noir esports', icon: '🌙', gradient: 'from-emerald-600 to-slate-800' },
  { id: 'color-pop', name: 'Color Pop', tagline: 'Choose your color scheme', icon: '🎨', gradient: 'from-fuchsia-500 to-cyan-400' },
  { id: 'pro', name: 'Shock Face', tagline: 'Viral-style reaction', icon: '😱', gradient: 'from-red-600 to-orange-500' },
  { id: 'anime', name: 'The Duel', tagline: 'Epic versus split', icon: '⚔️', gradient: 'from-primary-600 to-red-600' },
  { id: 'playful', name: 'Cartoon Pop', tagline: 'Colorful bubble text', icon: '🎮', gradient: 'from-primary-500 to-cyan-400' },
];

// Platform options for emote creation
const EMOTE_PLATFORMS = [
  { value: 'twitch', label: 'Twitch' },
  { value: 'tiktok', label: 'TikTok' },
];

// Size options per platform
const EMOTE_SIZES = {
  twitch: [
    { value: '112', label: '112×112 (Large)' },
    { value: '56', label: '56×56 (Medium)' },
    { value: '28', label: '28×28 (Small)' },
  ],
  tiktok: [
    { value: '300', label: '300×300 (Standard)' },
    { value: '200', label: '200×200 (Medium)' },
    { value: '100', label: '100×100 (Small)' },
  ],
};

/**
 * TEMPLATES - UI metadata for Quick Create templates
 * 
 * NOTE: The `fields` array here is a FALLBACK. The frontend should fetch
 * fields dynamically from /api/v1/templates/{id} to get the latest
 * placeholders from the YAML files.
 * 
 * This allows the backend to add new optional fields (like character_description,
 * accent_color) without requiring frontend changes.
 */
export const TEMPLATES: QuickTemplate[] = [
  {
    id: 'going-live', name: 'Going Live', tagline: 'Stream announcement', category: 'stream',
    assetType: 'story_graphic', dimensions: '1080×1920', emoji: '🔴',
    // Fallback fields - prefer fetching from backend
    fields: [
      { id: 'title', label: 'Stream Title', type: 'text', placeholder: 'Ranked Grind', required: true, maxLength: 50 },
      { id: 'game', label: 'Game', type: 'text', placeholder: 'Valorant', maxLength: 30 },
      { id: 'time', label: 'Time', type: 'text', placeholder: '7 PM EST', maxLength: 20 },
    ],
    previewStyle: 'Vertical story graphic optimized for Instagram & TikTok', vibes: STANDARD_VIBES,
  },
  {
    id: 'schedule', name: 'Weekly Schedule', tagline: 'Streaming calendar', category: 'stream',
    assetType: 'banner', dimensions: '1200×480', emoji: '📅',
    fields: [
      { id: 'days', label: 'Streaming Days', type: 'text', placeholder: 'Mon, Wed, Fri', required: true, maxLength: 50, hint: 'Enter your streaming days separated by commas' },
      { id: 'times', label: 'Stream Time', type: 'text', placeholder: '7 PM EST', maxLength: 30, hint: 'Your typical stream time' },
    ],
    previewStyle: 'Horizontal banner for Twitch panels & social headers',
    vibes: [
      { id: 'pro', name: 'Clean Minimalist', tagline: 'Professional desk flat-lay', icon: '🎯', gradient: 'from-slate-600 to-zinc-800' },
      { id: 'anime', name: 'Retro Arcade', tagline: 'Neon CRT monitors synthwave', icon: '🕹️', gradient: 'from-primary-600 to-pink-600' },
      { id: 'playful', name: 'Colorful Calendar', tagline: '3D blocks with cute icons', icon: '🎨', gradient: 'from-cyan-500 to-primary-600' },
    ],
  },
  {
    id: 'starting-soon', name: 'Starting Soon', tagline: 'Pre-stream screen', category: 'stream',
    assetType: 'overlay', dimensions: '1920×1080', emoji: '⏳',
    fields: [{ id: 'message', label: 'Message', type: 'text', placeholder: 'Starting in 5 min!' }],
    previewStyle: 'Full HD overlay for OBS/Streamlabs',
    vibes: [
      { id: 'pro', name: 'Command Center', tagline: 'Futuristic tech UI', icon: '🎯', gradient: 'from-slate-600 to-zinc-800' },
      { id: 'anime', name: 'Energy Burst', tagline: 'Anime speed lines', icon: '⚡', gradient: 'from-primary-600 to-pink-600' },
      { id: 'playful', name: 'Cozy Lofi', tagline: 'Rainy night gaming room', icon: '☕', gradient: 'from-amber-500 to-orange-400' },
    ],
  },
  {
    id: 'clip-highlight', name: 'Clip Highlight', tagline: 'Share moments', category: 'social',
    assetType: 'clip_cover', dimensions: '1080×1080', emoji: '🎬',
    fields: [
      { id: 'title', label: 'Clip Title', type: 'text', placeholder: '1v5 Clutch', required: true },
      { id: 'game', label: 'Game', type: 'text', placeholder: 'Valorant' },
    ],
    previewStyle: 'Square format for Instagram, Twitter, Discord',
    vibes: [
      { id: 'pro', name: 'Action Freeze', tagline: 'High-impact action shot', icon: '💥', gradient: 'from-slate-600 to-zinc-800' },
      { id: 'anime', name: 'Manga Panel', tagline: 'Dramatic speed lines', icon: '📖', gradient: 'from-primary-600 to-pink-600' },
      { id: 'playful', name: 'Pop Victory', tagline: 'Chibi celebration', icon: '🎉', gradient: 'from-cyan-500 to-primary-600' },
    ],
  },
  {
    id: 'milestone', name: 'Milestone', tagline: 'Celebrate achievements', category: 'social',
    assetType: 'story_graphic', dimensions: '1080×1920', emoji: '🎉',
    fields: [
      { id: 'type', label: 'Type', type: 'select', required: true, options: [
        { value: 'followers', label: 'Followers' }, { value: 'subs', label: 'Subscribers' }, { value: 'viewers', label: 'Peak Viewers' },
      ]},
      { id: 'count', label: 'Number', type: 'text', placeholder: '10,000', required: true },
    ],
    previewStyle: 'Vertical celebration graphic for stories',
    vibes: [
      { id: 'pro', name: 'Golden Trophy', tagline: 'Luxury esports stage', icon: '🏆', gradient: 'from-amber-500 to-yellow-600' },
      { id: 'anime', name: 'Level Up', tagline: 'Anime power-up auras', icon: '⬆️', gradient: 'from-primary-600 to-pink-600' },
      { id: 'playful', name: 'Pop-Art Party', tagline: 'Comic speech bubbles', icon: '🎊', gradient: 'from-cyan-500 to-primary-600' },
    ],
  },
  {
    id: 'thumbnail', name: 'YouTube Thumbnail', tagline: 'Video cover art', category: 'social',
    assetType: 'thumbnail', dimensions: '1280×720', emoji: '▶️',
    fields: [
      { id: 'title', label: 'Title', type: 'text', placeholder: 'I Hit Radiant!', required: true },
      { id: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'After 500 hours...' },
    ],
    previewStyle: 'Click-worthy thumbnail optimized for YouTube',
    vibes: THUMBNAIL_VIBES,
  },
  {
    id: 'emote', name: 'Custom Emote', tagline: 'Chat expression', category: 'twitch',
    assetType: 'twitch_emote', dimensions: '112×112', emoji: '😀',
    fields: [
      { id: 'platform', label: 'Platform', type: 'select', required: true, options: EMOTE_PLATFORMS },
      { id: 'emotion', label: 'Emotion', type: 'select', required: true, options: [
        { value: 'hype', label: 'Hype' }, { value: 'sad', label: 'Sad' }, { value: 'laugh', label: 'Laugh' }, { value: 'love', label: 'Love' },
        { value: 'comfy', label: 'Comfy' }, { value: 'rage', label: 'Rage' }, { value: 'pog', label: 'Pog' }, { value: 'gg', label: 'GG' },
      ]},
      { id: 'text', label: 'Text (optional)', type: 'text', placeholder: 'GG', maxLength: 10 },
      { id: 'size', label: 'Size', type: 'dynamic_select', required: true, dependsOn: 'platform', optionsMap: EMOTE_SIZES },
    ],
    previewStyle: 'Platform-ready emote, readable at all sizes', vibes: EMOTE_VIBES,
  },
  {
    id: 'panel', name: 'Channel Panel', tagline: 'Profile section', category: 'twitch',
    assetType: 'twitch_panel', dimensions: '320×160', emoji: '📋',
    fields: [{ id: 'type', label: 'Panel Type', type: 'select', required: true, options: [
      { value: 'about', label: 'About Me' }, { value: 'schedule', label: 'Schedule' }, { value: 'rules', label: 'Rules' }, { value: 'donate', label: 'Support' },
    ]}],
    previewStyle: 'Twitch profile panel header',
    vibes: [
      { id: 'pro', name: 'Matte Hardware', tagline: 'Minimalist premium', icon: '🎮', gradient: 'from-slate-600 to-zinc-800' },
      { id: 'anime', name: 'Neon Sign', tagline: 'Glowing tubes on brick', icon: '💡', gradient: 'from-primary-600 to-pink-600' },
      { id: 'playful', name: 'Cute Icon', tagline: 'Kawaii-inspired pastel', icon: '🩷', gradient: 'from-pink-400 to-rose-400' },
    ],
  },
  {
    id: 'offline', name: 'Offline Screen', tagline: 'When away', category: 'twitch',
    assetType: 'twitch_offline', dimensions: '1920×1080', emoji: '📺',
    fields: [
      { id: 'message', label: 'Message', type: 'text', placeholder: 'Currently Offline' },
      { id: 'schedule', label: 'Next Stream', type: 'text', placeholder: 'Back Monday 7PM' },
    ],
    previewStyle: 'Full HD offline banner for Twitch channel',
    vibes: [
      { id: 'pro', name: 'Tech Glitch', tagline: 'Professional RGB effects', icon: '📡', gradient: 'from-slate-600 to-zinc-800' },
      { id: 'anime', name: 'Anime Away', tagline: 'Cute chibi waving', icon: '👋', gradient: 'from-primary-600 to-pink-600' },
      { id: 'playful', name: 'Cozy Desk', tagline: 'Moonlight ambiance', icon: '🌙', gradient: 'from-primary-600 to-primary-700' },
    ],
  },
];

/**
 * Get UI metadata for a vibe (icon, gradient, tagline)
 * This is used to enhance the backend vibe data with visual styling
 */
export function getVibeUIMeta(templateId: string, vibeId: string): Partial<VibeOption> {
  const template = TEMPLATES.find(t => t.id === templateId);
  if (!template) return {};
  
  const vibe = template.vibes.find(v => v.id === vibeId);
  return vibe || {};
}
