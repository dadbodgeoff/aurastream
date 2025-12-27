/**
 * useKeyboardShortcuts Hook
 * 
 * A hook for managing keyboard shortcuts with support for:
 * - Modifier keys (meta/ctrl, shift, alt)
 * - Single keys and key combinations
 * - Conditional shortcuts (when function)
 * - Input element detection (disables shortcuts when typing)
 * - Automatic cleanup on unmount
 * 
 * @module hooks/useKeyboardShortcuts
 * 
 * @example
 * ```tsx
 * const shortcuts: Shortcut[] = [
 *   { key: 'k', meta: true, action: 'openSearch', label: 'Open Search' },
 *   { key: 'n', action: 'newItem', label: 'New Item' },
 *   { key: 'Escape', action: 'close', label: 'Close', allowInInput: true },
 * ];
 * 
 * useKeyboardShortcuts(shortcuts, {
 *   onShortcut: (action) => {
 *     switch (action) {
 *       case 'openSearch': openSearchModal(); break;
 *       case 'newItem': createNewItem(); break;
 *       case 'close': closeModal(); break;
 *     }
 *   },
 * });
 * ```
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import type {
  Shortcut,
  UseKeyboardShortcutsOptions,
  UseKeyboardShortcutsReturn,
} from '../types/keyboard';
import { isInputElement, matchesShortcut } from '../types/keyboard';

/**
 * Hook for managing keyboard shortcuts
 * 
 * @param shortcuts - Array of shortcut definitions
 * @param options - Configuration options
 * @returns Object with shortcuts array and enabled state
 */
export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  options: UseKeyboardShortcutsOptions = {}
): UseKeyboardShortcutsReturn {
  const {
    enabled: initialEnabled = true,
    onShortcut,
    preventDefault = true,
    stopPropagation = false,
  } = options;

  const [enabled, setEnabled] = useState(initialEnabled);
  
  // Use refs to avoid stale closures in the event handler
  const shortcutsRef = useRef(shortcuts);
  const onShortcutRef = useRef(onShortcut);
  const enabledRef = useRef(enabled);
  const preventDefaultRef = useRef(preventDefault);
  const stopPropagationRef = useRef(stopPropagation);

  // Update refs when values change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    onShortcutRef.current = onShortcut;
  }, [onShortcut]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    preventDefaultRef.current = preventDefault;
  }, [preventDefault]);

  useEffect(() => {
    stopPropagationRef.current = stopPropagation;
  }, [stopPropagation]);

  /**
   * Handle keydown events
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if shortcuts are disabled
    if (!enabledRef.current) return;

    // Get the active element
    const activeElement = document.activeElement;
    const isInInput = isInputElement(activeElement);

    // Find matching shortcut
    for (const shortcut of shortcutsRef.current) {
      // Skip if in input and shortcut doesn't allow it
      if (isInInput && !shortcut.allowInInput) continue;

      // Check if the event matches this shortcut
      if (!matchesShortcut(event, shortcut)) continue;

      // Check the when condition if provided
      if (shortcut.when && !shortcut.when()) continue;

      // Shortcut matched! Prevent default and call handler
      if (preventDefaultRef.current) {
        event.preventDefault();
      }
      if (stopPropagationRef.current) {
        event.stopPropagation();
      }

      // Call the handler
      onShortcutRef.current?.(shortcut.action, event);
      
      // Only handle the first matching shortcut
      break;
    }
  }, []);

  /**
   * Set up and clean up the event listener
   */
  useEffect(() => {
    // Only add listener if we have shortcuts and a handler
    if (shortcuts.length === 0) return;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, shortcuts.length]);

  return {
    shortcuts,
    enabled,
    setEnabled,
  };
}

/**
 * Type export for consumers who need the return type
 */
export type { UseKeyboardShortcutsReturn };
