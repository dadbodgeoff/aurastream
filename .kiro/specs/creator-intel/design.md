# 🎨 Creator Intel - Design Specification

## Visual Identity

### Design Philosophy

Creator Intel should feel like a **premium command center** - the kind of dashboard a professional esports analyst would use, but accessible to any content creator. 

**Core Principles:**
1. **Calm confidence** - Dark, sophisticated, never overwhelming
2. **Information hierarchy** - Most important info is unmissable
3. **Actionable focus** - Every element leads to a decision
4. **Delightful details** - Subtle animations that reward attention
5. **Enterprise polish** - Pixel-perfect, consistent, professional

### Component Library Standards

We use best-in-class component patterns:
- **Radix UI primitives** for accessible dropdowns, modals, popovers
- **Framer Motion** for smooth, physics-based animations
- **react-grid-layout** for drag-drop dashboard
- **Recharts** for data visualization (consistent with existing)
- **Lucide icons** for consistent iconography

---

## Color Application

### Primary Surfaces

```css
/* Main dashboard background - subtle gradient for depth */
.intel-dashboard {
  background: 
    radial-gradient(ellipse at top, rgba(33, 128, 141, 0.03) 0%, transparent 50%),
    linear-gradient(180deg, #1F2121 0%, #1a1c1c 100%);
}

/* Panel cards - glassmorphism effect */
.panel-card {
  background: rgba(38, 40, 40, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(167, 169, 169, 0.12);
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.panel-card:hover {
  border-color: rgba(33, 128, 141, 0.25);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.16),
    0 0 0 1px rgba(33, 128, 141, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
```

### Accent Usage

```css
/* Hero panel gradient - premium feel */
.todays-mission {
  background: 
    linear-gradient(135deg, rgba(33, 128, 141, 0.12) 0%, transparent 60%),
    linear-gradient(225deg, rgba(168, 79, 47, 0.06) 0%, transparent 40%),
    rgba(38, 40, 40, 0.9);
  border: 1px solid rgba(33, 128, 141, 0.2);
}

/* Category pills - subtle but identifiable */
.category-pill {
  background: rgba(33, 128, 141, 0.12);
  border: 1px solid rgba(33, 128, 141, 0.25);
  color: #32B8C6;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.category-pill:hover {
  background: rgba(33, 128, 141, 0.18);
  border-color: rgba(33, 128, 141, 0.35);
  transform: translateY(-1px);
}

/* Viral/hot indicators */
.viral-badge {
  background: linear-gradient(135deg, #A84F2F 0%, #F79F6F 100%);
  color: white;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Confidence levels */
.confidence-high { color: #218081; }    /* 70-100% */
.confidence-medium { color: #A84F2F; }  /* 40-69% */
.confidence-low { color: #777C7C; }     /* 0-39% */
```

### Data Visualization Colors

```typescript
const chartColors = {
  primary: '#21808D',
  secondary: '#32B8C6',
  tertiary: '#66BDC3',
  accent: '#A84F2F',
  muted: '#62756E',
  grid: 'rgba(167, 169, 169, 0.08)',
  tooltip: {
    background: 'rgba(38, 40, 40, 0.95)',
    border: 'rgba(167, 169, 169, 0.2)',
  }
};
```

---

## Typography Scale

### Headlines

```css
/* Page title */
.page-title {
  font-size: 1.5rem;      /* 24px */
  font-weight: 600;
  color: #FCFCF9;
  letter-spacing: -0.02em;
}

/* Panel titles */
.panel-title {
  font-size: 0.75rem;     /* 12px */
  font-weight: 600;
  color: #A7A9A9;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* Today's Mission headline */
.mission-headline {
  font-size: 1.5rem;      /* 24px */
  font-weight: 600;
  color: #FCFCF9;
  line-height: 1.3;
}

@media (min-width: 768px) {
  .mission-headline {
    font-size: 1.75rem;   /* 28px */
  }
}
```

### Body Text

```css
.text-primary {
  font-size: 0.875rem;    /* 14px */
  color: #FCFCF9;
  line-height: 1.5;
}

.text-secondary {
  font-size: 0.8125rem;   /* 13px */
  color: #A7A9A9;
  line-height: 1.5;
}

.text-muted {
  font-size: 0.75rem;     /* 12px */
  color: #777C7C;
}
```

### Numbers & Stats

```css
.stat-large {
  font-size: 2rem;        /* 32px */
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #FCFCF9;
}

.stat-medium {
  font-size: 1.25rem;     /* 20px */
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
```

---

## Component Specifications

### Panel Card (Enterprise Grade)

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Icon] PANEL TITLE                         [⚙️]    │   │  ← 44px header
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              Content Area                           │   │  ← Flexible
│  │              (min-height: 180px)                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Updated 2m ago                         [↻]         │   │  ← 32px footer
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

Specifications:
- Border radius: 12px (rounded-xl)
- Content padding: 16px
- Gap between panels: 16px
- Header: px-4 py-3, border-b border-border-subtle/50
- Footer: px-4 py-2, border-t border-border-subtle/50

States:
- Default: border-border-subtle
- Hover: border-interactive-500/25, elevated shadow
- Dragging: scale(1.02), shadow-2xl, z-50
- Loading: content replaced with skeleton
- Error: red border accent, retry button
```

### Panel Sizes (Grid Units)

```
SMALL (1 column)
┌─────────────────┐
│                 │
│    280 x auto   │
│   (min 240px)   │
└─────────────────┘

WIDE (2 columns)  
┌─────────────────────────────────────┐
│                                     │
│              576 x auto             │
│                                     │
└─────────────────────────────────────┘

LARGE (2 columns, taller)
┌─────────────────────────────────────┐
│                                     │
│                                     │
│              576 x auto             │
│            (min 400px)              │
│                                     │
└─────────────────────────────────────┘
```

### Category Pill

```
┌─────────────────────────────┐
│  🎮  Fortnite          [×]  │
└─────────────────────────────┘

Specifications:
- Height: 32px
- Padding: 6px 12px
- Border radius: 16px (full pill)
- Icon: 14px
- Font: 13px, medium weight
- Gap: 6px

States:
- Default: bg-interactive-600/12, border-interactive-500/25
- Hover: bg-interactive-600/18, translateY(-1px)
- Remove hover: × icon turns error color

Animation:
- Entry: scale from 0.9, fade in (200ms spring)
- Exit: scale to 0.9, fade out (150ms ease-out)
```

### Filter Dropdown (Radix Select)

```
┌─────────────────────────────────────┐
│  Viewing: All Categories        [▼] │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  ✓ All Categories                   │
├─────────────────────────────────────┤
│    🎮 Fortnite                      │
│    🎯 Valorant                      │
│    💬 Just Chatting                 │
└─────────────────────────────────────┘

Specifications:
- Trigger: h-10, px-4, rounded-lg
- Dropdown: rounded-lg, shadow-xl, border
- Item: h-10, px-3
- Checkmark: text-interactive-500

Animation:
- Open: slide down 8px + fade (200ms)
- Close: slide up 4px + fade (150ms)
```

---

## Today's Mission Panel (Hero)

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─ Gradient background ──────────────────────────────────────────────────┐│
│  │                                                                        ││
│  │   🎯 TODAY'S MISSION                                                   ││
│  │                                                                        ││
│  │   ┌─────────────────────────────────────────────────────────────────┐ ││
│  │   │                                                                 │ ││
│  │   │  ┌─────────────┐                                                │ ││
│  │   │  │             │   "Stream Fortnite at 3pm EST"                 │ ││
│  │   │  │     87%     │                                                │ ││
│  │   │  │ confidence  │   Competition drops 40% while viewership       │ ││
│  │   │  │             │   stays high. New update just dropped.         │ ││
│  │   │  └─────────────┘                                                │ ││
│  │   │                                                                 │ ││
│  │   └─────────────────────────────────────────────────────────────────┘ ││
│  │                                                                        ││
│  │   Suggested Title:                                                     ││
│  │   ┌────────────────────────────────────────────────────┐              ││
│  │   │ 🔥 NEW UPDATE First Look - Fortnite Season 5       │  [Copy 📋]  ││
│  │   └────────────────────────────────────────────────────┘              ││
│  │                                                                        ││
│  │   ┌─────────────────┐                                                 ││
│  │   │ Start Planning →│                         Updated 2 min ago       ││
│  │   └─────────────────┘                                                 ││
│  │                                                                        ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Confidence Ring (SVG)

```typescript
// Animated circular progress
const ConfidenceRing = ({ value }: { value: number }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  
  const color = value >= 70 ? '#218081' : value >= 40 ? '#A84F2F' : '#777C7C';
  
  return (
    <svg width="100" height="100" className="transform -rotate-90">
      {/* Background ring */}
      <circle
        cx="50" cy="50" r={radius}
        fill="none"
        stroke="rgba(167, 169, 169, 0.1)"
        strokeWidth="8"
      />
      {/* Progress ring */}
      <motion.circle
        cx="50" cy="50" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - progress }}
        transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
      />
    </svg>
  );
};
```

---

## Viral Clips Panel

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🔥 VIRAL CLIPS                                      [⚙️]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ┌──────────┐                                       │   │
│  │  │          │  insane no-scope headshot             │   │
│  │  │ [thumb]  │  @ninja • 45K views                   │   │
│  │  │          │  🔥 12.5 views/min                    │   │
│  │  └──────────┘                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ┌──────────┐                                       │   │
│  │  │          │  1v5 clutch in ranked                 │   │
│  │  │ [thumb]  │  @shroud • 32K views                  │   │
│  │  │          │  📈 8.2 views/min                     │   │
│  │  └──────────┘                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Updated 30s ago                                   [↻]      │
└─────────────────────────────────────────────────────────────┘

Clip item specifications:
- Thumbnail: 80x45px (16:9), rounded-md
- Title: 14px, truncate at 1 line
- Meta: 12px, text-muted
- Velocity badge: 🔥 (>10/min), 📈 (>5/min)
- Hover: bg-white/5, slight scale
```

---

## Live Pulse Panel

### Layout (Wide)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 LIVE PULSE                                                       [⚙️]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Fortnite   │  │  Valorant   │  │ Just Chat   │  │   Total     │        │
│  │             │  │             │  │             │  │             │        │
│  │   890K      │  │   456K      │  │   1.2M      │  │   2.5M      │        │
│  │  viewers    │  │  viewers    │  │  viewers    │  │  viewers    │        │
│  │             │  │             │  │             │  │             │        │
│  │  🟢 Low     │  │  🟡 Med     │  │  🔴 High    │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Top Streams:                                                               │
│  1. @ninja playing Fortnite • 45K viewers                                   │
│  2. @pokimane Just Chatting • 38K viewers                                   │
│  3. @shroud playing Valorant • 32K viewers                                  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  🟢 Live • Auto-refreshing                                         [↻]      │
└─────────────────────────────────────────────────────────────────────────────┘

Competition indicator:
- 🟢 Low: < 500 streams (good opportunity)
- 🟡 Medium: 500-2000 streams
- 🔴 High: > 2000 streams (saturated)
```

---

## Animations & Micro-interactions

### Panel Interactions (Framer Motion)

```typescript
// Panel hover animation
const panelVariants = {
  initial: { scale: 1, y: 0 },
  hover: { 
    scale: 1.01, 
    y: -2,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
  },
  tap: { scale: 0.99 },
  drag: { 
    scale: 1.03, 
    rotate: 1,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    transition: { duration: 0.2 }
  }
};

// Data update animation
const numberVariants = {
  initial: { y: -10, opacity: 0 },
  animate: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' }
  }
};

// New item highlight
const newItemVariants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
  }
};
```

### Loading States

```css
/* Shimmer skeleton */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.02) 25%,
    rgba(255, 255, 255, 0.06) 50%,
    rgba(255, 255, 255, 0.02) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}

/* Live indicator pulse */
@keyframes pulse-live {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #218081;
  border-radius: 50%;
  animation: pulse-live 2s ease-in-out infinite;
}
```

---

## Responsive Behavior

### Breakpoints

```typescript
const breakpoints = {
  sm: 640,   // Mobile landscape
  md: 768,   // Tablet
  lg: 1024,  // Desktop
  xl: 1280,  // Large desktop
};
```

### Grid Behavior

```
Desktop (≥1024px): 4 columns
┌─────┬─────┬─────┬─────┐
│     │     │     │     │
└─────┴─────┴─────┴─────┘

Tablet (768-1023px): 2 columns
┌─────┬─────┐
│     │     │
└─────┴─────┘

Mobile (<768px): 1 column, no drag
┌─────────┐
│         │
└─────────┘
```

### Mobile Adaptations

- Category pills: horizontal scroll with fade edges
- Filter dropdown: full-width
- Panel settings: bottom sheet (Radix Dialog)
- Today's Mission: stacked layout
- Drag-drop: disabled, use up/down buttons

---

## Empty States

### No Categories Selected

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [Illustration]                           │
│                         🎮                                  │
│                                                             │
│              Pick your games to get started                 │
│                                                             │
│     Creator Intel shows you what's trending, what's         │
│     working, and what you should create next.               │
│                                                             │
│              ┌─────────────────────────┐                    │
│              │   + Add Your First Game  │                   │
│              └─────────────────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Panel Error State

```
┌─────────────────────────────────────────────────────────────┐
│  🔥 VIRAL CLIPS                                      [⚙️]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                         ⚠️                                  │
│                                                             │
│              Couldn't load clips                            │
│                                                             │
│              ┌─────────────┐                                │
│              │  Try Again  │                                │
│              └─────────────┘                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Failed 2m ago                                     [↻]      │
└─────────────────────────────────────────────────────────────┘
```

---

## Accessibility

### Keyboard Navigation

- `Tab` - Move between interactive elements
- `Enter/Space` - Activate buttons, open dropdowns
- `Arrow keys` - Navigate dropdown options
- `Escape` - Close modals/dropdowns
- `R` - Refresh focused panel

### Screen Reader

- Panels: `role="region"` with `aria-label`
- Live data: `aria-live="polite"` for updates
- Loading: `aria-busy="true"`
- Drag handles: `aria-label="Drag to reorder panel"`

### Color Contrast (WCAG AA)

- Primary text (#FCFCF9) on surface (#262828): 11.5:1 ✓
- Secondary text (#A7A9A9) on surface: 5.8:1 ✓
- Interactive (#32B8C6) on surface: 5.2:1 ✓

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

*Design Spec Version: 1.1*  
*Created: December 30, 2025*  
*Updated: December 30, 2025 - Enterprise-grade components, removed panel pinning*
