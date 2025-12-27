/**
 * Mock for @streamer-studio/ui
 * Enterprise design system colors (navy, blue, amber, slate)
 */

export const colors = {
  // Primary (Navy)
  primary: {
    50: '#EBF2F8',
    100: '#D4E2F0',
    200: '#A8C4E0',
    300: '#7A9FCC',
    400: '#4A7AB8',
    500: '#2E5A95',
    600: '#264A7A',
    700: '#1E3A5F',
    800: '#152A42',
    900: '#0F1D2F',
  },
  // Interactive (Blue)
  interactive: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  // Accent (Amber)
  accent: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  // Neutral (Slate)
  neutral: {
    50: '#FFFFFF',
    100: '#F8FAFC',
    200: '#F1F5F9',
    300: '#E2E8F0',
    400: '#CBD5E1',
    500: '#94A3B8',
    600: '#64748B',
    700: '#475569',
    800: '#334155',
    900: '#1E293B',
    950: '#0F172A',
  },
  // Semantic
  success: {
    light: '#86efac',
    main: '#22c55e',
    dark: '#16a34a',
  },
  warning: {
    light: '#fde047',
    main: '#eab308',
    dark: '#ca8a04',
  },
  error: {
    light: '#fca5a5',
    main: '#ef4444',
    dark: '#dc2626',
  },
  info: {
    light: '#93C5FD',
    main: '#3B82F6',
    dark: '#1D4ED8',
  },
  // Background
  background: {
    base: '#0F172A',
    surface: '#1E293B',
    elevated: '#334155',
    overlay: 'rgba(15, 23, 42, 0.8)',
  },
  // Text
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    tertiary: '#64748B',
    disabled: '#475569',
    inverse: '#0F172A',
  },
  // Border
  border: {
    default: '#334155',
    subtle: '#1E293B',
    strong: '#475569',
    focus: '#2563EB',
  },
};

export const spacing = {
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
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
};

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  ring: {
    default: '0 0 0 2px #2563EB',
    offset: '0 0 0 2px #0F172A, 0 0 0 4px #2563EB',
  },
};

export const tokens = {
  colors,
  spacing,
  shadows,
};
