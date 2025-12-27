/**
 * Command Store Tests
 * 
 * Unit tests for the command store functionality.
 * 
 * @module __tests__/commandStore.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import {
  useCommandStore,
  filterCommands,
  groupCommandsBySection,
  getRecentCommands,
} from '../stores/commandStore';
import type { Command } from '../stores/commandStore';

// Reset store before each test
beforeEach(() => {
  const store = useCommandStore.getState();
  store.clearCommands();
  act(() => {
    useCommandStore.setState({
      isOpen: false,
      search: '',
      commands: [],
      recentCommands: [],
    });
  });
});

describe('useCommandStore', () => {
  describe('open/close/toggle', () => {
    it('should open the command palette', () => {
      const { open } = useCommandStore.getState();
      
      act(() => {
        open();
      });
      
      expect(useCommandStore.getState().isOpen).toBe(true);
    });

    it('should close the command palette', () => {
      act(() => {
        useCommandStore.setState({ isOpen: true });
      });
      
      const { close } = useCommandStore.getState();
      
      act(() => {
        close();
      });
      
      expect(useCommandStore.getState().isOpen).toBe(false);
    });

    it('should toggle the command palette', () => {
      const { toggle } = useCommandStore.getState();
      
      // Toggle open
      act(() => {
        toggle();
      });
      expect(useCommandStore.getState().isOpen).toBe(true);
      
      // Toggle closed
      act(() => {
        toggle();
      });
      expect(useCommandStore.getState().isOpen).toBe(false);
    });

    it('should clear search when opening', () => {
      act(() => {
        useCommandStore.setState({ search: 'test query' });
      });
      
      const { open } = useCommandStore.getState();
      
      act(() => {
        open();
      });
      
      expect(useCommandStore.getState().search).toBe('');
    });

    it('should clear search when closing', () => {
      act(() => {
        useCommandStore.setState({ isOpen: true, search: 'test query' });
      });
      
      const { close } = useCommandStore.getState();
      
      act(() => {
        close();
      });
      
      expect(useCommandStore.getState().search).toBe('');
    });
  });

  describe('setSearch', () => {
    it('should update the search query', () => {
      const { setSearch } = useCommandStore.getState();
      
      act(() => {
        setSearch('test query');
      });
      
      expect(useCommandStore.getState().search).toBe('test query');
    });
  });

  describe('registerCommand', () => {
    it('should register a new command', () => {
      const { registerCommand } = useCommandStore.getState();
      
      const command: Command = {
        id: 'test-command',
        label: 'Test Command',
        section: 'actions',
        action: vi.fn(),
      };
      
      act(() => {
        registerCommand(command);
      });
      
      const commands = useCommandStore.getState().commands;
      expect(commands).toHaveLength(1);
      expect(commands[0].id).toBe('test-command');
    });

    it('should update existing command with same ID', () => {
      const { registerCommand } = useCommandStore.getState();
      
      const command1: Command = {
        id: 'test-command',
        label: 'Test Command 1',
        section: 'actions',
        action: vi.fn(),
      };
      
      const command2: Command = {
        id: 'test-command',
        label: 'Test Command 2',
        section: 'navigation',
        action: vi.fn(),
      };
      
      act(() => {
        registerCommand(command1);
        registerCommand(command2);
      });
      
      const commands = useCommandStore.getState().commands;
      expect(commands).toHaveLength(1);
      expect(commands[0].label).toBe('Test Command 2');
      expect(commands[0].section).toBe('navigation');
    });
  });

  describe('unregisterCommand', () => {
    it('should remove a command by ID', () => {
      const { registerCommand, unregisterCommand } = useCommandStore.getState();
      
      const command: Command = {
        id: 'test-command',
        label: 'Test Command',
        section: 'actions',
        action: vi.fn(),
      };
      
      act(() => {
        registerCommand(command);
      });
      
      expect(useCommandStore.getState().commands).toHaveLength(1);
      
      act(() => {
        unregisterCommand('test-command');
      });
      
      expect(useCommandStore.getState().commands).toHaveLength(0);
    });

    it('should also remove from recent commands', () => {
      act(() => {
        useCommandStore.setState({
          commands: [
            { id: 'cmd-1', label: 'Command 1', section: 'actions', action: vi.fn() },
          ],
          recentCommands: ['cmd-1'],
        });
      });
      
      const { unregisterCommand } = useCommandStore.getState();
      
      act(() => {
        unregisterCommand('cmd-1');
      });
      
      expect(useCommandStore.getState().recentCommands).toHaveLength(0);
    });
  });

  describe('executeCommand', () => {
    it('should execute the command action', async () => {
      const actionFn = vi.fn();
      
      const command: Command = {
        id: 'test-command',
        label: 'Test Command',
        section: 'actions',
        action: actionFn,
      };
      
      act(() => {
        useCommandStore.getState().registerCommand(command);
        useCommandStore.setState({ isOpen: true });
      });
      
      await act(async () => {
        await useCommandStore.getState().executeCommand('test-command');
      });
      
      expect(actionFn).toHaveBeenCalledTimes(1);
    });

    it('should close the palette after execution', async () => {
      const command: Command = {
        id: 'test-command',
        label: 'Test Command',
        section: 'actions',
        action: vi.fn(),
      };
      
      act(() => {
        useCommandStore.getState().registerCommand(command);
        useCommandStore.setState({ isOpen: true });
      });
      
      await act(async () => {
        await useCommandStore.getState().executeCommand('test-command');
      });
      
      expect(useCommandStore.getState().isOpen).toBe(false);
    });

    it('should add to recent commands', async () => {
      const command: Command = {
        id: 'test-command',
        label: 'Test Command',
        section: 'actions',
        action: vi.fn(),
      };
      
      act(() => {
        useCommandStore.getState().registerCommand(command);
      });
      
      await act(async () => {
        await useCommandStore.getState().executeCommand('test-command');
      });
      
      expect(useCommandStore.getState().recentCommands).toContain('test-command');
    });

    it('should not execute if when condition returns false', async () => {
      const actionFn = vi.fn();
      
      const command: Command = {
        id: 'test-command',
        label: 'Test Command',
        section: 'actions',
        action: actionFn,
        when: () => false,
      };
      
      act(() => {
        useCommandStore.getState().registerCommand(command);
      });
      
      await act(async () => {
        await useCommandStore.getState().executeCommand('test-command');
      });
      
      expect(actionFn).not.toHaveBeenCalled();
    });

    it('should handle async actions', async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);
      
      const command: Command = {
        id: 'test-command',
        label: 'Test Command',
        section: 'actions',
        action: actionFn,
      };
      
      act(() => {
        useCommandStore.getState().registerCommand(command);
      });
      
      await act(async () => {
        await useCommandStore.getState().executeCommand('test-command');
      });
      
      expect(actionFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('addToRecent', () => {
    it('should add command to recent list', () => {
      const { addToRecent } = useCommandStore.getState();
      
      act(() => {
        addToRecent('cmd-1');
      });
      
      expect(useCommandStore.getState().recentCommands).toEqual(['cmd-1']);
    });

    it('should move existing command to front', () => {
      act(() => {
        useCommandStore.setState({ recentCommands: ['cmd-1', 'cmd-2', 'cmd-3'] });
      });
      
      const { addToRecent } = useCommandStore.getState();
      
      act(() => {
        addToRecent('cmd-2');
      });
      
      expect(useCommandStore.getState().recentCommands).toEqual(['cmd-2', 'cmd-1', 'cmd-3']);
    });

    it('should limit to 5 recent commands', () => {
      act(() => {
        useCommandStore.setState({
          recentCommands: ['cmd-1', 'cmd-2', 'cmd-3', 'cmd-4', 'cmd-5'],
        });
      });
      
      const { addToRecent } = useCommandStore.getState();
      
      act(() => {
        addToRecent('cmd-6');
      });
      
      const recent = useCommandStore.getState().recentCommands;
      expect(recent).toHaveLength(5);
      expect(recent[0]).toBe('cmd-6');
      expect(recent).not.toContain('cmd-5');
    });
  });

  describe('clearCommands', () => {
    it('should clear all commands and recent', () => {
      act(() => {
        useCommandStore.setState({
          commands: [
            { id: 'cmd-1', label: 'Command 1', section: 'actions', action: vi.fn() },
          ],
          recentCommands: ['cmd-1'],
        });
      });
      
      const { clearCommands } = useCommandStore.getState();
      
      act(() => {
        clearCommands();
      });
      
      expect(useCommandStore.getState().commands).toHaveLength(0);
      expect(useCommandStore.getState().recentCommands).toHaveLength(0);
    });
  });
});

describe('filterCommands', () => {
  const commands: Command[] = [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'View your dashboard',
      keywords: ['home', 'main'],
      section: 'navigation',
      action: vi.fn(),
    },
    {
      id: 'nav-assets',
      label: 'Go to Assets',
      description: 'View your assets',
      keywords: ['images', 'files'],
      section: 'navigation',
      action: vi.fn(),
    },
    {
      id: 'action-create',
      label: 'Create New Asset',
      description: 'Generate a new asset',
      keywords: ['new', 'generate'],
      section: 'actions',
      action: vi.fn(),
    },
  ];

  it('should return all commands when search is empty', () => {
    const result = filterCommands(commands, '');
    expect(result).toHaveLength(3);
  });

  it('should filter by label', () => {
    const result = filterCommands(commands, 'dashboard');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('nav-dashboard');
  });

  it('should filter by description', () => {
    const result = filterCommands(commands, 'generate');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('action-create');
  });

  it('should filter by keywords', () => {
    const result = filterCommands(commands, 'home');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('nav-dashboard');
  });

  it('should be case insensitive', () => {
    const result = filterCommands(commands, 'DASHBOARD');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('nav-dashboard');
  });

  it('should filter out commands where when returns false', () => {
    const commandsWithWhen: Command[] = [
      {
        id: 'cmd-1',
        label: 'Command 1',
        section: 'actions',
        action: vi.fn(),
        when: () => true,
      },
      {
        id: 'cmd-2',
        label: 'Command 2',
        section: 'actions',
        action: vi.fn(),
        when: () => false,
      },
    ];

    const result = filterCommands(commandsWithWhen, 'command');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cmd-1');
  });
});

describe('groupCommandsBySection', () => {
  const commands: Command[] = [
    { id: 'nav-1', label: 'Nav 1', section: 'navigation', action: vi.fn() },
    { id: 'nav-2', label: 'Nav 2', section: 'navigation', action: vi.fn() },
    { id: 'action-1', label: 'Action 1', section: 'actions', action: vi.fn() },
  ];

  it('should group commands by section', () => {
    const groups = groupCommandsBySection(commands);
    
    expect(groups.get('navigation')).toHaveLength(2);
    expect(groups.get('actions')).toHaveLength(1);
    expect(groups.get('recent')).toHaveLength(0);
    expect(groups.get('search')).toHaveLength(0);
  });

  it('should filter out commands where when returns false', () => {
    const commandsWithWhen: Command[] = [
      { id: 'nav-1', label: 'Nav 1', section: 'navigation', action: vi.fn(), when: () => true },
      { id: 'nav-2', label: 'Nav 2', section: 'navigation', action: vi.fn(), when: () => false },
    ];

    const groups = groupCommandsBySection(commandsWithWhen);
    expect(groups.get('navigation')).toHaveLength(1);
  });
});

describe('getRecentCommands', () => {
  const commands: Command[] = [
    { id: 'cmd-1', label: 'Command 1', section: 'actions', action: vi.fn() },
    { id: 'cmd-2', label: 'Command 2', section: 'actions', action: vi.fn() },
    { id: 'cmd-3', label: 'Command 3', section: 'actions', action: vi.fn() },
  ];

  it('should return commands in recent order', () => {
    const recentIds = ['cmd-2', 'cmd-1'];
    const result = getRecentCommands(commands, recentIds);
    
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('cmd-2');
    expect(result[1].id).toBe('cmd-1');
  });

  it('should skip non-existent command IDs', () => {
    const recentIds = ['cmd-1', 'non-existent', 'cmd-2'];
    const result = getRecentCommands(commands, recentIds);
    
    expect(result).toHaveLength(2);
  });

  it('should filter out commands where when returns false', () => {
    const commandsWithWhen: Command[] = [
      { id: 'cmd-1', label: 'Command 1', section: 'actions', action: vi.fn(), when: () => true },
      { id: 'cmd-2', label: 'Command 2', section: 'actions', action: vi.fn(), when: () => false },
    ];

    const recentIds = ['cmd-1', 'cmd-2'];
    const result = getRecentCommands(commandsWithWhen, recentIds);
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cmd-1');
  });
});
