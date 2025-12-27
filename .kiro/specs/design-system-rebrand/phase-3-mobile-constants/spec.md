# Phase 3: Mobile Constants Migration

## Objective
Replace the duplicate mobile color constants with imports from the shared token package. Create a React Native-compatible theme export.

## Files to Modify

### 1. tsx/packages/ui/src/tokens/native.ts (NEW FILE)
Create a React Native-compatible export of tokens:
- Flat color object for StyleSheet use
- Numeric spacing values (without rem units)
- Typography values compatible with React Native

### 2. tsx/apps/mobile/src/components/coach/constants.ts
Replace hardcoded colors with imports from shared tokens:

CURRENT (to be replaced):
```typescript
export const colors = {
  backgroundBase: '#0D0D12',
  backgroundSurface: '#1A1A24',
  backgroundElevated: '#252532',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textTertiary: '#6B6B7B',
  primary: '#8B5CF6',        // PURPLE - MUST REMOVE
  primaryHover: '#7C3AED',   // PURPLE - MUST REMOVE
  accent: '#00D9FF',         // CYAN - MUST REMOVE
  error: '#EF4444',
  success: '#22C55E',
  border: '#3F3F46',
} as const;
```

NEW (using shared tokens):
```typescript
import { colors as tokenColors } from '@streamer-studio/ui/tokens';

export const colors = {
  backgroundBase: tokenColors.background.base,
  backgroundSurface: tokenColors.background.surface,
  backgroundElevated: tokenColors.background.elevated,
  textPrimary: tokenColors.text.primary,
  textSecondary: tokenColors.text.secondary,
  textTertiary: tokenColors.text.tertiary,
  primary: tokenColors.interactive[600],      // Blue, not purple
  primaryHover: tokenColors.interactive[500], // Blue hover
  accent: tokenColors.accent[600],            // Amber, not cyan
  error: tokenColors.error.main,
  success: tokenColors.success.main,
  border: tokenColors.border.default,
} as const;

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
```

### 3. tsx/apps/mobile/__mocks__/@streamer-studio/ui.ts
Update mock to match new token structure for tests.

## native.ts Content

```typescript
/**
 * React Native compatible token exports
 * Use these for StyleSheet.create() in mobile apps
 */

import { colors, typography, spacing, shadows, radius } from './index';

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
```

## Acceptance Criteria
- [ ] native.ts created with React Native-compatible exports
- [ ] constants.ts updated to import from shared tokens
- [ ] No hardcoded purple colors (#8B5CF6, #7C3AED)
- [ ] No hardcoded cyan colors (#00D9FF)
- [ ] Mock file updated
- [ ] Mobile app TypeScript compiles

## Verification
After implementation:
1. Run `npx tsc --noEmit` in tsx/apps/mobile
2. Grep for any remaining purple/cyan hex codes
