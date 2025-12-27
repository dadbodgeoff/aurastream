# Design System Rebrand - Design Document

## Design Tokens Specification

### 1. Color Palette

#### Primary Brand Colors
```
primary.900: #0F1D2F  // Darkest
primary.800: #152A42
primary.700: #1E3A5F  // Main brand color
primary.600: #264A7A
primary.500: #2E5A95
primary.400: #4A7AB8
primary.300: #7A9FCC
primary.200: #A8C4E0
primary.100: #D4E2F0
primary.50:  #EBF2F8  // Lightest
```

#### Interactive Colors (Links, Buttons)
```
interactive.900: #1E3A8A
interactive.800: #1E40AF
interactive.700: #1D4ED8
interactive.600: #2563EB  // Main interactive
interactive.500: #3B82F6  // Hover
interactive.400: #60A5FA
interactive.300: #93C5FD
interactive.200: #BFDBFE
interactive.100: #DBEAFE
interactive.50:  #EFF6FF
```

#### Accent Colors (Highlights, Premium)
```
accent.900: #78350F
accent.800: #92400E
accent.700: #B45309
accent.600: #D97706  // Main accent
accent.500: #F59E0B  // Highlight
accent.400: #FBBF24
accent.300: #FCD34D
accent.200: #FDE68A
accent.100: #FEF3C7
accent.50:  #FFFBEB
```

#### Neutral Scale (Slate-based)
```
neutral.950: #0F172A  // Background base
neutral.900: #1E293B  // Surface
neutral.800: #334155  // Elevated
neutral.700: #475569  // Card/border strong
neutral.600: #64748B  // Muted text
neutral.500: #94A3B8  // Secondary text
neutral.400: #CBD5E1  // Tertiary
neutral.300: #E2E8F0  // Border light
neutral.200: #F1F5F9  // Surface light
neutral.100: #F8FAFC  // Background light
neutral.50:  #FFFFFF  // Primary text (dark mode)
```

#### Semantic Colors
```
success.light:  #86EFAC
success.main:   #22C55E
success.dark:   #16A34A

warning.light:  #FDE047
warning.main:   #EAB308
warning.dark:   #CA8A04

error.light:    #FCA5A5
error.main:     #EF4444
error.dark:     #DC2626

info.light:     #93C5FD
info.main:      #3B82F6
info.dark:      #2563EB
```

#### Background (Dark Mode)
```
background.base:     #0F172A  // Page background
background.surface:  #1E293B  // Cards, panels
background.elevated: #334155  // Modals, dropdowns
background.overlay:  rgba(15, 23, 42, 0.8)  // Backdrop
```

#### Text (Dark Mode)
```
text.primary:   #F8FAFC  // Main content
text.secondary: #94A3B8  // Supporting text
text.tertiary:  #64748B  // Muted/placeholder
text.disabled:  #475569  // Disabled state
text.inverse:   #0F172A  // On light backgrounds
```

#### Border
```
border.default: #334155  // Standard borders
border.subtle:  #1E293B  // Subtle dividers
border.strong:  #475569  // Emphasized borders
border.focus:   #2563EB  // Focus rings
```

---

### 2. Typography

#### Font Families
```
fontFamily.sans:  "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
fontFamily.mono:  "JetBrains Mono", "Fira Code", Consolas, monospace
```

#### Font Sizes
```
fontSize.xs:    0.75rem   // 12px
fontSize.sm:    0.875rem  // 14px
fontSize.base:  1rem      // 16px
fontSize.lg:    1.125rem  // 18px
fontSize.xl:    1.25rem   // 20px
fontSize.2xl:   1.5rem    // 24px
fontSize.3xl:   1.875rem  // 30px
fontSize.4xl:   2.25rem   // 36px
fontSize.5xl:   3rem      // 48px
fontSize.6xl:   3.75rem   // 60px
```

#### Font Weights
```
fontWeight.normal:    400
fontWeight.medium:    500
fontWeight.semibold:  600
fontWeight.bold:      700
```

#### Line Heights
```
lineHeight.none:    1
lineHeight.tight:   1.25
lineHeight.snug:    1.375
lineHeight.normal:  1.5
lineHeight.relaxed: 1.625
lineHeight.loose:   2
```

#### Letter Spacing
```
letterSpacing.tighter: -0.05em
letterSpacing.tight:   -0.025em
letterSpacing.normal:  0
letterSpacing.wide:    0.025em
letterSpacing.wider:   0.05em
letterSpacing.widest:  0.1em
```

#### Typography Presets
```typescript
// Headings
h1: { size: '3xl', weight: 'bold', lineHeight: 'tight', letterSpacing: 'tight' }
h2: { size: '2xl', weight: 'semibold', lineHeight: 'tight', letterSpacing: 'tight' }
h3: { size: 'xl', weight: 'semibold', lineHeight: 'snug', letterSpacing: 'normal' }
h4: { size: 'lg', weight: 'semibold', lineHeight: 'snug', letterSpacing: 'normal' }
h5: { size: 'base', weight: 'semibold', lineHeight: 'normal', letterSpacing: 'normal' }
h6: { size: 'sm', weight: 'semibold', lineHeight: 'normal', letterSpacing: 'wide' }

// Body
bodyLarge:  { size: 'lg', weight: 'normal', lineHeight: 'relaxed' }
bodyBase:   { size: 'base', weight: 'normal', lineHeight: 'normal' }
bodySmall:  { size: 'sm', weight: 'normal', lineHeight: 'normal' }

// UI
label:      { size: 'sm', weight: 'medium', lineHeight: 'none', letterSpacing: 'wide' }
caption:    { size: 'xs', weight: 'normal', lineHeight: 'normal' }
overline:   { size: 'xs', weight: 'semibold', lineHeight: 'none', letterSpacing: 'widest', transform: 'uppercase' }
```

---

### 3. Spacing

#### Base Unit: 4px

```
spacing.0:   0
spacing.px:  1px
spacing.0.5: 0.125rem  // 2px
spacing.1:   0.25rem   // 4px
spacing.1.5: 0.375rem  // 6px
spacing.2:   0.5rem    // 8px
spacing.2.5: 0.625rem  // 10px
spacing.3:   0.75rem   // 12px
spacing.3.5: 0.875rem  // 14px
spacing.4:   1rem      // 16px
spacing.5:   1.25rem   // 20px
spacing.6:   1.5rem    // 24px
spacing.7:   1.75rem   // 28px
spacing.8:   2rem      // 32px
spacing.9:   2.25rem   // 36px
spacing.10:  2.5rem    // 40px
spacing.11:  2.75rem   // 44px
spacing.12:  3rem      // 48px
spacing.14:  3.5rem    // 56px
spacing.16:  4rem      // 64px
spacing.20:  5rem      // 80px
spacing.24:  6rem      // 96px
spacing.28:  7rem      // 112px
spacing.32:  8rem      // 128px
```

#### Component Spacing Standards
```
// Buttons
button.paddingX: spacing.4  // 16px
button.paddingY: spacing.2.5  // 10px
button.gap: spacing.2  // 8px (icon + text)

// Inputs
input.paddingX: spacing.3  // 12px
input.paddingY: spacing.2.5  // 10px

// Cards
card.padding: spacing.6  // 24px
card.gap: spacing.4  // 16px

// Modals
modal.padding: spacing.6  // 24px
modal.headerGap: spacing.4  // 16px

// Layout
layout.pageMargin: spacing.6  // 24px
layout.sectionGap: spacing.8  // 32px
layout.containerMax: 1280px
```

---

### 4. Border & Radius

#### Border Radius
```
radius.none: 0
radius.sm:   0.25rem  // 4px
radius.md:   0.375rem // 6px - DEFAULT
radius.lg:   0.5rem   // 8px - Cards
radius.xl:   0.75rem  // 12px
radius.2xl:  1rem     // 16px
radius.full: 9999px   // Pills/badges only
```

#### Border Width
```
borderWidth.0:       0
borderWidth.DEFAULT: 1px
borderWidth.2:       2px
```

---

### 5. Shadows

#### Elevation (No Glows)
```
shadow.none: none
shadow.sm:   0 1px 2px 0 rgba(0, 0, 0, 0.05)
shadow.md:   0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)
shadow.lg:   0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)
shadow.xl:   0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)
```

#### Focus Ring
```
ring.default: 0 0 0 2px #2563EB
ring.offset:  0 0 0 2px #0F172A, 0 0 0 4px #2563EB
```

---

### 6. Z-Index Scale

```
zIndex.hide:     -1
zIndex.base:     0
zIndex.dropdown: 1000
zIndex.sticky:   1100
zIndex.modal:    1200
zIndex.popover:  1300
zIndex.tooltip:  1400
zIndex.toast:    1500
```

---

### 7. Breakpoints

```
breakpoints.sm:  640px
breakpoints.md:  768px
breakpoints.lg:  1024px
breakpoints.xl:  1280px
breakpoints.2xl: 1536px
```

---

### 8. Animation

#### Duration
```
duration.fast:    150ms
duration.normal:  200ms
duration.slow:    300ms
duration.slower:  500ms
```

#### Easing
```
easing.default: cubic-bezier(0.4, 0, 0.2, 1)
easing.in:      cubic-bezier(0.4, 0, 1, 1)
easing.out:     cubic-bezier(0, 0, 0.2, 1)
easing.inOut:   cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Component Token Examples

### Button Variants
```typescript
button: {
  primary: {
    bg: 'interactive.600',
    bgHover: 'interactive.500',
    bgActive: 'interactive.700',
    text: 'neutral.50',
    border: 'transparent',
  },
  secondary: {
    bg: 'neutral.800',
    bgHover: 'neutral.700',
    bgActive: 'neutral.900',
    text: 'text.primary',
    border: 'border.default',
  },
  ghost: {
    bg: 'transparent',
    bgHover: 'neutral.800',
    bgActive: 'neutral.700',
    text: 'text.secondary',
    border: 'transparent',
  },
  destructive: {
    bg: 'error.dark',
    bgHover: 'error.main',
    bgActive: '#B91C1C',
    text: 'neutral.50',
    border: 'transparent',
  },
}
```

### Input States
```typescript
input: {
  default: {
    bg: 'background.surface',
    border: 'border.default',
    text: 'text.primary',
    placeholder: 'text.tertiary',
  },
  focus: {
    border: 'border.focus',
    ring: 'ring.default',
  },
  error: {
    border: 'error.main',
    ring: '0 0 0 2px rgba(239, 68, 68, 0.2)',
  },
  disabled: {
    bg: 'neutral.900',
    text: 'text.disabled',
    border: 'border.subtle',
  },
}
```

### Card Variants
```typescript
card: {
  default: {
    bg: 'background.surface',
    border: 'border.subtle',
    radius: 'radius.lg',
    shadow: 'shadow.none',
  },
  elevated: {
    bg: 'background.elevated',
    border: 'border.default',
    radius: 'radius.lg',
    shadow: 'shadow.md',
  },
  interactive: {
    bg: 'background.surface',
    bgHover: 'background.elevated',
    border: 'border.default',
    radius: 'radius.lg',
    shadow: 'shadow.sm',
    shadowHover: 'shadow.md',
  },
}
```

---

## Migration Strategy

### Phase 1: Update Token Files
1. Replace `tsx/packages/ui/src/tokens/colors.ts` with new palette
2. Update typography, spacing, shadows, animations tokens
3. Add new component tokens file

### Phase 2: Update Tailwind Config
1. Update `tsx/apps/web/tailwind.config.ts` to use new tokens
2. Verify all color references work

### Phase 3: Update Mobile Theme
1. Create `tsx/packages/ui/src/tokens/native.ts` for React Native
2. Delete `tsx/apps/mobile/src/components/coach/constants.ts`
3. Update mobile components to import from shared tokens

### Phase 4: Component Updates
1. Update all components using old colors
2. Remove gradient/glow CSS classes
3. Update shadow utilities

### Phase 5: Verification
1. Visual regression testing
2. Cross-platform consistency check
3. Accessibility contrast verification
