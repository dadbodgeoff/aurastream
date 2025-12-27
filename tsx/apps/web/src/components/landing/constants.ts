// =============================================================================
// Landing Page Constants
// =============================================================================

const SUPABASE_STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/landing-assets`
  : 'https://qgyvdadgdomnubngfpun.supabase.co/storage/v1/object/public/landing-assets';

// Hero showcase assets - EXACT order as specified:
// Emotes: 8_34, 3_00, 8_31, 8_35
// Thumbnails: 8_39, 8_41, 8_40, 8_37, 8_43
// Logos: 8_52, 8_54, 8_56
// Going Live Posts: 2_54, 2_53
export const SHOWCASE_ASSETS = [
  // Emotes (first) - exact order: 8_34, 3_00, 8_31, 8_35
  { type: 'Emote' as const, label: 'Twitch Emote', src: `${SUPABASE_STORAGE_URL}/8_34.png`, hasGreenBg: true, prompt: 'Hype victory emote with electric energy' },
  { type: 'Emote' as const, label: 'Twitch Emote', src: `${SUPABASE_STORAGE_URL}/3_00.png`, hasGreenBg: true, prompt: 'Excited celebration emote for big wins' },
  { type: 'Emote' as const, label: 'Twitch Emote', src: `${SUPABASE_STORAGE_URL}/8_31.png`, hasGreenBg: true, prompt: 'Cool gaming emote with neon vibes' },
  { type: 'Emote' as const, label: 'Twitch Emote', src: `${SUPABASE_STORAGE_URL}/8_35.png`, hasGreenBg: true, prompt: 'Epic streamer emote with my brand colors' },
  // Thumbnails - exact order: 8_39, 8_41, 8_40, 8_37, 8_43
  { type: 'Thumbnail' as const, label: 'YouTube Thumbnail', src: `${SUPABASE_STORAGE_URL}/8_39.png`, hasGreenBg: false, prompt: 'Epic Fortnite victory royale thumbnail' },
  { type: 'Thumbnail' as const, label: 'YouTube Thumbnail', src: `${SUPABASE_STORAGE_URL}/8_41.png`, hasGreenBg: false, prompt: 'Intense gaming moment thumbnail with action' },
  { type: 'Thumbnail' as const, label: 'YouTube Thumbnail', src: `${SUPABASE_STORAGE_URL}/8_40.png`, hasGreenBg: false, prompt: 'Dramatic highlight reel thumbnail' },
  { type: 'Thumbnail' as const, label: 'YouTube Thumbnail', src: `${SUPABASE_STORAGE_URL}/8_37.png`, hasGreenBg: false, prompt: 'Eye-catching stream recap thumbnail' },
  { type: 'Thumbnail' as const, label: 'YouTube Thumbnail', src: `${SUPABASE_STORAGE_URL}/8_43.png`, hasGreenBg: false, prompt: 'Bold gaming content thumbnail' },
  // Logos - exact order: 8_52, 8_54, 8_56
  { type: 'Logo' as const, label: 'Channel Logo', src: `${SUPABASE_STORAGE_URL}/8_52.png`, hasGreenBg: true, prompt: 'Modern streamer logo with clean design' },
  { type: 'Logo' as const, label: 'Channel Logo', src: `${SUPABASE_STORAGE_URL}/8_54.png`, hasGreenBg: true, prompt: 'Professional gaming channel logo' },
  { type: 'Logo' as const, label: 'Channel Logo', src: `${SUPABASE_STORAGE_URL}/8_56.png`, hasGreenBg: true, prompt: 'Sleek minimalist streamer brand logo' },
  // Going Live Posts (1080x1920) - exact order: 2_54, 2_53
  { type: 'Story' as const, label: 'Going Live Post', src: `${SUPABASE_STORAGE_URL}/2_54.png`, hasGreenBg: false, prompt: 'Going live announcement for Instagram story' },
  { type: 'Story' as const, label: 'Going Live Post', src: `${SUPABASE_STORAGE_URL}/2_53.png`, hasGreenBg: false, prompt: 'Stream starting soon social media post' },
];

// Demo prompts are now embedded in SHOWCASE_ASSETS above
// This array is kept for backward compatibility but pulls from assets
export const DEMO_PROMPTS = SHOWCASE_ASSETS.map(asset => asset.prompt);

export const ANIMATION_TIMING = {
  microInteraction: 300,
  majorTransition: 1000,
  showcaseCycle: 2500,
  generateDelay: 800,
} as const;

export const EASING = {
  smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;
