/**
 * Canvas Studio Template Data Index
 * 
 * Central export point for all built-in templates.
 * Templates are organized by platform/category and combined into a single array.
 */

// Re-export types
export * from './types';

// Import template arrays
import { YOUTUBE_THUMBNAIL_TEMPLATES } from './youtube-thumbnails';
import { TWITCH_GRAPHICS_TEMPLATES } from './twitch-graphics';

// Re-export individual template arrays
export { YOUTUBE_THUMBNAIL_TEMPLATES } from './youtube-thumbnails';
export { TWITCH_GRAPHICS_TEMPLATES } from './twitch-graphics';

// Re-export individual templates for direct access
export {
  YT_REACTION_TEMPLATE,
  YT_GAMING_TEMPLATE,
  YT_VERSUS_TEMPLATE,
  YT_MINIMAL_TEMPLATE,
  YT_ANNOUNCEMENT_TEMPLATE,
} from './youtube-thumbnails';

export {
  TW_OFFLINE_GAMING_TEMPLATE,
  TW_PANEL_ABOUT_TEMPLATE,
  TW_BANNER_GAMING_TEMPLATE,
  TW_EMOTE_POG_TEMPLATE,
  TW_BADGE_TIER1_TEMPLATE,
} from './twitch-graphics';

// ============================================================================
// Combined Template Array
// ============================================================================

/**
 * All built-in templates combined into a single array.
 * Use this for the template selector when showing all available templates.
 */
export const BUILT_IN_TEMPLATES = [
  ...YOUTUBE_THUMBNAIL_TEMPLATES,
  ...TWITCH_GRAPHICS_TEMPLATES,
];

/**
 * Total count of built-in templates
 */
export const BUILT_IN_TEMPLATE_COUNT = BUILT_IN_TEMPLATES.length;

/**
 * Get a template by ID
 */
export function getTemplateById(id: string) {
  return BUILT_IN_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string) {
  return BUILT_IN_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get free (non-premium) templates only
 */
export function getFreeTemplates() {
  return BUILT_IN_TEMPLATES.filter(t => !t.isPremium);
}

/**
 * Get premium templates only
 */
export function getPremiumTemplates() {
  return BUILT_IN_TEMPLATES.filter(t => t.isPremium);
}
