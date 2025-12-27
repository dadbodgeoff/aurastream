'use client';

/**
 * CommandItem Component
 * 
 * Individual command item in the command palette.
 * Displays icon, label, description, and shortcut hint.
 * 
 * @module components/command-palette/CommandItem
 */

import { forwardRef } from 'react';
import { Command as CmdkCommand } from 'cmdk';
import { cn } from '@/lib/utils';
import { useReducedMotion, formatShortcut } from '@aurastream/shared';
import type { Command, CommandShortcut } from '@aurastream/shared';

/**
 * Props for CommandItem
 */
interface CommandItemProps {
  command: Command;
  onSelect: (id: string) => void;
}

/**
 * Format shortcut for display in command item
 */
function formatCommandShortcut(shortcut: CommandShortcut): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  return formatShortcut(shortcut, isMac);
}

/**
 * CommandItem - Individual command in the palette
 */
export const CommandItem = forwardRef<HTMLDivElement, CommandItemProps>(
  function CommandItem({ command, onSelect }, ref) {
    const prefersReducedMotion = useReducedMotion();

    return (
      <CmdkCommand.Item
        ref={ref}
        value={command.id}
        keywords={command.keywords}
        onSelect={() => onSelect(command.id)}
        className={cn(
          'relative flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg cursor-pointer',
          'text-text-secondary',
          'outline-none',
          // Selected state
          'data-[selected=true]:bg-interactive-600/10',
          'data-[selected=true]:text-text-primary',
          'data-[selected=true]:border-l-2 data-[selected=true]:border-l-interactive-600',
          'data-[selected=true]:ml-0 data-[selected=true]:pl-[calc(0.75rem-2px)]',
          // Hover state (when not selected)
          'hover:bg-background-elevated/50',
          // Transition
          !prefersReducedMotion && 'transition-colors duration-150',
          prefersReducedMotion && 'transition-none'
        )}
      >
        {/* Icon */}
        {command.icon && (
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-text-muted">
            {command.icon}
          </span>
        )}

        {/* Label and Description */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {command.label}
          </p>
          {command.description && (
            <p className="text-xs text-text-muted truncate mt-0.5">
              {command.description}
            </p>
          )}
        </div>

        {/* Shortcut Hint */}
        {command.shortcut && (
          <span className="flex-shrink-0 ml-2">
            <kbd
              className={cn(
                'inline-flex items-center justify-center',
                'px-1.5 py-0.5 min-w-[22px]',
                'text-xs font-mono font-medium',
                'bg-background-elevated text-text-muted',
                'border border-border-subtle rounded',
                'select-none'
              )}
            >
              {formatCommandShortcut(command.shortcut)}
            </kbd>
          </span>
        )}
      </CmdkCommand.Item>
    );
  }
);

export default CommandItem;
