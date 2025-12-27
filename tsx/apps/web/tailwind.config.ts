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
        primary: tokens.colors.primary,
        interactive: tokens.colors.interactive,
        accent: tokens.colors.accent,
        neutral: tokens.colors.neutral,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        error: tokens.colors.error,
        info: tokens.colors.info,
        background: tokens.colors.background,
        text: tokens.colors.text,
        border: tokens.colors.border,
      },
      fontFamily: {
        sans: [tokens.typography.fontFamily.sans],
        mono: [tokens.typography.fontFamily.mono],
      },
      spacing: tokens.spacing,
      borderRadius: tokens.radius,
      boxShadow: {
        none: tokens.shadows.none,
        sm: tokens.shadows.sm,
        md: tokens.shadows.md,
        lg: tokens.shadows.lg,
        xl: tokens.shadows.xl,
        'ring': tokens.shadows.ring.default,
        'ring-offset': tokens.shadows.ring.offset,
      },
      zIndex: {
        dropdown: String(tokens.zIndex.dropdown),
        sticky: String(tokens.zIndex.sticky),
        modal: String(tokens.zIndex.modal),
        popover: String(tokens.zIndex.popover),
        tooltip: String(tokens.zIndex.tooltip),
        toast: String(tokens.zIndex.toast),
      },
    },
  },
  plugins: [],
};

export default config;
