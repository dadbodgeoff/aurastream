/**
 * Slide-over panel for Prompt Coach integration.
 * 
 * Used to embed the coach chat in other pages (like Twitch generation)
 * without navigating away. Pre-fills context from the parent page.
 * 
 * @module CoachSlideOver
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useScrollLock, useFocusTrap } from '@/hooks';
import { CoachChat } from './CoachChat';
import type { StartCoachRequest } from '../../hooks/useCoachContext';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CoachSlideOverProps {
  /** Whether the slide-over is open */
  isOpen: boolean;
  /** Callback to close the slide-over */
  onClose: () => void;
  /** Callback when user clicks "Generate Now" with the refined prompt */
  onUsePrompt: (prompt: string) => void;
  /** Pre-filled context for the coach session */
  initialRequest?: StartCoachRequest;
  /** Title for the slide-over header */
  title?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    />
  </svg>
);

// ============================================================================
// Main Component
// ============================================================================

/**
 * Slide-over panel for embedding Prompt Coach in other pages.
 * 
 * @example
 * ```tsx
 * <CoachSlideOver
 *   isOpen={showCoach}
 *   onClose={() => setShowCoach(false)}
 *   onUsePrompt={(prompt) => {
 *     setCustomPrompt(prompt);
 *     setShowCoach(false);
 *   }}
 *   initialRequest={coachRequest}
 * />
 * ```
 */
export function CoachSlideOver({
  isOpen,
  onClose,
  onUsePrompt,
  initialRequest,
  title = 'Prompt Coach',
}: CoachSlideOverProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock scroll and trap focus when open
  useScrollLock(isOpen);
  useFocusTrap(panelRef, isOpen);

  // Reset session when closed
  useEffect(() => {
    if (!isOpen) {
      setSessionId(null);
    }
  }, [isOpen]);

  const handleSessionStart = useCallback((id: string) => {
    setSessionId(id);
  }, []);

  const handleGenerateNow = useCallback((prompt: string) => {
    onUsePrompt(prompt);
  }, [onUsePrompt]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-40',
          'transition-opacity duration-300 motion-reduce:duration-0',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed inset-y-0 right-0 z-50',
          'w-full sm:max-w-lg',
          'bg-background-base border-l border-border-subtle',
          'flex flex-col',
          'transform transition-transform duration-300 ease-standard',
          'motion-reduce:duration-0',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-slideover-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-interactive-600/10 flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-interactive-600" />
            </div>
            <h2 id="coach-slideover-title" className="text-lg font-semibold text-text-primary">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex items-center justify-center w-11 h-11 -mr-2',
              'rounded-lg text-text-tertiary',
              'hover:text-text-primary hover:bg-background-surface',
              'active:bg-background-surface active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-interactive-600',
              'transition-all duration-75'
            )}
            aria-label="Close coach"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Coach Chat */}
        <div className="flex-1 overflow-hidden">
          {isOpen && (
            <CoachChat
              sessionId={sessionId}
              onSessionStart={handleSessionStart}
              onGenerateNow={handleGenerateNow}
              initialRequest={initialRequest}
              className="h-full"
            />
          )}
        </div>
      </div>
    </>
  );
}

export default CoachSlideOver;
