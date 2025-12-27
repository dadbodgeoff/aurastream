/**
 * Command Store using Zustand
 * Manages command palette state across the application
 *
 * Features:
 * - Command registration/unregistration
 * - Recent commands tracking
 * - Search state management
 * - Open/close state
 *
 * @module stores/commandStore
 */

import { create } from 'zustand';
import type { ReactNode } from 'react';

/**
 * Command section for grouping in the palette
 */
export type CommandSection = 'navigation' | 'actions' | 'recent' | 'search';

/**
 * Shortcut definition for a command
 */
export interface CommandShortcut {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

/**
 * Represents a command in the palette
 */
export interface Command {
  /** Unique identifier for the command */
  id: string;
  /** Display label for the command */
  label: string;
  /** Optional description text */
  description?: string;
  /** Optional icon (React node) */
  icon?: ReactNode;
  /** Optional keyboard shortcut */
  shortcut?: CommandShortcut;
  /** Keywords for fuzzy search */
  keywords?: string[];
  /** Section for grouping */
  section: CommandSection;
  /** Action to execute when command is selected */
  action: () => void | Promise<void>;
  /** Condition function - command only shows when this returns true */
  when?: () => boolean;
}

/**
 * Input type for registering a command
 */
export type CommandInput = Command;

/**
 * Command store state interface
 */
export interface CommandState {
  // State
  /** Whether the command palette is open */
  isOpen: boolean;
  /** Current search query */
  search: string;
  /** Registered commands */
  commands: Command[];
  /** IDs of recently used commands (most recent first) */
  recentCommands: string[];

  // Actions
  /** Open the command palette */
  open: () => void;
  /** Close the command palette */
  close: () => void;
  /** Toggle the command palette */
  toggle: () => void;
  /** Set the search query */
  setSearch: (search: string) => void;
  /** Register a new command */
  registerCommand: (command: CommandInput) => void;
  /** Unregister a command by ID */
  unregisterCommand: (id: string) => void;
  /** Execute a command by ID */
  executeCommand: (id: string) => Promise<void>;
  /** Add a command to recent history */
  addToRecent: (id: string) => void;
  /** Clear all commands (useful for cleanup) */
  clearCommands: () => void;
}

/**
 * Maximum number of recent commands to track
 */
const MAX_RECENT_COMMANDS = 5;

/**
 * Command store for managing command palette state
 */
export const useCommandStore = create<CommandState>((set, get) => ({
  // Initial state
  isOpen: false,
  search: '',
  commands: [],
  recentCommands: [],

  // Actions
  open: () => {
    set({ isOpen: true, search: '' });
  },

  close: () => {
    set({ isOpen: false, search: '' });
  },

  toggle: () => {
    const state = get();
    if (state.isOpen) {
      set({ isOpen: false, search: '' });
    } else {
      set({ isOpen: true, search: '' });
    }
  },

  setSearch: (search) => {
    set({ search });
  },

  registerCommand: (command) => {
    set((state) => {
      // Check if command with same ID already exists
      const exists = state.commands.some((c) => c.id === command.id);
      if (exists) {
        // Update existing command
        return {
          commands: state.commands.map((c) =>
            c.id === command.id ? command : c
          ),
        };
      }
      // Add new command
      return {
        commands: [...state.commands, command],
      };
    });
  },

  unregisterCommand: (id) => {
    set((state) => ({
      commands: state.commands.filter((c) => c.id !== id),
      // Also remove from recent if present
      recentCommands: state.recentCommands.filter((cId) => cId !== id),
    }));
  },

  executeCommand: async (id) => {
    const state = get();
    const command = state.commands.find((c) => c.id === id);

    if (!command) {
      console.warn(`Command not found: ${id}`);
      return;
    }

    // Check the when condition if provided
    if (command.when && !command.when()) {
      console.warn(`Command condition not met: ${id}`);
      return;
    }

    // Close the palette first
    set({ isOpen: false, search: '' });

    // Add to recent commands
    get().addToRecent(id);

    // Execute the action
    try {
      await command.action();
    } catch (error) {
      console.error(`Error executing command ${id}:`, error);
    }
  },

  addToRecent: (id) => {
    set((state) => {
      // Remove if already in recent
      const filtered = state.recentCommands.filter((cId) => cId !== id);
      // Add to front
      const updated = [id, ...filtered].slice(0, MAX_RECENT_COMMANDS);
      return { recentCommands: updated };
    });
  },

  clearCommands: () => {
    set({ commands: [], recentCommands: [] });
  },
}));

/**
 * Filter commands based on search query
 * Uses fuzzy matching on label, description, and keywords
 */
export function filterCommands(commands: Command[], search: string): Command[] {
  if (!search.trim()) {
    return commands;
  }

  const query = search.toLowerCase().trim();

  return commands.filter((command) => {
    // Check the when condition
    if (command.when && !command.when()) {
      return false;
    }

    // Check label
    if (command.label.toLowerCase().includes(query)) {
      return true;
    }

    // Check description
    if (command.description?.toLowerCase().includes(query)) {
      return true;
    }

    // Check keywords
    if (command.keywords?.some((kw) => kw.toLowerCase().includes(query))) {
      return true;
    }

    return false;
  });
}

/**
 * Group commands by section
 */
export function groupCommandsBySection(
  commands: Command[]
): Map<CommandSection, Command[]> {
  const groups = new Map<CommandSection, Command[]>();

  // Initialize sections
  const sections: CommandSection[] = ['recent', 'navigation', 'actions', 'search'];
  for (const section of sections) {
    groups.set(section, []);
  }

  // Group commands
  for (const command of commands) {
    // Check the when condition
    if (command.when && !command.when()) {
      continue;
    }

    const group = groups.get(command.section) || [];
    group.push(command);
    groups.set(command.section, group);
  }

  return groups;
}

/**
 * Get recent commands from the command list
 */
export function getRecentCommands(
  commands: Command[],
  recentIds: string[]
): Command[] {
  return recentIds
    .map((id) => commands.find((c) => c.id === id))
    .filter((c): c is Command => c !== undefined)
    .filter((c) => !c.when || c.when());
}
