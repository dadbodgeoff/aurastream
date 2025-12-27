/**
 * Streamer Studio Design Tokens
 * Enterprise Design System
 * 
 * This file exports all design tokens for use across the application.
 * Tokens are organized by category and include full TypeScript types.
 */

// Individual token exports
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';
export * from './animations';
export * from './native';
export * from './native';

// Import for combined tokens object
import { colors } from './colors';
import { typography } from './typography';
import { spacing, componentSpacing, radius, zIndex, breakpoints } from './spacing';
import { shadows } from './shadows';
import { animations, transitions } from './animations';

/**
 * Combined tokens object for convenience
 * Use this when you need access to all tokens in one place
 */
export const tokens = {
  colors,
  typography,
  spacing,
  componentSpacing,
  radius,
  zIndex,
  breakpoints,
  shadows,
  animations,
  transitions,
} as const;

// Type for the complete tokens object
export type Tokens = typeof tokens;

/**
 * CSS Custom Properties Generator
 * Converts tokens to CSS custom properties for use in stylesheets
 */
export function generateCSSVariables(): string {
  const lines: string[] = [':root {'];
  
  // Primary Colors
  Object.entries(colors.primary).forEach(([key, value]) => {
    lines.push(`  --color-primary-${key}: ${value};`);
  });
  
  // Interactive Colors
  Object.entries(colors.interactive).forEach(([key, value]) => {
    lines.push(`  --color-interactive-${key}: ${value};`);
  });
  
  // Accent Colors
  Object.entries(colors.accent).forEach(([key, value]) => {
    lines.push(`  --color-accent-${key}: ${value};`);
  });
  
  // Neutral Colors
  Object.entries(colors.neutral).forEach(([key, value]) => {
    lines.push(`  --color-neutral-${key}: ${value};`);
  });
  
  // Background Colors
  Object.entries(colors.background).forEach(([key, value]) => {
    lines.push(`  --color-bg-${key}: ${value};`);
  });
  
  // Text Colors
  Object.entries(colors.text).forEach(([key, value]) => {
    lines.push(`  --color-text-${key}: ${value};`);
  });
  
  // Border Colors
  Object.entries(colors.border).forEach(([key, value]) => {
    lines.push(`  --color-border-${key}: ${value};`);
  });
  
  // Spacing
  Object.entries(spacing).forEach(([key, value]) => {
    lines.push(`  --spacing-${key}: ${value};`);
  });
  
  // Typography - Font Sizes
  Object.entries(typography.fontSize).forEach(([key, value]) => {
    lines.push(`  --font-size-${key}: ${value};`);
  });
  
  // Typography - Font Weights
  Object.entries(typography.fontWeight).forEach(([key, value]) => {
    lines.push(`  --font-weight-${key}: ${value};`);
  });
  
  // Typography - Line Heights
  Object.entries(typography.lineHeight).forEach(([key, value]) => {
    lines.push(`  --line-height-${key}: ${value};`);
  });
  
  // Typography - Letter Spacing
  Object.entries(typography.letterSpacing).forEach(([key, value]) => {
    lines.push(`  --letter-spacing-${key}: ${value};`);
  });
  
  // Shadows
  lines.push(`  --shadow-none: ${shadows.none};`);
  lines.push(`  --shadow-sm: ${shadows.sm};`);
  lines.push(`  --shadow-md: ${shadows.md};`);
  lines.push(`  --shadow-lg: ${shadows.lg};`);
  lines.push(`  --shadow-xl: ${shadows.xl};`);
  lines.push(`  --shadow-ring-default: ${shadows.ring.default};`);
  lines.push(`  --shadow-ring-offset: ${shadows.ring.offset};`);
  
  // Border Radius
  Object.entries(radius).forEach(([key, value]) => {
    lines.push(`  --radius-${key}: ${value};`);
  });
  
  lines.push('}');
  return lines.join('\n');
}
