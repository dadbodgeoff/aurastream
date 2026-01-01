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
      label: 'Go to Overview',
      description: 'View your dashboard overview',
      keywords: ['home', 'main', 'overview', 'dashboard'],
      section: 'navigation',
      action: () => navigate('/dashboard'),
    },
    {
      id: 'nav-create',
      label: 'Go to Create',
      description: 'Create new assets',
      keywords: ['new', 'generate', 'create', 'make'],
      section: 'navigation',
      shortcut: { key: 'n' },
      action: () => navigate('/dashboard/create'),
    },
    {
      id: 'nav-brand-kits',
      label: 'Go to Brand Studio',
      description: 'Manage your brand kits and styles',
      keywords: ['brands', 'styles', 'colors', 'themes', 'studio'],
      section: 'navigation',
      shortcut: { key: 'b' },
      action: () => navigate('/dashboard/brand-kits'),
    },
    {
      id: 'nav-assets',
      label: 'Go to Asset Library',
      description: 'View and manage your generated assets',
      keywords: ['images', 'files', 'library', 'gallery', 'assets'],
      section: 'navigation',
      shortcut: { key: 'a' },
      action: () => navigate('/dashboard/assets'),
    },
    {
      id: 'nav-community',
      label: 'Go to Community',
      description: 'Browse community content and inspiration',
      keywords: ['community', 'social', 'share', 'inspiration'],
      section: 'navigation',
      shortcut: { key: 'c' },
      action: () => navigate('/community'),
    },
    {
      id: 'nav-intel',
      label: 'Go to Creator Intel',
      description: 'View creator intelligence and insights',
      keywords: ['intel', 'intelligence', 'insights', 'analytics', 'trends'],
      section: 'navigation',
      shortcut: { key: 'i' },
      action: () => navigate('/dashboard/intel'),
    },
    {
      id: 'nav-profile-creator',
      label: 'Go to Profile Creator',
      description: 'Create profile pictures and avatars',
      keywords: ['profile', 'avatar', 'picture', 'pfp'],
      section: 'navigation',
      action: () => navigate('/dashboard/profile-creator'),
    },
    {
      id: 'nav-aura-lab',
      label: 'Go to Aura Lab',
      description: 'Experiment with style fusion',
      keywords: ['lab', 'experiment', 'fusion', 'aura'],
      section: 'navigation',
      action: () => navigate('/dashboard/aura-lab'),
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
