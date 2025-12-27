# UX Integration Fixes - Design Document

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dashboard Layout                              │
│  tsx/apps/web/src/app/dashboard/layout.tsx                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ OnboardingProv  │  │ UndoToastCont   │  │ CelebrationOvly │ │
│  │ (NEW)           │  │ (NEW)           │  │ (EXISTS)        │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    DashboardShell                           ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ Sidebar (with data-tour attributes)                  │   ││
│  │  │  - [data-tour="quick-create"] Quick Create           │   ││
│  │  │  - [data-tour="brand-kits"] Brand Studio             │   ││
│  │  │  - [data-tour="assets"] Asset Library                │   ││
│  │  │  - [data-tour="coach"] Prompt Coach (NEW)            │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Task Breakdown

### Task 1: Wire OnboardingProvider into Dashboard Layout
**File:** `tsx/apps/web/src/app/dashboard/layout.tsx`

**Changes:**
1. Import OnboardingProvider from `@/providers/OnboardingProvider`
2. Wrap children with OnboardingProvider inside the authenticated section
3. OnboardingProvider renders OnboardingTour internally

**Code Pattern:**
```tsx
import { OnboardingProvider } from '@/providers/OnboardingProvider';

// Inside authenticated return:
return (
  <OnboardingProvider>
    <DashboardShell ...>
      {children}
    </DashboardShell>
    <CelebrationOverlay />
    <UndoToastContainer />
  </OnboardingProvider>
);
```

### Task 2: Add data-tour Attributes to Sidebar
**File:** `tsx/apps/web/src/components/dashboard/layout/Sidebar.tsx`

**Changes:**
1. Add `dataTour?: string` to NavItem interface
2. Add data-tour values to mainNavItems and toolsNavItems
3. Render data-tour attribute in NavLink component

**Data Tour Mapping:**
- Quick Create → `data-tour="quick-create"`
- Brand Studio → `data-tour="brand-kits"`
- Asset Library → `data-tour="assets"`
- Prompt Coach → `data-tour="coach"`

### Task 3: Add Coach Step to Onboarding Tour
**File:** `tsx/apps/web/src/components/onboarding/OnboardingTour.tsx`

**Changes:**
1. Add new step after Assets (index 3) for Prompt Coach
2. Update TOTAL_ONBOARDING_STEPS in store to 6
3. Highlight the Coach trial benefit

**New Step:**
```typescript
{
  element: '[data-tour="coach"]',
  popover: {
    title: '🤖 Your Free AI Coach Session',
    description: 'Get AI-powered help crafting the perfect prompt. You have 1 free trial session to experience the Coach!',
    side: 'right',
    align: 'start',
  },
  title: 'Prompt Coach',
  description: 'AI Coach trial',
}
```

### Task 4: Wire UndoToastContainer into Dashboard Layout
**File:** `tsx/apps/web/src/app/dashboard/layout.tsx`

**Changes:**
1. Import UndoToastContainer from `@/components/undo`
2. Render after CelebrationOverlay
3. Use default props (bottom-left, max 3)

### Task 5: Integrate Skeleton Components
**Files:**
- `tsx/apps/web/src/app/dashboard/assets/page.tsx`
- `tsx/apps/web/src/app/dashboard/brand-kits/page.tsx`
- `tsx/apps/web/src/app/dashboard/page.tsx`

**Pattern:**
```tsx
if (isLoading) {
  return <AssetGridSkeleton count={6} />;
}
```

### Task 6: Integrate Empty States
**Files:**
- `tsx/apps/web/src/app/dashboard/assets/page.tsx`
- `tsx/apps/web/src/app/dashboard/brand-kits/page.tsx`

**Pattern:**
```tsx
if (!isLoading && assets.length === 0) {
  return (
    <AssetsEmptyState
      tier={user?.subscriptionTier}
      onCreateAsset={() => router.push('/dashboard/create')}
    />
  );
}
```

## File Change Summary

| File | Task | Changes |
|------|------|---------|
| `dashboard/layout.tsx` | 1, 4 | Add OnboardingProvider, UndoToastContainer |
| `dashboard/layout/Sidebar.tsx` | 2 | Add data-tour attributes |
| `onboarding/OnboardingTour.tsx` | 3 | Add Coach step |
| `stores/onboardingStore.ts` | 3 | Update TOTAL_ONBOARDING_STEPS to 6 |
| `dashboard/assets/page.tsx` | 5, 6 | Add skeleton, empty state |
| `dashboard/brand-kits/page.tsx` | 5, 6 | Add skeleton, empty state |
| `dashboard/page.tsx` | 5 | Add dashboard skeleton |

## Testing Strategy

1. **Unit Tests:** Verify components render correctly
2. **Integration Tests:** Verify tour flow, undo flow
3. **Manual Verification:**
   - Clear localStorage `aurastream-onboarding` key
   - Refresh dashboard, tour should auto-start
   - Complete tour, refresh, tour should NOT start
   - Delete an asset, undo toast should appear
   - Click undo within 5 seconds, asset restored

## Rollback Plan
All changes are additive imports and wrapper components. Rollback by:
1. Remove OnboardingProvider wrapper
2. Remove UndoToastContainer render
3. Remove data-tour attributes
4. Revert skeleton/empty state conditionals
