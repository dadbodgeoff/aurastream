# Phase 4: Web Pages Update

## Objective
Update all web pages to use the new enterprise design system. Remove all gradients, glows, and purple/cyan color references.

## Scope
All pages in tsx/apps/web/src/app/

## Color Class Replacements

### Primary Colors (Purple → Navy/Interactive)
- `bg-primary-500` → `bg-interactive-600`
- `bg-primary-600` → `bg-interactive-700`
- `text-primary-500` → `text-interactive-600`
- `text-primary-400` → `text-interactive-500`
- `border-primary-500` → `border-interactive-600`
- `hover:bg-primary-600` → `hover:bg-interactive-500`
- `focus:ring-primary-500` → `focus:ring-interactive-600`

### Accent Colors (Cyan → Amber)
- `bg-accent-500` → `bg-accent-600`
- `text-accent-500` → `text-accent-600`
- `text-accent-400` → `text-accent-500`

### Background Colors (Zinc → Slate)
- `bg-zinc-950` or `bg-[#09090b]` → `bg-background-base`
- `bg-zinc-900` or `bg-[#18181b]` → `bg-background-surface`
- `bg-zinc-800` or `bg-[#27272a]` → `bg-background-elevated`

### Text Colors
- `text-zinc-50` → `text-text-primary`
- `text-zinc-400` → `text-text-secondary`
- `text-zinc-500` → `text-text-tertiary`

### Border Colors
- `border-zinc-700` → `border-border-default`
- `border-zinc-800` → `border-border-subtle`

## Patterns to Remove

### Gradients
- `bg-gradient-to-r from-primary-500 to-primary-600` → `bg-interactive-600`
- `bg-gradient-to-r from-primary-600 to-accent-500` → `bg-interactive-600`
- Any `bg-gradient-*` with primary/accent → solid color

### Glow Shadows
- `shadow-glow-primary` → `shadow-md`
- `shadow-glow-accent` → `shadow-md`

### Hardcoded Hex Colors
- `#a855f7` → use `text-interactive-600` or `bg-interactive-600`
- `#8B5CF6` → use `text-interactive-600` or `bg-interactive-600`
- `#06b6d4` → use `text-accent-600` or `bg-accent-600`
- `#00D9FF` → use `text-accent-600` or `bg-accent-600`

## Files to Update

### High Priority (Landing & Auth)
1. tsx/apps/web/src/app/page.tsx - Landing page
2. tsx/apps/web/src/app/layout.tsx - Root layout
3. tsx/apps/web/src/app/(auth)/login/page.tsx
4. tsx/apps/web/src/app/(auth)/signup/page.tsx
5. tsx/apps/web/src/app/(auth)/forgot-password/page.tsx
6. tsx/apps/web/src/app/(auth)/reset-password/page.tsx

### Dashboard Pages
7. tsx/apps/web/src/app/dashboard/layout.tsx
8. tsx/apps/web/src/app/dashboard/page.tsx
9. tsx/apps/web/src/app/dashboard/brand-kits/page.tsx
10. tsx/apps/web/src/app/dashboard/brand-kits/new/page.tsx
11. tsx/apps/web/src/app/dashboard/brand-kits/[id]/page.tsx
12. tsx/apps/web/src/app/dashboard/assets/page.tsx
13. tsx/apps/web/src/app/dashboard/generate/page.tsx
14. tsx/apps/web/src/app/dashboard/twitch/page.tsx
15. tsx/apps/web/src/app/dashboard/settings/page.tsx

### Error Pages
16. tsx/apps/web/src/app/error.tsx
17. tsx/apps/web/src/app/not-found.tsx

## Acceptance Criteria
- [ ] No `bg-gradient-*` with primary/accent colors
- [ ] No `shadow-glow-*` classes
- [ ] No hardcoded purple hex codes (#a855f7, #8B5CF6, #9333ea, #7c3aed)
- [ ] No hardcoded cyan hex codes (#06b6d4, #00D9FF, #22d3ee)
- [ ] All primary actions use `interactive-600` (blue)
- [ ] All accent/highlight elements use `accent-600` (amber)
- [ ] All backgrounds use `background-*` tokens
- [ ] All text uses `text-*` tokens
- [ ] TypeScript compiles without errors

## Verification
After each file update:
1. Grep for remaining purple/cyan colors
2. Grep for gradient classes
3. Grep for glow shadows
4. Run `npx tsc --noEmit`
