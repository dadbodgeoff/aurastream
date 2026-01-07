/**
 * Active Effects UI - Utilities
 *
 * Helper functions for extracting and managing effect information
 * from animation configurations.
 */

import type { AnimationConfig } from '@aurastream/api-client';
import type { EffectInfo, EffectCategory, EffectColor, EffectPropertySchema, PropertyDefinition } from './types';

// ============================================================================
// Effect Metadata
// ============================================================================

const EFFECT_LABELS: Record<string, { label: string; icon: string; color: EffectColor }> = {
  // Entry animations
  pop_in: { label: 'Pop In', icon: '🎯', color: 'purple' },
  slide_in: { label: 'Slide In', icon: '➡️', color: 'blue' },
  fade_in: { label: 'Fade In', icon: '🌅', color: 'cyan' },
  bounce_in: { label: 'Bounce In', icon: '⚡', color: 'yellow' },
  zoom_in: { label: 'Zoom In', icon: '🔍', color: 'green' },
  spin_in: { label: 'Spin In', icon: '🌀', color: 'pink' },
  
  // Loop animations
  float: { label: 'Float', icon: '☁️', color: 'cyan' },
  pulse: { label: 'Pulse', icon: '💓', color: 'pink' },
  wiggle: { label: 'Wiggle', icon: '〰️', color: 'purple' },
  breathe: { label: 'Breathe', icon: '🌬️', color: 'blue' },
  shake: { label: 'Shake', icon: '📳', color: 'orange' },
  swing: { label: 'Swing', icon: '🎪', color: 'yellow' },
  glow: { label: 'Glow', icon: '💫', color: 'yellow' },
  rgb_glow: { label: 'RGB Glow', icon: '🌈', color: 'pink' },
  
  // Depth effects
  parallax: { label: 'Parallax', icon: '🎯', color: 'cyan' },
  tilt: { label: 'Tilt', icon: '📐', color: 'blue' },
  pop_out: { label: 'Pop Out', icon: '🎪', color: 'purple' },
  
  // Particles
  sparkles: { label: 'Sparkles', icon: '✨', color: 'yellow' },
  confetti: { label: 'Confetti', icon: '🎊', color: 'pink' },
  hearts: { label: 'Hearts', icon: '💕', color: 'pink' },
  fire: { label: 'Fire', icon: '🔥', color: 'orange' },
  snow: { label: 'Snow', icon: '❄️', color: 'cyan' },
  smoke: { label: 'Smoke', icon: '💨', color: 'blue' },
};

const CATEGORY_INFO: Record<EffectCategory, { label: string; icon: string; color: EffectColor }> = {
  entry: { label: 'Entry', icon: '🎯', color: 'purple' },
  loop: { label: 'Loop', icon: '🔄', color: 'cyan' },
  depth: { label: '3D Depth', icon: '📦', color: 'blue' },
  particles: { label: 'Particles', icon: '✨', color: 'pink' },
};

// ============================================================================
// Effect Extraction
// ============================================================================

/**
 * Extract active effects from animation config
 */
export function extractActiveEffects(config: AnimationConfig): EffectInfo[] {
  const effects: EffectInfo[] = [];
  
  // Entry animation
  if (config.entry?.type) {
    const meta = EFFECT_LABELS[config.entry.type] || { label: config.entry.type, icon: '🎯', color: 'purple' as EffectColor };
    effects.push({
      id: `entry-${config.entry.type}`,
      category: 'entry',
      type: config.entry.type,
      label: meta.label,
      icon: meta.icon,
      enabled: true,
      color: meta.color,
      description: 'How the alert enters the screen',
    });
  }
  
  // Loop animation
  if (config.loop?.type) {
    const meta = EFFECT_LABELS[config.loop.type] || { label: config.loop.type, icon: '🔄', color: 'cyan' as EffectColor };
    effects.push({
      id: `loop-${config.loop.type}`,
      category: 'loop',
      type: config.loop.type,
      label: meta.label,
      icon: meta.icon,
      enabled: true,
      color: meta.color,
      description: 'Continuous animation while displayed',
    });
  }
  
  // Depth effect
  if (config.depthEffect?.type) {
    const meta = EFFECT_LABELS[config.depthEffect.type] || { label: config.depthEffect.type, icon: '📦', color: 'blue' as EffectColor };
    effects.push({
      id: `depth-${config.depthEffect.type}`,
      category: 'depth',
      type: config.depthEffect.type,
      label: meta.label,
      icon: meta.icon,
      enabled: true,
      color: meta.color,
      description: '3D parallax depth effect',
    });
  }
  
  // Particles
  if (config.particles?.type) {
    const meta = EFFECT_LABELS[config.particles.type] || { label: config.particles.type, icon: '✨', color: 'pink' as EffectColor };
    effects.push({
      id: `particles-${config.particles.type}`,
      category: 'particles',
      type: config.particles.type,
      label: meta.label,
      icon: meta.icon,
      enabled: true,
      color: meta.color,
      description: 'Particle overlay effect',
    });
  }
  
  return effects;
}

/**
 * Get category info
 */
export function getCategoryInfo(category: EffectCategory) {
  return CATEGORY_INFO[category];
}

/**
 * Get effect metadata by type
 */
export function getEffectMeta(type: string) {
  return EFFECT_LABELS[type] || { label: type, icon: '🎨', color: 'purple' as EffectColor };
}

// ============================================================================
// Property Schemas
// ============================================================================

const ENTRY_PROPERTIES: PropertyDefinition[] = [
  { key: 'durationMs', label: 'Duration', type: 'slider', min: 100, max: 2000, step: 50, suffix: 'ms', defaultValue: 400 },
  { key: 'easing', label: 'Easing', type: 'select', options: [
    { value: 'ease-out', label: 'Ease Out' },
    { value: 'ease-in-out', label: 'Ease In Out' },
    { value: 'spring', label: 'Spring' },
    { value: 'bounce', label: 'Bounce' },
  ], defaultValue: 'ease-out' },
];

const LOOP_PROPERTIES: Record<string, PropertyDefinition[]> = {
  float: [
    { key: 'frequency', label: 'Speed', type: 'slider', min: 0.1, max: 2, step: 0.1, suffix: 'Hz', defaultValue: 0.4 },
    { key: 'amplitudeY', label: 'Height', type: 'slider', min: 0.01, max: 0.1, step: 0.01, suffix: '%', defaultValue: 0.03 },
  ],
  pulse: [
    { key: 'frequency', label: 'Speed', type: 'slider', min: 0.3, max: 2, step: 0.1, suffix: 'Hz', defaultValue: 0.8 },
    { key: 'scaleMin', label: 'Min Scale', type: 'slider', min: 0.9, max: 1, step: 0.01, defaultValue: 0.98 },
    { key: 'scaleMax', label: 'Max Scale', type: 'slider', min: 1, max: 1.2, step: 0.01, defaultValue: 1.04 },
  ],
  wiggle: [
    { key: 'frequency', label: 'Speed', type: 'slider', min: 0.5, max: 4, step: 0.1, suffix: 'Hz', defaultValue: 1.5 },
    { key: 'angleMax', label: 'Angle', type: 'slider', min: 1, max: 15, step: 1, suffix: '°', defaultValue: 2 },
  ],
  breathe: [
    { key: 'frequency', label: 'Speed', type: 'slider', min: 0.1, max: 1, step: 0.05, suffix: 'Hz', defaultValue: 0.25 },
    { key: 'scaleMin', label: 'Min Scale', type: 'slider', min: 0.9, max: 1, step: 0.01, defaultValue: 0.97 },
    { key: 'scaleMax', label: 'Max Scale', type: 'slider', min: 1, max: 1.15, step: 0.01, defaultValue: 1.03 },
  ],
  shake: [
    { key: 'frequency', label: 'Speed', type: 'slider', min: 4, max: 15, step: 1, suffix: 'Hz', defaultValue: 8 },
    { key: 'intensity', label: 'Intensity', type: 'slider', min: 0.005, max: 0.05, step: 0.005, suffix: '%', defaultValue: 0.02 },
  ],
  swing: [
    { key: 'frequency', label: 'Speed', type: 'slider', min: 0.2, max: 1.5, step: 0.1, suffix: 'Hz', defaultValue: 0.5 },
    { key: 'angleMax', label: 'Angle', type: 'slider', min: 2, max: 20, step: 1, suffix: '°', defaultValue: 8 },
  ],
  glow: [
    { key: 'frequency', label: 'Speed', type: 'slider', min: 0.3, max: 2, step: 0.1, suffix: 'Hz', defaultValue: 0.6 },
    { key: 'intensityMin', label: 'Min Glow', type: 'slider', min: 0, max: 0.5, step: 0.05, defaultValue: 0.3 },
    { key: 'intensityMax', label: 'Max Glow', type: 'slider', min: 0.5, max: 1, step: 0.05, defaultValue: 1 },
    { key: 'color', label: 'Color', type: 'color', defaultValue: '#a855f7' },
  ],
  rgb_glow: [
    { key: 'frequency', label: 'Speed', type: 'slider', min: 0.1, max: 1, step: 0.05, suffix: 'Hz', defaultValue: 0.3 },
    { key: 'intensityMin', label: 'Min Glow', type: 'slider', min: 0, max: 0.5, step: 0.05, defaultValue: 0.4 },
    { key: 'intensityMax', label: 'Max Glow', type: 'slider', min: 0.5, max: 1, step: 0.05, defaultValue: 1 },
  ],
};

const DEPTH_PROPERTIES: PropertyDefinition[] = [
  { key: 'intensity', label: 'Intensity', type: 'slider', min: 0.1, max: 1, step: 0.1, defaultValue: 0.5 },
  { key: 'depthScale', label: 'Depth Scale', type: 'slider', min: 0.5, max: 2, step: 0.1, defaultValue: 1 },
];

const PARTICLE_PROPERTIES: PropertyDefinition[] = [
  { key: 'count', label: 'Count', type: 'slider', min: 10, max: 200, step: 10, defaultValue: 50 },
  { key: 'speed', label: 'Speed', type: 'slider', min: 0.1, max: 3, step: 0.1, defaultValue: 1 },
  { key: 'size', label: 'Size', type: 'slider', min: 0.5, max: 3, step: 0.1, defaultValue: 1 },
  { key: 'opacity', label: 'Opacity', type: 'slider', min: 0.1, max: 1, step: 0.1, defaultValue: 0.8 },
];

/**
 * Get property schema for an effect
 */
export function getEffectPropertySchema(category: EffectCategory, type: string): EffectPropertySchema {
  const meta = getEffectMeta(type);
  
  let properties: PropertyDefinition[] = [];
  
  switch (category) {
    case 'entry':
      properties = ENTRY_PROPERTIES;
      break;
    case 'loop':
      properties = LOOP_PROPERTIES[type] || [];
      break;
    case 'depth':
      properties = DEPTH_PROPERTIES;
      break;
    case 'particles':
      properties = PARTICLE_PROPERTIES;
      break;
  }
  
  return {
    category,
    type,
    label: meta.label,
    icon: meta.icon,
    properties,
  };
}

// ============================================================================
// Color Utilities
// ============================================================================

export const EFFECT_COLOR_CLASSES: Record<EffectColor, { bg: string; border: string; text: string; badge: string }> = {
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400', badge: 'bg-purple-600' },
  cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400', badge: 'bg-cyan-600' },
  pink: { bg: 'bg-pink-500/20', border: 'border-pink-500/50', text: 'text-pink-400', badge: 'bg-pink-600' },
  green: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400', badge: 'bg-green-600' },
  yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', badge: 'bg-yellow-600' },
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400', badge: 'bg-orange-600' },
  red: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', badge: 'bg-red-600' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', badge: 'bg-blue-600' },
};
