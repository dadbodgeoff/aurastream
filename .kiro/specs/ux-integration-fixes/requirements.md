# UX Integration Fixes - Requirements

## Overview
Connect built-but-disconnected UX components to complete the AuraStream frontend experience.

## Problem Statement
Multiple enterprise-grade UX components have been built but are not wired into the application:
1. OnboardingProvider + OnboardingTour - New users don't see guided tour
2. UndoToastContainer - Destructive actions have no undo capability
3. data-tour attributes missing from Sidebar - Tour can't highlight elements
4. Skeleton components not used during loading states
5. Empty states may not be properly integrated

## Requirements

### REQ-1: Onboarding System Integration
- **REQ-1.1**: Wire OnboardingProvider into dashboard layout (authenticated users only)
- **REQ-1.2**: Add data-tour attributes to Sidebar navigation items
- **REQ-1.3**: Ensure tour auto-starts for new users (hasCompletedOnboarding === false)
- **REQ-1.4**: Tour must be skippable and completion state persisted
- **REQ-1.5**: Add Coach trial step to tour (step 4, before command palette)

### REQ-2: Undo System Integration
- **REQ-2.1**: Wire UndoToastContainer into dashboard layout
- **REQ-2.2**: Position toasts at bottom-left, max 3 visible
- **REQ-2.3**: Ensure undo store is properly initialized
- **REQ-2.4**: Verify 5-second countdown and undo functionality

### REQ-3: Loading State Skeletons
- **REQ-3.1**: Use AssetGridSkeleton in assets page during loading
- **REQ-3.2**: Use BrandKitCardSkeleton in brand-kits page during loading
- **REQ-3.3**: Use DashboardStatsSkeleton in dashboard during loading

### REQ-4: Empty States Integration
- **REQ-4.1**: Use AssetsEmptyState when user has no assets
- **REQ-4.2**: Use BrandKitsEmptyState when user has no brand kits
- **REQ-4.3**: Pass correct tier for tier-specific messaging

## Acceptance Criteria
- [ ] New users see onboarding tour on first dashboard visit
- [ ] Tour highlights Quick Create, Brand Studio, Assets, Coach, Command Palette
- [ ] Tour can be skipped or completed, state persists across sessions
- [ ] Undo toasts appear for destructive actions (delete asset, delete brand kit)
- [ ] Skeleton loaders show during data fetching
- [ ] Empty states show with tier-appropriate messaging
- [ ] All components follow existing enterprise patterns
- [ ] No TypeScript errors
- [ ] All existing tests pass

## Out of Scope
- useSoundEffects (optional feature, low priority)
- useViewTransition (enhancement, low priority)
- useFormValidation (partially used, needs separate audit)

## Technical Constraints
- Must use existing component APIs without modification
- Must follow AuraStream naming conventions (camelCase frontend, snake_case backend)
- Must maintain accessibility compliance
- Must support reduced motion preferences
