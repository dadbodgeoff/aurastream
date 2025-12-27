'use client';

/**
 * CommandGroup Component
 * 
 * Groups commands by section with a header.
 * 
 * @module components/command-palette/CommandGroup
 */

import { Command as CmdkCommand } from 'cmdk';
import { cn } from '@/lib/utils';
import type { Command, CommandSection } from '@aurastream/shared';
import { CommandItem } from './CommandItem';

/**
 * Section labels for display
 */
const SECTION_LABELS: Record<CommandSection, string> = {
  recent: 'Recent',
  navigation: 'Navigation',
  actions: 'Actions',
  search: 'Search Results',
};

/**
 * Props for CommandGroup
 */
interface CommandGroupProps {
  section: CommandSection;
  commands: Command[];
  onSelect: (id: string) => void;
}

/**
 * CommandGroup - Group of commands with a header
 */
export function CommandGroup({ section, commands, onSelect }: CommandGroupProps) {
  if (commands.length === 0) {
    return null;
  }

  return (
    <CmdkCommand.Group
      heading={SECTION_LABELS[section]}
      className="py-2"
    >
      <div
        className={cn(
          'px-3 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wider'
        )}
        aria-hidden="true"
      >
        {SECTION_LABELS[section]}
      </div>
      {commands.map((command) => (
        <CommandItem
          key={command.id}
          command={command}
          onSelect={onSelect}
        />
      ))}
    </CmdkCommand.Group>
  );
}

export default CommandGroup;
