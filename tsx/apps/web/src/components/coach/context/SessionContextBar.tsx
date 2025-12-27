'use client';

/**
 * SessionContextBar Component
 * 
 * Sticky context bar displayed at the top of the coach chat interface.
 * Shows session information including asset type, brand kit, and turns remaining.
 * Supports expanded and collapsed states for mobile responsiveness.
 * 
 * @module coach/context/SessionContextBar
 */

import React, { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { SessionBadge } from './SessionBadge';
import { TurnsIndicator } from './TurnsIndicator';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SessionContextBarProps {
  /** Current session ID */
  sessionId: string;
  /** Type of asset being created */
  assetType: string;
  /** Brand kit name for display (optional) */
  brandKitName?: string;
  /** Number of turns used */
  turnsUsed: number;
  /** Number of turns remaining */
  turnsRemaining: number;
  /** Total turns allowed */
  totalTurns?: number;
  /** Callback when End Session is clicked */
  onEndSession?: () => void;
  /** Callback when View History is clicked */
  onViewHistory?: () => void;
  /** Whether the bar is collapsed (mobile mode) */
  isCollapsed?: boolean;
  /** Callback to toggle collapsed state */
  onToggleCollapse?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const HistoryIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const StopIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface ActionButtonProps {
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'danger';
  testId?: string;
}

/**
 * Action button for the context bar
 */
const ActionButton = memo(function ActionButton({
  onClick,
  icon,
  label,
  variant = 'default',
  testId,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md',
        'text-sm font-medium',
        'transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-base',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'danger'
          ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
          : 'text-text-secondary hover:bg-white/10 hover:text-text-primary'
      )}
      aria-label={label}
      data-testid={testId}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
});

ActionButton.displayName = 'ActionButton';

// ============================================================================
// Main Component
// ============================================================================

/**
 * SessionContextBar displays session information at the top of the chat.
 * 
 * Features:
 * - Sticky positioning at top of chat
 * - Shows asset type badge and brand kit name
 * - Displays turns remaining with warning states
 * - End Session and View History actions
 * - Collapse/expand for mobile responsiveness
 * - Glassmorphism styling
 * 
 * Layout (expanded):
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │ Creating: [Twitch Emote] with [My Brand Kit]        │
 * │ Turns: 3/10 remaining          [End] [History] [−]  │
 * └─────────────────────────────────────────────────────┘
 * ```
 * 
 * Layout (collapsed):
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │ [Twitch Emote] • 3 turns left                   [+] │
 * └─────────────────────────────────────────────────────┘
 * ```
 * 
 * @example
 * ```tsx
 * <SessionContextBar
 *   sessionId="session-123"
 *   assetType="twitch_emote"
 *   brandKitName="My Brand Kit"
 *   turnsUsed={7}
 *   turnsRemaining={3}
 *   onEndSession={() => handleEndSession()}
 *   onViewHistory={() => handleViewHistory()}
 * />
 * ```
 */
export const SessionContextBar = memo(function SessionContextBar({
  sessionId,
  assetType,
  brandKitName,
  turnsUsed,
  turnsRemaining,
  totalTurns = 10,
  onEndSession,
  onViewHistory,
  isCollapsed = false,
  onToggleCollapse,
  className,
  testId = 'session-context-bar',
}: SessionContextBarProps) {
  // Determine warning state
  const isLowTurns = turnsRemaining < 3 && turnsRemaining > 0;
  const isCritical = turnsRemaining <= 1 && turnsRemaining > 0;

  // Handle collapse toggle
  const handleToggleCollapse = useCallback(() => {
    onToggleCollapse?.();
  }, [onToggleCollapse]);

  // Collapsed view
  if (isCollapsed) {
    return (
      <div
        data-testid={testId}
        className={cn(
          // Sticky positioning
          'sticky top-0 z-10',
          // Glassmorphism styling
          'bg-background-surface/80 backdrop-blur-sm',
          'border-b border-border-default',
          // Layout
          'px-4 py-2',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SessionBadge assetType={assetType} testId={`${testId}-badge`} />
            <span className="text-text-tertiary">•</span>
            <span
              className={cn(
                'text-sm',
                isCritical
                  ? 'text-red-400'
                  : isLowTurns
                    ? 'text-yellow-400'
                    : 'text-text-secondary'
              )}
            >
              {turnsRemaining} {turnsRemaining === 1 ? 'turn' : 'turns'} left
            </span>
          </div>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={handleToggleCollapse}
              className={cn(
                'p-1.5 rounded-md',
                'text-text-tertiary hover:text-text-primary',
                'hover:bg-white/10',
                'transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500'
              )}
              aria-label="Expand session context"
              aria-expanded={false}
              data-testid={`${testId}-expand`}
            >
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div
      data-testid={testId}
      className={cn(
        // Sticky positioning
        'sticky top-0 z-10',
        // Glassmorphism styling
        'bg-background-surface/80 backdrop-blur-sm',
        'border-b border-border-default',
        // Layout
        'px-4 py-3',
        className
      )}
    >
      {/* Top row: Creating info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-text-secondary">Creating:</span>
          <SessionBadge assetType={assetType} testId={`${testId}-badge`} />
          {brandKitName && (
            <>
              <span className="text-text-tertiary text-sm">with</span>
              <span className="text-sm font-medium text-text-primary">
                {brandKitName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Bottom row: Turns and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Turns:</span>
          <TurnsIndicator
            used={turnsUsed}
            total={totalTurns}
            testId={`${testId}-turns`}
          />
        </div>

        <div className="flex items-center gap-1">
          <ActionButton
            onClick={onEndSession}
            icon={<StopIcon className="w-4 h-4" />}
            label="End"
            variant="danger"
            testId={`${testId}-end`}
          />
          <ActionButton
            onClick={onViewHistory}
            icon={<HistoryIcon className="w-4 h-4" />}
            label="History"
            testId={`${testId}-history`}
          />
          {onToggleCollapse && (
            <button
              type="button"
              onClick={handleToggleCollapse}
              className={cn(
                'p-1.5 rounded-md',
                'text-text-tertiary hover:text-text-primary',
                'hover:bg-white/10',
                'transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500'
              )}
              aria-label="Collapse session context"
              aria-expanded={true}
              data-testid={`${testId}-collapse`}
            >
              <ChevronUpIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

SessionContextBar.displayName = 'SessionContextBar';

export default SessionContextBar;
