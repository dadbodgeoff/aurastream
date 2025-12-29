'use client';

/**
 * SessionContextBar Component
 * 
 * Sticky context bar displayed at the top of the coach chat interface.
 * Shows session information including asset type, brand kit, turns remaining,
 * and session timeout countdown.
 * Supports expanded and collapsed states for mobile responsiveness.
 * 
 * Enterprise UX Features:
 * - Session timeout recovery prompt with "Start New Session" button
 * - Clear session state indicators
 * - Warning states for low turns and approaching timeout
 * 
 * @module coach/context/SessionContextBar
 */

import React, { memo, useCallback, useState, useEffect } from 'react';
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
  /** Session start time for timeout calculation (optional) */
  sessionStartTime?: Date;
  /** Session timeout in minutes (default: 30) */
  sessionTimeoutMinutes?: number;
  /** Whether the session has expired */
  isSessionExpired?: boolean;
  /** Callback when End Session is clicked */
  onEndSession?: () => void;
  /** Callback when View History is clicked */
  onViewHistory?: () => void;
  /** Callback when Start New Session is clicked (for expired sessions) */
  onStartNewSession?: () => void;
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
// Hooks
// ============================================================================

/**
 * Hook to calculate and track session timeout
 * 
 * @param sessionStartTime - When the session started
 * @param timeoutMinutes - Total timeout duration in minutes
 * @returns Minutes remaining until session expires, or null if not applicable
 */
function useSessionTimeout(
  sessionStartTime?: Date,
  timeoutMinutes: number = 30
): number | null {
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);

  useEffect(() => {
    // If no session start time provided, don't track timeout
    if (!sessionStartTime) {
      setMinutesRemaining(null);
      return;
    }

    // Calculate time remaining
    const calculateTimeRemaining = () => {
      const now = new Date();
      const startTime = new Date(sessionStartTime);
      const expiresAt = new Date(startTime.getTime() + timeoutMinutes * 60 * 1000);
      const msRemaining = expiresAt.getTime() - now.getTime();
      
      // Convert to minutes, minimum 0
      const minutes = Math.max(0, Math.ceil(msRemaining / (60 * 1000)));
      setMinutesRemaining(minutes);
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every minute
    const intervalId = setInterval(calculateTimeRemaining, 60 * 1000);

    // Cleanup on unmount or when dependencies change
    return () => {
      clearInterval(intervalId);
    };
  }, [sessionStartTime, timeoutMinutes]);

  return minutesRemaining;
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

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
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

interface SessionTimeoutDisplayProps {
  minutesRemaining: number;
  testId?: string;
}

/**
 * Displays the session timeout countdown with appropriate warning colors
 */
const SessionTimeoutDisplay = memo(function SessionTimeoutDisplay({
  minutesRemaining,
  testId,
}: SessionTimeoutDisplayProps) {
  // Determine warning state
  const isCritical = minutesRemaining <= 2;
  const isWarning = minutesRemaining <= 5 && !isCritical;

  // Determine display text
  const displayText = minutesRemaining === 0
    ? 'Session expired'
    : `Session expires in ${minutesRemaining} min`;

  // Determine aria-live for screen readers
  const ariaLive = isCritical ? 'assertive' : isWarning ? 'polite' : 'off';

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm',
        isCritical
          ? 'text-red-400'
          : isWarning
            ? 'text-yellow-400'
            : 'text-text-tertiary'
      )}
      role="timer"
      aria-live={ariaLive}
      aria-label={displayText}
      data-testid={testId}
    >
      <ClockIcon className="w-3.5 h-3.5" />
      <span>{displayText}</span>
    </div>
  );
});

SessionTimeoutDisplay.displayName = 'SessionTimeoutDisplay';

// ============================================================================
// Session Expired Banner Component
// ============================================================================

interface SessionExpiredBannerProps {
  onStartNewSession?: () => void;
  testId?: string;
}

/**
 * Banner shown when the session has expired.
 * Provides clear recovery action with "Start New Session" button.
 */
const SessionExpiredBanner = memo(function SessionExpiredBanner({
  onStartNewSession,
  testId,
}: SessionExpiredBannerProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3',
        'bg-yellow-500/10 border-b border-yellow-500/20',
        'text-yellow-400'
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <span className="font-medium">Session Expired</span>
          <span className="text-yellow-400/80 ml-2 text-sm">
            Your coaching session has timed out.
          </span>
        </div>
      </div>
      {onStartNewSession && (
        <button
          type="button"
          onClick={onStartNewSession}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            'text-sm font-medium',
            'bg-yellow-500/20 hover:bg-yellow-500/30',
            'text-yellow-300',
            'transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-base'
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Start New Session
        </button>
      )}
    </div>
  );
});

SessionExpiredBanner.displayName = 'SessionExpiredBanner';

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
 * - Shows session timeout countdown with warning states
 * - End Session and View History actions
 * - Collapse/expand for mobile responsiveness
 * - Glassmorphism styling
 * 
 * Layout (expanded):
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │ Creating: [Twitch Emote] with [My Brand Kit]        │
 * │ Turns: 3/10 remaining • Session expires in 25 min   │
 * │                                 [End] [History] [−] │
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
 *   sessionStartTime={new Date()}
 *   sessionTimeoutMinutes={30}
 *   onEndSession={() => handleEndSession()}
 *   onViewHistory={() => handleViewHistory()}
 * />
 * ```
 */
export const SessionContextBar = memo(function SessionContextBar({
  sessionId: _sessionId,
  assetType,
  brandKitName,
  turnsUsed,
  turnsRemaining,
  totalTurns = 10,
  sessionStartTime,
  sessionTimeoutMinutes = 30,
  isSessionExpired = false,
  onEndSession,
  onViewHistory,
  onStartNewSession,
  isCollapsed = false,
  onToggleCollapse,
  className,
  testId = 'session-context-bar',
}: SessionContextBarProps) {
  // Calculate session timeout
  const minutesRemaining = useSessionTimeout(sessionStartTime, sessionTimeoutMinutes);

  // Determine warning state for turns
  const isLowTurns = turnsRemaining < 3 && turnsRemaining > 0;
  const isCritical = turnsRemaining <= 1 && turnsRemaining > 0;

  // Handle collapse toggle
  const handleToggleCollapse = useCallback(() => {
    onToggleCollapse?.();
  }, [onToggleCollapse]);

  // Show expired banner if session has expired
  if (isSessionExpired || minutesRemaining === 0) {
    return (
      <SessionExpiredBanner
        onStartNewSession={onStartNewSession}
        testId={`${testId}-expired`}
      />
    );
  }

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

      {/* Bottom row: Turns, timeout, and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Turns indicator */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Turns:</span>
            <TurnsIndicator
              used={turnsUsed}
              total={totalTurns}
              testId={`${testId}-turns`}
            />
          </div>

          {/* Session timeout display - only shown if sessionStartTime is provided */}
          {minutesRemaining !== null && (
            <>
              <span className="text-text-tertiary hidden sm:inline">•</span>
              <SessionTimeoutDisplay
                minutesRemaining={minutesRemaining}
                testId={`${testId}-timeout`}
              />
            </>
          )}
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
