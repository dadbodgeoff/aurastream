/**
 * Keyboard Shortcut Types
 * 
 * Type definitions for the keyboard navigation system.
 * Used across the application for consistent shortcut handling.
 * 
 * @module types/keyboard
 */

/**
 * Shortcut category for grouping in the shortcuts modal
 */
export type ShortcutCategory = 
  | 'navigation'
  | 'actions'
  | 'modal'
  | 'general';

/**
 * Represents a keyboard shortcut definition
 */
export interface Shortcut {
  /** The key to listen for (e.g., 'k', 'Escape', 'Enter') */
  key: string;
  /** Whether the Meta key (⌘ on Mac, Windows key on Windows) is required */
  meta?: boolean;
  /** Whether the Ctrl key is required */
  ctrl?: boolean;
  /** Whether the Shift key is required */
  shift?: boolean;
  /** Whether the Alt/Option key is required */
  alt?: boolean;
  /** Unique action identifier */
  action: string;
  /** Human-readable label for the shortcut */
  label: string;
  /** Optional description for the shortcuts modal */
  description?: string;
  /** Category for grouping in the shortcuts modal */
  category?: ShortcutCategory;
  /** Condition function - shortcut only fires when this returns true */
  when?: () => boolean;
  /** Whether this shortcut should work even when typing in inputs */
  allowInInput?: boolean;
}

/**
 * Shortcut handler function type
 */
export type ShortcutHandler = (action: string, event: KeyboardEvent) => void;

/**
 * Options for the useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean;
  /** Handler function called when a shortcut is triggered */
  onShortcut?: ShortcutHandler;
  /** Whether to prevent default browser behavior (default: true) */
  preventDefault?: boolean;
  /** Whether to stop event propagation (default: false) */
  stopPropagation?: boolean;
}

/**
 * Return type for the useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsReturn {
  /** Currently registered shortcuts */
  shortcuts: Shortcut[];
  /** Whether shortcuts are currently enabled */
  enabled: boolean;
  /** Enable or disable shortcuts */
  setEnabled: (enabled: boolean) => void;
}

/**
 * Context value for the KeyboardShortcutsProvider
 */
export interface KeyboardShortcutsContextValue {
  /** All registered shortcuts */
  shortcuts: Shortcut[];
  /** Register a new shortcut */
  registerShortcut: (shortcut: Shortcut) => void;
  /** Unregister a shortcut by action */
  unregisterShortcut: (action: string) => void;
  /** Whether shortcuts are globally enabled */
  enabled: boolean;
  /** Enable or disable shortcuts globally */
  setEnabled: (enabled: boolean) => void;
  /** Whether the shortcuts modal is open */
  isModalOpen: boolean;
  /** Open the shortcuts modal */
  openModal: () => void;
  /** Close the shortcuts modal */
  closeModal: () => void;
}

/**
 * Props for the ShortcutHint component
 */
export interface ShortcutHintProps {
  /** The shortcut to display */
  shortcut: Pick<Shortcut, 'key' | 'meta' | 'ctrl' | 'shift' | 'alt'>;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the ShortcutsModal component
 */
export interface ShortcutsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
}

/**
 * Format a shortcut for display
 * Returns platform-appropriate symbols (⌘ for Mac, Ctrl for Windows)
 */
export function formatShortcut(
  shortcut: Pick<Shortcut, 'key' | 'meta' | 'ctrl' | 'shift' | 'alt'>,
  isMac: boolean = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
): string {
  const parts: string[] = [];
  
  if (shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Win');
  }
  if (shortcut.ctrl) {
    parts.push(isMac ? '⌃' : 'Ctrl');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  
  // Format special keys
  const keyDisplay = formatKeyDisplay(shortcut.key);
  parts.push(keyDisplay);
  
  return parts.join(isMac ? '' : '+');
}

/**
 * Format a key for display
 */
function formatKeyDisplay(key: string): string {
  if (!key) return '';
  
  const keyMap: Record<string, string> = {
    'Escape': 'Esc',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Enter': '↵',
    'Backspace': '⌫',
    'Delete': '⌦',
    'Tab': '⇥',
    ' ': 'Space',
  };
  
  return keyMap[key] || key.toUpperCase();
}

/**
 * Check if an element is an input-like element
 */
export function isInputElement(element: Element | null): boolean {
  if (!element) return false;
  
  const tagName = element.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  const isContentEditable = element.getAttribute('contenteditable') === 'true';
  
  return isInput || isContentEditable;
}

/**
 * Check if a keyboard event matches a shortcut definition
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  // Guard against undefined keys
  if (!event.key || !shortcut.key) {
    return false;
  }
  
  // Check modifier keys
  const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
  const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
  const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
  const altMatch = shortcut.alt ? event.altKey : !event.altKey;
  
  // Check the main key (case-insensitive for letters)
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
  
  return metaMatch && ctrlMatch && shiftMatch && altMatch && keyMatch;
}
