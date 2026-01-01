'use client';

/**
 * ShortcutHint Component
 * 
 * Displays keyboard shortcut hints inline with platform-appropriate symbols.
 * Supports different sizes and respects reduced motion preferences.
 * 
 * @module components/keyboard/ShortcutHint
 * 
 * @example
 * ```tsx
 * // Simple shortcut
 * <ShortcutHint shortcut={{ key: 'k', meta: true }} />
 * // Renders: ⌘K (on Mac) or Ctrl+K (on Windows)
 * 
 * // With size
 * <ShortcutHint shortcut={{ key: 'n' }} size="sm" />
 * ```
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion, formatShortcut } from '@aurastream/shared';
import type { ShortcutHintProps } from '@aurastream/shared';

/**
 * Size variants for the ShortcutHint component
 */
const sizeClasses = {
  sm: 'text-micro px-1 py-0.5 min-w-[18px]',
  md: 'text-xs px-1.5 py-0.5 min-w-[22px]',
  lg: 'text-sm px-2 py-1 min-w-[28px]',
} as const;

/**
 * Detect if the user is on a Mac
 */
function useIsMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * ShortcutHint - Display keyboard shortcut hints
 * 
 * Features:
 * - Platform-aware symbols (⌘ for Mac, Ctrl for Windows)
 * - Multiple size variants
 * - Subtle styling that doesn't distract
 * - Respects reduced motion preferences
 */
export function ShortcutHint({
  shortcut,
  size = 'md',
  className,
}: ShortcutHintProps) {
  const isMac = useIsMac();
  const prefersReducedMotion = useReducedMotion();

  // Format the shortcut for display
  const displayText = useMemo(
    () => formatShortcut(shortcut, isMac),
    [shortcut, isMac]
  );

  // Split into individual keys for better styling
  const keys = useMemo(() => {
    if (isMac) {
      // On Mac, symbols are combined without separator
      // Split by looking for uppercase letters or symbols
      const parts: string[] = [];
      let current = '';
      
      for (const char of displayText) {
        if (char === '⌘' || char === '⌃' || char === '⌥' || char === '⇧') {
          if (current) parts.push(current);
          parts.push(char);
          current = '';
        } else {
          current += char;
        }
      }
      if (current) parts.push(current);
      
      return parts;
    } else {
      // On Windows, keys are separated by +
      return displayText.split('+');
    }
  }, [displayText, isMac]);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5',
        className
      )}
      aria-label={`Keyboard shortcut: ${displayText}`}
    >
      {keys.map((key, index) => (
        <kbd
          key={index}
          className={cn(
            // Base styles
            'inline-flex items-center justify-center',
            'font-mono font-medium',
            'bg-background-elevated text-text-muted',
            'border border-border-subtle rounded',
            'select-none',
            // Transition for hover states
            !prefersReducedMotion && 'transition-colors duration-150',
            // Size variant
            sizeClasses[size]
          )}
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

/**
 * Inline shortcut hint for use in buttons or menu items
 * Slightly more subtle styling
 */
export function InlineShortcutHint({
  shortcut,
  className,
}: Omit<ShortcutHintProps, 'size'>) {
  const isMac = useIsMac();

  const displayText = useMemo(
    () => formatShortcut(shortcut, isMac),
    [shortcut, isMac]
  );

  return (
    <span
      className={cn(
        'ml-auto text-xs text-text-muted opacity-60',
        'font-mono',
        className
      )}
      aria-label={`Keyboard shortcut: ${displayText}`}
    >
      {displayText}
    </span>
  );
}

export default ShortcutHint;
