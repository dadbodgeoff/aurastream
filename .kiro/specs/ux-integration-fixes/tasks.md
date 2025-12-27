# UX Integration Fixes - Task Breakdown

## Parallel Execution Groups

### Group A: Core Infrastructure (Must Complete First)
- Task 1: Wire OnboardingProvider
- Task 4: Wire UndoToastContainer

### Group B: Sidebar Data Attributes (Depends on Group A)
- Task 2: Add data-tour attributes to Sidebar

### Group C: Tour Enhancement (Depends on Group B)
- Task 3: Add Coach step to tour + update store

### Group D: Page Enhancements (Can run parallel to B/C)
- Task 5: Skeleton integration
- Task 6: Empty state integration

---

## Task 1: Wire OnboardingProvider into Dashboard Layout

**Assigned to:** Sub-agent 1
**Priority:** HIGH
**Dependencies:** None

### Objective
Import and wrap dashboard content with OnboardingProvider to enable the onboarding tour for authenticated users.

### File to Modify
`tsx/apps/web/src/app/dashboard/layout.tsx`

### Implementation Steps
1. Add import: `import { OnboardingProvider } from '@/providers/OnboardingProvider';`
2. Wrap the return JSX with OnboardingProvider (inside the authenticated check)
3. OnboardingProvider must wrap DashboardShell and siblings

### Expected Result
```tsx
return (
  <OnboardingProvider>
    <>
      <DashboardShell ...>
        {children}
      </DashboardShell>
      <CelebrationOverlay />
    </>
  </OnboardingProvider>
);
```

### Verification
- No TypeScript errors
- Dashboard still renders correctly
- OnboardingProvider context is available

---

## Task 2: Add data-tour Attributes to Sidebar

**Assigned to:** Sub-agent 2
**Priority:** HIGH
**Dependencies:** None (can start immediately)

### Objective
Add data-tour attributes to sidebar navigation items so the onboarding tour can highlight them.

### File to Modify
`tsx/apps/web/src/components/dashboard/layout/Sidebar.tsx`

### Implementation Steps
1. Add `dataTour?: string` to NavItem interface
2. Update mainNavItems array:
   - Quick Create: `dataTour: 'quick-create'`
   - Brand Studio: `dataTour: 'brand-kits'`
   - Asset Library: `dataTour: 'assets'`
3. Update toolsNavItems array:
   - Prompt Coach: `dataTour: 'coach'`
4. Update NavLink component to render `data-tour={item.dataTour}` on the Link

### Expected NavItem Interface
```typescript
export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
  dataTour?: string;  // NEW
}
```

### Expected NavLink Change
```tsx
<Link
  href={item.href}
  data-tour={item.dataTour}
  className={...}
>
```

### Verification
- Inspect DOM, verify data-tour attributes present
- No TypeScript errors

---

## Task 3: Add Coach Step to Onboarding Tour

**Assigned to:** Sub-agent 3
**Priority:** MEDIUM
**Dependencies:** Task 2 (data-tour="coach" must exist)

### Objective
Add a new tour step highlighting the Prompt Coach and free trial, update total steps.

### Files to Modify
1. `tsx/apps/web/src/components/onboarding/OnboardingTour.tsx`
2. `tsx/packages/shared/src/stores/onboardingStore.ts`

### Implementation Steps

#### OnboardingTour.tsx
Insert new step at index 3 (after Assets, before Command Palette):
```typescript
{
  element: '[data-tour="coach"]',
  popover: {
    title: '🤖 Your Free AI Coach Session',
    description:
      'Get AI-powered help crafting the perfect prompt. You have 1 free trial session included with your account!',
    side: 'right',
    align: 'start',
  },
  title: 'Prompt Coach',
  description: 'AI Coach with free trial',
},
```

#### onboardingStore.ts
Update constant:
```typescript
export const TOTAL_ONBOARDING_STEPS = 6;  // Was 5
```

### Verification
- Tour now has 6 steps
- Step 4 highlights Prompt Coach
- Step 5 is Command Palette
- Step 6 is Completion

---

## Task 4: Wire UndoToastContainer into Dashboard Layout

**Assigned to:** Sub-agent 1 (same as Task 1, sequential)
**Priority:** HIGH
**Dependencies:** Task 1 complete

### Objective
Add UndoToastContainer to dashboard layout to enable undo functionality for destructive actions.

### File to Modify
`tsx/apps/web/src/app/dashboard/layout.tsx`

### Implementation Steps
1. Add import: `import { UndoToastContainer } from '@/components/undo';`
2. Render UndoToastContainer after CelebrationOverlay
3. Use default props (position="bottom-left", maxVisible={3})

### Expected Result
```tsx
return (
  <OnboardingProvider>
    <>
      <DashboardShell ...>
        {children}
      </DashboardShell>
      <CelebrationOverlay />
      <UndoToastContainer />
    </>
  </OnboardingProvider>
);
```

### Verification
- No TypeScript errors
- UndoToastContainer renders (check React DevTools)
- Toast appears when undo action is queued (manual test)

---

## Task 5: Integrate Skeleton Components

**Assigned to:** Sub-agent 4
**Priority:** MEDIUM
**Dependencies:** None

### Objective
Add skeleton loading states to dashboard pages for better perceived performance.

### Files to Modify
1. `tsx/apps/web/src/app/dashboard/page.tsx` - DashboardStatsSkeleton
2. `tsx/apps/web/src/app/dashboard/assets/page.tsx` - AssetGridSkeleton
3. `tsx/apps/web/src/app/dashboard/brand-kits/page.tsx` - BrandKitCardSkeleton

### Implementation Pattern
```tsx
import { AssetGridSkeleton } from '@/components/ui/skeletons';

// In component:
if (isLoading) {
  return (
    <PageContainer>
      <AssetGridSkeleton count={6} />
    </PageContainer>
  );
}
```

### Verification
- Skeleton shows during loading
- Skeleton matches layout of actual content
- No layout shift when content loads

---

## Task 6: Integrate Empty States

**Assigned to:** Sub-agent 5
**Priority:** MEDIUM
**Dependencies:** None

### Objective
Use tier-aware empty state components when user has no assets or brand kits.

### Files to Modify
1. `tsx/apps/web/src/app/dashboard/assets/page.tsx`
2. `tsx/apps/web/src/app/dashboard/brand-kits/page.tsx`

### Implementation Pattern
```tsx
import { AssetsEmptyState } from '@/components/empty-states';

// In component:
if (!isLoading && assets.length === 0) {
  return (
    <PageContainer>
      <AssetsEmptyState
        tier={user?.subscriptionTier}
        onCreateAsset={() => router.push('/dashboard/create')}
        onBrowseTemplates={() => router.push('/dashboard/templates')}
      />
    </PageContainer>
  );
}
```

### Verification
- Empty state shows when no data
- Tier-specific messaging displays correctly
- CTA buttons navigate correctly

---

## Verification Checklist

### After All Tasks Complete
- [ ] Clear localStorage key `aurastream-onboarding`
- [ ] Navigate to /dashboard
- [ ] Tour auto-starts with step 1 (Quick Create)
- [ ] Navigate through all 6 steps
- [ ] Step 4 highlights Prompt Coach with trial message
- [ ] Complete tour, refresh page
- [ ] Tour does NOT restart
- [ ] Delete an asset (if any exist)
- [ ] Undo toast appears at bottom-left
- [ ] Click undo within 5 seconds
- [ ] Asset is restored
- [ ] Navigate to empty assets page
- [ ] AssetsEmptyState displays
- [ ] Navigate to empty brand-kits page
- [ ] BrandKitsEmptyState displays
- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run typecheck` - no errors
