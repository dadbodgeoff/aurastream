/**
 * React Native compatible token exports
 * Use these for StyleSheet.create() in mobile apps
 */

import { colors, typography } from './index';

/**
 * Flat color object for React Native StyleSheet
 * All values are hex strings or rgba strings
 */
export const nativeColors = {
  // Primary (Navy)
  primary50: colors.primary[50],
  primary100: colors.primary[100],
  primary200: colors.primary[200],
  primary300: colors.primary[300],
  primary400: colors.primary[400],
  primary500: colors.primary[500],
  primary600: colors.primary[600],
  primary700: colors.primary[700],
  primary800: colors.primary[800],
  primary900: colors.primary[900],
  
  // Interactive (Blue)
  interactive50: colors.interactive[50],
  interactive100: colors.interactive[100],
  interactive200: colors.interactive[200],
  interactive300: colors.interactive[300],
  interactive400: colors.interactive[400],
  interactive500: colors.interactive[500],
  interactive600: colors.interactive[600],
  interactive700: colors.interactive[700],
  interactive800: colors.interactive[800],
  interactive900: colors.interactive[900],
  
  // Accent (Amber)
  accent50: colors.accent[50],
  accent100: colors.accent[100],
  accent200: colors.accent[200],
  accent300: colors.accent[300],
  accent400: colors.accent[400],
  accent500: colors.accent[500],
  accent600: colors.accent[600],
  accent700: colors.accent[700],
  accent800: colors.accent[800],
  accent900: colors.accent[900],
  
  // Neutral (Slate)
  neutral50: colors.neutral[50],
  neutral100: colors.neutral[100],
  neutral200: colors.neutral[200],
  neutral300: colors.neutral[300],
  neutral400: colors.neutral[400],
  neutral500: colors.neutral[500],
  neutral600: colors.neutral[600],
  neutral700: colors.neutral[700],
  neutral800: colors.neutral[800],
  neutral900: colors.neutral[900],
  neutral950: colors.neutral[950],
  
  // Semantic
  successLight: colors.success.light,
  successMain: colors.success.main,
  successDark: colors.success.dark,
  warningLight: colors.warning.light,
  warningMain: colors.warning.main,
  warningDark: colors.warning.dark,
  errorLight: colors.error.light,
  errorMain: colors.error.main,
  errorDark: colors.error.dark,
  infoLight: colors.info.light,
  infoMain: colors.info.main,
  infoDark: colors.info.dark,
  
  // Background
  backgroundBase: colors.background.base,
  backgroundSurface: colors.background.surface,
  backgroundElevated: colors.background.elevated,
  
  // Text
  textPrimary: colors.text.primary,
  textSecondary: colors.text.secondary,
  textTertiary: colors.text.tertiary,
  textDisabled: colors.text.disabled,
  textInverse: colors.text.inverse,
  
  // Border
  borderDefault: colors.border.default,
  borderSubtle: colors.border.subtle,
  borderStrong: colors.border.strong,
  borderFocus: colors.border.focus,
} as const;

/**
 * Numeric spacing values for React Native (in pixels)
 */
export const nativeSpacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
} as const;

/**
 * Numeric border radius values for React Native (in pixels)
 */
export const nativeRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

/**
 * Typography values for React Native
 */
export const nativeTypography = {
  fontFamily: {
    sans: 'Inter',
    mono: 'JetBrains Mono',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
  },
} as const;

export type NativeColors = typeof nativeColors;
export type NativeSpacing = typeof nativeSpacing;
export type NativeRadius = typeof nativeRadius;
export type NativeTypography = typeof nativeTypography;
