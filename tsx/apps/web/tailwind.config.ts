import type { Config } from 'tailwindcss';
import { tokens } from '@aurastream/ui/tokens';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary - Teal (Premium spec)
        primary: tokens.colors.primary,
        // Interactive - Teal aligned
        interactive: tokens.colors.interactive,
        // Accent - Warm coral
        accent: tokens.colors.accent,
        // Neutral - Premium slate/charcoal
        neutral: tokens.colors.neutral,
        // Semantic colors
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        error: tokens.colors.error,
        info: tokens.colors.info,
        // Background
        background: tokens.colors.background,
        // Text
        text: tokens.colors.text,
        // Border
        border: tokens.colors.border,
        // Tints
        tint: tokens.colors.tint,
      },
      fontFamily: {
        sans: [tokens.typography.fontFamily.sans],
        mono: [tokens.typography.fontFamily.mono],
      },
      fontSize: tokens.typography.fontSize,
      fontWeight: {
        normal: tokens.typography.fontWeight.normal,
        medium: tokens.typography.fontWeight.medium,
        semibold: tokens.typography.fontWeight.semibold,
        bold: tokens.typography.fontWeight.bold,
        extrabold: tokens.typography.fontWeight.extrabold,
      },
      lineHeight: tokens.typography.lineHeight,
      letterSpacing: tokens.typography.letterSpacing,
      spacing: tokens.spacing,
      borderRadius: tokens.radius,
      boxShadow: {
        none: tokens.shadows.none,
        sm: tokens.shadows.sm,
        md: tokens.shadows.md,
        lg: tokens.shadows.lg,
        xl: tokens.shadows.xl,
        '2xl': tokens.shadows['2xl'],
        'ring': tokens.shadows.ring.default,
        'ring-offset': tokens.shadows.ring.offset,
        'ring-subtle': tokens.shadows.ring.subtle,
        'inset-subtle': tokens.shadows.inset.subtle,
        'inset-strong': tokens.shadows.inset.strong,
      },
      zIndex: {
        base: '0',
        dropdown: String(tokens.zIndex.dropdown),
        sticky: String(tokens.zIndex.sticky),
        modal: String(tokens.zIndex.modal),
        popover: String(tokens.zIndex.popover),
        tooltip: String(tokens.zIndex.tooltip),
        toast: String(tokens.zIndex.toast),
      },
      transitionDuration: {
        quick: tokens.animations.duration.quick,
        fast: tokens.animations.duration.fast,
        normal: tokens.animations.duration.normal,
        slow: tokens.animations.duration.slow,
        slower: tokens.animations.duration.slower,
      },
      transitionTimingFunction: {
        standard: tokens.animations.easing.standard,
        'ease-in': tokens.animations.easing.in,
        'ease-out': tokens.animations.easing.out,
        'ease-in-out': tokens.animations.easing.inOut,
        spring: tokens.animations.easing.spring,
      },
      animation: {
        'fade-in': 'fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-up': 'slide-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-down': 'slide-in-down 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-up': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-down': {
          from: { opacity: '0', transform: 'translateY(-100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(33, 128, 141, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(33, 128, 141, 0.5)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
