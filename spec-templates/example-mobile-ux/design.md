# Design Document: Enterprise Mobile UX Enhancements

## Overview

This design document outlines the technical architecture for implementing enterprise-grade mobile UX enhancements. The implementation follows a modular, hook-based architecture that integrates seamlessly with existing components while maintaining backward compatibility.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MOBILE UX LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        HOOKS LAYER                                   │   │
│  │  packages/shared/src/hooks/                                          │   │
│  │  ├── useKeyboardAware.ts      (Virtual keyboard detection)           │   │
│  │  ├── useNetworkStatus.ts      (Online/offline detection)             │   │
│  │  ├── usePullToRefresh.ts      (Pull gesture handling)                │   │
│  │  ├── useLongPress.ts          (Long-press gesture detection)         │   │
│  │  ├── useHapticFeedback.ts     (Vibration API wrapper)                │   │
│  │  ├── useSwipeGesture.ts       (Horizontal swipe detection)           │   │
│  │  └── usePinchZoom.ts          (Pinch gesture handling)               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      COMPONENTS LAYER                                │   │
│  │  apps/web/src/components/ui/                                         │   │
│  │  ├── ResponsiveModal.tsx      (Bottom sheet on mobile)               │   │
│  │  ├── OfflineBanner.tsx        (Network status indicator)             │   │
│  │  ├── ContextMenu.tsx          (Long-press action menu)               │   │
│  │  ├── PullToRefresh.tsx        (Pull-to-refresh wrapper)              │   │
│  │  └── Toast.tsx                (Enhanced with swipe-to-dismiss)       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    INTEGRATION LAYER                                 │   │
│  │  Existing components enhanced with mobile UX                         │   │
│  │  ├── ShortcutsModal.tsx       → Uses ResponsiveModal                 │   │
│  │  ├── ImageLightbox.tsx        → Uses usePinchZoom                    │   │
│  │  ├── MobileBottomNav.tsx      → Uses useHapticFeedback               │   │
│  │  └── ContentCard.tsx          → Uses useLongPress + ContextMenu      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dependency Graph

```
useMobileDetection (existing)
    │
    ├──► useKeyboardAware
    │        └──► Form components
    │
    ├──► useNetworkStatus
    │        └──► OfflineBanner
    │
    ├──► usePullToRefresh
    │        └──► PullToRefresh component
    │
    ├──► useLongPress
    │        └──► ContextMenu
    │                └──► ContentCard
    │
    ├──► useSwipeGesture
    │        └──► Toast (swipe-to-dismiss)
    │
    ├──► usePinchZoom
    │        └──► ImageLightbox
    │
    └──► useHapticFeedback
             └──► MobileBottomNav

useReducedMotion (existing)
    └──► All animation-related components
```

## Components

### 1. ResponsiveModal

A modal component that adapts its presentation based on viewport size.

```typescript
interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** Force desktop mode even on mobile */
  forceDesktop?: boolean;
  /** Maximum height for bottom sheet (default: 90vh) */
  maxHeight?: string;
  /** Show drag handle on mobile (default: true) */
  showDragHandle?: boolean;
  /** Close on backdrop click (default: true) */
  closeOnBackdrop?: boolean;
  /** Close on escape key (default: true) */
  closeOnEscape?: boolean;
  /** Additional class names */
  className?: string;
}
```

**Behavior:**
- Desktop (>768px): Centered dialog with backdrop blur
- Mobile (≤768px): Bottom sheet sliding up from bottom
- Swipe down on drag handle closes modal
- Focus trap and scroll lock enabled
- Respects reduced motion preference

### 2. OfflineBanner

A persistent banner indicating network status.

```typescript
interface OfflineBannerProps {
  /** Custom offline message */
  offlineMessage?: string;
  /** Custom reconnected message */
  reconnectedMessage?: string;
  /** Duration to show reconnected message (ms) */
  reconnectedDuration?: number;
  /** Position of banner */
  position?: 'top' | 'bottom';
  /** Additional class names */
  className?: string;
}
```

**Behavior:**
- Shows when device goes offline
- Dismissible but reappears on next offline event
- Shows brief "Back online" toast on reconnection
- Positioned at top of viewport, below any fixed headers

### 3. ContextMenu

A floating menu triggered by long-press or right-click.

```typescript
interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  isOpen: boolean;
  onClose: () => void;
  /** Position relative to trigger element */
  position: { x: number; y: number };
  /** Additional class names */
  className?: string;
}
```

**Behavior:**
- Appears at touch/click position
- Closes on outside click or escape
- Focus trap for accessibility
- Haptic feedback on open (if supported)

### 4. PullToRefresh

A wrapper component enabling pull-to-refresh gesture.

```typescript
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  /** Pull threshold in pixels (default: 80) */
  threshold?: number;
  /** Disable pull-to-refresh */
  disabled?: boolean;
  /** Custom loading indicator */
  loadingIndicator?: React.ReactNode;
  /** Additional class names */
  className?: string;
}
```

**Behavior:**
- Only activates when scrolled to top
- Shows progress indicator while pulling
- Shows spinner during refresh
- Animates back on release
- Respects reduced motion preference

## Hooks

### 1. useKeyboardAware

```typescript
interface KeyboardAwareState {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  scrollToFocused: () => void;
}

function useKeyboardAware(): KeyboardAwareState;
```

### 2. useNetworkStatus

```typescript
interface NetworkStatusState {
  isOnline: boolean;
  hasChanged: boolean;
  lastChanged: number | null;
}

function useNetworkStatus(): NetworkStatusState;
```

### 3. usePullToRefresh

```typescript
interface PullToRefreshState {
  pullDistance: number;
  isTriggered: boolean;
  isRefreshing: boolean;
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

function usePullToRefresh(options: {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}): PullToRefreshState;
```

### 4. useLongPress

```typescript
function useLongPress(options: {
  onLongPress: (position: { x: number; y: number }) => void;
  duration?: number;
  moveThreshold?: number;
  disabled?: boolean;
}): {
  handlers: { /* touch handlers */ };
  state: { isLongPressing: boolean; position: { x: number; y: number } | null };
};
```

### 5. useSwipeGesture

```typescript
function useSwipeGesture(options: {
  onSwipe: (direction: 'left' | 'right') => void;
  threshold?: number;
  disabled?: boolean;
}): {
  handlers: { /* touch handlers */ };
  state: { offset: number; isTriggered: boolean; direction: 'left' | 'right' | null };
  style: React.CSSProperties;
};
```

### 6. usePinchZoom

```typescript
function usePinchZoom(options?: {
  minScale?: number;
  maxScale?: number;
  doubleTapZoom?: boolean;
  wheelZoom?: boolean;
}): {
  handlers: { /* touch and wheel handlers */ };
  state: { scale: number; offset: { x: number; y: number }; isPinching: boolean };
  reset: () => void;
  zoomTo: (scale: number) => void;
};
```

### 7. useHapticFeedback

```typescript
type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

function useHapticFeedback(): {
  isSupported: boolean;
  trigger: (pattern?: HapticPattern) => void;
};
```

## Correctness Properties

### P1: Modal Accessibility
- Focus MUST be trapped within modal when open
- Body scroll MUST be locked when modal is open
- Escape key MUST close modal
- Focus MUST return to trigger element on close

### P2: Gesture Conflict Resolution
- Pull-to-refresh MUST NOT activate when not at scroll top
- Swipe-to-dismiss MUST NOT conflict with horizontal scroll
- Long-press MUST cancel if finger moves beyond threshold
- Pinch-to-zoom MUST NOT interfere with single-finger pan when zoomed

### P3: Reduced Motion Compliance
- All animations MUST respect `prefers-reduced-motion`
- Instant transitions MUST be used when reduced motion is preferred
- Haptic feedback MUST be disabled when reduced motion is preferred

### P4: Network Status Accuracy
- Online/offline detection MUST respond within 1 second
- Status MUST be accurate on initial load
- Reconnection toast MUST only show after actual offline period

### P5: Touch Target Compliance
- All interactive elements MUST have minimum 44x44px touch targets
- Context menu items MUST have adequate spacing for touch
- Drag handles MUST be easily graspable

## File Structure

```
packages/shared/src/hooks/
├── useKeyboardAware.ts
├── useNetworkStatus.ts
├── usePullToRefresh.ts
├── useLongPress.ts
├── useSwipeGesture.ts
├── usePinchZoom.ts
├── useHapticFeedback.ts
└── index.ts (exports)

apps/web/src/components/ui/
├── ResponsiveModal.tsx
├── OfflineBanner.tsx
├── ContextMenu.tsx
├── PullToRefresh.tsx
└── Toast.tsx (enhanced)
```

## Backward Compatibility

All enhancements are additive and opt-in:
- Existing modals continue to work unchanged
- New `ResponsiveModal` is a separate component
- Toast swipe-to-dismiss is an enhancement, not a breaking change
- All hooks return safe defaults when features are unsupported
