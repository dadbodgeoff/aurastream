# Phase 1: Core Token Updates

## Objective
Replace all design tokens in `@streamer-studio/ui/tokens` with the new enterprise palette. This is the foundation — all other phases depend on this.

## Files to Modify

### 1. tsx/packages/ui/src/tokens/colors.ts
Replace entire file with new enterprise color palette:
- Primary: Navy blue scale (#0F1D2F to #EBF2F8)
- Interactive: Blue scale (#1E3A8A to #EFF6FF)
- Accent: Amber scale (#78350F to #FFFBEB)
- Neutral: Slate scale (#0F172A to #FFFFFF)
- Semantic: Keep success/warning/error, add info
- Background: Slate-based dark mode
- Text: Slate-based hierarchy
- Border: Slate-based

### 2. tsx/packages/ui/src/tokens/shadows.ts
- Remove `glow` object entirely
- Keep only standard elevation shadows (sm, md, lg, xl, none)
- Add focus ring tokens

### 3. tsx/packages/ui/src/tokens/typography.ts
- Remove `display` font family (Cal Sans)
- Keep `sans` (Inter) and `mono` (JetBrains Mono)
- Add letter-spacing tokens
- Add typography presets (h1-h6, body, caption, overline, label)

### 4. tsx/packages/ui/src/tokens/spacing.ts
- Add half-step spacing values (0.5, 1.5, 2.5, 3.5)
- Add component spacing standards
- Keep existing radius, zIndex, breakpoints

### 5. tsx/packages/ui/src/tokens/index.ts
- Update exports for new token structure
- Update `generateCSSVariables()` function
- Ensure backward compatibility where possible

## Exact Color Values (from design.md)

### Primary (Navy Blue)
```typescript
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
}
```

### Interactive (Blue)
```typescript
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
}
```

### Accent (Amber)
```typescript
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
}
```

### Neutral (Slate)
```typescript
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
}
```

### Background (Dark Mode)
```typescript
background: {
  base: '#0F172A',
  surface: '#1E293B',
  elevated: '#334155',
  overlay: 'rgba(15, 23, 42, 0.8)',
}
```

### Text (Dark Mode)
```typescript
text: {
  primary: '#F8FAFC',
  secondary: '#94A3B8',
  tertiary: '#64748B',
  disabled: '#475569',
  inverse: '#0F172A',
}
```

### Border
```typescript
border: {
  default: '#334155',
  subtle: '#1E293B',
  strong: '#475569',
  focus: '#2563EB',
}
```

## Shadows (No Glows)
```typescript
shadows: {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  ring: {
    default: '0 0 0 2px #2563EB',
    offset: '0 0 0 2px #0F172A, 0 0 0 4px #2563EB',
  },
}
```

## Acceptance Criteria
- [ ] All color tokens updated to new palette
- [ ] No purple (#8B5CF6, #a855f7, etc.) in any token file
- [ ] No cyan (#00D9FF, #06b6d4, etc.) in any token file
- [ ] No glow effects in shadows
- [ ] Typography presets added
- [ ] All TypeScript types updated and valid
- [ ] Token tests pass (if any exist)

## Verification
After implementation, run:
```bash
cd tsx && npm run build
```
Ensure no TypeScript errors in the ui package.
