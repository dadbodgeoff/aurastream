/**
 * AuraStream Color Tokens
 * Premium Enterprise Design System
 * 
 * Based on Premium UI Spec - Teal primary, professional neutrals
 * Updated: December 2025
 * 
 * NOTE: This is a DARK THEME app. Text colors should be light on dark backgrounds.
 */

export const colors = {
  // Primary - Teal (Brand identity) - Premium spec primary
  primary: {
    50: '#E6F4F5',
    100: '#CCE9EB',
    200: '#99D3D7',
    300: '#66BDC3',
    400: '#33A7AF',
    500: '#21808D',  // Main brand - Premium spec primary
    600: '#1B6A75',  // Hover state
    700: '#15545D',  // Active state
    800: '#0F3E45',
    900: '#09282D',
  },
  
  // Interactive - Teal (Actions/Links) - Aligned with primary
  interactive: {
    50: '#E6F4F5',
    100: '#CCE9EB',
    200: '#99D3D7',
    300: '#32B8C6',  // Light variant for dark mode
    400: '#33A7AF',
    500: '#21808D',  // Main interactive
    600: '#247380',  // Hover
    700: '#1A7373',  // Deep active
    800: '#15545D',
    900: '#09282D',
  },
  
  // Accent - Warm Coral/Orange (Highlights/CTAs) - Premium warmth
  accent: {
    50: '#FEF3ED',
    100: '#FDE7DB',
    200: '#FBCFB7',
    300: '#F9B793',
    400: '#F79F6F',
    500: '#A84F2F',  // Warning tone from premium spec
    600: '#8A4127',
    700: '#6C331F',
    800: '#4E2517',
    900: '#30170F',
  },
  
  // Neutral - Premium Slate/Charcoal (UI elements)
  neutral: {
    50: '#FCFCF9',   // Cream - Premium spec main background
    100: '#F5F5F5',  // Off-white - Premium spec surfaces
    200: '#E8E8E8',
    300: '#A7A9A9',  // Light - Subtle borders
    400: '#777C7C',  // Medium - Muted text
    500: '#62756E',  // Slate info color
    600: '#475569',
    700: '#1F2121',  // Darker - Modal overlays
    800: '#262828',  // Dark - Surface in dark mode
    900: '#131B3B',  // Charcoal - Text on light backgrounds
    950: '#0F172A',  // Deep dark
  },
  
  // Semantic Colors - Premium spec aligned
  success: {
    light: '#86efac',
    main: '#218081',  // Premium spec success (teal-green)
    dark: '#16a34a',
  },
  warning: {
    light: '#fde047',
    main: '#A84F2F',  // Premium spec warning (warm orange)
    dark: '#92400E',
  },
  error: {
    light: '#fca5a5',
    main: '#C0152F',  // Premium spec error (deep red)
    dark: '#9f1239',
  },
  info: {
    light: '#99D3D7',
    main: '#62756E',  // Premium spec info (slate)
    dark: '#475569',
  },
  
  // Backgrounds (Dark Theme) - Premium spec aligned
  background: {
    default: '#1F2121',   // Dark mode base (main app background)
    base: '#1F2121',      // Dark mode base
    surface: '#262828',   // Dark mode surface (cards)
    elevated: '#334155',  // Elevated surfaces
    overlay: 'rgba(31, 33, 33, 0.8)',  // Modal overlay
  },
  
  // Text (Dark Theme) - Light text on dark backgrounds
  text: {
    primary: '#FCFCF9',   // Cream - main text on dark backgrounds
    secondary: '#A7A9A9', // Light gray - secondary text
    tertiary: '#777C7C',  // Medium gray - helper text
    muted: '#62756E',     // Slate - very muted text
    disabled: 'rgba(167, 169, 169, 0.4)',  // Disabled state
    inverse: '#131B3B',   // Charcoal for light backgrounds
  },
  
  // Borders - Premium spec aligned
  border: {
    default: 'rgba(167, 169, 169, 0.20)',  // Subtle borders for dark mode
    subtle: 'rgba(119, 124, 124, 0.30)', // Dark mode dividers
    strong: '#777C7C',
    focus: '#21808D',     // Primary color for focus
  },
  
  // Background tints (low-opacity overlays for visual interest)
  tint: {
    blue: 'rgba(59, 130, 246, 0.08)',
    yellow: 'rgba(245, 158, 11, 0.08)',
    green: 'rgba(34, 197, 94, 0.08)',
    red: 'rgba(239, 68, 68, 0.08)',
    purple: 'rgba(147, 51, 234, 0.08)',
    teal: 'rgba(33, 128, 141, 0.08)',
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
export type TintColor = keyof typeof colors.tint;
