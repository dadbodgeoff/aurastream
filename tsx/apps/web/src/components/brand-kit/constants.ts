/**
 * Brand Kit Suite - Constants
 * Centralized configuration for the brand kit system
 */

import type { BrandKitTone } from '@aurastream/api-client';

// ============================================================================
// Font Options
// ============================================================================

export const SUPPORTED_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins',
  'Lato', 'Oswald', 'Raleway', 'Nunito', 'Playfair Display',
  'Merriweather', 'Source Sans Pro', 'Ubuntu', 'Rubik', 'Work Sans',
  'Quicksand', 'Barlow', 'Mulish', 'Karla', 'Manrope',
  'Space Grotesk', 'DM Sans', 'Outfit', 'Sora', 'Clash Display'
];

export const FONT_WEIGHTS = [
  { value: 100, label: 'Thin' },
  { value: 200, label: 'Extra Light' },
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semi Bold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra Bold' },
  { value: 900, label: 'Black' },
];

// ============================================================================
// Tone Options
// ============================================================================

export interface ToneOption {
  value: BrandKitTone;
  label: string;
  description: string;
  emoji: string;
}

export const TONE_OPTIONS: ToneOption[] = [
  { value: 'professional', label: 'Professional', description: 'Clean, polished, business-ready', emoji: '💼' },
  { value: 'competitive', label: 'Competitive', description: 'Bold, intense, high-energy', emoji: '🔥' },
  { value: 'casual', label: 'Casual', description: 'Relaxed, approachable, friendly', emoji: '😊' },
  { value: 'educational', label: 'Educational', description: 'Clear, informative, helpful', emoji: '📚' },
  { value: 'comedic', label: 'Comedic', description: 'Fun, entertaining, playful', emoji: '😂' },
];

export const EXTENDED_TONE_OPTIONS: ToneOption[] = [
  { value: 'inspirational' as BrandKitTone, label: 'Inspirational', description: 'Motivating, uplifting', emoji: '✨' },
  { value: 'edgy' as BrandKitTone, label: 'Edgy', description: 'Bold, provocative, daring', emoji: '⚡' },
  { value: 'wholesome' as BrandKitTone, label: 'Wholesome', description: 'Warm, positive, inclusive', emoji: '💖' },
];

export const ALL_TONE_OPTIONS = [...TONE_OPTIONS, ...EXTENDED_TONE_OPTIONS];

// ============================================================================
// Typography Levels
// ============================================================================

export const TYPOGRAPHY_LEVELS = [
  { key: 'display', label: 'Display', description: 'Hero sections, large titles' },
  { key: 'headline', label: 'Headline', description: 'H1-H2 headers' },
  { key: 'subheadline', label: 'Subheadline', description: 'H3-H4 headers' },
  { key: 'body', label: 'Body', description: 'Main content text' },
  { key: 'caption', label: 'Caption', description: 'Small text, labels' },
  { key: 'accent', label: 'Accent', description: 'Quotes, callouts' },
] as const;

// ============================================================================
// Logo Types
// ============================================================================

export const LOGO_TYPES = [
  { type: 'primary' as const, label: 'Primary Logo', description: 'Main logo for generation', recommended: '512x512+' },
  { type: 'secondary' as const, label: 'Secondary', description: 'Alternative version', recommended: '512x512+' },
  { type: 'icon' as const, label: 'Icon', description: 'Favicon, small displays', recommended: '128x128' },
  { type: 'monochrome' as const, label: 'Monochrome', description: 'Single-color version', recommended: '512x512' },
  { type: 'watermark' as const, label: 'Watermark', description: 'Transparent overlay', recommended: '256x256' },
];

// ============================================================================
// Color Presets
// ============================================================================

export const PRESET_PALETTES = [
  { name: 'Ocean Blue', primary: ['#3B82F6', '#2563EB'], accent: ['#F59E0B'] },
  { name: 'Forest Green', primary: ['#22C55E', '#16A34A'], accent: ['#EC4899'] },
  { name: 'Sunset Orange', primary: ['#F97316', '#EA580C'], accent: ['#3B82F6'] },
  { name: 'Cherry Red', primary: ['#EF4444', '#DC2626'], accent: ['#F59E0B'] },
  { name: 'Midnight', primary: ['#1E293B', '#0F172A'], accent: ['#F59E0B'] },
  { name: 'Royal Purple', primary: ['#7C3AED', '#6D28D9'], accent: ['#F59E0B'] },
];

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_IDENTITY = {
  name: '',
  primaryColors: ['#3B82F6'],
  accentColors: [],
  headlineFont: 'Montserrat',
  bodyFont: 'Inter',
  tone: 'professional' as BrandKitTone,
  styleReference: '',
};
