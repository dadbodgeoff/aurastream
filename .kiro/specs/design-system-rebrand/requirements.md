# Design System Rebrand Requirements

## Overview
Complete rebrand of Streamer Studio from gaming/AI aesthetic to professional enterprise creative tools platform. Remove all purple/violet, cyan/neon colors, gradients, and glow effects.

## Goals
1. Establish a professional, enterprise-grade visual identity
2. Create 100% consistency across web and mobile platforms
3. Define comprehensive design tokens consumed by both platforms
4. Remove all AI-associated visual patterns (purple, gradients, glows)

## Non-Goals
- Redesigning component functionality
- Changing application architecture
- Adding new features

## Requirements

### REQ-1: Color Palette
- Primary: Deep navy blue (`#1E3A5F`) for brand identity
- Interactive: Classic blue (`#2563EB`) for links and actions
- Accent: Warm amber/gold (`#D97706`) for highlights and premium elements
- Neutral scale: Slate-based with warm undertones
- Semantic colors: Standard green/amber/red for success/warning/error
- No purple, violet, cyan, or neon colors
- No gradients or glow effects

### REQ-2: Typography Hierarchy
- Single font family: Inter for all UI text
- Monospace: JetBrains Mono for code only
- Complete type scale from xs (12px) to 6xl (60px)
- Defined heading hierarchy (h1-h6)
- Body text presets (large, base, small)
- Caption and overline styles
- Consistent line-height and letter-spacing per size

### REQ-3: Spacing System
- 4px base unit
- Consistent spacing scale (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24)
- Component padding standards
- Layout margin/gutter standards

### REQ-4: Border & Radius
- Subtle radius: 6px default, 8px for cards
- No pill shapes except badges/tags
- Consistent border widths (1px default)
- Border colors from neutral scale

### REQ-5: Shadows & Elevation
- Subtle elevation shadows only
- No glow effects
- 3-4 elevation levels (sm, md, lg, xl)
- Dark mode appropriate shadow colors

### REQ-6: Platform Consistency
- Single source of truth in `@streamer-studio/ui/tokens`
- Web consumes via Tailwind config
- Mobile consumes via theme provider/StyleSheet factory
- Remove duplicate color definitions in mobile app
- All hex values must match exactly between platforms

### REQ-7: Component Tokens
- Button variants (primary, secondary, ghost, destructive)
- Input styles (default, focus, error, disabled)
- Card styles (default, elevated, interactive)
- Badge/tag styles

## Constraints
- Must maintain dark mode as primary theme
- Must work with existing Tailwind setup
- Must work with React Native StyleSheet
- No breaking changes to component APIs
