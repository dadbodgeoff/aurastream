# Shared Hooks

## useKeyboardShortcuts

Register and manage keyboard shortcuts.

```typescript
import { useKeyboardShortcuts } from '@aurastream/shared';

const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

// Register a shortcut
registerShortcut({
  key: 'n',
  action: () => router.push('/create'),
  description: 'New Asset',
});
```

## useSmartDefaults

Access and update user preferences.

```typescript
import { useSmartDefaults } from '@aurastream/shared';

const { lastBrandKitId, lastAssetType, setLastBrandKit } = useSmartDefaults();
```

## useMilestones

Track and celebrate user milestones.

```typescript
import { useMilestones } from '@aurastream/shared';

const { checkMilestone, getMilestoneForCount } = useMilestones();

// Check if user hit a milestone
const milestone = checkMilestone(assetCount);
if (milestone) {
  // Trigger celebration
}
```
