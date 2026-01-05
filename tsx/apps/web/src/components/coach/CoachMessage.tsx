/**
 * Individual message component for Creative Director Coach chat.
 * 
 * Renders user and assistant messages with support for:
 * - Natural conversation display (NO prompt blocks)
 * - Ready-to-create indicators
 * - Grounding indicators
 * - Streaming cursor animation
 * - Thinking indicator when streaming with no content
 * - Optional chain-of-thought display
 * 
 * @module CoachMessage
 */

'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChatMessage, IntentStatus } from '../../hooks/useCoachChat';
import { ThinkingIndicator, ChainOfThought } from './streaming';
import type { ThinkingStage } from './streaming';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CoachMessageProps {
  /** The message to display */
  message: ChatMessage;
  /** Current thinking stage (for streaming messages) */
  thinkingStage?: ThinkingStage;
  /** Optional reasoning text for chain-of-thought display */
  reasoning?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const BotIcon = ({ className }: { className?: string }) => (
  <span className={cn("text-xs font-bold", className)}>A</span>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface ReadyIndicatorProps {
  intentStatus: IntentStatus;
}

/**
 * Renders a "ready to create" indicator when the coach confirms the vision is clear.
 */
function ReadyIndicator({ intentStatus }: ReadyIndicatorProps) {
  if (!intentStatus.isReady) return null;

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-default">
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
          'text-xs font-medium border',
          'bg-green-500/10 text-green-400 border-green-500/30'
        )}
      >
        <CheckCircleIcon className="w-4 h-4" />
        <span>Ready to create</span>
      </div>
    </div>
  );
}

interface GroundingIndicatorProps {
  className?: string;
}

/**
 * Renders an indicator that grounding (web search) was used.
 */
function GroundingIndicator({ className }: GroundingIndicatorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
        'bg-primary-500/10 text-primary-400 text-xs',
        className
      )}
    >
      <GlobeIcon className="w-3 h-3" />
      <span>Game context loaded</span>
    </div>
  );
}

interface StreamingCursorProps {
  className?: string;
}

/**
 * Renders an animated cursor for streaming messages.
 */
function StreamingCursor({ className }: StreamingCursorProps) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-4 ml-0.5 bg-accent-600',
        'animate-pulse',
        className
      )}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// Content Cleaner
// ============================================================================

/**
 * Clean message content - remove any accidental prompt blocks or technical markers.
 * The coach shouldn't output these, but just in case.
 */
function cleanContent(content: string): string {
  // Remove any ```prompt blocks (shouldn't happen, but safety)
  let cleaned = content.replace(/```prompt\n?[\s\S]*?```/g, '');
  
  // Remove [INTENT_READY] markers (internal use only) - case insensitive, with optional whitespace
  cleaned = cleaned.replace(/\s*\[INTENT_READY\]\s*/gi, ' ');
  
  // Replace "✨ Ready!" + detailed prompt with simple confirmation
  // Users shouldn't see the full generation prompt
  const readyMatch = cleaned.match(/✨\s*Ready!\s*(.+)/s);
  if (readyMatch) {
    cleaned = cleaned.replace(/✨\s*Ready!\s*.+/s, "✨ Got it! I understand exactly what you want.");
  }
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  return cleaned;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Individual message component for Creative Director Coach chat.
 * 
 * Renders natural conversation messages without exposing any prompts
 * or technical details. Shows a "ready to create" indicator when
 * the coach confirms the vision is clear.
 * 
 * @example
 * ```tsx
 * <CoachMessage
 *   message={{
 *     id: '1',
 *     role: 'assistant',
 *     content: 'Love the idea! Is this more of a fist-pump moment?',
 *     intentStatus: { isReady: false, confidence: 0.5, refinedDescription: '...' },
 *   }}
 * />
 * 
 * // With thinking indicator (streaming, no content yet)
 * <CoachMessage
 *   message={{ id: '2', role: 'assistant', content: '', isStreaming: true }}
 *   thinkingStage="thinking"
 * />
 * 
 * // With chain-of-thought
 * <CoachMessage
 *   message={{ ... }}
 *   reasoning="First, I analyzed the brand colors..."
 * />
 * ```
 */
export function CoachMessage({ message, thinkingStage, reasoning, className }: CoachMessageProps) {
  const { role, content, isStreaming, intentStatus, groundingUsed } = message;
  const isUser = role === 'user';
  
  // State for chain-of-thought expansion
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

  // Clean content to remove any technical artifacts
  const displayContent = useMemo(() => cleanContent(content), [content]);
  
  // Determine if we should show the thinking indicator
  const showThinkingIndicator = !isUser && isStreaming && !displayContent && thinkingStage;

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
      role="article"
      aria-label={`${isUser ? 'Your' : 'Coach'} message`}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-accent-600 text-white'
            : 'bg-background-elevated text-text-secondary border border-border-default'
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <UserIcon className="w-4 h-4" />
        ) : (
          <BotIcon className="w-4 h-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex-1 max-w-[85%]',
          isUser ? 'text-right' : 'text-left'
        )}
      >
        {/* AuraBot label for assistant messages */}
        {!isUser && !showThinkingIndicator && (
          <span className="text-xs font-medium text-accent-500 mb-1 block">AuraBot</span>
        )}
        
        {/* Show thinking indicator when streaming with no content */}
        {showThinkingIndicator ? (
          <ThinkingIndicator stage={thinkingStage} />
        ) : (
          <div
            className={cn(
              'inline-block rounded-2xl px-4 py-3',
              'text-sm leading-relaxed',
              isUser
                ? 'bg-accent-600 text-white rounded-tr-sm'
                : 'bg-background-surface border border-border-default text-text-primary rounded-tl-sm'
            )}
          >
            {/* Grounding indicator */}
            {!isUser && groundingUsed && (
              <GroundingIndicator className="mb-2" />
            )}

            {/* Message content - natural conversation only */}
            <div>
              <p className="whitespace-pre-wrap">{displayContent}</p>
              {isStreaming && displayContent && <StreamingCursor />}
            </div>

            {/* Ready indicator */}
            {!isUser && intentStatus && !isStreaming && (
              <ReadyIndicator intentStatus={intentStatus} />
            )}
            
            {/* Chain of thought (optional) */}
            {!isUser && reasoning && !isStreaming && (
              <ChainOfThought
                reasoning={reasoning}
                isExpanded={isReasoningExpanded}
                onToggle={() => setIsReasoningExpanded(!isReasoningExpanded)}
              />
            )}
          </div>
        )}

        {/* Timestamp - only show when not in thinking state */}
        {!showThinkingIndicator && (
          <div
            className={cn(
              'text-xs text-text-tertiary mt-1',
              isUser ? 'text-right' : 'text-left'
            )}
          >
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CoachMessage;

// Re-export types for convenience
export type { ChatMessage, IntentStatus };
export type { ThinkingStage } from './streaming';
