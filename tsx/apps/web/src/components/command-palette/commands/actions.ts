/**
 * Action Commands
 * 
 * Commands for performing actions in the application.
 * 
 * @module components/command-palette/commands/actions
 */

import type { Command } from '@aurastream/shared';

/**
 * Create action commands
 * @param navigate - Function to navigate to a path
 * @param callbacks - Optional callbacks for specific actions
 */
export function createActionCommands(
  navigate: (path: string) => void,
  callbacks?: {
    onToggleTheme?: () => void;
    onShowShortcuts?: () => void;
  }
): Command[] {
  const commands: Command[] = [
    {
      id: 'action-new-asset',
      label: 'Create New Asset',
      description: 'Start generating a new asset',
      keywords: ['generate', 'create', 'new', 'make', 'image'],
      section: 'actions',
      action: () => navigate('/dashboard/quick-create'),
    },
    {
      id: 'action-new-brand-kit',
      label: 'Create New Brand Kit',
      description: 'Set up a new brand kit',
      keywords: ['brand', 'kit', 'new', 'create', 'style'],
      section: 'actions',
      action: () => navigate('/dashboard/brand-kits/new'),
    },
    {
      id: 'action-new-emote',
      label: 'Create Twitch Emote',
      description: 'Generate a new Twitch emote',
      keywords: ['twitch', 'emote', 'emoji', 'stream'],
      section: 'actions',
      action: () => navigate('/dashboard/quick-create?type=twitch_emote'),
    },
    {
      id: 'action-new-thumbnail',
      label: 'Create YouTube Thumbnail',
      description: 'Generate a new YouTube thumbnail',
      keywords: ['youtube', 'thumbnail', 'video', 'cover'],
      section: 'actions',
      action: () => navigate('/dashboard/quick-create?type=youtube_thumbnail'),
    },
    {
      id: 'action-new-banner',
      label: 'Create Twitch Banner',
      description: 'Generate a new Twitch banner',
      keywords: ['twitch', 'banner', 'header', 'stream'],
      section: 'actions',
      action: () => navigate('/dashboard/quick-create?type=twitch_banner'),
    },
  ];

  // Add theme toggle if callback provided
  if (callbacks?.onToggleTheme) {
    commands.push({
      id: 'action-toggle-theme',
      label: 'Toggle Theme',
      description: 'Switch between light and dark mode',
      keywords: ['theme', 'dark', 'light', 'mode', 'appearance'],
      section: 'actions',
      action: callbacks.onToggleTheme,
    });
  }

  // Add shortcuts modal if callback provided
  if (callbacks?.onShowShortcuts) {
    commands.push({
      id: 'action-show-shortcuts',
      label: 'Show Keyboard Shortcuts',
      description: 'View all available keyboard shortcuts',
      keywords: ['keyboard', 'shortcuts', 'keys', 'help', 'hotkeys'],
      section: 'actions',
      shortcut: { key: '?', shift: true },
      action: callbacks.onShowShortcuts,
    });
  }

  return commands;
}
