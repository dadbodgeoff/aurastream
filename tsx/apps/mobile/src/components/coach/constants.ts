/**
 * Design tokens and constants for Prompt Coach.
 * Uses shared tokens from @aurastream/ui for consistency.
 * @module coach/constants
 */

import { colors as tokenColors } from '@aurastream/ui/tokens';

export const colors = {
  backgroundBase: tokenColors.background.base,
  backgroundSurface: tokenColors.background.surface,
  backgroundElevated: tokenColors.background.elevated,
  textPrimary: tokenColors.text.primary,
  textSecondary: tokenColors.text.secondary,
  textTertiary: tokenColors.text.tertiary,
  primary: tokenColors.interactive[600],      // Blue (enterprise)
  primaryHover: tokenColors.interactive[500], // Blue hover
  accent: tokenColors.accent[600],            // Amber (enterprise)
  error: tokenColors.error.main,
  success: tokenColors.success.main,
  border: tokenColors.border.default,
} as const;

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
