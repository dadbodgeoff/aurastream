'use client';

/**
 * ContextMenu Component
 *
 * A floating context menu that appears at a specified position.
 * Designed for enterprise mobile UX with accessibility and haptic feedback.
 *
 * Features:
 * - Floating menu at specified viewport coordinates
 * - Automatic viewport boundary detection and repositioning
 * - Focus trap for accessibility
 * - Close on outside click
 * - Close on escape key
 * - Haptic feedback on open (if supported)
 * - Arrow key navigation between items
 * - Support for menu items with icons, labels, and variants
 * - Reduced motion support
 *
 * @module ui/ContextMenu
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ContextMenu
 *   items={[
 *     { id: 'edit', label: 'Edit', onClick: handleEdit },
 *     { id: 'delete', label: 'Delete', onClick: handleDelete, variant: 'danger' },
 *   ]}
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   position={{ x: 100, y: 200 }}
 * />
 *
 * // With icons and disabled items
 * <ContextMenu
 *   items={[
 *     { id: 'copy', label: 'Copy', icon: <CopyIcon />, onClick: handleCopy },
 *     { id: 'paste', label: 'Paste', icon: <PasteIcon />, onClick: handlePaste, disabled: true },
 *   ]}
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   position={{ x: mouseX, y: mouseY }}
 * />
 * ```
 */

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks';
import { useHapticFeedback, useReducedMotion } from '@aurastream/shared';

/**
 * Represents a single menu item in the context menu.
 */
export interface ContextMenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display label for the menu item */
  label: string;
  /** Optional icon to display before the label */
  icon?: ReactNode;
  /** Callback fired when the item is clicked */
  onClick: () => void;
  /** Visual variant of the item */
  variant?: 'default' | 'danger';
  /** Whether the item is disabled */
  disabled?: boolean;
}

/**
 * Props for the ContextMenu component.
 */
export interface ContextMenuProps {
  /** Array of menu items to display */
  items: ContextMenuItem[];
  /** Whether the menu is open */
  isOpen: boolean;
  /** Callback fired when the menu should close */
  onClose: () => void;
  /** Position relative to viewport */
  position: { x: number; y: number };
  /** Additional class names */
  className?: string;
}

/** Minimum width of the context menu */
const MIN_WIDTH = 180;

/** Maximum width of the context menu */
const MAX_WIDTH = 280;

/** Padding from viewport edges */
const VIEWPORT_PADDING = 8;

/**
 * ContextMenu - A floating menu that appears at a specified position.
 *
 * Provides a context menu with full accessibility support including
 * focus trap, keyboard navigation, and haptic feedback.
 *
 * @param props - Component props
 * @returns The context menu component or null if not open
 */
export function ContextMenu({
  items,
  isOpen,
  onClose,
  position,
  className,
}: ContextMenuProps): ReactNode {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  
  const { trigger: triggerHaptic } = useHapticFeedback();
  const prefersReducedMotion = useReducedMotion();
  
  // Use focus trap for accessibility
  useFocusTrap(menuRef, isOpen);

  /**
   * Get the indices of enabled (non-disabled) items
   */
  const enabledIndices = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.disabled)
    .map(({ index }) => index);

  /**
   * Calculate adjusted position to keep menu within viewport
   */
  useEffect(() => {
    if (!isOpen || !menuRef.current) {
      setAdjustedPosition(position);
      return;
    }

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Adjust horizontal position if menu would overflow right edge
    if (position.x + rect.width > viewportWidth - VIEWPORT_PADDING) {
      adjustedX = Math.max(VIEWPORT_PADDING, viewportWidth - rect.width - VIEWPORT_PADDING);
    }

    // Adjust vertical position if menu would overflow bottom edge
    if (position.y + rect.height > viewportHeight - VIEWPORT_PADDING) {
      adjustedY = Math.max(VIEWPORT_PADDING, viewportHeight - rect.height - VIEWPORT_PADDING);
    }

    // Ensure menu doesn't go off left or top edges
    adjustedX = Math.max(VIEWPORT_PADDING, adjustedX);
    adjustedY = Math.max(VIEWPORT_PADDING, adjustedY);

    setAdjustedPosition({ x: adjustedX, y: adjustedY });
  }, [isOpen, position]);

  /**
   * Trigger haptic feedback when menu opens
   */
  useEffect(() => {
    if (isOpen) {
      triggerHaptic('light');
      // Reset focused index to first enabled item
      const firstEnabledIndex = enabledIndices[0] ?? 0;
      setFocusedIndex(firstEnabledIndex);
    }
  }, [isOpen, triggerHaptic, enabledIndices]);

  /**
   * Handle escape key press to close menu
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  /**
   * Handle outside click to close menu
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use setTimeout to avoid immediate close from the same click that opened the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  /**
   * Handle keyboard navigation within the menu
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (enabledIndices.length === 0) return;

      const currentEnabledPosition = enabledIndices.indexOf(focusedIndex);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextPosition = (currentEnabledPosition + 1) % enabledIndices.length;
          setFocusedIndex(enabledIndices[nextPosition]);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevPosition = currentEnabledPosition <= 0
            ? enabledIndices.length - 1
            : currentEnabledPosition - 1;
          setFocusedIndex(enabledIndices[prevPosition]);
          break;
        }
        case 'Home': {
          e.preventDefault();
          setFocusedIndex(enabledIndices[0]);
          break;
        }
        case 'End': {
          e.preventDefault();
          setFocusedIndex(enabledIndices[enabledIndices.length - 1]);
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          const item = items[focusedIndex];
          if (item && !item.disabled) {
            item.onClick();
            onClose();
          }
          break;
        }
      }
    },
    [enabledIndices, focusedIndex, items, onClose]
  );

  /**
   * Handle item click
   */
  const handleItemClick = useCallback(
    (item: ContextMenuItem) => {
      if (item.disabled) return;
      triggerHaptic('medium');
      item.onClick();
      onClose();
    },
    [onClose, triggerHaptic]
  );

  /**
   * Focus the item button when focusedIndex changes
   */
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const buttons = menuRef.current.querySelectorAll<HTMLButtonElement>(
      'button[role="menuitem"]:not([disabled])'
    );
    
    // Find the button that corresponds to the focused index
    const enabledPosition = enabledIndices.indexOf(focusedIndex);
    if (enabledPosition >= 0 && buttons[enabledPosition]) {
      buttons[enabledPosition].focus();
    }
  }, [focusedIndex, isOpen, enabledIndices]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      {/* Invisible backdrop for outside click detection */}
      <div
        className="fixed inset-0 z-50"
        aria-hidden="true"
      />

      {/* Context Menu */}
      <div
        ref={menuRef}
        role="menu"
        aria-orientation="vertical"
        tabIndex={-1}
        className={cn(
          'fixed z-50',
          'bg-background-surface border border-border-subtle rounded-xl shadow-xl',
          'py-1',
          'transition-opacity',
          prefersReducedMotion ? 'duration-0' : 'duration-150',
          'animate-in fade-in-0 zoom-in-95',
          prefersReducedMotion && 'animate-none',
          className
        )}
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
          minWidth: MIN_WIDTH,
          maxWidth: MAX_WIDTH,
        }}
        onKeyDown={handleKeyDown}
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            role="menuitem"
            tabIndex={focusedIndex === index ? 0 : -1}
            disabled={item.disabled}
            onClick={() => handleItemClick(item)}
            onMouseEnter={() => {
              if (!item.disabled) {
                setFocusedIndex(index);
              }
            }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 text-sm text-left',
              'transition-colors',
              prefersReducedMotion ? 'duration-0' : 'duration-150',
              // Default variant
              item.variant !== 'danger' && [
                'text-text-primary',
                'hover:bg-background-hover focus:bg-background-hover',
                'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-primary/50',
              ],
              // Danger variant
              item.variant === 'danger' && [
                'text-red-500',
                'hover:bg-red-500/10 focus:bg-red-500/10',
                'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500/50',
              ],
              // Disabled state
              item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent focus:bg-transparent'
            )}
          >
            {item.icon && (
              <span
                className={cn(
                  'flex-shrink-0 w-5 h-5',
                  item.variant === 'danger' ? 'text-red-500' : 'text-text-muted'
                )}
                aria-hidden="true"
              >
                {item.icon}
              </span>
            )}
            <span className="flex-1 truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export default ContextMenu;
