/**
 * useKeyboardShortcuts Hook Tests
 * 
 * Comprehensive tests for the keyboard shortcuts hook.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { Shortcut } from '../types/keyboard';
import { isInputElement, matchesShortcut, formatShortcut } from '../types/keyboard';

// ============================================================================
// Test Data
// ============================================================================

const createShortcut = (overrides: Partial<Shortcut> = {}): Shortcut => ({
  key: 'k',
  action: 'test',
  label: 'Test Shortcut',
  ...overrides,
});

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a keyboard event with specified properties
 */
function createKeyboardEvent(
  key: string,
  options: Partial<KeyboardEventInit> = {}
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
}

/**
 * Dispatch a keyboard event on the document
 */
function dispatchKeyEvent(
  key: string,
  options: Partial<KeyboardEventInit> = {}
): KeyboardEvent {
  const event = createKeyboardEvent(key, options);
  document.dispatchEvent(event);
  return event;
}

// ============================================================================
// Tests
// ============================================================================

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Basic Functionality
  // ==========================================================================

  describe('basic functionality', () => {
    it('should return shortcuts array and enabled state', () => {
      const shortcuts = [createShortcut()];
      const { result } = renderHook(() => useKeyboardShortcuts(shortcuts));

      expect(result.current.shortcuts).toEqual(shortcuts);
      expect(result.current.enabled).toBe(true);
    });

    it('should call onShortcut when matching key is pressed', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut({ key: 'k', action: 'testAction' })];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      act(() => {
        dispatchKeyEvent('k');
      });

      expect(onShortcut).toHaveBeenCalledTimes(1);
      expect(onShortcut).toHaveBeenCalledWith('testAction', expect.any(KeyboardEvent));
    });

    it('should not call onShortcut for non-matching keys', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut({ key: 'k' })];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      act(() => {
        dispatchKeyEvent('j');
      });

      expect(onShortcut).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive key matching', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut({ key: 'K' })];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      act(() => {
        dispatchKeyEvent('k');
      });

      expect(onShortcut).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Modifier Keys
  // ==========================================================================

  describe('modifier keys', () => {
    it('should match shortcut with meta key', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut({ key: 'k', meta: true })];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      // Without meta - should not match
      act(() => {
        dispatchKeyEvent('k');
      });
      expect(onShortcut).not.toHaveBeenCalled();

      // With meta - should match
      act(() => {
        dispatchKeyEvent('k', { metaKey: true });
      });
      expect(onShortcut).toHaveBeenCalledTimes(1);
    });

    it('should match shortcut with ctrl key', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut({ key: 'k', ctrl: true })];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      // Without ctrl - should not match
      act(() => {
        dispatchKeyEvent('k');
      });
      expect(onShortcut).not.toHaveBeenCalled();

      // With ctrl - should match
      act(() => {
        dispatchKeyEvent('k', { ctrlKey: true });
      });
      expect(onShortcut).toHaveBeenCalledTimes(1);
    });

    it('should match shortcut with shift key', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut({ key: '?', shift: true })];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      // Without shift - should not match
      act(() => {
        dispatchKeyEvent('?');
      });
      expect(onShortcut).not.toHaveBeenCalled();

      // With shift - should match
      act(() => {
        dispatchKeyEvent('?', { shiftKey: true });
      });
      expect(onShortcut).toHaveBeenCalledTimes(1);
    });

    it('should match shortcut with alt key', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut({ key: 'n', alt: true })];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      // Without alt - should not match
      act(() => {
        dispatchKeyEvent('n');
      });
      expect(onShortcut).not.toHaveBeenCalled();

      // With alt - should match
      act(() => {
        dispatchKeyEvent('n', { altKey: true });
      });
      expect(onShortcut).toHaveBeenCalledTimes(1);
    });

    it('should match shortcut with multiple modifiers', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut({ key: 's', meta: true, shift: true })];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      // Only meta - should not match
      act(() => {
        dispatchKeyEvent('s', { metaKey: true });
      });
      expect(onShortcut).not.toHaveBeenCalled();

      // Only shift - should not match
      act(() => {
        dispatchKeyEvent('s', { shiftKey: true });
      });
      expect(onShortcut).not.toHaveBeenCalled();

      // Both meta and shift - should match
      act(() => {
        dispatchKeyEvent('s', { metaKey: true, shiftKey: true });
      });
      expect(onShortcut).toHaveBeenCalledTimes(1);
    });

    it('should not match when extra modifiers are pressed', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut({ key: 'k', meta: true })];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      // Meta + Shift when only meta is expected - should not match
      act(() => {
        dispatchKeyEvent('k', { metaKey: true, shiftKey: true });
      });
      expect(onShortcut).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Enable/Disable
  // ==========================================================================

  describe('enable/disable', () => {
    it('should not fire shortcuts when disabled via options', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut()];

      renderHook(() =>
        useKeyboardShortcuts(shortcuts, { onShortcut, enabled: false })
      );

      act(() => {
        dispatchKeyEvent('k');
      });

      expect(onShortcut).not.toHaveBeenCalled();
    });

    it('should allow enabling/disabling via setEnabled', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut()];

      const { result } = renderHook(() =>
        useKeyboardShortcuts(shortcuts, { onShortcut })
      );

      // Initially enabled
      act(() => {
        dispatchKeyEvent('k');
      });
      expect(onShortcut).toHaveBeenCalledTimes(1);

      // Disable
      act(() => {
        result.current.setEnabled(false);
      });

      act(() => {
        dispatchKeyEvent('k');
      });
      expect(onShortcut).toHaveBeenCalledTimes(1); // Still 1, not called again

      // Re-enable
      act(() => {
        result.current.setEnabled(true);
      });

      act(() => {
        dispatchKeyEvent('k');
      });
      expect(onShortcut).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Input Element Detection
  // ==========================================================================

  describe('input element detection', () => {
    it('should not fire shortcuts when focused on input', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut()];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      // Create and focus an input
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      act(() => {
        dispatchKeyEvent('k');
      });

      expect(onShortcut).not.toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(input);
    });

    it('should not fire shortcuts when focused on textarea', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut()];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      // Create and focus a textarea
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      act(() => {
        dispatchKeyEvent('k');
      });

      expect(onShortcut).not.toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(textarea);
    });

    it('should fire shortcuts with allowInInput when focused on input', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut({ key: 'Escape', allowInInput: true })];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      // Create and focus an input
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      act(() => {
        dispatchKeyEvent('Escape');
      });

      expect(onShortcut).toHaveBeenCalledTimes(1);

      // Cleanup
      document.body.removeChild(input);
    });
  });

  // ==========================================================================
  // When Condition
  // ==========================================================================

  describe('when condition', () => {
    it('should only fire shortcut when condition returns true', () => {
      const onShortcut = vi.fn();
      let conditionResult = false;
      const shortcuts = [
        createShortcut({
          when: () => conditionResult,
        }),
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      // Condition is false
      act(() => {
        dispatchKeyEvent('k');
      });
      expect(onShortcut).not.toHaveBeenCalled();

      // Condition is true
      conditionResult = true;
      act(() => {
        dispatchKeyEvent('k');
      });
      expect(onShortcut).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  describe('event handling', () => {
    it('should prevent default by default', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut()];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      const event = createKeyboardEvent('k');
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        document.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not prevent default when preventDefault is false', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut()];

      renderHook(() =>
        useKeyboardShortcuts(shortcuts, { onShortcut, preventDefault: false })
      );

      const event = createKeyboardEvent('k');
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        document.dispatchEvent(event);
      });

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should stop propagation when stopPropagation is true', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut()];

      renderHook(() =>
        useKeyboardShortcuts(shortcuts, { onShortcut, stopPropagation: true })
      );

      const event = createKeyboardEvent('k');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      act(() => {
        document.dispatchEvent(event);
      });

      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Multiple Shortcuts
  // ==========================================================================

  describe('multiple shortcuts', () => {
    it('should handle multiple shortcuts', () => {
      const onShortcut = vi.fn();
      const shortcuts = [
        createShortcut({ key: 'a', action: 'actionA' }),
        createShortcut({ key: 'b', action: 'actionB' }),
        createShortcut({ key: 'c', action: 'actionC' }),
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      act(() => {
        dispatchKeyEvent('a');
      });
      expect(onShortcut).toHaveBeenLastCalledWith('actionA', expect.any(KeyboardEvent));

      act(() => {
        dispatchKeyEvent('b');
      });
      expect(onShortcut).toHaveBeenLastCalledWith('actionB', expect.any(KeyboardEvent));

      act(() => {
        dispatchKeyEvent('c');
      });
      expect(onShortcut).toHaveBeenLastCalledWith('actionC', expect.any(KeyboardEvent));

      expect(onShortcut).toHaveBeenCalledTimes(3);
    });

    it('should only fire first matching shortcut', () => {
      const onShortcut = vi.fn();
      const shortcuts = [
        createShortcut({ key: 'k', action: 'first' }),
        createShortcut({ key: 'k', action: 'second' }),
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts, { onShortcut }));

      act(() => {
        dispatchKeyEvent('k');
      });

      expect(onShortcut).toHaveBeenCalledTimes(1);
      expect(onShortcut).toHaveBeenCalledWith('first', expect.any(KeyboardEvent));
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const onShortcut = vi.fn();
      const shortcuts = [createShortcut()];

      const { unmount } = renderHook(() =>
        useKeyboardShortcuts(shortcuts, { onShortcut })
      );

      // Shortcut works before unmount
      act(() => {
        dispatchKeyEvent('k');
      });
      expect(onShortcut).toHaveBeenCalledTimes(1);

      // Unmount
      unmount();

      // Shortcut should not work after unmount
      act(() => {
        dispatchKeyEvent('k');
      });
      expect(onShortcut).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should not add listener when shortcuts array is empty', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() => useKeyboardShortcuts([]));

      // Should not have added a keydown listener
      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('isInputElement', () => {
  it('should return true for input elements', () => {
    const input = document.createElement('input');
    expect(isInputElement(input)).toBe(true);
  });

  it('should return true for textarea elements', () => {
    const textarea = document.createElement('textarea');
    expect(isInputElement(textarea)).toBe(true);
  });

  it('should return true for select elements', () => {
    const select = document.createElement('select');
    expect(isInputElement(select)).toBe(true);
  });

  it('should return true for contenteditable elements', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    expect(isInputElement(div)).toBe(true);
  });

  it('should return false for regular elements', () => {
    const div = document.createElement('div');
    expect(isInputElement(div)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isInputElement(null)).toBe(false);
  });
});

describe('matchesShortcut', () => {
  it('should match simple key', () => {
    const event = createKeyboardEvent('k');
    const shortcut = createShortcut({ key: 'k' });
    expect(matchesShortcut(event, shortcut)).toBe(true);
  });

  it('should match with meta key', () => {
    const event = createKeyboardEvent('k', { metaKey: true });
    const shortcut = createShortcut({ key: 'k', meta: true });
    expect(matchesShortcut(event, shortcut)).toBe(true);
  });

  it('should not match when meta is expected but not pressed', () => {
    const event = createKeyboardEvent('k');
    const shortcut = createShortcut({ key: 'k', meta: true });
    expect(matchesShortcut(event, shortcut)).toBe(false);
  });

  it('should not match when meta is pressed but not expected', () => {
    const event = createKeyboardEvent('k', { metaKey: true });
    const shortcut = createShortcut({ key: 'k' });
    expect(matchesShortcut(event, shortcut)).toBe(false);
  });
});

describe('formatShortcut', () => {
  it('should format simple key', () => {
    const shortcut = { key: 'k' };
    expect(formatShortcut(shortcut, true)).toBe('K');
    expect(formatShortcut(shortcut, false)).toBe('K');
  });

  it('should format with meta key on Mac', () => {
    const shortcut = { key: 'k', meta: true };
    expect(formatShortcut(shortcut, true)).toBe('⌘K');
  });

  it('should format with meta key on Windows', () => {
    const shortcut = { key: 'k', meta: true };
    expect(formatShortcut(shortcut, false)).toBe('Win+K');
  });

  it('should format with ctrl key on Mac', () => {
    const shortcut = { key: 'k', ctrl: true };
    expect(formatShortcut(shortcut, true)).toBe('⌃K');
  });

  it('should format with ctrl key on Windows', () => {
    const shortcut = { key: 'k', ctrl: true };
    expect(formatShortcut(shortcut, false)).toBe('Ctrl+K');
  });

  it('should format with multiple modifiers', () => {
    const shortcut = { key: 's', meta: true, shift: true };
    expect(formatShortcut(shortcut, true)).toBe('⌘⇧S');
    expect(formatShortcut(shortcut, false)).toBe('Win+Shift+S');
  });

  it('should format special keys', () => {
    expect(formatShortcut({ key: 'Escape' }, true)).toBe('Esc');
    expect(formatShortcut({ key: 'Enter' }, true)).toBe('↵');
    expect(formatShortcut({ key: 'ArrowUp' }, true)).toBe('↑');
  });
});
