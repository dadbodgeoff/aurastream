/**
 * Streamer Studio Color Tokens
 * Enterprise Design System
 * 
 * Color Palette - Professional enterprise palette with navy primary,
 * blue interactive, amber accent, and slate neutrals
 */

export const colors = {
  // Primary - Navy Blue (Brand identity)
  primary: {
    50: '#EBF2F8',
    100: '#D4E2F0',
    200: '#A8C4E0',
    300: '#7A9FCC',
    400: '#4A7AB8',
    500: '#2E5A95',
    600: '#264A7A',
    700: '#1E3A5F',  // Main brand
    800: '#152A42',
    900: '#0F1D2F',
  },
  
  // Interactive - Blue (Actions/Links)
  interactive: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',  // Hover
    600: '#2563EB',  // Main
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Accent - Amber (Highlights/CTAs)
  accent: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',  // Highlight
    600: '#D97706',  // Main
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  
  // Neutral - Slate (UI elements)
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
  
  // Semantic Colors
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
  
  // Backgrounds (Dark Theme)
  background: {
    base: '#0F172A',      // Slate 950
    surface: '#1E293B',   // Slate 900
    elevated: '#334155',  // Slate 800
    overlay: 'rgba(15, 23, 42, 0.8)',
  },
  
  // Text
  text: {
    primary: '#F8FAFC',   // Slate 100
    secondary: '#94A3B8', // Slate 500
    tertiary: '#64748B',  // Slate 600
    disabled: '#475569',  // Slate 700
    inverse: '#0F172A',   // Slate 950
  },
  
  // Borders
  border: {
    default: '#334155',   // Slate 800
    subtle: '#1E293B',    // Slate 900
    strong: '#475569',    // Slate 700
    focus: '#2563EB',     // Interactive 600
  },
} as const;

// Type exports for TypeScript
export type Colors = typeof colors;
export type PrimaryColor = keyof typeof colors.primary;
export type InteractiveColor = keyof typeof colors.interactive;
export type AccentColor = keyof typeof colors.accent;
export type NeutralColor = keyof typeof colors.neutral;
export type SemanticColor = 'success' | 'warning' | 'error' | 'info';
export type BackgroundColor = keyof typeof colors.background;
export type TextColor = keyof typeof colors.text;
export type BorderColor = keyof typeof colors.border;
