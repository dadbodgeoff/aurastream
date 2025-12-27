'use client';

/**
 * CommandPalette Component
 * 
 * Main command palette modal using cmdk library.
 * Provides quick access to navigation and actions via keyboard.
 * 
 * Features:
 * - Fuzzy search with highlighting
 * - Keyboard navigation (↑↓ Enter Escape)
 * - Grouped commands by section
 * - Recent commands tracking
 * - Accessible (role="dialog", aria-modal, focus trap)
 * - Glassmorphism styling
 * - Reduced motion support
 * 
 * @module components/command-palette/CommandPalette
 */

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { Command as CmdkCommand } from 'cmdk';
import { cn } from '@/lib/utils';
import { useScrollLock, useFocusTrap } from '@/hooks';
import {
  useReducedMotion,
  useCommandStore,
  filterCommands,
  getRecentCommands,
} from '@aurastream/shared';
import type { Command, CommandSection } from '@aurastream/shared';
import { CommandItem } from './CommandItem';

/**
 * Section order for display
 */
const SECTION_ORDER: CommandSection[] = ['recent', 'navigation', 'actions', 'search'];

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
 * CommandPalette - Main command palette modal
 */
export function CommandPalette() {
  const modalRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Get state from store
  const isOpen = useCommandStore((state) => state.isOpen);
  const search = useCommandStore((state) => state.search);
  const commands = useCommandStore((state) => state.commands);
  const recentCommandIds = useCommandStore((state) => state.recentCommands);
  const close = useCommandStore((state) => state.close);
  const setSearch = useCommandStore((state) => state.setSearch);
  const executeCommand = useCommandStore((state) => state.executeCommand);

  // Use hooks for scroll lock and focus trap
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen);

  // Filter commands based on search
  const filteredCommands = useMemo(
    () => filterCommands(commands, search),
    [commands, search]
  );

  // Get recent commands
  const recentCommands = useMemo(
    () => getRecentCommands(commands, recentCommandIds),
    [commands, recentCommandIds]
  );

  // Group commands by section
  const groupedCommands = useMemo(() => {
    const groups = new Map<CommandSection, Command[]>();

    // Initialize sections
    for (const section of SECTION_ORDER) {
      groups.set(section, []);
    }

    // Add recent commands if no search
    if (!search.trim() && recentCommands.length > 0) {
      groups.set('recent', recentCommands);
    }

    // Group filtered commands
    for (const command of filteredCommands) {
      // Skip recent section for regular commands
      if (command.section === 'recent') continue;

      const group = groups.get(command.section) || [];
      // Don't add duplicates from recent
      if (!recentCommandIds.includes(command.id) || search.trim()) {
        group.push(command);
      }
      groups.set(command.section, group);
    }

    return groups;
  }, [filteredCommands, recentCommands, recentCommandIds, search]);

  // Handle command selection
  const handleSelect = useCallback(
    (id: string) => {
      executeCommand(id);
    },
    [executeCommand]
  );

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [close]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    close();
  }, [close]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the modal is rendered
      const timer = setTimeout(() => {
        const input = modalRef.current?.querySelector('input');
        input?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Check if there are any commands to show
  const hasCommands = SECTION_ORDER.some(
    (section) => (groupedCommands.get(section) || []).length > 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop with glassmorphism */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm',
          !prefersReducedMotion && 'transition-opacity duration-200',
          prefersReducedMotion && 'transition-none'
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Command Palette Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
        className={cn(
          'relative w-full max-w-xl',
          'bg-background-surface/95 backdrop-blur-xl',
          'border border-border-subtle rounded-2xl shadow-2xl',
          'overflow-hidden',
          !prefersReducedMotion && 'transform transition-all duration-200',
          !prefersReducedMotion && 'animate-in fade-in-0 zoom-in-95',
          prefersReducedMotion && 'transition-none'
        )}
      >
        <CmdkCommand
          className="flex flex-col"
          filter={(value, search) => {
            // Custom filter - we handle filtering ourselves
            // Return 1 for all items to show them
            return 1;
          }}
          onKeyDown={(e) => {
            // Allow escape to bubble up
            if (e.key === 'Escape') {
              return;
            }
          }}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
            {/* Search Icon */}
            <svg
              className="w-5 h-5 text-text-muted flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            <CmdkCommand.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className={cn(
                'flex-1 bg-transparent',
                'text-base text-text-primary placeholder:text-text-muted',
                'outline-none border-none',
                'w-full'
              )}
            />

            {/* Escape hint */}
            <kbd
              className={cn(
                'hidden sm:inline-flex items-center justify-center',
                'px-1.5 py-0.5 min-w-[28px]',
                'text-xs font-mono font-medium',
                'bg-background-elevated text-text-muted',
                'border border-border-subtle rounded',
                'select-none'
              )}
            >
              Esc
            </kbd>
          </div>

          {/* Command List */}
          <CmdkCommand.List
            className={cn(
              'max-h-[60vh] overflow-y-auto',
              'py-2',
              'scrollbar-hide'
            )}
          >
            {/* Empty State */}
            <CmdkCommand.Empty className="py-8 text-center text-text-muted">
              <p className="text-sm">No commands found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </CmdkCommand.Empty>

            {/* Command Groups */}
            {SECTION_ORDER.map((section) => {
              const sectionCommands = groupedCommands.get(section) || [];
              if (sectionCommands.length === 0) return null;

              return (
                <CmdkCommand.Group
                  key={section}
                  heading={SECTION_LABELS[section]}
                >
                  <div
                    className={cn(
                      'px-4 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wider'
                    )}
                    aria-hidden="true"
                  >
                    {SECTION_LABELS[section]}
                  </div>
                  {sectionCommands.map((command) => (
                    <CommandItem
                      key={command.id}
                      command={command}
                      onSelect={handleSelect}
                    />
                  ))}
                </CmdkCommand.Group>
              );
            })}
          </CmdkCommand.List>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border-subtle bg-background-elevated/50">
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-background-elevated border border-border-subtle rounded text-[10px]">↑↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-background-elevated border border-border-subtle rounded text-[10px]">↵</kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-background-elevated border border-border-subtle rounded text-[10px]">Esc</kbd>
                <span>Close</span>
              </span>
            </div>
          </div>
        </CmdkCommand>
      </div>
    </div>
  );
}

export default CommandPalette;
