'use client';

/**
 * ShortcutsModal Component
 * 
 * Accessible modal displaying all available keyboard shortcuts grouped by category.
 * Triggered by pressing "?" key.
 * 
 * Features:
 * - Uses ResponsiveModal for mobile bottom sheet / desktop dialog
 * - Grouped shortcuts by category
 * - Platform-aware shortcut display
 * - Reduced motion support
 * 
 * @module components/keyboard/ShortcutsModal
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import type { ShortcutsModalProps, Shortcut, ShortcutCategory } from '@aurastream/shared';
import { ShortcutHint } from './ShortcutHint';

/**
 * Category labels for display
 */
const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  navigation: 'Navigation',
  actions: 'Actions',
  modal: 'Modals & Dialogs',
  general: 'General',
};

/**
 * Category order for display
 */
const CATEGORY_ORDER: ShortcutCategory[] = ['general', 'navigation', 'actions', 'modal'];

/**
 * Group shortcuts by category
 */
function groupShortcutsByCategory(shortcuts: Shortcut[]): Map<ShortcutCategory, Shortcut[]> {
  const groups = new Map<ShortcutCategory, Shortcut[]>();
  
  // Initialize all categories
  for (const category of CATEGORY_ORDER) {
    groups.set(category, []);
  }
  
  // Group shortcuts, filtering out duplicates by action
  const seenActions = new Set<string>();
  
  for (const shortcut of shortcuts) {
    // Skip duplicates (e.g., Cmd+K and Ctrl+K for same action)
    if (seenActions.has(shortcut.action)) continue;
    seenActions.add(shortcut.action);
    
    const category = shortcut.category || 'general';
    const group = groups.get(category) || [];
    group.push(shortcut);
    groups.set(category, group);
  }
  
  return groups;
}

/**
 * ShortcutsModal - Display all keyboard shortcuts
 */
export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  // Get shortcuts from context or use defaults
  // For now, we'll define them here since we can't use context inside the modal
  // (it would create a circular dependency)
  const shortcuts: Shortcut[] = useMemo(() => [
    {
      key: 'k',
      meta: true,
      action: 'openCommandPalette',
      label: 'Open Command Palette',
      description: 'Quick access to all commands',
      category: 'general' as ShortcutCategory,
    },
    {
      key: 'n',
      action: 'newAsset',
      label: 'New Asset',
      description: 'Navigate to create page',
      category: 'navigation' as ShortcutCategory,
    },
    {
      key: 'b',
      action: 'brandKits',
      label: 'Brand Studio',
      description: 'Navigate to brand kits',
      category: 'navigation' as ShortcutCategory,
    },
    {
      key: 'a',
      action: 'assets',
      label: 'Asset Library',
      description: 'Navigate to assets',
      category: 'navigation' as ShortcutCategory,
    },
    {
      key: 'i',
      action: 'intel',
      label: 'Creator Intel',
      description: 'Navigate to Creator Intel',
      category: 'navigation' as ShortcutCategory,
    },
    {
      key: 'c',
      action: 'community',
      label: 'Community',
      description: 'Navigate to community',
      category: 'navigation' as ShortcutCategory,
    },
    {
      key: '?',
      action: 'showShortcuts',
      label: 'Show Shortcuts',
      description: 'Display this modal',
      category: 'modal' as ShortcutCategory,
    },
    {
      key: 'Escape',
      action: 'closeModal',
      label: 'Close Modal',
      description: 'Close any open modal',
      category: 'modal' as ShortcutCategory,
    },
  ], []);

  // Group shortcuts by category
  const groupedShortcuts = useMemo(
    () => groupShortcutsByCategory(shortcuts),
    [shortcuts]
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      description="Navigate faster with these shortcuts"
    >
      {/* Shortcuts Content */}
      <div className="space-y-6">
        {CATEGORY_ORDER.map((category) => {
          const categoryShortcuts = groupedShortcuts.get(category) || [];
          if (categoryShortcuts.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="text-sm font-medium text-text-secondary mb-3">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.action}
                    className={cn(
                      'flex items-center justify-between',
                      'p-3 rounded-lg',
                      'bg-background-elevated/50',
                      'border border-border-subtle/50'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {shortcut.label}
                      </p>
                      {shortcut.description && (
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          {shortcut.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <ShortcutHint
                        shortcut={{
                          key: shortcut.key,
                          meta: shortcut.meta,
                          ctrl: shortcut.ctrl,
                          shift: shortcut.shift,
                          alt: shortcut.alt,
                        }}
                        size="md"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-border-subtle">
        <p className="text-xs text-text-muted text-center">
          Press <ShortcutHint shortcut={{ key: '?' }} size="sm" className="mx-1" /> anytime to show this help
        </p>
      </div>
    </ResponsiveModal>
  );
}

export default ShortcutsModal;
