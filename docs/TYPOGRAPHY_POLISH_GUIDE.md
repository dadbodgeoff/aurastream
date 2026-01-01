# Typography & UI Polish Guide

## Overview

This guide documents the typography system and UI polish standards for AuraStream. Following these guidelines ensures consistent, accessible, and professional-looking interfaces.

## Typography System

### Text Color Tokens (WCAG AA Compliant)

All text colors meet WCAG AA contrast requirements (4.5:1 minimum for normal text):

| Token | Hex | Contrast | Usage |
|-------|-----|----------|-------|
| `text-primary` | #FCFCF9 | 15.8:1 | Main headings, important text |
| `text-secondary` | #B8BABA | 8.2:1 | Body text, descriptions |
| `text-tertiary` | #9A9E9E | 5.8:1 | Helper text, captions |
| `text-muted` | #7D8282 | 4.5:1 | Timestamps, metadata |

### Typography Variants

Use the `<Text>` component or CSS utility classes:

```tsx
// Component approach (preferred)
import { Text, Heading, Body, Caption, Label, Micro } from '@/components/ui/Typography';

<Heading level={1}>Page Title</Heading>
<Text variant="body">Regular paragraph</Text>
<Caption>Helper text</Caption>
<Label>Form label</Label>
<Micro>Timestamp</Micro>

// CSS utility approach
<h1 className="text-h1">Page Title</h1>
<p className="text-body">Regular paragraph</p>
<p className="text-caption">Helper text</p>
<span className="text-label">Form label</span>
<span className="text-micro">Timestamp</span>
```

### Typography Scale

| Variant | Size | Weight | Line Height | Use Case |
|---------|------|--------|-------------|----------|
| `display` | 36px | Bold | 1.2 | Hero sections |
| `h1` | 24px | Bold | 1.3 | Page titles |
| `h2` | 20px | Semibold | 1.4 | Section headers |
| `h3` | 18px | Semibold | 1.4 | Card titles |
| `h4` | 16px | Semibold | 1.5 | Subsections |
| `body` | 16px | Normal | 1.5 | Default text |
| `bodySmall` | 14px | Normal | 1.5 | Compact body |
| `caption` | 14px | Normal | 1.5 | Descriptions |
| `label` | 12px | Medium | 1.3 | Form labels, tags |
| `overline` | 12px | Semibold | 1.5 | Section labels (uppercase) |
| `micro` | 11px | Normal | 1.3 | Timestamps, metadata |

## Badge & Tag System

### Badge Component

For status indicators and labels:

```tsx
import { Badge } from '@/components/ui/Badge';

<Badge variant="success">Active</Badge>
<Badge variant="warning" size="xs">Medium</Badge>
<Badge variant="primary" dot>Live</Badge>
```

Variants: `default`, `primary`, `secondary`, `success`, `warning`, `error`, `info`, `premium`
Sizes: `xs`, `sm`, `md`

### Tag Component

For interactive/clickable labels:

```tsx
import { Tag } from '@/components/ui/Badge';

<Tag onClick={handleClick}>Fortnite</Tag>
<Tag selected>Selected Tag</Tag>
<Tag variant="primary">Primary Tag</Tag>
```

### CSS Badge Utilities

Quick badge styling without components:

```html
<span class="badge-success">Active</span>
<span class="badge-warning badge-xs">Warning</span>
```

## Card System

### Card Utilities

```html
<div class="card-sm">Small padding (16px)</div>
<div class="card-md">Medium padding (20px)</div>
<div class="card-lg">Large padding (24px)</div>
<div class="card-interactive">Hover effects</div>
```

## Migration Guide

### Before (Inconsistent)

```tsx
// ❌ Arbitrary sizes, inconsistent colors
<span className="text-[10px] text-text-tertiary">Updated 5m ago</span>
<span className="text-[11px] text-gray-400">Helper text</span>
<div className="text-xs text-slate-500">Caption</div>
```

### After (Consistent)

```tsx
// ✅ Using typography system
<Micro>Updated 5m ago</Micro>
<Caption>Helper text</Caption>
<Text variant="caption" color="tertiary">Caption</Text>

// Or CSS utilities
<span className="text-micro">Updated 5m ago</span>
<span className="text-caption">Helper text</span>
```

### Badge Migration

```tsx
// ❌ Before: Inline styles
<span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded font-medium">
  easy
</span>

// ✅ After: Badge component
<Badge variant="success" size="xs">easy</Badge>
```

## Checklist for New Components

- [ ] Use `<Text>` component or typography utilities for all text
- [ ] Use `<Badge>` or `<Tag>` for status indicators
- [ ] Use `card-*` utilities for card containers
- [ ] Avoid arbitrary font sizes (`text-[10px]`, `text-[11px]`)
- [ ] Avoid raw color classes (`text-gray-*`, `text-slate-*`)
- [ ] Ensure all text meets WCAG AA contrast (4.5:1)
- [ ] Use semantic color tokens (`text-text-secondary` not `text-gray-400`)

## Files to Update

The following patterns need migration across the codebase:

1. Replace `text-[10px]` → `text-micro` or `<Micro>`
2. Replace `text-[11px]` → `text-caption` or `<Caption>`
3. Replace `text-gray-*` → `text-text-*` tokens
4. Replace inline badge styles → `<Badge>` component
5. Replace inline tag styles → `<Tag>` component

### Priority Files

- `tsx/apps/web/src/components/intel/feeds/*.tsx`
- `tsx/apps/web/src/components/intel/panels/*.tsx`
- `tsx/apps/web/src/app/intel/**/*.tsx`
- `tsx/apps/web/src/components/create/*.tsx`
