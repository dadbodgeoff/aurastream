# 🎨 AURASTREAM FRONTEND MASTER SCHEMA
## Comprehensive UI/UX Reference for AI Agents

**Version:** 1.0.0  
**Last Updated:** December 28, 2025  
**Purpose:** Definitive reference for all frontend development on AuraStream

---

## QUICK REFERENCE

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS with custom design tokens
- **State:** TanStack Query (server state), Zustand (client state)
- **Animation:** Framer Motion
- **Icons:** Custom icon components + Lucide React

### Key Directories
```
tsx/apps/web/src/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── dashboard/          # Dashboard-specific components
│   ├── ui/                 # Shared UI primitives
│   ├── community/          # Community feature components
│   ├── coach/              # Prompt Coach components
│   ├── aura-lab/           # Aura Lab components
│   ├── vibe-branding/      # Vibe Branding components
│   └── forms/              # Form components
├── hooks/                  # Custom React hooks
└── lib/                    # Utilities (cn, etc.)

tsx/packages/
├── api-client/             # API hooks and types
├── shared/                 # Shared utilities, analytics, hooks
└── ui/                     # Design tokens (spacing, colors)
```

---

## DESIGN SYSTEM STANDARDS

### Spacing Scale (8px Grid) - STRICT COMPLIANCE
```
Base Unit: 8px
Half-steps: 4px increments

ALLOWED Tailwind Classes (on 8px grid):
- p-1 / m-1   = 4px   ✓
- p-2 / m-2   = 8px   ✓
- p-3 / m-3   = 12px  ✓
- p-4 / m-4   = 16px  ✓
- p-6 / m-6   = 24px  ✓
- p-8 / m-8   = 32px  ✓
- p-10 / m-10 = 40px  ✓
- p-12 / m-12 = 48px  ✓

AVOID (not on 8px grid):
- p-5 / m-5   = 20px  ✗ Use p-4 (16px) or p-6 (24px) instead
- gap-5       = 20px  ✗ Use gap-4 (16px) or gap-6 (24px) instead

EXCEPTION: space-y-5 is allowed for form field spacing (20px vertical rhythm)
```

### Standard Component Spacing
```typescript
// Card Padding
card.sm  = 'p-3'   // 12px
card.md  = 'p-4'   // 16px
card.lg  = 'p-6'   // 24px

// Button Padding
button.sm = 'px-3 py-2'   // 12px x 8px
button.md = 'px-4 py-2'   // 16px x 8px
button.lg = 'px-6 py-3'   // 24px x 12px

// Input Padding
input.sm = 'px-3 py-2'    // 12px x 8px
input.md = 'px-4 py-2'    // 16px x 8px
input.lg = 'px-4 py-3'    // 16px x 12px

// Section Spacing
section.sm = 'space-y-4'  // 16px
section.md = 'space-y-6'  // 24px
section.lg = 'space-y-8'  // 32px
```

### Border Radius
```
rounded-lg   = 8px   // Inputs, buttons, small cards
rounded-xl   = 12px  // Cards, dropdowns
rounded-2xl  = 16px  // Modals, large containers
rounded-3xl  = 24px  // Hero sections (rare)
rounded-full         // Pills, avatars, badges
```

### Touch Targets (Accessibility)
```
Minimum: 44x44px (WCAG 2.1)

Implementation:
- Buttons: min-h-11 (44px) or min-h-[44px]
- Icon buttons: w-11 h-11 (44px)
- Nav items: min-h-11 (44px)
- Form inputs: min-h-10 (40px) acceptable for desktop
```

### Shadows & Elevation (5-Tier System)
```
Elevation 0 - Base/Flat
  Shadow:    none
  Z-Index:   0
  Usage:     Main background, base surfaces

Elevation 1 - Raised (Cards, panels)
  Shadow:    shadow-sm
  Z-Index:   10
  Usage:     Cards, panels, low-prominence content
  Hover:     shadow-md (elevation 2)

Elevation 2 - Floating (Overlays, hover states)
  Shadow:    shadow-md
  Z-Index:   20
  Usage:     Interactive overlays, hovered cards, popovers

Elevation 3 - Modal/Dialog
  Shadow:    shadow-lg or shadow-xl
  Z-Index:   100
  Usage:     Modals, drawers, menus with scrim

Elevation 4 - Toast/Floating Action
  Shadow:    shadow-xl
  Z-Index:   200
  Usage:     Toast notifications, floating buttons, alerts

Elevation 5 - Maximum (rare)
  Shadow:    shadow-2xl
  Z-Index:   250
  Usage:     Tooltips, extreme emphasis
```

### Shadow Usage Guidelines
```typescript
// Card hover elevation pattern
'shadow-sm hover:shadow-md transition-all'

// Modal elevation
'shadow-xl'  // Elevation 3

// Toast elevation
'shadow-xl'  // Elevation 4

// Focus rings (teal-based)
'focus:ring-2 focus:ring-interactive-500'
'focus:ring-2 focus:ring-interactive-500/50'  // With opacity

// Colored shadows (for CTAs, special elements)
'shadow-lg shadow-interactive-600/30'
'hover:shadow-xl hover:shadow-interactive-600/40'
```

### Z-Index Scale
```
z-0        = 0      // Base layer
z-10       = 10     // Raised cards
z-20       = 20     // Floating overlays
z-30       = 30     // Sticky headers
z-50       = 50     // Standard modals
z-[100]    = 100    // High-priority modals
z-[200]    = 200    // Toasts, floating actions
z-[250]    = 250    // Tooltips
```

---

## COLOR SYSTEM

### Premium Teal Palette (December 2025 Redesign)
```css
/* Primary Teal - Brand Identity */
--color-primary-500: #21808D;  /* Main brand color */
--color-primary-600: #247380;  /* Hover state */
--color-primary-700: #1A7373;  /* Active/pressed state */
--color-primary-300: #32B8C6;  /* Light variant (dark mode) */

/* Neutral Colors */
--color-gray-900: #131B3B;     /* Charcoal - text on light */
--color-gray-800: #262828;     /* Dark - surface in dark mode */
--color-gray-700: #1F2121;     /* Darker - modal overlays */
--color-gray-400: #777C7C;     /* Medium - muted text */
--color-gray-300: #A7A9A9;     /* Light - subtle borders */
--color-gray-100: #F5F5F5;     /* Off-white - surfaces */
--color-gray-50:  #FCFCF9;     /* Cream - main background */

/* Semantic Colors */
--color-success: #218081;      /* Teal-green */
--color-warning: #A84F2F;      /* Warm coral */
--color-error:   #C0152F;      /* Deep red */
--color-info:    #62756E;      /* Slate */
```

### Semantic Color Tokens
```css
/* Text Colors */
text-text-primary      /* Main text - #131B3B */
text-text-secondary    /* Secondary text - #777C7C */
text-text-tertiary     /* Muted/helper text - #62756E */
text-text-muted        /* Very muted text - #A7A9A9 */
text-text-disabled     /* Disabled state */

/* Background Colors */
bg-background-default  /* Page background - #FCFCF9 (light) / #1F2121 (dark) */
bg-background-surface  /* Card/panel background - #262828 */
bg-background-elevated /* Hover/elevated state */
bg-background-base     /* Base layer */

/* Border Colors */
border-border-subtle   /* Light borders - rgba(94, 82, 64, 0.20) */
border-border-default  /* Standard borders */
border-border-focus    /* Focus ring - #21808D */

/* Interactive Colors (Teal) */
text-interactive-500   /* Primary brand color - #21808D */
text-interactive-600   /* Primary hover - #247380 */
bg-interactive-500     /* Primary button bg - #21808D */
bg-interactive-600     /* Primary button hover - #247380 */
bg-interactive-500/10  /* Light tint for badges */

/* Primary Colors (alias for interactive) */
text-primary-500       /* #21808D */
text-primary-600       /* #247380 */
bg-primary-500         /* #21808D */
bg-primary-600         /* #247380 */
bg-primary-500/10      /* Light tint */
```

### Status Colors
```css
/* Success - Teal-green */
text-emerald-500, bg-emerald-500/10
/* Or use semantic: */
text-success-main, bg-success-main/10

/* Warning - Warm coral */
text-amber-500, bg-amber-500/10
/* Or use semantic: */
text-warning-main, bg-warning-main/10

/* Error - Deep red */
text-red-500, bg-red-500/10
/* Or use semantic: */
text-error-main, bg-error-main/10

/* Info - Teal (matches primary) */
text-primary-500, bg-primary-500/10
```

### Gradient Utilities
```css
/* Premium teal gradient text */
.gradient-text {
  background: linear-gradient(135deg, #21808D 0%, #32B8C6 50%, #247380 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Glow effects */
.glow-primary {
  box-shadow: 0 0 40px rgba(33, 128, 141, 0.3);
}

.glow-teal {
  box-shadow: 0 0 40px rgba(50, 184, 198, 0.3);
}

/* Pulse glow animation */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(33, 128, 141, 0.3); }
  50% { box-shadow: 0 0 40px rgba(33, 128, 141, 0.5); }
}
```

---

## LAYOUT PATTERNS

### Page Container Standard
```tsx
// All dashboard pages use this pattern
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
  <PageHeader title="Page Title" subtitle="Description" />
  {/* Page content */}
</div>

// Or via PageContainer component
<PageContainer title="Page Title" description="Description">
  {/* Content with space-y-6 between sections */}
</PageContainer>
```

### Responsive Breakpoints
```
Mobile-first approach:
- Base: < 640px (mobile)
- sm: 640px (large mobile/small tablet)
- md: 768px (tablet)
- lg: 1024px (desktop)
- xl: 1280px (large desktop)
```

### Standard Grid Patterns
```tsx
// Asset/Card Grid (responsive)
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">

// Component Grid (3-column max)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Stat Cards (2-3 columns)
<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

// Quick Actions (4-column)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

### Section Header Pattern
```tsx
<h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-4">
  Section Title
</h2>
```

---

## COMPONENT REFERENCE

### Modal Sizes
```typescript
// Modal.tsx size options
const modalSizes = {
  sm: 'max-w-sm',     // 384px - Confirmations, alerts
  md: 'max-w-md',     // 448px - Standard forms
  lg: 'max-w-lg',     // 512px - Larger forms (default)
  xl: 'max-w-xl',     // 576px - Feature modals
  '2xl': 'max-w-2xl', // 672px - Large feature modals
  full: 'max-w-4xl',  // 896px - Complex content
};

// ResponsiveModal defaults
// Desktop: max-w-lg (512px)
// Mobile: Full-width bottom sheet
// Padding: p-4 (mobile) / p-6 (desktop)
```


### Button Variants
```typescript
// Primary Button - Full state coverage
const primaryButton = cn(
  'px-4 py-2 min-h-[44px]',                    // Touch target
  'bg-interactive-600 text-white',             // Default
  'hover:bg-interactive-500',                  // Hover
  'active:bg-interactive-700 active:scale-[0.98]', // Active/pressed
  'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2', // Focus
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100', // Disabled
  'transition-all duration-150',               // Animation
  'text-sm font-medium rounded-lg'             // Typography & shape
);

// Secondary Button
const secondaryButton = cn(
  'px-4 py-2 min-h-[44px]',
  'bg-background-elevated text-text-primary',
  'hover:bg-background-surface',
  'active:scale-[0.98]',
  'focus:outline-none focus:ring-2 focus:ring-interactive-500',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'transition-all duration-150',
  'text-sm font-medium rounded-lg border border-border-subtle'
);

// Ghost Button
const ghostButton = cn(
  'px-4 py-2 min-h-[44px]',
  'bg-transparent text-text-secondary',
  'hover:bg-background-elevated hover:text-text-primary',
  'active:scale-[0.98]',
  'focus:outline-none focus:ring-2 focus:ring-interactive-500',
  'transition-all duration-150',
  'text-sm font-medium rounded-lg'
);

// Destructive Button
const destructiveButton = cn(
  'px-4 py-2 min-h-[44px]',
  'bg-red-500 text-white',
  'hover:bg-red-600',
  'active:bg-red-700 active:scale-[0.98]',
  'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'transition-all duration-150',
  'text-sm font-medium rounded-lg'
);

// Button sizes with touch targets
const buttonSizes = {
  sm: 'h-8 min-h-[44px] px-3 text-sm',   // 32px visual, 44px touch
  md: 'h-10 min-h-[44px] px-4 text-sm',  // 40px visual, 44px touch
  lg: 'h-12 px-6 text-base',              // 48px (meets 44px)
};
```

### Input Sizes
```typescript
const inputSizes = {
  sm: 'h-8 px-3 text-sm',    // 32px
  md: 'h-10 px-4 text-sm',   // 40px (standard)
  lg: 'h-12 px-4 text-base', // 48px
};

// Standard input styling with premium focus
const inputBase = cn(
  'w-full min-h-[44px] rounded-lg border border-border-subtle',
  'bg-background-surface text-text-primary',
  'placeholder:text-text-muted',
  'focus:outline-none focus:ring-2 focus:ring-interactive-500/50',
  'focus:border-interactive-500',
  'transition-all duration-150'
);
```

### Card Variants
```typescript
// StatCard sizes
const statCardSizes = {
  sm: 'p-3',  // 12px - Compact stats
  md: 'p-4',  // 16px - Standard stats
  lg: 'p-6',  // 24px - Featured stats
};

// Standard card styling with hover elevation
const cardBase = cn(
  'bg-background-surface/50 border border-border-subtle rounded-xl',
  'shadow-sm hover:shadow-md',  // Elevation 1 → 2 on hover
  'transition-all duration-200'
);
```

---

## PAGE STRUCTURE

### Dashboard Shell
```
┌─────────────────────────────────────────────────────────────────┐
│ Desktop Layout                                                   │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                   │
│   Sidebar    │              Main Content                        │
│   (w-64)     │              (flex-1, p-4 md:p-8)               │
│              │                                                   │
│   - Logo     │   ┌─────────────────────────────────────────┐   │
│   - Nav      │   │ PageContainer (max-w-7xl mx-auto)       │   │
│   - Usage    │   │   - PageHeader                          │   │
│   - User     │   │   - Content sections (space-y-6)        │   │
│              │   └─────────────────────────────────────────┘   │
└──────────────┴──────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Mobile Layout                                                    │
├─────────────────────────────────────────────────────────────────┤
│ Header (h-14, sticky)                                           │
│   - Logo (left)                                                 │
│   - MobileNavDropdown (right)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    Main Content                                  │
│                    (p-4, overflow-y-auto)                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Standard Page Template
```tsx
'use client';

import { PageContainer } from '@/components/dashboard';
import { PageHeader } from '@/components/navigation';

export default function ExamplePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader 
        title="Page Title"
        subtitle="Page description"
        actions={<ActionButtons />}
      />
      
      {/* Section 1 */}
      <section>
        <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-4">
          Section Title
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Content */}
        </div>
      </section>
      
      {/* Section 2 */}
      <section>
        {/* More content */}
      </section>
    </div>
  );
}
```

---

## COMPONENT DIRECTORY

### Dashboard Components (`/components/dashboard/`)

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `PageContainer` | Page wrapper with header | title, description, actions |
| `StatCard` | KPI display card | label, value, trend, icon, size |
| `MetricsGrid` | Grid of stat cards | children |
| `UsageMeter` | Progress bar for usage | used, limit, label |
| `QuickActionCard` | Action button card | title, description, icon, href |
| `ActivityFeed` | Recent activity list | activities, maxItems |
| `ActivityItem` | Single activity row | type, title, timestamp, status |
| `AssetCard` | Asset thumbnail card | asset, onSelect, onDownload |
| `BrandKitCard` | Brand kit preview | brandKit, isActive, onActivate |
| `JobCard` | Generation job status | job, onCancel |
| `DataTable` | Sortable data table | columns, data, onSort |
| `SearchInput` | Search field | value, onChange, placeholder |
| `FilterDropdown` | Filter select | options, value, onChange |
| `ViewToggle` | Grid/list toggle | view, onChange |
| `Modal` | Dialog modal | isOpen, onClose, size, title |
| `ConfirmDialog` | Confirmation modal | isOpen, onConfirm, onCancel |
| `EmptyState` | Empty content state | title, description, action |
| `ErrorState` | Error display | error, onRetry |

### UI Components (`/components/ui/`)

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `ResponsiveModal` | Mobile-adaptive modal | isOpen, onClose, title |
| `ButtonGroup` | Button with variants | variant, size, children |
| `InputGroup` | Input with addons | leftIcon, rightIcon, size |
| `Toast` | Notification toast | message, type, duration |
| `PullToRefresh` | Mobile pull refresh | onRefresh, children |
| `ContextMenu` | Right-click menu | items, position |
| `OfflineBanner` | Offline indicator | - |

### Form Components (`/components/forms/`)

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `ValidatedInput` | Input with validation | name, label, fieldState |
| `ValidationFeedback` | Validation message | type, message |

### Navigation Components (`/components/navigation/`)

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `PageHeader` | Page title + actions | title, subtitle, actions |
| `Breadcrumbs` | Navigation breadcrumbs | - (auto-detected) |

### Mobile Components (`/components/mobile/`)

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `MobileNavDropdown` | Mobile navigation | onLogout |
| `MobileBottomNav` | Bottom tab bar | - |


---

## FEATURE MODULES

### Community Module (`/components/community/`)
```
Components:
- HeroCarousel        # Rotating banner carousel
- QuickActionCards    # Create action shortcuts
- CreatorSpotlight    # Featured creators section
- InspirationGallery  # Community asset gallery
- ShareAssetModal     # Share to community modal

Page: /community
Layout: max-w-7xl, space-y-8 (larger gaps for feature-rich page)
```

### Aura Lab Module (`/components/aura-lab/`)
```
Components:
- TestSubjectPanel    # Asset selection panel
- FusionCore          # Central fusion interface
- ElementGrid         # Element selection grid
- FusionResultCard    # Fusion result display
- InventoryGallery    # User's fusion inventory

Page: /dashboard/aura-lab
Layout: 3-column grid (lg:grid-cols-12)
```

### Vibe Branding Module (`/components/vibe-branding/`)
```
Components:
- VibeBrandingModal   # Main modal (max-w-2xl)
- UploadDropzone      # Image upload area
- AnalyzingTerminal   # Analysis animation
- VibeResultsDisplay  # Results with colors/fonts

Trigger: Modal from brand-kits page or quick actions
```

### Coach Module (`/components/coach/`)
```
Components:
- CoachSlideOver      # Slide-over panel
- SessionContextBar   # Context display bar
- ChatMessage         # Message bubble
- IntentCard          # Extracted intent display

Page: /dashboard/coach
Layout: Full-height flex, two-phase flow
```

### Promo Board Module (`/components/promo/`)
```
Components:
- PromoComposeModal   # Message compose modal
- MessageCard         # Promo message display
- LeaderboardCard     # Top spenders leaderboard

Page: /promo
Layout: Flex with sidebar (w-80 on desktop)
```

---

## HOOKS REFERENCE

### API Hooks (`@aurastream/api-client`)
```typescript
// Auth
useAuth()                    // Current user state
useLogin(), useLogout()      // Auth actions

// Assets
useAssets(filters)           // Asset list
useJobs()                    // Generation jobs
useOptimisticAssetDeletion() // Optimistic delete

// Brand Kits
useBrandKits()               // Brand kit list
useCreateBrandKit()          // Create mutation
useOptimisticBrandKitActivation()

// Generation
useGenerate()                // Start generation
useJobStatus(jobId)          // Poll job status

// Community
useCommunityPosts(filters)   // Community feed
useFeaturedPosts()           // Featured posts
useTrendingPosts()           // Trending posts
useLikePost(), useUnlikePost()
useFollowUser(), useUnfollowUser()
useSpotlightCreators()       // Featured creators

// Vibe Branding
useAnalyzeImage()            // Image analysis
useVibeBrandingUsage()       // Usage quota

// Aura Lab
useAuraLabInventory()        // User's fusions
useAuraLabUsage()            // Daily usage
useFuse()                    // Fusion mutation
useKeepFusion(), useTrashFusion()

// Promo
usePromoMessages()           // Promo feed
usePinnedMessage()           // Pinned message
useLeaderboard()             // Top spenders
```

### Shared Hooks (`@aurastream/shared`)
```typescript
// Mobile Detection
useMobileDetection()         // { isMobile, isTablet, isDesktop }
useReducedMotion()           // Prefers reduced motion

// Gestures
useLongPress(callback, ms)   // Long press detection
usePinchZoom()               // Pinch zoom gesture
useSwipeGesture()            // Swipe detection
usePullToRefresh()           // Pull to refresh

// Utilities
useNetworkStatus()           // Online/offline state
useKeyboardAware()           // Keyboard visibility
useHapticFeedback()          // Vibration feedback
```

### Local Hooks (`/hooks/`)
```typescript
// UI State
useScrollLock(isLocked)      // Prevent body scroll
useFocusTrap(ref, isActive)  // Focus trap for modals
useIsMobile()                // Simple mobile check

// Features
useUsageStats()              // User usage statistics
useCoachChat()               // Coach chat state
useDownload()                // Asset download handler
useFormValidation(rules)     // Form validation
useGenerationCelebration()   // Milestone celebrations
```

---

## ANIMATION PATTERNS

### Framer Motion Defaults
```typescript
// Fade in
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Slide up
const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

// Scale in
const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// Stagger children
const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};
```

### Premium Easing & Timing
```typescript
// Premium easing function (use for all standard transitions)
// cubic-bezier(0.16, 1, 0.3, 1) - Starts quickly, eases to end
// Available as Tailwind class: ease-standard

// Duration Scale
duration-75    // 75ms  - Micro: button press, icon change
duration-100   // 100ms - Quick: immediate feedback
duration-150   // 150ms - Fast: hover states, menu opens
duration-200   // 200ms - Normal: standard transitions (default)
duration-300   // 300ms - Slow: modals, drawers, large animations
duration-500   // 500ms - Slower: hero animations (use sparingly)

// Recommended Patterns
'transition-all duration-200 ease-standard'     // Standard
'transition-colors duration-150 ease-standard'  // Color changes
'transition-transform duration-150 ease-standard' // Transforms
'transition-all duration-300 ease-standard'     // Modals/drawers
```

### CSS Transitions
```css
/* Standard transition with premium easing */
transition-all duration-200 ease-standard

/* Color changes */
transition-colors duration-150 ease-standard

/* Transform only */
transition-transform duration-150 ease-standard

/* Reduced motion support */
motion-reduce:duration-0   /* Disable for a11y */
motion-reduce:transition-none
```

### Micro-interaction Patterns
```typescript
// Button hover: color shift
'hover:bg-interactive-600 transition-colors duration-150 ease-standard'

// Button press: slight scale
'active:scale-[0.98] transition-transform duration-75'

// Card hover: elevation lift
'shadow-sm hover:shadow-md transition-all duration-200 ease-standard'

// Menu open: fade + slide
'animate-in fade-in-0 slide-in-from-top-2 duration-200'

// Modal appear: scale + fade
'animate-in fade-in-0 zoom-in-95 duration-200'
```

### Modal Animations
```tsx
// Desktop: zoom + fade
'animate-in fade-in-0 zoom-in-95'

// Mobile bottom sheet: slide up
'animate-in slide-in-from-bottom'
```

---

## ACCESSIBILITY STANDARDS

### Touch Targets
- Minimum 44x44px for all interactive elements
- Use `min-h-11` or `min-h-[44px]` for buttons
- Icon buttons: `w-11 h-11`

### Focus States
```css
focus:outline-none 
focus:ring-2 
focus:ring-interactive-500 
focus:ring-offset-2
```

### ARIA Attributes
```tsx
// Modals
role="dialog"
aria-modal="true"
aria-labelledby="modal-title"
aria-describedby="modal-description"

// Buttons
aria-label="Close modal"
aria-expanded={isOpen}
aria-haspopup="menu"

// Loading states
aria-busy={isLoading}
aria-live="polite"
```

### Reduced Motion
```tsx
// Check preference
const prefersReducedMotion = useReducedMotion();

// Apply conditionally
className={cn(
  'transition-transform',
  prefersReducedMotion ? 'duration-0' : 'duration-300'
)}
```


---

## COMMON PATTERNS

### Adding a New Page
```tsx
// 1. Create page file: tsx/apps/web/src/app/dashboard/[feature]/page.tsx
'use client';

import { PageContainer } from '@/components/dashboard';

export default function FeaturePage() {
  return (
    <PageContainer title="Feature" description="Feature description">
      {/* Content */}
    </PageContainer>
  );
}

// 2. Add to Sidebar navigation (if needed)
// tsx/apps/web/src/components/dashboard/layout/Sidebar.tsx
const mainNavItems: NavItem[] = [
  // ... existing items
  { name: 'Feature', href: '/dashboard/feature', icon: FeatureIcon },
];
```

### Adding a New Modal
```tsx
// Use ResponsiveModal for mobile-adaptive behavior
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';

export function FeatureModal({ isOpen, onClose }: Props) {
  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Modal Title"
      description="Optional description"
      className="max-w-lg" // Override width if needed
    >
      <div className="space-y-5">
        {/* Form content with space-y-5 */}
      </div>
    </ResponsiveModal>
  );
}
```

### Adding a New Card Component
```tsx
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  title: string;
  description?: string;
  onClick?: () => void;
  className?: string;
}

export function FeatureCard({ title, description, onClick, className }: FeatureCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        // Base card styles
        'bg-background-surface/50 border border-border-subtle rounded-xl',
        // Padding (use p-4 for standard, p-6 for larger)
        'p-4',
        // Interactive states
        onClick && 'cursor-pointer hover:bg-background-elevated transition-colors',
        className
      )}
    >
      <h3 className="font-medium text-text-primary">{title}</h3>
      {description && (
        <p className="text-sm text-text-muted mt-1">{description}</p>
      )}
    </div>
  );
}
```

### Adding a New Form
```tsx
import { ValidatedInput } from '@/components/forms';
import { useFormValidation, VALIDATION_RULES } from '@/hooks/useFormValidation';

export function FeatureForm({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const { validateField, getFieldState, isFormValid } = useFormValidation({
    name: VALIDATION_RULES.required,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    onSubmit({ name });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <ValidatedInput
        name="name"
        label="Name"
        value={name}
        onChange={setName}
        onBlur={() => validateField('name', name)}
        fieldState={getFieldState('name')}
        required
      />
      
      <button
        type="submit"
        className={cn(
          'w-full px-4 py-2.5 rounded-lg font-medium',
          'bg-interactive-500 text-white',
          'hover:bg-interactive-600 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        Submit
      </button>
    </form>
  );
}
```

---

## CHECKLIST FOR CHANGES

Before submitting any frontend change, verify:

### Spacing & Sizing
- [ ] All padding/margin values on 4px or 8px grid
- [ ] No hardcoded pixel values (use Tailwind classes)
- [ ] Touch targets meet 44px minimum
- [ ] Consistent border-radius (lg/xl/2xl)

### Responsiveness
- [ ] Mobile-first approach used
- [ ] Tested on mobile viewport (< 640px)
- [ ] Tested on tablet viewport (768px)
- [ ] Tested on desktop viewport (1024px+)

### Accessibility
- [ ] Focus states visible
- [ ] ARIA attributes present on interactive elements
- [ ] Reduced motion respected
- [ ] Color contrast sufficient

### Consistency
- [ ] Uses semantic color tokens (not raw colors)
- [ ] Follows existing component patterns
- [ ] Uses shared components where available
- [ ] Form spacing uses space-y-5

### Performance
- [ ] Images use `loading="lazy"` and `decoding="async"`
- [ ] Heavy components use dynamic imports
- [ ] Animations respect reduced motion

---

## QUICK FIXES REFERENCE

### Common Issues

**Inconsistent spacing:**
```tsx
// ❌ Bad: Non-standard padding
className="p-5"  // 20px - not on 8px grid

// ✅ Good: Standard padding
className="p-4"  // 16px
className="p-6"  // 24px
```

**Hardcoded pixel values:**
```tsx
// ❌ Bad: Arbitrary values
className="w-[256px] h-[44px]"

// ✅ Good: Tailwind classes
className="w-64 h-11"  // 256px, 44px
```

**Missing touch targets:**
```tsx
// ❌ Bad: Small button
className="h-8 px-3"  // 32px height

// ✅ Good: Touch-compliant
className="h-8 min-h-[44px] px-3"  // 32px visual, 44px touch
```

**Inconsistent modal widths:**
```tsx
// ❌ Bad: Random width
className="max-w-[500px]"

// ✅ Good: Standard size
className="max-w-lg"  // 512px
```

---

## FILE NAMING CONVENTIONS

### Components
```
PascalCase.tsx           # Component files
index.ts                 # Barrel exports
types.ts                 # Type definitions
constants.ts             # Constants
```

### Hooks
```
use{Feature}.ts          # Custom hooks
useFormValidation.ts
useCoachChat.ts
```

### Pages (App Router)
```
page.tsx                 # Page component
layout.tsx               # Layout wrapper
loading.tsx              # Loading state
error.tsx                # Error boundary
```

---

## VISUAL QA CHECKLIST

### Premium UI Verification (December 2025)

Run the app and verify the following on each key page:

#### Color Consistency
- [ ] Primary buttons use teal (#21808D) not blue/purple
- [ ] Hover states use darker teal (#247380)
- [ ] Focus rings are teal (ring-interactive-500)
- [ ] Success states use teal-green (#218081)
- [ ] Warning states use warm coral (#A84F2F)
- [ ] Error states use deep red (#C0152F)

#### Key Pages to Check
- [ ] Landing page (/) - Hero, features, CTA sections
- [ ] Login/Signup (/login, /signup) - Form inputs, buttons
- [ ] Dashboard (/dashboard) - Stats, quick actions, cards
- [ ] Brand Kits (/dashboard/brand-kits) - Cards, modals
- [ ] Assets (/dashboard/assets) - Grid, cards, filters
- [ ] Community (/community) - Gallery, creator cards
- [ ] Aura Lab (/dashboard/aura-lab) - Fusion interface

#### Shadow & Elevation
- [ ] Cards have subtle shadow (shadow-sm)
- [ ] Cards lift on hover (shadow-md)
- [ ] Modals have prominent shadow (shadow-xl)
- [ ] Toasts have floating shadow (shadow-xl)
- [ ] Dropdowns have shadow-lg

#### Motion & Animation
- [ ] Hover transitions are smooth (150-200ms)
- [ ] Modal open/close animations work
- [ ] Reduced motion preference disables animations
- [ ] No janky or stuttering animations

#### Touch & Accessibility
- [ ] All buttons have 44px touch targets
- [ ] Focus rings visible on keyboard navigation
- [ ] Tab order is logical
- [ ] Screen reader labels present

#### Responsive Behavior
- [ ] Mobile nav works correctly
- [ ] Cards stack properly on mobile
- [ ] Modals become bottom sheets on mobile
- [ ] Touch gestures work (swipe, long-press)

### Quick Visual Test Commands
```bash
# Start dev server
cd tsx && npm run dev --workspace=@aurastream/web

# Test pages:
# http://localhost:3000/
# http://localhost:3000/login
# http://localhost:3000/dashboard
# http://localhost:3000/community
```

---

*This schema is the single source of truth for AuraStream frontend development. All agents should reference this document when making UI changes.*
