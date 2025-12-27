# Phase 2: Tailwind & Global Styles Update

## Objective
Update Tailwind configuration and global CSS to use the new enterprise tokens. Remove all glow utilities and gradient patterns.

## Files to Modify

### 1. tsx/apps/web/tailwind.config.ts
Update to use new token structure:
- Map `primary` to `tokens.colors.primary`
- Add `interactive` mapping to `tokens.colors.interactive`
- Map `accent` to `tokens.colors.accent`
- Add `neutral` mapping to `tokens.colors.neutral`
- Update `background`, `text`, `border` mappings
- Remove `glow-primary` and `glow-accent` shadow utilities
- Add `ring` shadow utilities for focus states
- Remove `display` font family
- Add `componentSpacing` if useful

### 2. tsx/apps/web/src/app/globals.css
Update CSS variables:
- Change `--background` from `#09090b` to `#0F172A`
- Change `--foreground` from `#fafafa` to `#F8FAFC`
- Update scrollbar colors to slate palette
- Remove any gradient or glow CSS if present

## Expected Tailwind Config Structure

```typescript
import type { Config } from 'tailwindcss';
import { tokens } from '@streamer-studio/ui/tokens';

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
        // NO display font
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
        // NO glow-primary or glow-accent
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
```

## Expected globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0F172A;
  --foreground: #F8FAFC;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
}

/* Custom scrollbar for dark theme */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1E293B;
}

::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64748B;
}

/* Hide scrollbar utility */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Snap scroll */
.snap-x {
  scroll-snap-type: x mandatory;
}

.snap-center {
  scroll-snap-align: center;
}

.snap-mandatory {
  scroll-snap-type: x mandatory;
}
```

## Acceptance Criteria
- [ ] Tailwind config updated with new color mappings
- [ ] `interactive` and `neutral` color scales added
- [ ] `info` semantic color added
- [ ] `glow-primary` and `glow-accent` shadows REMOVED
- [ ] `ring` and `ring-offset` shadows added
- [ ] `display` font family REMOVED
- [ ] globals.css updated with slate-based colors
- [ ] No TypeScript errors
- [ ] No build errors

## Verification
After implementation:
1. Run `npx tsc --noEmit` in tsx/apps/web
2. Verify no references to removed utilities cause errors
