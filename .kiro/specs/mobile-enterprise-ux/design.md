# Design Document: Enterprise Mobile UX Enhancements

## Overview

This design document outlines the technical architecture for implementing enterprise-grade mobile UX enhancements for AuraStream. The implementation follows a modular, hook-based architecture that integrates seamlessly with existing components while maintaining backward compatibility.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MOBILE UX LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        HOOKS LAYER                                   │   │
│  │  tsx/packages/shared/src/hooks/                                      │   │
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
│  │  tsx/apps/web/src/components/                                        │   │
│  │  ├── ui/ResponsiveModal.tsx   (Bottom sheet on mobile)               │   │
│  │  ├── ui/OfflineBanner.tsx     (Network status indicator)             │   │
│  │  ├── ui/ContextMenu.tsx       (Long-press action menu)               │   │
│  │  ├── ui/PullToRefresh.tsx     (Pull-to-refresh wrapper)              │   │
│  │  └── ui/Toast.tsx             (Enhanced with swipe-to-dismiss)       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    INTEGRATION LAYER                                 │   │
│  │  Existing components enhanced with mobile UX                         │   │
│  │  ├── keyboard/ShortcutsModal.tsx  → Uses ResponsiveModal             │   │
│  │  ├── lightbox/ImageLightbox.tsx   → Uses usePinchZoom                │   │
│  │  ├── mobile/MobileBottomNav.tsx   → Uses useHapticFeedback           │   │
│  │  └── dashboard/cards/AssetCard.tsx → Uses useLongPress + ContextMenu │   │
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
    │                └──► AssetCard
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

Detects virtual keyboard presence and provides keyboard height.

```typescript
interface KeyboardAwareState {
  /** Whether keyboard is currently visible */
  isKeyboardVisible: boolean;
  /** Height of keyboard in pixels (0 if not visible) */
  keyboardHeight: number;
  /** Scroll focused element into view */
  scrollToFocused: () => void;
}

function useKeyboardAware(): KeyboardAwareState;
```

**Implementation:**
- Uses VisualViewport API when available
- Falls back to window resize detection
- Calculates keyboard height from viewport difference
- Provides utility to scroll focused element into view

### 2. useNetworkStatus

Monitors network connectivity status.

```typescript
interface NetworkStatusState {
  /** Current online status */
  isOnline: boolean;
  /** Whether status has changed since mount */
  hasChanged: boolean;
  /** Timestamp of last status change */
  lastChanged: number | null;
}

function useNetworkStatus(): NetworkStatusState;
```

**Implementation:**
- Uses navigator.onLine for initial state
- Listens to online/offline events
- Tracks status changes for UI feedback

### 3. usePullToRefresh

Handles pull-to-refresh gesture detection.

```typescript
interface PullToRefreshState {
  /** Current pull distance in pixels */
  pullDistance: number;
  /** Whether threshold has been reached */
  isTriggered: boolean;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Touch event handlers */
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

function usePullToRefresh(options: UsePullToRefreshOptions): PullToRefreshState;
```

### 4. useLongPress

Detects long-press gestures.

```typescript
interface LongPressState {
  /** Whether long press is active */
  isLongPressing: boolean;
  /** Position where long press started */
  position: { x: number; y: number } | null;
}

interface UseLongPressOptions {
  onLongPress: (position: { x: number; y: number }) => void;
  /** Duration in ms (default: 500) */
  duration?: number;
  /** Movement threshold to cancel (default: 10px) */
  moveThreshold?: number;
  disabled?: boolean;
}

function useLongPress(options: UseLongPressOptions): {
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
    onContextMenu: (e: MouseEvent) => void;
  };
  state: LongPressState;
};
```

### 5. useSwipeGesture

Detects horizontal swipe gestures.

```typescript
interface SwipeState {
  /** Current swipe offset in pixels */
  offset: number;
  /** Whether swipe threshold has been reached */
  isTriggered: boolean;
  /** Direction of swipe */
  direction: 'left' | 'right' | null;
}

interface UseSwipeGestureOptions {
  onSwipe: (direction: 'left' | 'right') => void;
  /** Threshold in pixels (default: 100) */
  threshold?: number;
  disabled?: boolean;
}

function useSwipeGesture(options: UseSwipeGestureOptions): {
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
  };
  state: SwipeState;
  style: React.CSSProperties;
};
```

### 6. usePinchZoom

Handles pinch-to-zoom gestures.

```typescript
interface PinchZoomState {
  /** Current zoom scale (1 = 100%) */
  scale: number;
  /** Current pan offset */
  offset: { x: number; y: number };
  /** Whether user is currently pinching */
  isPinching: boolean;
}

interface UsePinchZoomOptions {
  /** Minimum zoom level (default: 1) */
  minScale?: number;
  /** Maximum zoom level (default: 4) */
  maxScale?: number;
  /** Enable double-tap to zoom (default: true) */
  doubleTapZoom?: boolean;
  /** Enable scroll wheel zoom on desktop (default: true) */
  wheelZoom?: boolean;
}

function usePinchZoom(options?: UsePinchZoomOptions): {
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
    onWheel: (e: WheelEvent) => void;
  };
  state: PinchZoomState;
  reset: () => void;
  zoomTo: (scale: number) => void;
};
```

### 7. useHapticFeedback

Provides haptic feedback using the Vibration API.

```typescript
type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

interface UseHapticFeedbackReturn {
  /** Whether haptic feedback is supported */
  isSupported: boolean;
  /** Trigger haptic feedback */
  trigger: (pattern?: HapticPattern) => void;
}

function useHapticFeedback(): UseHapticFeedbackReturn;
```

**Patterns:**
- `light`: 10ms vibration (navigation taps)
- `medium`: 20ms vibration (selections)
- `heavy`: 30ms vibration (confirmations)
- `success`: 10ms, 50ms pause, 10ms (success feedback)
- `warning`: 20ms, 30ms pause, 20ms (warning feedback)
- `error`: 30ms, 20ms pause, 30ms, 20ms pause, 30ms (error feedback)

## Data Models

### Network Status Store (Zustand)

```typescript
interface NetworkStatusStore {
  isOnline: boolean;
  lastChanged: number | null;
  setOnline: (online: boolean) => void;
}
```

### Modal State (Component-local)

```typescript
interface ModalState {
  isOpen: boolean;
  isDragging: boolean;
  dragOffset: number;
  isClosing: boolean;
}
```

### Context Menu State (Component-local)

```typescript
interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
}
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

## Integration Strategy

### Phase 1: Foundation Hooks
1. Create `useKeyboardAware` hook
2. Create `useNetworkStatus` hook
3. Create `useHapticFeedback` hook
4. Create `useSwipeGesture` hook

### Phase 2: Core Components
1. Create `ResponsiveModal` component
2. Create `OfflineBanner` component
3. Enhance `Toast` with swipe-to-dismiss

### Phase 3: Advanced Gestures
1. Create `usePullToRefresh` hook
2. Create `PullToRefresh` component
3. Create `useLongPress` hook
4. Create `ContextMenu` component

### Phase 4: Zoom & Polish
1. Create `usePinchZoom` hook
2. Integrate pinch-to-zoom into `ImageLightbox`
3. Integrate haptic feedback into `MobileBottomNav`

### Phase 5: Migration
1. Migrate `ShortcutsModal` to use `ResponsiveModal`
2. Integrate `ContextMenu` with `AssetCard`
3. Add `PullToRefresh` to asset/brand kit lists

## Testing Strategy

### Unit Tests
- Each hook tested in isolation with mock events
- Component rendering tests with different props
- Accessibility tests (focus trap, ARIA attributes)

### Integration Tests
- Modal open/close flow
- Gesture detection accuracy
- Network status change handling

### E2E Tests
- Full user flows on mobile viewport
- Gesture interactions (requires touch simulation)
- Offline/online transitions

## File Structure

```
tsx/packages/shared/src/hooks/
├── useKeyboardAware.ts
├── useNetworkStatus.ts
├── usePullToRefresh.ts
├── useLongPress.ts
├── useSwipeGesture.ts
├── usePinchZoom.ts
├── useHapticFeedback.ts
└── index.ts (exports)

tsx/apps/web/src/components/ui/
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
