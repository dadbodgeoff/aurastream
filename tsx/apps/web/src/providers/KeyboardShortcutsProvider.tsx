'use client';

/**
 * KeyboardShortcutsProvider
 * 
 * Global provider for keyboard shortcuts. Registers application-wide shortcuts
 * and provides context for shortcut state management.
 * 
 * Features:
 * - Global shortcut registration
 * - Shortcuts modal toggle
 * - Navigation shortcuts
 * - Modal/escape handling
 * 
 * @module providers/KeyboardShortcutsProvider
 * 
 * @example
 * ```tsx
 * // In your app layout
 * <KeyboardShortcutsProvider>
 *   <App />
 * </KeyboardShortcutsProvider>
 * ```
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useKeyboardShortcuts, useCommandStore } from '@aurastream/shared';
import type {
  Shortcut,
  KeyboardShortcutsContextValue,
} from '@aurastream/shared';
import { ShortcutsModal } from '@/components/keyboard/ShortcutsModal';

/**
 * Default global shortcuts for the application
 */
const DEFAULT_SHORTCUTS: Shortcut[] = [
  // Command palette (placeholder for now)
  {
    key: 'k',
    meta: true,
    action: 'openCommandPalette',
    label: 'Open Command Palette',
    description: 'Quick access to all commands',
    category: 'general',
  },
  // Also support Ctrl+K for non-Mac users
  {
    key: 'k',
    ctrl: true,
    action: 'openCommandPalette',
    label: 'Open Command Palette',
    description: 'Quick access to all commands',
    category: 'general',
  },
  // Navigation shortcuts
  {
    key: 'n',
    action: 'newAsset',
    label: 'New Asset',
    description: 'Navigate to create page',
    category: 'navigation',
  },
  {
    key: 'b',
    action: 'brandKits',
    label: 'Brand Studio',
    description: 'Navigate to brand kits',
    category: 'navigation',
  },
  {
    key: 'a',
    action: 'assets',
    label: 'Asset Library',
    description: 'Navigate to assets',
    category: 'navigation',
  },
  {
    key: 'i',
    action: 'intel',
    label: 'Creator Intel',
    description: 'Navigate to Creator Intel',
    category: 'navigation',
  },
  {
    key: 'c',
    action: 'community',
    label: 'Community',
    description: 'Navigate to community',
    category: 'navigation',
  },
  // Modal shortcuts
  {
    key: '?',
    shift: true,
    action: 'showShortcuts',
    label: 'Show Shortcuts',
    description: 'Display all keyboard shortcuts',
    category: 'modal',
  },
  // Also support just ? without shift for convenience
  {
    key: '?',
    action: 'showShortcuts',
    label: 'Show Shortcuts',
    description: 'Display all keyboard shortcuts',
    category: 'modal',
  },
  {
    key: 'Escape',
    action: 'closeModal',
    label: 'Close Modal',
    description: 'Close any open modal',
    category: 'modal',
    allowInInput: true,
  },
];

/**
 * Context for keyboard shortcuts
 */
const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

/**
 * Props for the KeyboardShortcutsProvider
 */
interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

/**
 * Provider component for keyboard shortcuts
 */
export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customShortcuts, setCustomShortcuts] = useState<Shortcut[]>([]);
  const [enabled, setEnabled] = useState(true);

  // Get command store actions
  const openCommandPalette = useCommandStore((state) => state.open);

  // Combine default and custom shortcuts
  const allShortcuts = useMemo(
    () => [...DEFAULT_SHORTCUTS, ...customShortcuts],
    [customShortcuts]
  );

  // Open shortcuts modal
  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // Close shortcuts modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Register a new shortcut
  const registerShortcut = useCallback((shortcut: Shortcut) => {
    setCustomShortcuts((prev) => {
      // Check if shortcut with same action already exists
      const exists = prev.some((s) => s.action === shortcut.action);
      if (exists) {
        // Update existing shortcut
        return prev.map((s) => (s.action === shortcut.action ? shortcut : s));
      }
      // Add new shortcut
      return [...prev, shortcut];
    });
  }, []);

  // Unregister a shortcut by action
  const unregisterShortcut = useCallback((action: string) => {
    setCustomShortcuts((prev) => prev.filter((s) => s.action !== action));
  }, []);

  // Handle shortcut actions
  const handleShortcut = useCallback(
    (action: string, _event: KeyboardEvent) => {
      switch (action) {
        case 'openCommandPalette':
          // Open the command palette
          openCommandPalette();
          break;
        case 'newAsset':
          router.push('/dashboard/create');
          break;
        case 'brandKits':
          router.push('/dashboard/brand-kits');
          break;
        case 'assets':
          router.push('/dashboard/assets');
          break;
        case 'intel':
          router.push('/dashboard/intel');
          break;
        case 'community':
          router.push('/community');
          break;
        case 'showShortcuts':
          openModal();
          break;
        case 'closeModal':
          closeModal();
          break;
        default:
          // Unknown action - could be a custom shortcut
          // No-op for unhandled shortcuts
          break;
      }
    },
    [router, openModal, closeModal, openCommandPalette]
  );

  // Set up keyboard shortcuts
  useKeyboardShortcuts(allShortcuts, {
    enabled,
    onShortcut: handleShortcut,
  });

  // Context value
  const contextValue = useMemo<KeyboardShortcutsContextValue>(
    () => ({
      shortcuts: allShortcuts,
      registerShortcut,
      unregisterShortcut,
      enabled,
      setEnabled,
      isModalOpen,
      openModal,
      closeModal,
    }),
    [
      allShortcuts,
      registerShortcut,
      unregisterShortcut,
      enabled,
      isModalOpen,
      openModal,
      closeModal,
    ]
  );

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}
      <ShortcutsModal isOpen={isModalOpen} onClose={closeModal} />
    </KeyboardShortcutsContext.Provider>
  );
}

/**
 * Hook to access keyboard shortcuts context
 * 
 * @throws Error if used outside of KeyboardShortcutsProvider
 * @returns KeyboardShortcutsContextValue
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { openModal, registerShortcut } = useKeyboardShortcutsContext();
 *   
 *   useEffect(() => {
 *     registerShortcut({
 *       key: 's',
 *       meta: true,
 *       action: 'save',
 *       label: 'Save',
 *     });
 *   }, [registerShortcut]);
 * }
 * ```
 */
export function useKeyboardShortcutsContext(): KeyboardShortcutsContextValue {
  const context = useContext(KeyboardShortcutsContext);
  
  if (!context) {
    throw new Error(
      'useKeyboardShortcutsContext must be used within a KeyboardShortcutsProvider'
    );
  }
  
  return context;
}

export default KeyboardShortcutsProvider;
