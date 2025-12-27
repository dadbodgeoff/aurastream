# UX Polish 2025 - Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UX POLISH LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Command Palette │  │  Onboarding     │  │  Celebrations   │             │
│  │    (cmdk)       │  │   (driver.js)   │  │  (existing)     │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│  ┌────────▼────────────────────▼────────────────────▼────────┐             │
│  │                    SHARED STORES (Zustand)                 │             │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │             │
│  │  │ commandStore │ │onboardingStore│ │ polishStore  │       │             │
│  │  └──────────────┘ └──────────────┘ └──────────────┘       │             │
│  └────────────────────────────────────────────────────────────┘             │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Optimistic      │  │  Undo System    │  │  Smart Defaults │             │
│  │ Updates (TQ)    │  │  (Toast+Store)  │  │  (localStorage) │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│  ┌────────▼────────────────────▼────────────────────▼────────┐             │
│  │                    HOOKS LAYER                             │             │
│  │  useCommandPalette, useOnboarding, useUndo, useDefaults   │             │
│  │  useKeyboardShortcuts, useOptimistic, useValidation       │             │
│  └────────────────────────────────────────────────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Module 1: Command Palette

### Dependencies
```json
{
  "cmdk": "^1.0.0"
}
```

### File Structure
```
tsx/packages/shared/src/
├── stores/
│   └── commandStore.ts          # Command registry and state
├── hooks/
│   └── useCommandPalette.ts     # Hook for command palette

tsx/apps/web/src/
├── components/
│   └── command-palette/
│       ├── CommandPalette.tsx   # Main component
│       ├── CommandGroup.tsx     # Group renderer
│       ├── CommandItem.tsx      # Item renderer
│       ├── commands/
│       │   ├── navigation.ts    # Navigation commands
│       │   ├── actions.ts       # Action commands
│       │   └── index.ts         # Command registry
│       └── index.ts
├── providers/
│   └── CommandPaletteProvider.tsx
```

### Command Interface
```typescript
interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  keywords?: string[];
  section: 'navigation' | 'actions' | 'recent' | 'search';
  action: () => void | Promise<void>;
  when?: () => boolean; // Conditional visibility
}
```

### Store Design
```typescript
interface CommandStore {
  isOpen: boolean;
  search: string;
  commands: Command[];
  recentCommands: string[]; // Command IDs
  
  open: () => void;
  close: () => void;
  setSearch: (search: string) => void;
  registerCommand: (command: Command) => void;
  unregisterCommand: (id: string) => void;
  executeCommand: (id: string) => void;
  addToRecent: (id: string) => void;
}
```

---

## Module 2: Optimistic Updates

### Pattern: TanStack Query Optimistic Updates
```typescript
// Example: Brand Kit Activation
const useActivateBrandKit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: activateBrandKitApi,
    onMutate: async (brandKitId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['brandKits'] });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(['brandKits']);
      
      // Optimistically update
      queryClient.setQueryData(['brandKits'], (old) => ({
        ...old,
        brandKits: old.brandKits.map(kit => ({
          ...kit,
          is_active: kit.id === brandKitId
        }))
      }));
      
      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['brandKits'], context.previous);
      toast.error('Failed to activate brand kit');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['brandKits'] });
    },
  });
};
```

### Hooks to Create
```typescript
// tsx/packages/api-client/src/hooks/
useOptimisticBrandKitActivation.ts
useOptimisticAssetDeletion.ts
useOptimisticLogoUpload.ts
useOptimisticFavorite.ts
```

---

## Module 3: Onboarding Tour

### Dependencies
```json
{
  "driver.js": "^1.3.0"
}
```

### File Structure
```
tsx/packages/shared/src/
├── stores/
│   └── onboardingStore.ts       # Onboarding state

tsx/apps/web/src/
├── components/
│   └── onboarding/
│       ├── OnboardingProvider.tsx
│       ├── OnboardingTour.tsx
│       ├── steps/
│       │   ├── welcome.ts
│       │   ├── quickCreate.ts
│       │   ├── brandKits.ts
│       │   ├── assets.ts
│       │   └── coach.ts
│       └── index.ts
```

### Store Design
```typescript
interface OnboardingStore {
  hasCompletedOnboarding: boolean;
  currentStep: number;
  totalSteps: number;
  isActive: boolean;
  
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}
```

### Tour Steps
```typescript
const ONBOARDING_STEPS: TourStep[] = [
  {
    element: '#quick-create-button',
    popover: {
      title: 'Create Your First Asset',
      description: 'Start here to generate professional streaming assets in seconds.',
      position: 'bottom',
    },
  },
  // ... more steps
];
```

---

## Module 4: Enhanced Empty States

### File Structure
```
tsx/apps/web/src/components/
├── empty-states/
│   ├── EmptyStateBase.tsx       # Base component
│   ├── AssetsEmptyState.tsx     # Assets page
│   ├── BrandKitsEmptyState.tsx  # Brand kits page
│   ├── JobsEmptyState.tsx       # Jobs/history page
│   ├── SearchEmptyState.tsx     # Search results
│   ├── illustrations/
│   │   ├── NoAssets.tsx
│   │   ├── NoBrandKits.tsx
│   │   └── NoResults.tsx
│   └── index.ts
```

### Base Component Interface
```typescript
interface EmptyStateProps {
  illustration: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  tier?: 'free' | 'pro' | 'studio';
}
```

---

## Module 5: Content-Aware Skeleton Loading

### Enhanced Skeleton Components
```
tsx/apps/web/src/components/ui/
├── Skeleton.tsx                 # Base (existing)
├── skeletons/
│   ├── AssetGridSkeleton.tsx
│   ├── BrandKitCardSkeleton.tsx
│   ├── DashboardStatsSkeleton.tsx
│   ├── CoachMessageSkeleton.tsx
│   └── index.ts
```

### Skeleton with Context
```typescript
interface SkeletonWithContextProps {
  message?: string;
  showProgress?: boolean;
  brandColor?: string;
}
```

---

## Module 6: Undo System

### File Structure
```
tsx/packages/shared/src/
├── stores/
│   └── undoStore.ts             # Undo queue management

tsx/apps/web/src/
├── hooks/
│   └── useUndo.ts               # Undo hook
├── components/
│   └── undo/
│       ├── UndoToast.tsx        # Undo toast component
│       └── index.ts
```

### Store Design
```typescript
interface UndoAction {
  id: string;
  type: 'delete_asset' | 'delete_brand_kit' | 'bulk_delete';
  label: string;
  data: unknown;
  undo: () => Promise<void>;
  expiresAt: number;
}

interface UndoStore {
  actions: UndoAction[];
  
  pushAction: (action: Omit<UndoAction, 'id' | 'expiresAt'>) => string;
  executeUndo: (id: string) => Promise<void>;
  removeAction: (id: string) => void;
  clearExpired: () => void;
}
```

### Backend Support
```sql
-- Add soft delete columns
ALTER TABLE assets ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE brand_kits ADD COLUMN deleted_at TIMESTAMPTZ;

-- Update RLS policies to exclude soft-deleted
```

---

## Module 7: Generation Celebrations

### Integration Points
```typescript
// In generation progress page
useEffect(() => {
  if (status === 'completed' && asset) {
    // Trigger celebration
    queueCelebration({
      type: 'achievement',
      title: 'Asset Created!',
      description: `Your ${asset.asset_type} is ready`,
      rarity: getAssetRarity(assetCount),
    });
    
    // Check milestones
    checkMilestones(assetCount);
  }
}, [status, asset]);
```

### Milestone System
```typescript
const MILESTONES = [
  { count: 1, title: 'First Creation', rarity: 'rare' },
  { count: 10, title: 'Getting Started', rarity: 'epic' },
  { count: 50, title: 'Content Creator', rarity: 'legendary' },
  { count: 100, title: 'Asset Master', rarity: 'mythic' },
];
```

---

## Module 8: Smart Defaults

### File Structure
```
tsx/packages/shared/src/
├── stores/
│   └── preferencesStore.ts      # User preferences
├── hooks/
│   └── useSmartDefaults.ts      # Smart defaults hook
```

### Store Design
```typescript
interface PreferencesStore {
  lastBrandKitId: string | null;
  lastAssetType: string | null;
  formHistory: Record<string, Record<string, string>>;
  
  setLastBrandKit: (id: string) => void;
  setLastAssetType: (type: string) => void;
  saveFormValues: (formId: string, values: Record<string, string>) => void;
  getFormDefaults: (formId: string) => Record<string, string>;
}
```

### Persistence
```typescript
// Use zustand persist middleware
export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      // ... implementation
    }),
    {
      name: 'aurastream-preferences',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

---

## Module 9: Inline Validation

### File Structure
```
tsx/apps/web/src/
├── hooks/
│   └── useFormValidation.ts     # Validation hook
├── components/
│   └── forms/
│       ├── ValidatedInput.tsx   # Input with validation
│       ├── ValidationFeedback.tsx
│       ├── FormProgress.tsx
│       └── index.ts
```

### Validation Hook
```typescript
interface UseFormValidationOptions<T> {
  schema: ZodSchema<T>;
  onValidChange?: (isValid: boolean) => void;
  debounceMs?: number;
}

function useFormValidation<T>(options: UseFormValidationOptions<T>) {
  // Returns validation state, errors, and helpers
}
```

---

## Module 10: Keyboard Navigation

### File Structure
```
tsx/packages/shared/src/
├── hooks/
│   └── useKeyboardShortcuts.ts  # Global shortcuts

tsx/apps/web/src/
├── providers/
│   └── KeyboardShortcutsProvider.tsx
├── components/
│   └── keyboard/
│       ├── ShortcutHint.tsx     # Inline shortcut hints
│       ├── ShortcutsModal.tsx   # ? modal
│       └── index.ts
```

### Shortcuts Registry
```typescript
const GLOBAL_SHORTCUTS: Shortcut[] = [
  { key: 'k', meta: true, action: 'openCommandPalette', label: 'Command Palette' },
  { key: 'n', action: 'newAsset', label: 'New Asset' },
  { key: 'b', action: 'brandKits', label: 'Brand Kits' },
  { key: 'a', action: 'assets', label: 'Assets' },
  { key: '?', action: 'showShortcuts', label: 'Show Shortcuts' },
  { key: 'Escape', action: 'closeModal', label: 'Close' },
];
```

---

## Implementation Order

### Phase 1: Foundation (Tasks 1-3)
1. Keyboard Navigation System (enables everything else)
2. Command Palette (high impact, uses keyboard system)
3. Smart Defaults Store (used by other features)

### Phase 2: Core UX (Tasks 4-6)
4. Optimistic Updates (improves perceived performance)
5. Undo System (safety net for optimistic updates)
6. Enhanced Empty States (improves first-time experience)

### Phase 3: Delight (Tasks 7-9)
7. Generation Celebrations (uses existing system)
8. Onboarding Tour (uses all previous features)
9. Inline Validation (polish)

### Phase 4: Polish (Task 10)
10. Content-Aware Skeletons (final polish)

---

## Testing Strategy

### Unit Tests
- All stores: State transitions, persistence
- All hooks: Return values, side effects
- All components: Rendering, interactions

### Integration Tests
- Command palette: Search, execute, keyboard nav
- Onboarding: Full flow completion
- Undo: Delete → Undo → Verify restored

### E2E Tests
- New user onboarding flow
- Power user keyboard-only workflow
- Asset generation with celebration

---

## Rollout Strategy

1. Feature flags for each module
2. A/B testing for onboarding
3. Gradual rollout by user tier
4. Analytics tracking for each feature
