'use client';

/**
 * CommandPaletteProvider
 * 
 * Provider component that sets up the command palette with default commands.
 * Registers navigation and action commands on mount.
 * 
 * Features:
 * - Registers default commands on mount
 * - Cleans up commands on unmount
 * - Provides the CommandPalette component
 * 
 * @module providers/CommandPaletteProvider
 * 
 * @example
 * ```tsx
 * // In your app layout
 * <CommandPaletteProvider>
 *   <App />
 * </CommandPaletteProvider>
 * ```
 */

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useCommandStore } from '@aurastream/shared';
import { CommandPalette } from '@/components/command-palette';
import {
  createNavigationCommands,
  createActionCommands,
} from '@/components/command-palette/commands';

/**
 * Props for CommandPaletteProvider
 */
interface CommandPaletteProviderProps {
  children: ReactNode;
  /** Optional callback when shortcuts modal should open */
  onShowShortcuts?: () => void;
}

/**
 * CommandPaletteProvider - Sets up command palette with default commands
 */
export function CommandPaletteProvider({
  children,
  onShowShortcuts,
}: CommandPaletteProviderProps) {
  const router = useRouter();
  const registerCommand = useCommandStore((state) => state.registerCommand);
  const clearCommands = useCommandStore((state) => state.clearCommands);

  // Register default commands on mount
  useEffect(() => {
    // Navigation function
    const navigate = (path: string) => {
      router.push(path);
    };

    // Register navigation commands
    const navigationCommands = createNavigationCommands(navigate);
    for (const command of navigationCommands) {
      registerCommand(command);
    }

    // Register action commands
    const actionCommands = createActionCommands(navigate, {
      onShowShortcuts,
    });
    for (const command of actionCommands) {
      registerCommand(command);
    }

    // Cleanup on unmount
    return () => {
      clearCommands();
    };
  }, [router, registerCommand, clearCommands, onShowShortcuts]);

  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}

export default CommandPaletteProvider;
