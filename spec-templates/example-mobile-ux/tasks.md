# Implementation Tasks: Enterprise Mobile UX Enhancements

## Phase 1: Foundation Hooks (Critical)

### Task 1.1: Create useHapticFeedback Hook
- [ ] Create `packages/shared/src/hooks/useHapticFeedback.ts`
- [ ] Implement Vibration API detection
- [ ] Implement pattern presets (light, medium, heavy, success, warning, error)
- [ ] Add reduced motion check to disable haptics
- [ ] Export from `packages/shared/src/hooks/index.ts`
- [ ] Write unit test for haptic patterns

### Task 1.2: Create useNetworkStatus Hook
- [ ] Create `packages/shared/src/hooks/useNetworkStatus.ts`
- [ ] Implement navigator.onLine initial state
- [ ] Add online/offline event listeners
- [ ] Track status change timestamps
- [ ] Export from `packages/shared/src/hooks/index.ts`
- [ ] Write unit test for status changes

### Task 1.3: Create useKeyboardAware Hook
- [ ] Create `packages/shared/src/hooks/useKeyboardAware.ts`
- [ ] Implement VisualViewport API detection
- [ ] Add fallback to window resize detection
- [ ] Calculate keyboard height from viewport difference
- [ ] Implement scrollToFocused utility
- [ ] Export from `packages/shared/src/hooks/index.ts`
- [ ] Write unit test for keyboard detection

### Task 1.4: Create useSwipeGesture Hook
- [ ] Create `packages/shared/src/hooks/useSwipeGesture.ts`
- [ ] Implement touch start/move/end handlers
- [ ] Calculate swipe direction and distance
- [ ] Provide offset for visual feedback
- [ ] Add threshold configuration
- [ ] Export from `packages/shared/src/hooks/index.ts`
- [ ] Write unit test for swipe detection

## Phase 2: Core Components (Critical)

### Task 2.1: Create ResponsiveModal Component
- [ ] Create `apps/web/src/components/ui/ResponsiveModal.tsx`
- [ ] Implement desktop centered dialog mode
- [ ] Implement mobile bottom sheet mode
- [ ] Add drag handle with swipe-to-close
- [ ] Implement focus trap
- [ ] Implement scroll lock
- [ ] Add backdrop click to close
- [ ] Add escape key to close
- [ ] Add reduced motion support
- [ ] Add proper ARIA attributes
- [ ] Write unit test for modal behavior

### Task 2.2: Create OfflineBanner Component
- [ ] Create `apps/web/src/components/ui/OfflineBanner.tsx`
- [ ] Integrate useNetworkStatus hook
- [ ] Implement persistent banner UI
- [ ] Add dismiss functionality
- [ ] Add reconnection toast notification
- [ ] Style with existing design tokens
- [ ] Write unit test for banner states

### Task 2.3: Enhance Toast with Swipe-to-Dismiss
- [ ] Modify `apps/web/src/components/ui/Toast.tsx`
- [ ] Integrate useSwipeGesture hook
- [ ] Add horizontal swipe tracking
- [ ] Add opacity reduction during swipe
- [ ] Implement threshold-based dismissal
- [ ] Add spring-back animation on release below threshold
- [ ] Maintain existing click-to-dismiss
- [ ] Add reduced motion support
- [ ] Write unit test for swipe dismiss

## Phase 3: Advanced Gestures (Enhancement)

### Task 3.1: Create usePullToRefresh Hook
- [ ] Create `packages/shared/src/hooks/usePullToRefresh.ts`
- [ ] Implement touch start/move/end handlers
- [ ] Check scroll position before activating
- [ ] Calculate pull distance with resistance
- [ ] Manage refreshing state
- [ ] Export from `packages/shared/src/hooks/index.ts`
- [ ] Write unit test for pull detection

### Task 3.2: Create PullToRefresh Component
- [ ] Create `apps/web/src/components/ui/PullToRefresh.tsx`
- [ ] Integrate usePullToRefresh hook
- [ ] Implement pull progress indicator
- [ ] Implement loading spinner
- [ ] Add success/error states
- [ ] Add reduced motion support
- [ ] Write unit test for refresh flow

### Task 3.3: Create useLongPress Hook
- [ ] Create `packages/shared/src/hooks/useLongPress.ts`
- [ ] Implement touch start with timer
- [ ] Add movement threshold cancellation
- [ ] Track press position for menu placement
- [ ] Add right-click support for desktop
- [ ] Export from `packages/shared/src/hooks/index.ts`
- [ ] Write unit test for long press detection

### Task 3.4: Create ContextMenu Component
- [ ] Create `apps/web/src/components/ui/ContextMenu.tsx`
- [ ] Implement floating menu UI
- [ ] Position relative to trigger point
- [ ] Add focus trap for accessibility
- [ ] Add escape key to close
- [ ] Add outside click to close
- [ ] Integrate useHapticFeedback on open
- [ ] Style with existing design tokens
- [ ] Write unit test for menu behavior

## Phase 4: Zoom & Polish

### Task 4.1: Create usePinchZoom Hook
- [ ] Create `packages/shared/src/hooks/usePinchZoom.ts`
- [ ] Implement two-finger touch detection
- [ ] Calculate scale from finger distance
- [ ] Implement pan when zoomed
- [ ] Add double-tap to toggle zoom
- [ ] Add scroll wheel zoom for desktop
- [ ] Clamp scale to min/max bounds
- [ ] Export from `packages/shared/src/hooks/index.ts`
- [ ] Write unit test for zoom calculations

### Task 4.2: Integrate Pinch-to-Zoom in ImageLightbox
- [ ] Modify `apps/web/src/components/lightbox/ImageLightbox.tsx`
- [ ] Integrate usePinchZoom hook
- [ ] Apply transform to image element
- [ ] Reset zoom on lightbox close
- [ ] Add reduced motion support
- [ ] Write integration test for zoom flow

### Task 4.3: Integrate Haptic Feedback in MobileNav
- [ ] Modify `apps/web/src/components/mobile/MobileBottomNav.tsx`
- [ ] Integrate useHapticFeedback hook
- [ ] Trigger light haptic on nav item tap
- [ ] Only trigger on successful navigation
- [ ] Skip disabled items
- [ ] Write unit test for haptic triggers

## Phase 5: Integration & Migration

### Task 5.1: Migrate ShortcutsModal to ResponsiveModal
- [ ] Modify `apps/web/src/components/keyboard/ShortcutsModal.tsx`
- [ ] Replace custom modal implementation with ResponsiveModal
- [ ] Maintain all existing functionality
- [ ] Verify accessibility compliance
- [ ] Write regression test

### Task 5.2: Integrate ContextMenu with ContentCard
- [ ] Modify `apps/web/src/components/cards/ContentCard.tsx`
- [ ] Integrate useLongPress hook
- [ ] Add ContextMenu with relevant actions
- [ ] Add visual highlight during long-press
- [ ] Maintain existing hover actions for desktop
- [ ] Write integration test

### Task 5.3: Add PullToRefresh to List Pages
- [ ] Identify list pages that need refresh
- [ ] Wrap list components with PullToRefresh
- [ ] Connect to existing data refetch functions
- [ ] Test on mobile viewport

## Phase 6: Testing & Validation

### Task 6.1: Build Verification
- [ ] TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No console errors in browser

### Task 6.2: Unit Test Coverage
- [ ] All hooks have unit tests
- [ ] All components have unit tests
- [ ] Run full test suite

### Task 6.3: Integration Testing
- [ ] Test modal open/close flows
- [ ] Test gesture interactions
- [ ] Test network status changes
- [ ] Test keyboard handling in forms

### Task 6.4: Accessibility Audit
- [ ] Verify focus management in modals
- [ ] Verify ARIA attributes
- [ ] Test with screen reader
- [ ] Verify reduced motion compliance

### Task 6.5: Mobile Device Testing
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Verify touch targets are 44x44px minimum
- [ ] Verify gestures work correctly

## Completion Checklist

- [ ] All Phase 1 tasks complete (Foundation Hooks)
- [ ] All Phase 2 tasks complete (Core Components)
- [ ] All Phase 3 tasks complete (Advanced Gestures)
- [ ] All Phase 4 tasks complete (Zoom & Polish)
- [ ] All Phase 5 tasks complete (Integration)
- [ ] All Phase 6 tasks complete (Testing)
- [ ] TypeScript strict mode passes
- [ ] All tests pass
- [ ] No console errors
- [ ] Documentation updated
