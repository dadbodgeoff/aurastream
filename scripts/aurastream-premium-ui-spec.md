# Aurastream: Premium Enterprise UI Specification

**A comprehensive guide to premium "touch and feel" for high-end streaming assets UI**

---

## Executive Overview

Premium enterprise interfaces are built on **five non-negotiable foundations**:

1. **Predictable Systems** – Every color, spacing, and animation follows consistent rules. No arbitrary choices.
2. **Subtle Depth** – Strategic use of shadows and elevation creates visual hierarchy without clutter.
3. **Responsive Feedback** – Micro-interactions confirm every user action instantly and elegantly.
4. **Intentional Motion** – Animation accelerates cognitive processing; it never slows users down.
5. **Accessibility Built-In** – Color contrast, focus states, and keyboard navigation are part of the design, not afterthoughts.

---

## Design Principles

### 1. **Consistency Over Cleverness**
Every visual decision follows a documented system. Designers don't invent new buttons; they apply proven patterns. This predictability builds trust and reduces cognitive load.

### 2. **Subtle Motion, Strong Feedback**
Animations are brief (150–250ms) and purposeful. They confirm actions without interrupting flow. Avoid spinning, bouncing, or excessive transitions.

### 3. **Silence is Golden**
Empty states, loading screens, and error messages communicate with restraint. Clear, humble microcopy paired with minimal visuals beats verbose explanations.

### 4. **Hierarchy Through Restraint**
Fewer colors, fewer shadows, fewer font weights. Premium interfaces feel "quiet" because they remove everything non-essential. One primary color, one secondary. Two elevation levels. Three font weights.

### 5. **First Pixel, Last Pixel**
Every pixel serves a purpose. Borders, shadows, spacing—all carry meaning. If it doesn't communicate, remove it.

### 6. **Performance Equals Perception**
A perceived 300ms response is worth more than actual 500ms performance. Skeleton screens, optimistic UI, and instant visual feedback create the illusion of speed.

### 7. **Accessible is Premium**
WCAG AA compliance isn't a feature—it's a requirement. High contrast, clear focus states, and logical keyboard navigation signal maturity and professionalism.

---

## Design Tokens

### Color System

**Primitive Tokens** (raw material)

```
Primary Colors
--color-primary-500:     #2180 8D (Teal)       [Main interactive color]
--color-primary-600:     #247380                [Hover / active state]
--color-primary-700:     #1A7373                [Deep active state]
--color-primary-300:     #32B8C6                [Light / dark mode variant]

Neutral Colors
--color-gray-900:        #131B3B (Charcoal)    [Text on light backgrounds]
--color-gray-800:        #262828 (Dark)        [Surface in dark mode]
--color-gray-700:        #1F2121 (Darker)      [Modal overlay backgrounds]
--color-gray-400:        #777C7C (Medium)      [Muted text, disabled states]
--color-gray-300:        #A7A9A9 (Light)       [Subtle borders, dividers]
--color-gray-100:        #F5F5F5 (Off-white)   [Surfaces in light mode]
--color-gray-50:         #FCFCF9 (Cream)       [Main background]

Semantic Colors
--color-success:         #218081  [Green for positive feedback]
--color-warning:         #A84F2F  [Orange for caution]
--color-error:           #C0152F  [Red for destruction/critical]
--color-info:            #62756E  [Slate for neutral info]

Backgrounds (low-opacity overlays for visual interest)
--color-bg-1:            rgba(59, 130, 246, 0.08)    [Light blue tint]
--color-bg-2:            rgba(245, 158, 11, 0.08)    [Light yellow tint]
--color-bg-3:            rgba(34, 197, 94, 0.08)     [Light green tint]
--color-bg-4:            rgba(239, 68, 68, 0.08)     [Light red tint]
--color-bg-5:            rgba(147, 51, 234, 0.08)    [Light purple tint]

Opacity Scale
--opacity-disabled:      0.40  [For disabled elements]
--opacity-hover:         0.85  [For subtle hover overlays]
--opacity-focus-ring:    0.40  [For focus indicators]
```

**Semantic Tokens** (role-based, derived from primitives)

```
Light Mode
--color-background:      --color-gray-50         [Main app background]
--color-surface:         --color-gray-100        [Cards, panels, containers]
--color-surface-alt:     --color-gray-200        [Secondary surfaces]
--color-text-primary:    --color-gray-900        [Default body text]
--color-text-secondary:  --color-gray-400        [Muted labels, helper text]
--color-border:          rgba(94, 82, 64, 0.20)  [Card borders, dividers]
--color-border-focus:    --color-primary-500     [Focus ring borders]

Dark Mode
--color-background:      --color-gray-700        [Main app background]
--color-surface:         --color-gray-800        [Cards, panels]
--color-surface-alt:     --color-gray-900        [Secondary surfaces]
--color-text-primary:    --color-gray-100        [Default body text]
--color-text-secondary:  rgba(167, 169, 169, 0.70)  [Muted labels]
--color-border:          rgba(119, 124, 124, 0.30)  [Dividers]
--color-border-focus:    --color-primary-300     [Focus ring for dark]
```

**Best Practices**

- **Avoid pure black/white.** Use off-gray or charcoal for text. Use off-white (#F5F5F5 or #FCFCF9) for backgrounds. Pure black (#000000) feels harsh; off-gray feels cultivated.
- **Test contrast on both light and dark.** A color that passes WCAG AA on white may fail on a tinted surface.
- **Limit the palette.** One primary, one secondary, four grays. If you need more, you're overcomplicating.
- **Semantic tokens drive consistency.** Never use a primitive color directly in a component. Always route through a semantic token (e.g., use `--color-text-primary`, not `--color-gray-900`).

---

### Typography System

**Font Family**
- **Primary:** System stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`
  - Reason: Operating system fonts feel native and load instantly.
  - Fallback: Inter, Geist, or Satoshi for branded feel (if needed).
- **Monospace:** `'Berkeley Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
  - Used for: code, logs, data values, timestamps.

**Font Weight Scale**
```
--font-weight-regular:    400  [Body, default text]
--font-weight-medium:     500  [Labels, small headings]
--font-weight-semibold:   550  [Subheadings, emphasized labels]
--font-weight-bold:       600  [Primary headings, strong emphasis]
```

**Type Scale** (semantic labels with fixed and responsive sizes)

```
Display / Hero
  Size: 30–36px (desktop), 24–28px (mobile)
  Weight: 600 (Bold)
  Line Height: 1.2 (36–42px)
  Usage: Page titles, main headings

Heading 1
  Size: 24px (desktop), 20px (mobile)
  Weight: 600 (Bold)
  Line Height: 1.3 (31–32px)
  Usage: Section headings, dialog titles

Heading 2
  Size: 20px (desktop), 18px (mobile)
  Weight: 600 (Bold)
  Line Height: 1.4 (28–32px)
  Usage: Subsection headings, card titles

Heading 3
  Size: 18px (desktop), 16px (mobile)
  Weight: 550 (Semibold)
  Line Height: 1.4 (25–28px)
  Usage: Tertiary headings, data labels

Body / Paragraph
  Size: 16px (desktop), 14–16px (mobile)
  Weight: 400 (Regular)
  Line Height: 1.5 (24–30px)
  Usage: Main content, descriptions, body text

Small / Caption
  Size: 14px (desktop), 13px (mobile)
  Weight: 400 (Regular)
  Line Height: 1.5 (21–23px)
  Usage: Helper text, metadata, fine print

Label / Tag
  Size: 12px (fixed, no responsive scaling)
  Weight: 500 (Medium)
  Line Height: 1.3 (16px)
  Usage: Form labels, badges, pill labels

Micro / Tooltip
  Size: 11px (fixed)
  Weight: 400 (Regular)
  Line Height: 1.3 (14px)
  Usage: Tooltips, hints, very small secondary text
```

**Line Height & Letter Spacing**
```
Headings:
  Line Height:     1.2–1.3 (tight, confident)
  Letter Spacing:  -0.01em (slight tightening for density)

Body Text:
  Line Height:     1.5–1.6 (loose, readable)
  Letter Spacing:  0 (neutral)

Monospace:
  Line Height:     1.6 (loose, for readability)
  Letter Spacing:  0 (preserve code spacing)
```

**Best Practices**

- **Minimum readable size is 14px.** Never go below 12px except in tooltips or very minor labels.
- **Line height >= 1.5 for body text.** Users with dyslexia or low vision benefit from generous leading.
- **Paragraph spacing > line-height.** If your line-height is 8px (from 16px text ÷ 2), set paragraph margins to 16–24px to signal paragraph breaks.
- **Scale responsively.** Use a type scale that adapts for mobile. Headings get smaller, but not proportionally smaller.
- **Test kerning on odd font sizes.** 13px or 17px sometimes kern poorly; stick to even values when possible.

---

### Spacing System

**Base Unit: 8px Grid**

All spacing is a multiple of 8px. When finer control is needed, use 4px as a half-step.

```
--space-2:    2px   [Micro: between icon and label]
--space-4:    4px   [Tight: compact spacing]
--space-6:    6px   [Sub-unit: rare, use 8 instead]
--space-8:    8px   [Base: default gap between elements]
--space-12:   12px  [3x base: for breathing room]
--space-16:   16px  [2x base: standard padding, card margins]
--space-20:   20px  [2.5x base: for emphasis]
--space-24:   24px  [3x base: larger section padding]
--space-32:   32px  [4x base: major section breaks]
--space-40:   40px  [5x base: page-level spacing]
--space-48:   48px  [6x base: hero sections, top padding]
--space-64:   64px  [8x base: large layout blocks]
--space-80:   80px  [10x base: full-page margins]
```

**Padding Hierarchy**

```
Component Padding (internal spacing)
  Compact:   8px (for dense data tables, tag lists)
  Standard:  12–16px (for cards, buttons, form fields)
  Spacious:  20–24px (for modals, large cards, hero sections)

Container Padding (page-level)
  Mobile:    16px (left/right margins on viewport)
  Desktop:   24–32px (left/right margins, max-width container)
```

**Margin Rules**

- **Internal spacing <= External spacing.** Space *within* a component is tighter than space *around* it.
  - Example: Icon + text gap = 8px. Card to card gap = 16px.
- **Vertical rhythm.** All vertical gaps (margin-bottom, section breaks) should be multiples of your line-height.
- **Collapse margins.** Never use margin-top and margin-bottom on adjacent elements; collapse them to one margin value.

**Grid Layout**

```
Max Content Width:    1280px (desktop)
Sidebar Width:        256px (collapsible, 64px icons when collapsed)
Column Gap:           16px (between grid columns)
Row Gap:              12px (between grid rows)
```

**Best Practices**

- **Never use arbitrary values.** If 15px feels right, use 16px instead. The 8px grid discipline forces intentional decisions.
- **Negative space is a tool.** Generous spacing signals confidence and maturity. Cramped interfaces feel cheap.
- **Mobile-first spacing.** Design mobile margins first (tight), then add breathing room on desktop.
- **Consistent left/right padding.** If your card has 16px left padding, it should have 16px right padding.

---

### Shadows & Elevation

**Elevation Levels** (5-tier system)

```
Elevation 0 (Base / Flat)
  Box Shadow:    none
  Z-Index:       0
  Usage:         Main background, base surfaces
  Example:       App background, bottom layers

Elevation 1 (Raised)
  Box Shadow:    0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)
  Z-Index:       10
  Usage:         Cards, panels, low-prominence content
  Example:       Data cards, form containers, tabs

Elevation 2 (Floating)
  Box Shadow:    0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)
  Z-Index:       20
  Usage:         Interactive overlays, hovered cards, popovers
  Example:       Dropdown menus, tooltip, button hover state

Elevation 3 (Modal / Dialog)
  Box Shadow:    0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)
  Z-Index:       100
  Usage:         Modals, drawers, menus with scrim
  Example:       Dialog boxes, side panels, confirmation modals

Elevation 4 (Toast / Floating Action)
  Box Shadow:    0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)
  Z-Index:       200
  Usage:         Notifications, floating buttons, highest priority overlays
  Example:       Toast notifications, floating action buttons, alerts
```

**Shadow Properties**

- **Soft, directional shadows.** Blur radius >= 1px. Spread radius: 0 to -1px for sharpness.
- **Multiple layers.** Use at least two box-shadow layers: one diffuse (for bulk shadow) + one sharp (for contact shadow).
- **Dark mode adjustment.** In dark mode, increase shadow opacity slightly (darker surfaces scatter less light).

**Z-Index Scale**

```
--z-base:            0      [Default layer]
--z-elevation-1:     10     [Raised cards]
--z-elevation-2:     20     [Floating overlays]
--z-sticky:          30     [Sticky headers, sticky nav]
--z-elevation-3:     100    [Modals, drawers]
--z-backdrop:        90     [Modal scrim/backdrop]
--z-elevation-4:     200    [Toasts, floating actions]
--z-tooltip:         250    [Tooltips, popovers]
```

**Best Practices**

- **One shadow style per elevation level.** Don't create arbitrary shadows; use the scale above.
- **Shadows don't guarantee hierarchy.** Pair shadows with spacing and color for clear layering.
- **Test shadows in dark mode.** A shadow that works on white (#FFFFFF) may be invisible on dark gray (#1F2121).
- **Inset shadows for depth.** Use `inset 0 1px 0 rgba(255, 255, 255, 0.1)` on dark surfaces to suggest a subtle inner edge.

---

### Border Radius

**Radius Scale**

```
--radius-none:        0px      [No radius, sharp corners]
--radius-sm:          6px      [Subtle, for small components]
--radius-base:        8px      [Default, for most components]
--radius-md:          10px     [Medium, for larger cards]
--radius-lg:          12px     [Large, for tall modals or panels]
--radius-xl:          16px     [Extra large, hero sections]
--radius-full:        9999px   [Pills, circular badges, full circles]
```

**Usage Guidelines**

```
Buttons:              --radius-base (8px)
Input Fields:         --radius-base (8px)
Cards:                --radius-md to --radius-lg (10–12px)
Modals:               --radius-lg (12px)
Badges/Pills:         --radius-full (9999px)
Dropdowns:            --radius-base (8px)
Images:               --radius-sm to --radius-md (6–10px)
```

**Best Practices**

- **Consistent radius across components.** Don't use 7px in one place and 9px in another.
- **Slightly larger radius for larger elements.** A card (12px) should have more radius than a button (8px).
- **No over-rounding.** Very rounded corners (>16px) feel cartoonish. Use 12px max for standard components.

---

## Core Component Standards

### Buttons

#### Default States

**Primary Button**
```
Visual State    | Background              | Text Color              | Border   | Padding     
Default         | --color-primary-500     | --color-btn-primary-text| None     | 8px 16px   
Hover           | --color-primary-600     | --color-btn-primary-text| None     | 8px 16px   
Active/Pressed  | --color-primary-700     | --color-btn-primary-text| None     | 8px 16px   
Focus           | --color-primary-500     | --color-btn-primary-text| 2px solid --color-primary-600 (outline) | 8px 16px
Disabled        | --color-gray-400 @ 40%  | --color-text-secondary  | None     | 8px 16px
Loading         | --color-primary-500     | --color-btn-primary-text| None, spinner | 8px 16px
```

**Secondary Button**
```
Visual State    | Background                      | Text Color         | Border                          | Padding
Default         | --color-secondary (rgba muted)  | --color-text-primary| 1px solid --color-border        | 8px 16px
Hover           | --color-secondary-hover         | --color-text-primary| 1px solid --color-border        | 8px 16px
Active/Pressed  | --color-secondary-active        | --color-text-primary| 1px solid --color-border        | 8px 16px
Focus           | --color-secondary               | --color-text-primary| 2px solid --color-border-focus  | 8px 16px
Disabled        | transparent                     | --color-text-secondary| 1px solid --color-border (low opacity) | 8px 16px
Loading         | --color-secondary               | --color-text-primary| 1px solid --color-border        | 8px 16px
```

**Ghost Button** (minimal, link-like)
```
Visual State    | Background   | Text Color               | Border | Padding
Default         | transparent  | --color-primary-500      | None   | 8px 16px
Hover           | --color-bg-1 | --color-primary-600      | None   | 8px 16px
Active/Pressed  | --color-bg-1 | --color-primary-700      | None   | 8px 16px
Focus           | transparent  | --color-primary-500      | 2px solid --color-primary-600 (outline) | 8px 16px
Disabled        | transparent  | --color-text-secondary   | None   | 8px 16px
```

**Destructive Button** (delete, irreversible action)
```
Visual State    | Background            | Text Color              | Border | Padding
Default         | --color-error         | --color-btn-primary-text| None   | 8px 16px
Hover           | darken(--color-error) | --color-btn-primary-text| None   | 8px 16px
Active/Pressed  | darken further        | --color-btn-primary-text| None   | 8px 16px
Focus           | --color-error         | --color-btn-primary-text| 2px solid (outline) | 8px 16px
Disabled        | --color-error @ 40%   | --color-text-secondary  | None   | 8px 16px
```

#### Sizing

```
Size          | Padding      | Font Size   | Radius      | Min Width
Extra Small   | 4px 8px      | 11px        | 6px         | 40px
Small         | 6px 12px     | 12px        | 6px         | 64px
Base/Default  | 8px 16px     | 14px        | 8px         | 80px
Large         | 10px 20px    | 16px        | 8px         | 120px
Full Width    | varies       | varies      | varies      | 100% of container
```

#### Interactive Behavior

- **Hover transition:** 150ms cubic-bezier(0.16, 1, 0.3, 1)
- **Active transition:** Immediate (no delay)
- **Focus ring:** 2px solid outline, offset 2px
- **Disabled state:** Reduce opacity to 40%, disable pointer events
- **Loading state:** Add spinner icon, disable interactions, prevent click events

#### Microcopy Best Practices

- **Action-oriented.** Use verbs: "Save", "Delete", "Publish", not "Confirm", "OK"
- **Specific over generic.** "Save Changes" > "Save"
- **No exclamation marks.** They feel aggressive.
- **Capitalization:** Title case for buttons ("Add Item", not "add item")

---

### Form Inputs

#### Text Input / Text Area

**Default State**
```
Background:       --color-surface
Border:           1px solid --color-border
Text Color:       --color-text-primary
Placeholder:      --color-text-secondary @ 60%
Padding:          8px 12px (input), 12px (textarea)
Border Radius:    8px
Font Size:        14px
Line Height:      1.5
```

**States**

```
State          | Border Color             | Background    | Shadow | Outline
Default        | --color-border           | --color-surface| None  | None
Hover          | --color-border (darken) | --color-surface| None  | None
Focus          | --color-border-focus     | --color-surface| var(--focus-ring) | 2px solid offset 2px
Filled         | --color-border           | --color-surface| None  | None
Error          | --color-error            | rgba(error, 0.05) | var(--focus-ring, error tint) | 2px solid error
Disabled       | --color-border @ 40%     | --color-gray-200 (light) | None | None
Success        | --color-success          | rgba(success, 0.05) | None | None
```

**Validation Best Practices**

1. **Inline validation on blur (not while typing).** Don't validate until user leaves the field.
2. **Error message placement.** Show error text directly below the field, 4–8px below the input.
3. **Remove error on correction.** As soon as user fixes the error, remove the error state and message.
4. **Clear error icons.** Use an icon (⚠️ or ✗) next to the error message for quick scanning.
5. **Positive validation.** Show a success checkmark (✓) for complex fields (email, password confirmation).
6. **Helper text above input.** Keep labels and hint text above; errors and success below.

---

#### Select Dropdown

**Default State**
```
Background:       --color-surface
Border:           1px solid --color-border
Text Color:       --color-text-primary
Caret Icon:       --color-text-secondary, positioned right 12px
Padding:          8px 12px (left), 32px (right for caret)
Border Radius:    8px
Font Size:        14px
Caret SVG:        16px, centered vertically
```

**States**
```
State          | Border Color             | Background    | Caret Opacity
Default        | --color-border           | --color-surface| 1
Hover          | --color-border (darken) | --color-surface| 1
Focus          | --color-border-focus     | --color-surface| 1
Open (Menu)    | --color-border-focus     | --color-surface| 1
Disabled       | --color-border @ 40%     | --color-gray-200| 0.4
```

**Menu Behavior**
- **Elevation.** Menu sits at elevation-2 (box-shadow for floating appearance).
- **Animation.** Fade in 150ms; fade out 100ms on close.
- **Max height.** Limit to 5–6 items visible before scrolling. Example: max-height: 240px.
- **Padding inside.** 8px vertical padding inside menu container (before first item).
- **Item spacing.** 8px padding per item (vertical).
- **Hover state.** Background color: --color-bg-1 or light tint of primary color.
- **Selected item.** Show a checkmark icon (✓) on the left side of selected item.

---

#### Checkboxes & Radio Buttons

**Checkbox**

```
Size:             16px × 16px
Border:           2px solid --color-border
Checked Icon:     ✓ (white, 12px × 12px)
Background:       --color-surface (unchecked), --color-primary-500 (checked)
Checked Border:   --color-primary-500
Focus Ring:       var(--focus-ring)
Padding:          4px left (from label text)
Cursor:           pointer
Disabled:         opacity 40%, cursor: not-allowed
```

**Radio Button**

```
Size:             16px × 16px (outer), 6px × 6px (inner dot when selected)
Border:           2px solid --color-border (unchecked)
Outer Border:     --color-primary-500 (checked)
Inner Dot:        --color-primary-500 (checked)
Background:       --color-surface (unchecked), transparent (checked)
Focus Ring:       var(--focus-ring)
Cursor:           pointer
```

**Labels**
- **Clickable area.** Label text should be clickable (wrap input in `<label>` or use `for` attribute).
- **Spacing.** 8px gap between checkbox/radio and label text.
- **Font size.** Same as body text (14px).

---

#### Toggle / Switch

```
Width:            44px
Height:           24px
Border Radius:    --radius-full (12px)
Track Color:      --color-gray-300 (off), --color-primary-500 (on)
Knob Color:       --color-gray-100 / --color-gray-50 (both states)
Knob Size:        20px × 20px
Knob Offset:      2px from track edge
Animation:        Slide 200ms cubic-bezier(0.16, 1, 0.3, 1)
Focus Ring:       var(--focus-ring) around entire component
Disabled:         opacity 40%, cursor: not-allowed
```

---

### Navigation

#### Top Navigation Bar

```
Height:           56px (desktop), 48px (mobile)
Background:       --color-surface
Border Bottom:    1px solid --color-border
Padding:          0px 24px (horizontal, desktop), 0px 16px (mobile)
Sticky:           Yes, position: sticky, z-index: 30
Shadow:           None (or elevation-1 on scroll)
Layout:           Flex, items-center, justify-between
```

**Content Structure**
- **Left:** Logo/Brand (24–32px height)
- **Center:** Primary navigation links (optional on desktop, hamburger on mobile)
- **Right:** User menu, search, notifications, settings

**Link Styling** (Nav Items)
```
Default:    color: --color-text-primary, no underline, 14px
Hover:      color: --color-primary-600, background: var(--color-bg-1), border-radius: 6px
Active:     color: --color-primary-600, bottom border: 2px solid --color-primary-600
Focus:      var(--focus-ring)
```

#### Sidebar Navigation

```
Width:            256px (desktop), collapsible to 64px (icon-only)
Background:       --color-surface or --color-gray-100 (light mode)
Border Right:     1px solid --color-border
Position:         Fixed or sticky
Height:           100vh
Overflow:         Auto, scrollable
Z-Index:          20 (above main content)
Shadow:           elevation-1 (on expand from mobile)
```

**Link Styling**
```
Default:    padding: 8px 12px, margin: 4px 8px, border-radius: 6px, color: --color-text-primary
Hover:      background: --color-bg-1, color: --color-text-primary
Active:     background: rgba(--color-primary-500, 0.15), color: --color-primary-600, left border: 3px solid --color-primary-500
Focus:      var(--focus-ring) around link area
```

**Collapse Animation**
- **Speed:** 250ms cubic-bezier(0.16, 1, 0.3, 1)
- **On collapse:** Hide labels, show icons only, width: 64px
- **Icon size:** 24px centered in 64px container
- **Tooltips:** Show label on icon hover when collapsed

---

### Cards & Panels

**Standard Card**
```
Background:       --color-surface
Border:           1px solid --color-card-border
Border Radius:    --radius-md (10px)
Box Shadow:       elevation-1
Padding:          16px
Margin:           varies (typically 16px between cards)
Hover Shadow:     elevation-2 (subtle lift on hover)
Transition:       box-shadow 250ms cubic-bezier(0.16, 1, 0.3, 1)
```

**Card Sections**

```
.card__header
  Border Bottom:    1px solid --color-card-border-inner
  Padding:          16px
  Font Weight:      550 (Semibold)
  Font Size:        16px

.card__body
  Padding:          16px
  Font Size:        14px
  Line Height:      1.5

.card__footer
  Border Top:       1px solid --color-card-border-inner
  Padding:          16px
  Background:       Slightly darker than body (--color-gray-50 or --color-gray-100)
  Font Size:        12px
  Text Color:       --color-text-secondary
```

**Data/Stat Card** (Specialized)
```
Background:       --color-surface
Padding:          24px
Metric Size:      24px, weight 600
Metric Color:     --color-text-primary
Label:            12px, weight 500, color --color-text-secondary
Trend Indicator:  Small arrow + percentage, color --color-success or --color-error
```

---

### Tables

#### Table Structure & Styling

```
Container:        100% width, horizontal scroll on mobile
Background:       --color-surface
Border:           1px solid --color-border on wrapper
Border Radius:    --radius-base on wrapper
Overflow:         Hidden (children rounded corners)
```

**Header Row**
```
Background:       --color-gray-100 (light mode), --color-gray-800 (dark mode)
Border Bottom:    1px solid --color-border
Padding:          12px 16px per cell
Font Weight:      550 (Semibold)
Font Size:        12px (uppercase, optional)
Text Color:       --color-text-secondary (slightly muted)
Sticky:           Yes, position: sticky, top: 0, z-index: 10
```

**Data Rows**
```
Padding:          12px 16px per cell
Border Bottom:    1px solid --color-card-border-inner
Font Size:        14px
Text Color:       --color-text-primary
Hover Background: --color-bg-1 or rgba(--color-primary-500, 0.05)
Selected Row:     Background --color-bg-1, left border 3px solid --color-primary-500
```

**Column Alignment**
```
Numbers:          Right-aligned
Text/Strings:     Left-aligned
Dates:            Left-aligned
Status:           Center-aligned
Actions:          Right-aligned
```

**Interactive Features**

- **Sorting:** Click header to sort. Show ▲ / ▼ arrow indicator.
- **Bulk select:** Checkbox in header to select all visible rows.
- **Inline actions:** "Edit", "Delete", "More" buttons in last column. Show on hover or always visible depending on density.
- **Row selection:** Make entire row clickable (except for links/buttons).
- **Empty state:** Center text + icon in middle of table when no rows present.

---

### Modals & Dialogs

#### Modal Structure

```
Backdrop/Overlay  | Background: rgba(0, 0, 0, 0.5), z-index: 90, animation: fade-in 200ms
Modal Container   | Max-width: 512px (default), elevation-3, border-radius: 12px
Position          | Fixed, center (top: 50%, left: 50%, transform: translate(-50%, -50%))
Overflow          | Hidden, shadow elevation-3
Padding (Body)    | 24px
```

**Modal Anatomy**

```
.modal__header
  Padding:          16px 24px
  Border Bottom:    1px solid --color-border
  Display:          Flex, justify-between, align-items: center
  Title:            18px, weight 600
  Close Button:     Icon-only, 24px, positioned top-right

.modal__body
  Padding:          24px
  Max Height:       60vh (scrollable)
  Overflow:         Auto

.modal__footer
  Padding:          16px 24px
  Border Top:       1px solid --color-border
  Background:       --color-gray-50 or --color-gray-100 (light mode)
  Display:          Flex, justify-end, gap: 12px
  Buttons:          Primary (right) + Secondary (left)
```

**Animation**
```
Entrance:   Fade in: 200ms, opacity 0 → 1
            Scale: 95% → 100%, cubic-bezier(0.16, 1, 0.3, 1)
Exit:       Fade out: 150ms, opacity 1 → 0
            Scale: 100% → 98%
```

**Best Practices**

- **Focus trap.** Tab cycling stays within modal.
- **Close on backdrop click.** Allow dismissal by clicking outside (unless destructive action).
- **Escape key.** ESC key closes modal (except for critical confirmations).
- **Accessible close button.** Visible, labeled, easy to hit (min 44px touch target).

---

### Notifications & Toasts

#### Toast Notification

```
Position:         Fixed, bottom-right corner (12px from edges)
Width:            320px (desktop), 100% - 32px (mobile)
Padding:          12px 16px
Border Radius:    --radius-md (10px)
Background:       Varies by type (success, error, warning, info)
Border:           1px solid (darker tint of background)
Box Shadow:       elevation-3
Z-Index:          200
```

**Toast Types**

```
Success           | Background: rgba(--color-success, 0.95), Border: --color-success
Error             | Background: rgba(--color-error, 0.95), Border: --color-error
Warning           | Background: rgba(--color-warning, 0.95), Border: --color-warning
Info              | Background: rgba(--color-info, 0.95), Border: --color-info
```

**Content Layout**

```
Icon (16px)  |  Text (14px)  |  Close (16px)
  8px        |     8px       |     auto
```

**Animation**
```
Entrance:   Slide up from bottom: 200ms, cubic-bezier(0.16, 1, 0.3, 1)
            Opacity: 0 → 1
Exit:       Slide down: 150ms
            Opacity: 1 → 0
Auto-dismiss: 4 seconds (success/info), 6 seconds (warning/error)
            Can be dismissed early by user click
```

#### Inline Alert / Banner

```
Width:            Full-width or container-width
Padding:          12px 16px
Border Radius:    --radius-base (8px)
Border:           Left border 3px solid (color per type)
Background:       rgba(color, 0.1) or lighter tint
Box Shadow:       None (no elevation, sits in-content)
```

---

### Overlays & Popovers

#### Popover / Tooltip

**Popover** (larger, interactive)
```
Min Width:        160px
Max Width:        320px
Padding:          12px 16px
Background:       --color-surface
Border:           1px solid --color-border
Border Radius:    --radius-sm (6px)
Box Shadow:       elevation-2
Z-Index:          250
Arrow:            Positioned toward trigger element, 8px pointing up/down/left/right
```

**Tooltip** (small, read-only)
```
Max Width:        200px
Padding:          6px 10px
Background:       --color-gray-700 (dark mode style, even in light mode)
Text Color:       #FFFFFF
Border Radius:    --radius-sm (6px)
Font Size:        11px
Box Shadow:       elevation-1
Z-Index:          250
Arrow:            4px triangle
```

**Positioning**
- **Smart placement.** Popover appears above by default. If insufficient space, appear below.
- **Alignment.** Center popover on trigger element.
- **Offset.** 8px distance from trigger to popover edge.

**Animation**
```
Entrance:   Fade in: 150ms, opacity 0 → 1
            Scale: 95% → 100%
Exit:       Fade out: 100ms
Triggered by: Hover (tooltip), click (popover), focus
```

---

## Interaction & Motion Guidelines

### Animation Timing & Easing

**Duration Scale**

```
--duration-quick:     100ms  [For micro-interactions: button presses, icon changes]
--duration-fast:      150ms  [For modular interactions: menu opens, transitions]
--duration-normal:    250ms  [For standard interactions: page transitions, modal opens]
--duration-slow:      400ms  [For large-scale animations: full-page layout shifts]
--duration-slowest:   600ms  [For hero animations, only use sparingly]
```

**Easing Curves** (cubic-bezier format)

```
Standard (most common)
  cubic-bezier(0.16, 1, 0.3, 1)
  Starts quickly, eases to end. Feels natural, "bouncy" but professional.
  Usage: Opens, closes, hovers, standard transitions.

Linear
  cubic-bezier(0, 0, 1, 1) or linear
  Constant speed. Used only for continuous motion (progress bars, loading spinners).
  Usage: Spinners, loading bars, infinite animations.

Ease-in (slow start, fast end)
  cubic-bezier(0.4, 0, 1, 1)
  Elements "gather momentum." Feels heavy, intentional.
  Usage: Exits, dismissals, elements leaving the screen.

Ease-out (fast start, slow end)
  cubic-bezier(0, 0, 0.2, 1)
  Light, "graceful entrance." Feels responsive.
  Usage: Entrances, appears, elements entering screen.
```

**Recommended Animation Patterns**

```
Button Hover      | Background color shift     | 150ms standard easing
Button Press      | Slight scale (0.98)        | 100ms linear (snappy)
Menu Open         | Fade in + slide down       | 200ms standard easing
Menu Close        | Fade out + slide up        | 150ms ease-in
Modal Appear      | Fade in + scale up         | 250ms standard easing
Modal Dismiss     | Fade out + scale down      | 200ms ease-in
Tooltip Appear    | Fade in only               | 100ms linear
Focus Ring        | Glow effect (optional)     | 150ms standard easing
Success Feedback  | Checkmark animation       | 300ms standard easing
Error Shake       | Slight horizontal shift    | 400ms ease-in-out (avoid—jarring)
Page Load         | Progressive content fade   | 250–400ms per section
Scroll Snap       | Smooth scroll              | 300ms standard easing
```

### Micro-Interaction Patterns

#### Hover States

**Button Hover**
- Change: Background color shift (darker tint) + subtle scale (1.02)
- Duration: 150ms
- Easing: Standard (0.16, 1, 0.3, 1)
- Feedback: Visual change, cursor changes to pointer

**Link Hover**
- Change: Color shift to darker primary + optional underline
- Duration: 150ms
- Easing: Standard
- Avoid: Box shadow or background, too heavy for text links

**Card Hover**
- Change: Box shadow elevation-1 → elevation-2, slight scale (1.01)
- Duration: 250ms
- Easing: Standard
- Avoid: Color shifts, maintain visual hierarchy

#### Focus States

- **Keyboard focus ring:** Always visible, 2px solid outline, 2px offset
- **Color:** --color-border-focus or primary color tint
- **Animation:** No animation needed; outline appears instantly
- **Accessibility:** Ring must have >= 4.5:1 contrast against background

#### Loading States

**Spinner**
- **Style:** Circular, 24px default size, 2px stroke
- **Color:** --color-primary-500
- **Animation:** Rotate 360° continuously, 1200ms linear, no easing
- **Avoid:** Bounce or pulsing, stick to constant rotation

**Skeleton Loader** (Preferred over spinner for content)
- **Shape:** Placeholder blocks matching real content shape
- **Color:** --color-gray-200 (light) or --color-gray-700 (dark)
- **Animation:** Shimmer effect (linear gradient sliding left-to-right)
- **Duration:** 2000ms linear, infinite
- **Gradient:** From transparent → 30% opacity → transparent
- **Fade to content:** Cross-fade (200ms) from skeleton to real content

**Shimmer Effect Code**
```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite linear;
}
```

---

## Feedback, States & Error Handling

### Validation Feedback

#### Inline Validation (Recommended)

**Timing Rules**

```
Show error:       On blur (when user leaves field)
Remove error:     As soon as user corrects input (on change)
Show success:     Only for complex fields (email, password confirmation)
Never validate:   While user is still typing (premature validation)
```

**Visual Treatment**

```
Error State
  Border:         2px solid --color-error
  Icon:           ⚠️ right-aligned inside field
  Message:        Below field, 8px gap, 12px font, --color-error
  Background:     Optional: rgba(--color-error, 0.05)

Success State
  Icon:           ✓ right-aligned, --color-success
  Message:        Optional: "Looks good!" or similar
  Animation:      Fade in checkmark 200ms

Hint Text (Above field)
  Color:          --color-text-secondary
  Font Size:      12px
  Margin:         8px below label
  Example:        "Password must be 8+ characters"
```

**Message Guidelines**

- **Explicit:** "Email must include @" > "Invalid format"
- **Constructive:** "Password must contain a number" > "Password invalid"
- **Polite:** "Please enter a valid date" > "Wrong date"
- **No jargon:** Avoid technical terms; write for users
- **Not red-only:** Pair color with icon and text for accessibility

---

### Loading States

**Response Time Guidelines**

```
< 100ms    | No feedback needed (feels instant)
100–300ms  | Show subtle feedback (skeleton, small spinner)
300–1000ms | Show prominent feedback (progress bar, larger spinner)
> 1000ms   | Show message + cancel option ("This is taking longer...")
```

**Perceived Performance Optimization**

1. **Skeleton screens (best):** Show UI structure immediately, fade in real content
2. **Progressive loading:** Load headers first, then details, then images
3. **Optimistic updates:** Show result before server confirmation (e.g., "Published!" before server responds)

---

### Empty States

**When to Show Empty State**

- No data yet (new user, no filters applied)
- Search returned no results
- After user deletes all items in a list

**Design Pattern**

```
Icon            | 64px, --color-gray-300, muted
Title           | 16px weight 600, --color-text-primary
Subtitle        | 14px weight 400, --color-text-secondary, 1–2 sentences max
Primary CTA     | Button pointing to next action ("Create new", "Adjust filters")
Optional:       | Link or secondary CTA ("Learn more", "Upload CSV")
```

**Best Practices**

- **Be helpful.** Show reason why it's empty, not just "No items found"
- **Suggest action.** Primary button should resolve the empty state
- **No clutter.** Empty state should be clean, not a graveyard of features

---

### Error & Failure States

**Error Hierarchy**

```
Validation Error  | Inline, below field, field border red
Form Error        | Alert banner at top of form, list of errors
Network Error     | Toast notification, "Try again" button
Permission Error  | Inline message, no action available
Not Found (404)   | Full-page design with "Go home" button
Server Error      | Toast or banner, option to retry, "Contact support" link
```

**Recovery Patterns**

- **Show cause:** "Connection lost" > "Error"
- **Suggest next step:** "Retry" button, "Go back" link
- **Don't repeat.** Remove error state once user corrects issue
- **Log for debugging:** Provide error code for support inquiries (small, gray text)

---

## Information Architecture & Hierarchy

### Visual Hierarchy Patterns

**Primary Actions**
- Solid background, primary color
- Highest visual weight
- Positioned prominently (right in dialogs, top in forms)
- Example: "Save", "Publish", "Send"

**Secondary Actions**
- Border or ghost style
- Medium visual weight
- Positioned left or below primary
- Example: "Cancel", "Discard", "Save Draft"

**Tertiary Actions**
- Text link or very subtle border
- Lowest visual weight
- Optional, contextual
- Example: "Learn more", "See details", "Undo"

**Destructive Actions**
- Red/error color background
- Requires secondary confirmation (modal or tooltip)
- Example: "Delete", "Remove access", "Purge data"

### Page Layout Principles

**Header Area** (Navigation)
```
Height:       56px (desktop), 48px (mobile)
Sticky:       Yes
Content:      Logo, nav, user menu, notifications
Z-Index:      30
Shadow:       None (or elevation-1 on scroll)
```

**Breadcrumbs** (if needed)
```
Position:     Below main header, above page title
Font Size:    12px
Color:        --color-text-secondary
Separator:    "/"
Link Color:   --color-primary-500 (underline on hover)
```

**Page Title Section**
```
Title:        20–24px weight 600
Subtitle:     14px weight 400, --color-text-secondary (optional)
Primary CTA:  Button positioned right
Padding:      24px top, 16px bottom
```

**Main Content**
```
Max Width:    1280px (centered)
Padding:      0px 24px (desktop), 0px 16px (mobile)
Margin:       Auto for centering
Layout:       Two-column (sidebar + main) or full-width
```

**Sidebar** (if applicable)
```
Width:        256px fixed or 25% flexible
Position:     Left side, sticky
Z-Index:      20
Border:       Right 1px solid --color-border
Overflow:     Auto, scrollable
```

---

## State & Feedback Guidelines

### Loading Progression

**1. Trigger (0ms)**
- User clicks button or action
- Immediate visual feedback (button color change, cursor change)

**2. Anticipation (0–300ms)**
- Show skeleton screen or small spinner
- Confirm action was received

**3. Progression (300ms–n)**
- Show progress bar for long-running operations
- Update spinner size or add helpful message
- For very long waits, show estimated time

**4. Completion (n+250ms)**
- Show success state (toast, inline confirmation)
- Return to default state or navigate to result

**5. Failure (at any step)**
- Show error toast with "Retry" button
- Keep UI in error state until retry or dismissal
- Log error code for debugging

---

### Accessibility Requirements (WCAG AA Minimum)

**Color Contrast**
```
Normal text:      4.5:1 ratio minimum
Large text (18px+): 3:1 ratio minimum
Graphics/UI:      3:1 ratio for meaningful elements
Test with:        WAVE, aXe, or Chrome DevTools
```

**Focus Management**

```
Focus Visible:     Always visible, 2px solid outline
Focus Order:       Logical reading order (top-left to bottom-right)
Focus Trap:        Modal keeps focus cycling within itself
Focus Return:      After modal close, focus returns to trigger element
Skip Links:        Optional "Skip to main content" link at top of page
```

**Keyboard Navigation**

```
Tab:              Navigate forward through interactive elements
Shift+Tab:        Navigate backward
Enter/Space:      Activate buttons, open dropdowns, toggle checkboxes
Escape:           Close modals, dropdowns, popovers
Arrow Keys:       Navigate within lists, tabs, sliders
```

**Screen Reader Considerations**

- **Semantic HTML:** Use `<button>`, `<nav>`, `<main>`, `<heading>` correctly
- **ARIA labels:** `aria-label` for icon-only buttons
- **ARIA descriptions:** `aria-describedby` for help text
- **Live regions:** `aria-live` for dynamic content updates
- **Disabled state:** `aria-disabled="true"` on disabled buttons

---

## Systemization & Design Tokens

### Token Organization

**Directory Structure** (CSS/SCSS)

```
variables/
  ├─ colors.css       (Primitive: --color-primary-500, etc.)
  ├─ spacing.css      (--space-8, --space-16, etc.)
  ├─ typography.css   (--font-size-*, --font-weight-*)
  ├─ radius.css       (--radius-sm, --radius-base, etc.)
  ├─ shadows.css      (--shadow-sm, elevation tokens)
  ├─ motion.css       (--duration-*, easing curves)
  └─ semantic.css     (Role-based: --color-text-primary, etc.)
```

**Naming Convention**

```
Pattern:  --{category}-{property}-{variant}
Examples: --color-primary-500
          --spacing-base-16
          --shadow-elevation-2
          --duration-normal-250ms
```

**Component-Level CSS**

```
.button {
  /* Use tokens, not hardcoded values */
  background: var(--color-primary-500);
  padding: var(--space-8) var(--space-16);
  border-radius: var(--radius-base);
  transition: background-color var(--duration-fast) var(--easing-standard);
}

.button:hover {
  background: var(--color-primary-600);
}
```

### Living Documentation

**What to Document**

1. **Usage examples.** Show the component in all states with code
2. **Anatomy.** Label all subcomponents and spacing
3. **Behavior.** Animation timing, interaction patterns
4. **Accessibility checklist.** What devs must implement
5. **Do's and Don'ts.** Common mistakes with visual examples
6. **Variants.** All size, color, and state combinations

**Tools for Living Design Systems**

- **Storybook:** Component library with Figma plugin sync
- **Chromatic:** Visual regression testing for components
- **Zeroheight:** Design system documentation platform
- **Figma Design System mode:** Tokens, components, styles in one
- **Design system website:** Custom docs site with code snippets

### Handoff from Design to Code

**Designer Responsibilities**

1. Export tokens as JSON or CSS variables
2. Provide Figma component library with proper naming
3. Document spacing & sizing on key components
4. Specify animation timing in Figma comments or external doc
5. Create a visual audit of all button states, form states, etc.

**Developer Responsibilities**

1. Implement CSS variables exactly as exported
2. Match spacing, colors, and typography to token values
3. Test all interaction states (hover, focus, active, disabled)
4. Verify color contrast with WCAG tools
5. Test keyboard navigation and screen readers

**Version Control**

- Keep tokens in Git alongside code
- Tag token updates with semantic versioning (v1.0.0, v1.1.0)
- Document breaking changes in CHANGELOG

---

## Implementation Checklist

### For Design Teams

- [ ] Create a Figma library with all tokens exported
- [ ] Build reusable components for all states
- [ ] Document typography scale with responsive rules
- [ ] Create elevation guidelines with shadow visualizations
- [ ] Specify animation timings in component notes
- [ ] Provide a color palette document with WCAG contrast checks
- [ ] Create a UI kit with all button, input, and card variants
- [ ] Design empty states, error states, loading states
- [ ] Review accessibility with axe DevTools or WAVE
- [ ] Build a design system website or wiki

### For Frontend Development Teams

- [ ] Set up CSS variable system matching Figma tokens
- [ ] Create base component library (Button, Input, Card, etc.)
- [ ] Implement all component states with CSS classes
- [ ] Add focus indicators (outline-based, not shadow-based)
- [ ] Test color contrast programmatically in CI
- [ ] Implement skeleton screens for async content
- [ ] Build toast notification system
- [ ] Create form validation patterns (inline, with messaging)
- [ ] Test keyboard navigation and screen readers
- [ ] Document components in Storybook with live examples
- [ ] Set up visual regression testing

### For Product Teams

- [ ] Review all error messaging for clarity and tone
- [ ] Audit empty states for helpful guidance
- [ ] User-test loading states (does skeleton feel fast?)
- [ ] Validate form validation (inline vs. submit-time)
- [ ] Check focus trap behavior in modals
- [ ] Review all CTAs for action-oriented language
- [ ] Audit notification patterns (toast fatigue?)
- [ ] Test with screen readers (NVDA, JAWS, VoiceOver)

---

## Premium Touch Addendum: The Intangibles

### What Makes an Interface Feel "Premium"

Beyond pixels and code, premium interfaces exhibit:

1. **Confidence in negative space.** Generous padding and spacing signal that the product isn't cramming features in.
2. **Consistency you don't notice.** When spacing, colors, and typography are perfectly aligned, users feel the coherence without consciously observing it.
3. **Thoughtful feedback.** A checkmark animation that celebrates user success, error messaging that helps rather than blames.
4. **Restraint.** Fewer colors, fewer animations, fewer effects. Every element serves a purpose.
5. **Polish in details.** Focus rings that glow, hover effects that feel natural, loading states that don't frustrate.
6. **Accessibility as default.** High contrast, clear labels, keyboard support—not added later.
7. **Performance perception.** Skeleton screens, optimistic updates, instant feedback. The app feels fast before it is fast.

### Red Flags (What to Avoid)

- **Inconsistent spacing:** 12px here, 15px there. Layout feels janky.
- **Too many animations:** Every interaction spins, bounces, or fades. Feels chaotic.
- **Color contrast issues:** Text on light backgrounds with insufficient contrast. Feels unprofessional.
- **Unresponsive feedback:** Clicks with no visual confirmation. Feels broken.
- **Disabled states that are confusing:** No explanation of why button is disabled. Feels incomplete.
- **Accessibility afterthought:** Focus only on mouse users, ignore keyboard and screen readers. Feels exclusionary.
- **Arbitrary design decisions:** Shadows, borders, and spacing with no system. Feels ad-hoc.

---

## Conclusion

Premium UI design is **systematic, restrained, and intentional**. It prioritizes clarity, accessibility, and user confidence. By adhering to this spec—consistent tokens, predictable components, thoughtful micro-interactions, and deliberate feedback—Aurastream can deliver interfaces that feel not just functional, but genuinely *premium*.

The key is **discipline:** follow the system, resist ad-hoc decisions, and let the constraints drive better design. In the end, constraints create confidence. And confidence creates premium.

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Audience:** Designers, Frontend Engineers, Product Managers  
**For:** Aurastream Premium Streaming Assets UI