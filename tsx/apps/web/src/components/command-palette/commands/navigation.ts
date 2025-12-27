/**
 * Navigation Commands
 * 
 * Commands for navigating to different pages in the application.
 * 
 * @module components/command-palette/commands/navigation
 */

import type { Command } from '@aurastream/shared';

/**
 * Create navigation commands with router navigation
 * @param navigate - Function to navigate to a path
 */
export function createNavigationCommands(
  navigate: (path: string) => void
): Command[] {
  return [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'View your dashboard overview',
      keywords: ['home', 'main', 'overview'],
      section: 'navigation',
      action: () => navigate('/dashboard'),
    },
    {
      id: 'nav-assets',
      label: 'Go to Assets',
      description: 'View and manage your generated assets',
      keywords: ['images', 'files', 'library', 'gallery'],
      section: 'navigation',
      shortcut: { key: 'a' },
      action: () => navigate('/dashboard/assets'),
    },
    {
      id: 'nav-brand-kits',
      label: 'Go to Brand Kits',
      description: 'Manage your brand kits and styles',
      keywords: ['brands', 'styles', 'colors', 'themes'],
      section: 'navigation',
      shortcut: { key: 'b' },
      action: () => navigate('/dashboard/brand-kits'),
    },
    {
      id: 'nav-quick-create',
      label: 'Go to Quick Create',
      description: 'Create new assets quickly',
      keywords: ['new', 'generate', 'create', 'make'],
      section: 'navigation',
      shortcut: { key: 'n' },
      action: () => navigate('/dashboard/quick-create'),
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      description: 'Manage your account settings',
      keywords: ['preferences', 'account', 'profile', 'config'],
      section: 'navigation',
      action: () => navigate('/dashboard/settings'),
    },
  ];
}
