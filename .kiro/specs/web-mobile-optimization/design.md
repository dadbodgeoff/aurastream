# Web Mobile Optimization - Design Document

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MOBILE OPTIMIZATION LAYERS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      1. VIEWPORT & META                              │   │
│  │  - Viewport meta tag configuration                                   │   │
│  │  - Safe area CSS variables                                           │   │
│  │  - Theme color meta                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      2. RESPONSIVE UTILITIES                         │   │
│  │  - useMediaQuery hook                                                │   │
│  │  - useIsMobile hook                                                  │   │
│  │  - useTouchDevice hook                                               │   │
│  │  - useReducedMotion hook (existing)                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      3. MOBILE NAVIGATION                            │   │
│  │  - MobileDrawer component                                            │   │
│  │  - MobileHeader component                                            │   │
│  │  - ResponsiveSidebar (desktop/mobile aware)                          │   │
│  │  - DashboardShell (responsive layout)                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      4. TOUCH OPTIMIZATION                           │   │
│  │  - TouchTarget wrapper component                                     │   │
│  │  - Active state utilities                                            │   │
│  │  - Focus trap hook                                                   │   │
│  │  - Scroll lock hook                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      5. PERFORMANCE OPTIMIZATION                     │   │
│  │  - Throttled event handlers                                          │   │
│  │  - Conditional animation rendering                                   │   │
│  │  - Image optimization patterns                                       │   │
│  │  - Mobile-aware background effects                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
tsx/apps/web/src/
├── app/
│   └── layout.tsx                    # UPDATE: Add viewport meta
├── hooks/
│   ├── useMediaQuery.ts              # NEW: Media query hook
│   ├── useIsMobile.ts                # NEW: Mobile detection
│   ├── useTouchDevice.ts             # NEW: Touch detection
│   ├── useScrollLock.ts              # NEW: Body scroll lock
│   └── useFocusTrap.ts               # NEW: Focus trap
├── components/
│   ├── mobile/
│   │   ├── MobileDrawer.tsx          # NEW: Mobile navigation drawer
│   │   ├── MobileHeader.tsx          # NEW: Mobile header with hamburger
│   │   └── index.ts                  # NEW: Exports
│   ├── ui/
│   │   ├── TouchTarget.tsx           # NEW: Touch target wrapper
│   │   ├── Modal.tsx                 # UPDATE: Focus trap, scroll lock
│   │   └── Toast.tsx                 # UPDATE: Touch target size
│   ├── dashboard/
│   │   └── layout/
│   │       ├── Sidebar.tsx           # UPDATE: Responsive
│   │       └── DashboardShell.tsx    # UPDATE: Mobile layout
│   ├── landing/
│   │   ├── ProductHero.tsx           # UPDATE: Responsive orbs
│   │   └── BackgroundEffects.tsx     # UPDATE: Mobile optimization
│   └── coach/
│       └── CoachSlideOver.tsx        # UPDATE: Full-width mobile
└── styles/
    └── globals.css                   # UPDATE: Mobile utilities
```

## Design Specifications

### 1. Viewport Configuration

**File: `tsx/apps/web/src/app/layout.tsx`**

```typescript
export const metadata: Metadata = {
  // ... existing metadata
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover', // For notched devices
  },
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
    { media: '(prefers-color-scheme: light)', color: '#0F172A' },
  ],
};
```

### 2. Responsive Hooks

**File: `tsx/apps/web/src/hooks/useMediaQuery.ts`**

```typescript
/**
 * useMediaQuery - SSR-safe media query hook
 * 
 * @param query - CSS media query string
 * @returns boolean indicating if query matches
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
```

**File: `tsx/apps/web/src/hooks/useIsMobile.ts`**

```typescript
/**
 * useIsMobile - Detect mobile viewport
 * 
 * Uses 768px breakpoint (md in Tailwind)
 * Returns false during SSR to prevent hydration mismatch
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
```

**File: `tsx/apps/web/src/hooks/useTouchDevice.ts`**

```typescript
/**
 * useTouchDevice - Detect touch-capable device
 * 
 * Checks for touch events and pointer type
 */
export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || 
                     navigator.maxTouchPoints > 0;
    setIsTouch(hasTouch);
  }, []);

  return isTouch;
}
```

### 3. Scroll Lock Hook

**File: `tsx/apps/web/src/hooks/useScrollLock.ts`**

```typescript
/**
 * useScrollLock - Prevent body scroll without layout shift
 * 
 * Handles scrollbar width compensation to prevent content jump
 * 
 * @param isLocked - Whether scroll should be locked
 */
export function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalPaddingRight = document.body.style.paddingRight;
    const originalOverflow = document.body.style.overflow;

    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.paddingRight = originalPaddingRight;
      document.body.style.overflow = originalOverflow;
    };
  }, [isLocked]);
}
```

### 4. Focus Trap Hook

**File: `tsx/apps/web/src/hooks/useFocusTrap.ts`**

```typescript
/**
 * useFocusTrap - Trap focus within a container
 * 
 * Essential for modal accessibility
 * 
 * @param containerRef - Ref to the container element
 * @param isActive - Whether trap is active
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isActive: boolean
): void {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector = 
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    
    const focusableElements = container.querySelectorAll(focusableSelector);
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element on mount
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}
```

### 5. Mobile Navigation Components

**File: `tsx/apps/web/src/components/mobile/MobileDrawer.tsx`**

```typescript
/**
 * MobileDrawer - Slide-out navigation drawer for mobile
 * 
 * Features:
 * - Full-height slide from left
 * - Backdrop with touch-to-close
 * - Focus trap when open
 * - Scroll lock when open
 * - Smooth animations with reduced motion support
 */
interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileDrawer({ isOpen, onClose, children }: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  
  useScrollLock(isOpen);
  useFocusTrap(drawerRef, isOpen);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-background-overlay',
          'transition-opacity',
          prefersReducedMotion ? 'duration-0' : 'duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-background-surface',
          'border-r border-border-subtle',
          'transform transition-transform',
          prefersReducedMotion ? 'duration-0' : 'duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {children}
      </div>
    </>
  );
}
```

**File: `tsx/apps/web/src/components/mobile/MobileHeader.tsx`**

```typescript
/**
 * MobileHeader - Header with hamburger menu for mobile
 * 
 * Features:
 * - Hamburger button with 44x44px touch target
 * - Logo/brand
 * - Optional action buttons
 */
interface MobileHeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function MobileHeader({ onMenuClick, title }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-background-surface border-b border-border-subtle md:hidden">
      {/* Hamburger - 44x44px touch target */}
      <button
        onClick={onMenuClick}
        className="flex items-center justify-center w-11 h-11 -ml-2 rounded-lg active:bg-background-elevated focus:outline-none focus:ring-2 focus:ring-interactive-600"
        aria-label="Open navigation menu"
      >
        <svg className="w-6 h-6 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      {title && (
        <h1 className="ml-3 text-lg font-semibold text-text-primary truncate">
          {title}
        </h1>
      )}
    </header>
  );
}
```

### 6. TouchTarget Component

**File: `tsx/apps/web/src/components/ui/TouchTarget.tsx`**

```typescript
/**
 * TouchTarget - Wrapper ensuring minimum 44x44px touch target
 * 
 * Use for small interactive elements that need larger hit areas
 * 
 * @example
 * <TouchTarget>
 *   <button className="p-1">×</button>
 * </TouchTarget>
 */
interface TouchTargetProps {
  children: React.ReactNode;
  className?: string;
}

export function TouchTarget({ children, className }: TouchTargetProps) {
  return (
    <span className={cn('relative inline-flex items-center justify-center', className)}>
      {/* Invisible touch target expansion */}
      <span 
        className="absolute -inset-2 min-w-[44px] min-h-[44px]" 
        aria-hidden="true" 
      />
      {children}
    </span>
  );
}
```

### 7. Updated Modal Component

**File: `tsx/apps/web/src/components/dashboard/modals/Modal.tsx`**

Key updates:
- Use `useScrollLock` hook instead of direct DOM manipulation
- Add `useFocusTrap` for accessibility
- Increase close button touch target to 44x44px
- Add `motion-reduce` variants
- Mobile-responsive max-height

```typescript
export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen);

  // ... rest of implementation
}
```

### 8. Updated Sidebar Component

**File: `tsx/apps/web/src/components/dashboard/layout/Sidebar.tsx`**

Key updates:
- Hidden on mobile (md:flex)
- Navigation items with 44px minimum height
- Active states for touch feedback

```typescript
export function Sidebar({ user, isAdmin, onLogout }: SidebarProps) {
  return (
    <aside className="hidden md:flex w-64 h-screen bg-background-surface border-r border-border-subtle flex-col">
      {/* ... content with touch-optimized nav items */}
    </aside>
  );
}
```

### 9. Updated DashboardShell Component

**File: `tsx/apps/web/src/components/dashboard/layout/DashboardShell.tsx`**

Key updates:
- Mobile drawer integration
- Responsive layout
- Mobile header on small screens

```typescript
export function DashboardShell({ children, user, isAdmin, onLogout }: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen bg-background-default">
      {/* Desktop Sidebar */}
      <Sidebar user={user} isAdmin={isAdmin} onLogout={onLogout} />
      
      {/* Mobile Drawer */}
      {isMobile && (
        <MobileDrawer isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)}>
          <MobileSidebarContent user={user} isAdmin={isAdmin} onLogout={onLogout} />
        </MobileDrawer>
      )}
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <MobileHeader 
          onMenuClick={() => setIsMobileMenuOpen(true)} 
          title="Dashboard"
        />
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
```

### 10. CSS Utilities

**File: `tsx/apps/web/src/app/globals.css`**

```css
/* Safe area insets for notched devices */
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-right: env(safe-area-inset-right, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-inset-left: env(safe-area-inset-left, 0px);
}

/* Reduced motion - disable all animations */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Touch action utilities */
.touch-manipulation {
  touch-action: manipulation;
}

/* Minimum touch target */
.min-touch-target {
  min-width: 44px;
  min-height: 44px;
}

/* Active state for touch feedback */
.touch-feedback {
  @apply active:scale-95 active:opacity-80 transition-transform duration-75;
}

/* Mobile-safe scroll */
.mobile-scroll {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
```

## Component Updates Summary

| Component | File | Changes |
|-----------|------|---------|
| Layout | `app/layout.tsx` | Add viewport meta, theme color |
| Modal | `components/dashboard/modals/Modal.tsx` | Focus trap, scroll lock, touch targets |
| Toast | `components/ui/Toast.tsx` | Increase close button size |
| Sidebar | `components/dashboard/layout/Sidebar.tsx` | Hide on mobile, touch targets |
| DashboardShell | `components/dashboard/layout/DashboardShell.tsx` | Mobile drawer, responsive |
| ProductHero | `components/landing/ProductHero.tsx` | Responsive orbs, throttled tracking |
| BackgroundEffects | `components/landing/BackgroundEffects.tsx` | Disable on mobile, throttle |
| CoachSlideOver | `components/coach/CoachSlideOver.tsx` | Full-width on mobile |
| GlassCard | `components/ui/GlassCard.tsx` | Active states |
| BrandCustomizationPanel | `components/generation/BrandCustomizationPanel.tsx` | Active states |

## Testing Requirements

### Viewport Testing
- 320px (iPhone SE)
- 375px (iPhone 12/13)
- 390px (iPhone 14)
- 428px (iPhone 14 Pro Max)
- 768px (iPad)
- 1024px (iPad Pro)
- 1280px+ (Desktop)

### Touch Testing
- All buttons have 44x44px minimum
- Active states visible on touch
- No hover-only functionality
- Forms work with mobile keyboards

### Accessibility Testing
- Focus trap in modals
- Escape closes modals
- Screen reader announces modal
- Reduced motion respected

### Performance Testing
- Lighthouse mobile score > 90
- No layout shift
- Animations smooth at 60fps
- Background effects don't cause jank
