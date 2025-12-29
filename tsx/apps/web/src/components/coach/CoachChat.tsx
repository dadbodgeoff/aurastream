/**
 * Main chat container for Prompt Coach.
 * 
 * This component implements Phase 2 of the Prompt Coach flow - the chat
 * interface where users interact with the AI coach to refine their prompts.
 * 
 * Features:
 * - Message list with auto-scroll
 * - Input field for refinements
 * - "Generate Now" button when prompt is ready
 * - Loading and streaming states
 * 
 * @module CoachChat
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CoachMessage } from './CoachMessage';
import { useCoachChat } from '../../hooks/useCoachChat';
import type { StartCoachRequest } from '../../hooks/useCoachContext';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CoachChatProps {
  /** Current session ID (null if not started) */
  sessionId: string | null;
  /** Callback when a new session starts */
  onSessionStart: (sessionId: string) => void;
  /** Callback when user clicks "Generate Now" */
  onGenerateNow: (prompt: string) => void;
  /** Initial request for starting a new session */
  initialRequest?: StartCoachRequest;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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

const LoadingSpinner = ({ className }: { className?: string }) => (
  <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface GroundingStatusProps {
  query: string | null;
}

/**
 * Shows the current grounding (web search) status.
 */
function GroundingStatus({ query }: GroundingStatusProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2',
        'bg-primary-500/10 border-t border-primary-500/20',
        'text-primary-400 text-sm'
      )}
      role="status"
      aria-live="polite"
    >
      <GlobeIcon className="w-4 h-4 animate-pulse" />
      <span>
        Searching the web{query ? ` for "${query}"` : ''}...
      </span>
    </div>
  );
}

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

/**
 * Shows an error banner with dismiss button.
 */
function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-3',
        'bg-red-500/10 border-t border-red-500/20',
        'text-red-400 text-sm'
      )}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-red-400 hover:text-red-300 transition-colors"
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}

interface EmptyStateProps {
  isLoading: boolean;
}

/**
 * Shows empty state when no messages exist.
 */
function EmptyState({ isLoading }: EmptyStateProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <LoadingSpinner className="w-8 h-8 text-accent-600 mb-4" />
        <p className="text-text-secondary">Starting your coaching session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <SparklesIcon className="w-12 h-12 text-text-tertiary mb-4" />
      <h3 className="text-lg font-medium text-text-primary mb-2">
        Ready to craft your prompt
      </h3>
      <p className="text-text-secondary max-w-md">
        Your coaching session will begin shortly. The AI coach will help you
        refine your prompt for the best results.
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Main chat container for Prompt Coach.
 * 
 * Manages the chat interface including message display, input handling,
 * and the "Generate Now" action.
 * 
 * @example
 * ```tsx
 * <CoachChat
 *   sessionId={sessionId}
 *   onSessionStart={(id) => setSessionId(id)}
 *   onGenerateNow={(prompt) => handleGenerate(prompt)}
 *   initialRequest={contextRequest}
 * />
 * ```
 */
export function CoachChat({
  sessionId: externalSessionId,
  onSessionStart,
  onGenerateNow,
  initialRequest,
  className,
}: CoachChatProps) {
  // Chat state from hook
  const {
    messages,
    isStreaming,
    sessionId: internalSessionId,
    refinedDescription,
    isGenerationReady,
    error,
    isGrounding,
    groundingQuery,
    startSession,
    sendMessage,
    reset,
  } = useCoachChat();

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Use internal session ID if external is null
  const activeSessionId = externalSessionId || internalSessionId;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Notify parent when session starts
  useEffect(() => {
    if (internalSessionId && !externalSessionId) {
      onSessionStart(internalSessionId);
    }
  }, [internalSessionId, externalSessionId, onSessionStart]);

  // Start session when initialRequest is provided
  useEffect(() => {
    if (initialRequest && !hasStarted && !activeSessionId) {
      setHasStarted(true);
      startSession(initialRequest);
    }
  }, [initialRequest, hasStarted, activeSessionId, startSession]);

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
    },
    []
  );

  // Handle key press (Enter to send, Shift+Enter for newline)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputValue, isStreaming, activeSessionId]
  );

  // Handle send message
  const handleSend = useCallback(async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || isStreaming) return;

    if (!activeSessionId) {
      setLocalError('No active session. Please start a new session.');
      return;
    }

    setInputValue('');
    setLocalError(null);
    await sendMessage(trimmedValue);
  }, [inputValue, isStreaming, activeSessionId, sendMessage]);

  // Handle generate now
  const handleGenerateNow = useCallback(() => {
    if (refinedDescription && isGenerationReady) {
      onGenerateNow(refinedDescription);
    }
  }, [refinedDescription, isGenerationReady, onGenerateNow]);

  // Handle error dismiss
  const handleDismissError = useCallback(() => {
    setLocalError(null);
  }, []);

  // Combined error - convert to string for display
  const displayError = localError || (error ? (typeof error === 'string' ? error : error.message || 'An error occurred') : null);

  // Determine if we should show empty state
  const showEmptyState = messages.length === 0;

  return (
    <div
      className={cn(
        'flex flex-col h-full',
        'bg-background-base',
        className
      )}
    >
      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {showEmptyState ? (
          <EmptyState isLoading={hasStarted && messages.length === 0} />
        ) : (
          <>
            {messages.map((message) => (
              <CoachMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Grounding Status */}
      {isGrounding && <GroundingStatus query={groundingQuery} />}

      {/* Error Banner */}
      {displayError && (
        <ErrorBanner message={displayError} onDismiss={handleDismissError} />
      )}

      {/* Input Area */}
      <div className="border-t border-border-default p-4">
        {/* Generate Now Button */}
        {refinedDescription && isGenerationReady && !isStreaming && (
          <div className="mb-3">
            <button
              type="button"
              onClick={handleGenerateNow}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'px-4 py-3 rounded-lg',
                'bg-green-600 hover:bg-green-500',
                'text-white font-medium',
                'transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-green-500/50'
              )}
            >
              <SparklesIcon className="w-5 h-5" />
              Create Now
            </button>
          </div>
        )}

        {/* Input Field */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isStreaming
                  ? 'Waiting for response...'
                  : 'Type your refinement request...'
              }
              disabled={isStreaming || !activeSessionId}
              rows={1}
              className={cn(
                'w-full px-4 py-3 rounded-lg resize-none',
                'bg-background-surface border border-border-default',
                'text-text-primary placeholder-text-tertiary',
                'focus:outline-none focus:ring-2 focus:ring-accent-600/50 focus:border-accent-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors'
              )}
              aria-label="Message input"
              style={{
                minHeight: '48px',
                maxHeight: '120px',
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming || !activeSessionId}
            className={cn(
              'flex-shrink-0 p-3 rounded-lg',
              'bg-accent-600 text-white',
              'hover:bg-accent-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-accent-600/50'
            )}
            aria-label="Send message"
          >
            {isStreaming ? (
              <LoadingSpinner className="w-5 h-5" />
            ) : (
              <SendIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-text-tertiary mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

export default CoachChat;

// Re-export types for convenience
export type { StartCoachRequest };
