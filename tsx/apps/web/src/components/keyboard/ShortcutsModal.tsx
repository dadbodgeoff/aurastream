'use client';

/**
 * ShortcutsModal Component
 * 
 * Accessible modal displaying all available keyboard shortcuts grouped by category.
 * Triggered by pressing "?" key.
 * 
 * Features:
 * - Focus trap for accessibility
 * - Escape to close
 * - Grouped shortcuts by category
 * - Platform-aware shortcut display
 * - Reduced motion support
 * 
 * @module components/keyboard/ShortcutsModal
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useScrollLock, useFocusTrap } from '@/hooks';
import { useReducedMotion } from '@aurastream/shared';
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
  const modalRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  
  // Use hooks for scroll lock and focus trap
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen);

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
      description: 'Navigate to quick create',
      category: 'navigation' as ShortcutCategory,
    },
    {
      key: 'b',
      action: 'brandKits',
      label: 'Brand Kits',
      description: 'Navigate to brand kits',
      category: 'navigation' as ShortcutCategory,
    },
    {
      key: 'a',
      action: 'assets',
      label: 'Assets',
      description: 'Navigate to assets',
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

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm',
          !prefersReducedMotion && 'transition-opacity duration-300',
          prefersReducedMotion && 'transition-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className={cn(
          'relative w-full max-w-lg',
          'bg-background-surface border border-border-subtle rounded-2xl shadow-xl',
          !prefersReducedMotion && 'transform transition-all duration-300',
          prefersReducedMotion && 'transition-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border-subtle">
          <div>
            <h2
              id="shortcuts-modal-title"
              className="text-lg font-semibold text-text-primary"
            >
              Keyboard Shortcuts
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Navigate faster with these shortcuts
            </p>
          </div>
          {/* Close button */}
          <button
            onClick={onClose}
            className={cn(
              'flex items-center justify-center w-11 h-11 -mr-2 -mt-2',
              'text-text-muted hover:text-text-secondary rounded-lg',
              'hover:bg-background-elevated active:bg-background-elevated active:scale-95',
              !prefersReducedMotion && 'transition-all duration-75',
              prefersReducedMotion && 'transition-none',
              'focus:outline-none focus:ring-2 focus:ring-interactive-600'
            )}
            aria-label="Close shortcuts modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
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
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border-subtle">
          <p className="text-xs text-text-muted text-center">
            Press <ShortcutHint shortcut={{ key: '?' }} size="sm" className="mx-1" /> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}

export default ShortcutsModal;
