'use client';

/**
 * CoachChatIntegrated - Full Integration of Coach Chat UX 2025
 * 
 * This component integrates all the new coach components from Tasks 1-6:
 * - Task 1: Image Lightbox System
 * - Task 2: Enhanced Streaming UX
 * - Task 3: AI Assistant Cards
 * - Task 4: Contextual Input Methods
 * - Task 5: Inline Generation Preview
 * - Task 6: Session Context Display
 * 
 * Enterprise UX Features:
 * - Connection loss recovery with auto-reconnect
 * - Streaming progress feedback (Thinking, Searching, Responding)
 * - Rate limit handling with countdown
 * - Session timeout recovery prompt
 * - Grounding error fallback handling
 * 
 * @module coach/CoachChatIntegrated
 */

import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion, createDevLogger } from '@aurastream/shared';

// Dev logger for this component
const log = createDevLogger({ prefix: '[CoachChat]' });

// Hooks
import { useCoachChat } from '../../hooks/useCoachChat';
import type { StartCoachRequest } from '../../hooks/useCoachContext';
import type { ChatMessage, StreamingStage, CoachError } from '../../hooks/useCoachChat';

// Enterprise error handling
import { showErrorToast } from '@/utils/errorMessages';
import { ErrorRecovery, useErrorRecovery } from '@/components/ErrorRecovery';
import { AsyncErrorBoundary } from '@/components/ErrorBoundary';
import { CoachMessageSkeleton } from '@/components/ui/Skeleton';

// Context components (Task 6)
import { SessionContextBar } from './context';
import type { ConversationStage } from './input';

// Streaming components (Task 2)
import { ThinkingIndicator, ChainOfThought } from './streaming';
import type { ThinkingStage } from './streaming';

// Cards (Task 3)
import { CardBase } from './cards';
// Note: PromptCard, ValidationCard, SuggestionCard available for future use
// import { PromptCard, ValidationCard, SuggestionCard } from './cards';

// Input components (Task 4)
import { CoachInput, useSuggestionContext } from './input';

// Generation components (Task 5)
import { GenerationProgress, GenerationResult, useInlineGeneration } from './generation';
import type { Asset } from './generation';

// Lightbox (Task 1)
import { useLightbox } from '../lightbox';

// Download utility
import { downloadAsset, getAssetFilename } from '@/utils/download';

// ============================================================================
// Feature Flag
// ============================================================================

const COACH_UX_2025_ENABLED = process.env.NEXT_PUBLIC_COACH_UX_2025 !== 'false';

// Debug logging (only when dev logging is enabled)
if (typeof window !== 'undefined') {
  log.info('COACH_UX_2025_ENABLED:', COACH_UX_2025_ENABLED);
  log.debug('NEXT_PUBLIC_COACH_UX_2025:', process.env.NEXT_PUBLIC_COACH_UX_2025);
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface CoachChatIntegratedProps {
  /** Type of asset being created */
  assetType: string;
  /** Brand kit ID (optional) */
  brandKitId?: string;
  /** Brand kit name for display */
  brandKitName?: string;
  /** Callback when generation completes */
  onGenerateComplete?: (asset: Asset) => void;
  /** Callback when session ends */
  onEndSession?: () => void;
  /** Initial request for starting a new session */
  initialRequest?: StartCoachRequest;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map coach asset types to backend generation asset types
 * The coach uses more specific types (e.g., youtube_thumbnail) but the
 * backend generation API uses generic types (e.g., thumbnail)
 */
function mapAssetTypeForGeneration(coachAssetType: string): string {
  const mapping: Record<string, string> = {
    // YouTube types map to generic types
    youtube_thumbnail: 'thumbnail',
    youtube_banner: 'banner',
    // Twitch types are passed through
    twitch_emote: 'twitch_emote',
    twitch_banner: 'banner',
    twitch_badge: 'twitch_badge',
    twitch_panel: 'twitch_panel',
    twitch_offline: 'twitch_offline',
    // TikTok types
    tiktok_story: 'story_graphic',
    tiktok_emote: 'tiktok_emote',
    // Instagram types
    instagram_story: 'story_graphic',
    instagram_reel: 'story_graphic',
    // Generic types pass through
    thumbnail: 'thumbnail',
    overlay: 'overlay',
    banner: 'banner',
    story_graphic: 'story_graphic',
    clip_cover: 'clip_cover',
  };
  
  return mapping[coachAssetType] || coachAssetType;
}

/**
 * Determine conversation stage based on messages and generation readiness
 */
function getConversationStage(
  messages: ChatMessage[],
  isGenerationReady: boolean
): ConversationStage {
  if (messages.length <= 2) return 'initial';
  if (isGenerationReady) return 'post_generation';
  return 'refining';
}

/**
 * Map streaming stage to thinking stage for the indicator
 */
function mapStreamingToThinkingStage(stage: StreamingStage): ThinkingStage {
  switch (stage) {
    case 'connecting':
    case 'thinking':
      return 'thinking';
    case 'validating':
      return 'validating';
    case 'streaming':
      return 'crafting';
    case 'reconnecting':
      return 'reconnecting';
    default:
      return 'thinking';
  }
}

// ============================================================================
// Icon Components
// ============================================================================

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
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface EmptyStateProps {
  isLoading: boolean;
}

/**
 * Empty state when no messages exist
 */
const EmptyState = memo(function EmptyState({ isLoading }: EmptyStateProps) {
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
});

EmptyState.displayName = 'EmptyState';

interface ErrorBannerProps {
  error: CoachError | null;
  message?: string;
  onDismiss: () => void;
  onRetry?: () => void;
  onUpgrade?: () => void;
  onStartNewSession?: () => void;
}

/**
 * Enterprise error banner with contextual recovery actions.
 * Handles different error types with appropriate messaging and actions.
 */
const ErrorBanner = memo(function ErrorBanner({ 
  error, 
  message, 
  onDismiss, 
  onRetry,
  onUpgrade,
  onStartNewSession,
}: ErrorBannerProps) {
  const [countdown, setCountdown] = useState(error?.retryAfter || 0);
  
  // Countdown timer for rate limits
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(c => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  // Reset countdown when error changes
  useEffect(() => {
    if (error?.retryAfter) {
      setCountdown(error.retryAfter);
    }
  }, [error?.retryAfter]);

  const displayMessage = message || error?.message || 'An error occurred';
  const errorCode = error?.code;

  // Determine banner style based on error type
  const isWarning = errorCode === 'COACH_RATE_LIMIT' || errorCode === 'COACH_SESSION_EXPIRED';
  const isInfo = errorCode === 'COACH_TIER_REQUIRED' || errorCode === 'COACH_GROUNDING_FAILED';

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3',
        'border-t',
        isInfo 
          ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
          : isWarning 
            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
      )}
      role="alert"
    >
      <div className="flex items-start gap-2 flex-1">
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {isInfo ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          )}
        </svg>
        <div className="flex-1">
          <span className="font-medium">{displayMessage}</span>
          {countdown > 0 && (
            <span className="ml-2 text-sm opacity-80">
              (retry in {countdown}s)
            </span>
          )}
          {errorCode === 'COACH_GROUNDING_FAILED' && (
            <p className="text-sm opacity-80 mt-1">
              Continuing without game context. Your asset will still be created.
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Contextual action buttons */}
        {errorCode === 'COACH_TIER_REQUIRED' && onUpgrade && (
          <button
            type="button"
            onClick={onUpgrade}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium',
              'bg-blue-500/20 hover:bg-blue-500/30',
              'transition-colors'
            )}
          >
            Upgrade
          </button>
        )}
        
        {errorCode === 'COACH_SESSION_EXPIRED' && onStartNewSession && (
          <button
            type="button"
            onClick={onStartNewSession}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium',
              'bg-yellow-500/20 hover:bg-yellow-500/30',
              'transition-colors'
            )}
          >
            New Session
          </button>
        )}
        
        {error?.canRetry && onRetry && countdown === 0 && (
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium',
              isWarning 
                ? 'bg-yellow-500/20 hover:bg-yellow-500/30'
                : 'bg-red-500/20 hover:bg-red-500/30',
              'transition-colors'
            )}
          >
            Retry
          </button>
        )}
        
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 hover:opacity-70 transition-opacity"
          aria-label="Dismiss error"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
});

ErrorBanner.displayName = 'ErrorBanner';


interface EnhancedCoachMessageProps {
  message: ChatMessage;
  streamingStage: StreamingStage;
  isLastMessage: boolean;
}

/**
 * Enhanced coach message with streaming components and cards
 */
const EnhancedCoachMessage = memo(function EnhancedCoachMessage({
  message,
  streamingStage,
  isLastMessage,
}: EnhancedCoachMessageProps) {
  const { role, content, isStreaming, intentStatus, groundingUsed } = message;
  const isUser = role === 'user';
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

  // Determine if we should show thinking indicator
  const showThinkingIndicator = !isUser && isStreaming && !content && isLastMessage;
  const thinkingStage = mapStreamingToThinkingStage(streamingStage);

  // Clean content
  const displayContent = useMemo(() => {
    let cleaned = content.replace(/```prompt\n?[\s\S]*?```/g, '');
    cleaned = cleaned.replace(/\[INTENT_READY\]/g, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    return cleaned;
  }, [content]);

  // User message
  if (isUser) {
    return (
      <div className="flex gap-3 flex-row-reverse" role="article" aria-label="Your message">
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-accent-600 text-white">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="inline-block max-w-full sm:max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 bg-accent-600 text-white text-sm leading-relaxed">
            <p className="whitespace-pre-wrap break-words">{displayContent}</p>
          </div>
          <div className="text-xs text-text-tertiary mt-1 text-right">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message with thinking indicator
  if (showThinkingIndicator) {
    return (
      <div className="flex gap-3" role="article" aria-label="Coach message">
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-background-elevated text-text-secondary border border-border-default">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4M7 15h.01M17 15h.01" />
          </svg>
        </div>
        <div className="flex-1 min-w-0 max-w-full sm:max-w-[85%]">
          <ThinkingIndicator stage={thinkingStage} />
        </div>
      </div>
    );
  }

  // Assistant message with content
  return (
    <div className="flex gap-3" role="article" aria-label="Coach message">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-background-elevated text-text-secondary border border-border-default">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4M7 15h.01M17 15h.01" />
        </svg>
      </div>
      <div className="flex-1 min-w-0 max-w-full sm:max-w-[85%]">
        <div className="inline-block rounded-2xl rounded-tl-sm px-4 py-3 bg-background-surface border border-border-default text-text-primary text-sm leading-relaxed">
          {/* Grounding indicator */}
          {groundingUsed && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary-500/10 text-primary-400 text-xs mb-2">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
              <span>Game context loaded</span>
            </div>
          )}

          {/* Message content */}
          <div>
            <p className="whitespace-pre-wrap">{displayContent}</p>
            {isStreaming && displayContent && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-accent-600 animate-pulse" aria-hidden="true" />
            )}
          </div>

          {/* Ready indicator */}
          {intentStatus?.isReady && !isStreaming && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-default">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/30">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Ready to create</span>
              </div>
            </div>
          )}

          {/* Chain of thought (if reasoning available) */}
          {!isStreaming && message.intentStatus?.refinedDescription && (
            <ChainOfThought
              reasoning={`Refined description: ${message.intentStatus.refinedDescription}`}
              isExpanded={isReasoningExpanded}
              onToggle={() => setIsReasoningExpanded(!isReasoningExpanded)}
            />
          )}
        </div>
        <div className="text-xs text-text-tertiary mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
});

EnhancedCoachMessage.displayName = 'EnhancedCoachMessage';

// ============================================================================
// Main Component
// ============================================================================

/**
 * CoachChatIntegrated - Full integration of Coach Chat UX 2025
 * 
 * Integrates all components from Tasks 1-6:
 * - SessionContextBar (sticky top)
 * - Enhanced message list with streaming components
 * - AI Assistant Cards (PromptCard, ValidationCard, SuggestionCard)
 * - CoachInput with SuggestionChips
 * - InlineGenerationCard for generation preview
 * - Lightbox integration for asset viewing
 * 
 * @example
 * ```tsx
 * <CoachChatIntegrated
 *   assetType="twitch_emote"
 *   brandKitId="kit-123"
 *   brandKitName="My Brand Kit"
 *   onGenerateComplete={(asset) => console.log('Generated:', asset)}
 *   onEndSession={() => console.log('Session ended')}
 * />
 * ```
 */
export const CoachChatIntegrated = memo(function CoachChatIntegrated({
  assetType,
  brandKitId,
  brandKitName,
  onGenerateComplete,
  onEndSession,
  initialRequest,
  className,
  testId = 'coach-chat-integrated',
}: CoachChatIntegratedProps) {
  const prefersReducedMotion = useReducedMotion();
  
  // Coach chat state
  const {
    messages,
    isStreaming,
    streamingStage,
    sessionId,
    refinedDescription,
    isGenerationReady,
    error,
    errorMessage,
    isGrounding,
    groundingQuery,
    isSessionExpired,
    sessionStartTime,
    retryCount,
    startSession,
    sendMessage,
    endSession,
    retry,
    clearError,
    startNewSession,
  } = useCoachChat();

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isContextBarCollapsed, setIsContextBarCollapsed] = useState(false);
  const [turnsUsed, setTurnsUsed] = useState(0);
  const [generatedAsset, setGeneratedAsset] = useState<Asset | null>(null);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [referenceImage, setReferenceImage] = useState<{ file: File; preview: string } | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lightbox integration
  const { openImage } = useLightbox();

  // Conversation stage for suggestions
  const conversationStage = useMemo(
    () => getConversationStage(messages, isGenerationReady),
    [messages, isGenerationReady]
  );

  // Suggestions based on conversation stage
  const { suggestions } = useSuggestionContext({
    conversationStage,
    assetType,
    currentPrompt: refinedDescription || undefined,
  });

  // Inline generation hook
  const {
    jobId: activeJobId,
    status: generationStatus,
    progress: generationProgress,
    asset: generationAsset,
    error: generationError,
    triggerGeneration,
    reset: resetGeneration,
  } = useInlineGeneration({
    sessionId: sessionId || '',
    onComplete: (asset) => {
      setGeneratedAsset(asset);
      setIsSessionLocked(true); // Lock session after generation completes
      onGenerateComplete?.(asset);
    },
    onError: (err) => {
      setLocalError(err);
    },
  });

  // Track turns used
  useEffect(() => {
    const userMessages = messages.filter((m) => m.role === 'user');
    setTurnsUsed(userMessages.length);
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (!prefersReducedMotion) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      messagesEndRef.current?.scrollIntoView();
    }
  }, [messages, prefersReducedMotion]);

  // Start session when initialRequest is provided
  useEffect(() => {
    if (initialRequest && !hasStarted && !sessionId) {
      setHasStarted(true);
      startSession(initialRequest);
    }
  }, [initialRequest, hasStarted, sessionId, startSession]);

  // Handle send message
  const handleSend = useCallback(async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || isStreaming || !sessionId) return;

    setInputValue('');
    setLocalError(null);
    await sendMessage(trimmedValue);
  }, [inputValue, isStreaming, sessionId, sendMessage]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    async (action: string) => {
      if (isStreaming || !sessionId) return;
      setLocalError(null);
      await sendMessage(action);
    },
    [isStreaming, sessionId, sendMessage]
  );

  // Handle generate now
  const handleGenerateNow = useCallback(async () => {
    log.info('handleGenerateNow called');
    log.debug('refinedDescription:', refinedDescription);
    log.debug('isGenerationReady:', isGenerationReady);
    log.debug('isStreaming:', isStreaming);
    
    if (!refinedDescription || !isGenerationReady || isStreaming) {
      log.debug('handleGenerateNow - conditions not met, returning');
      return;
    }

    try {
      // Map the coach asset type to the backend generation asset type
      const backendAssetType = mapAssetTypeForGeneration(assetType);
      log.info('Triggering generation with:', {
        assetType: backendAssetType,
        customPrompt: refinedDescription,
        brandKitId,
      });
      
      await triggerGeneration({
        assetType: backendAssetType as any,
        customPrompt: refinedDescription,
        brandKitId,
      });
      
      log.info('Generation triggered successfully');
    } catch (err) {
      log.error('Generation failed:', err);
      setLocalError(err instanceof Error ? err.message : 'Generation failed');
    }
  }, [refinedDescription, isGenerationReady, isStreaming, triggerGeneration, assetType, brandKitId]);

  // Handle end session
  const handleEndSession = useCallback(async () => {
    await endSession();
    onEndSession?.();
  }, [endSession, onEndSession]);

  // Handle error dismiss
  const handleDismissError = useCallback(() => {
    setLocalError(null);
    clearError();
  }, [clearError]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    setLocalError(null);
    await retry();
  }, [retry]);

  // Handle upgrade navigation
  const handleUpgrade = useCallback(() => {
    window.location.href = '/pricing';
  }, []);

  // Handle start new session (for expired sessions)
  const handleStartNewSessionFromError = useCallback(() => {
    startNewSession();
    setLocalError(null);
  }, [startNewSession]);

  // Handle reference image upload
  const handleImageUpload = useCallback((file: File) => {
    const preview = URL.createObjectURL(file);
    setReferenceImage({ file, preview });
  }, []);

  // Handle reference image removal
  const handleRemoveImage = useCallback(() => {
    if (referenceImage?.preview) {
      URL.revokeObjectURL(referenceImage.preview);
    }
    setReferenceImage(null);
  }, [referenceImage]);

  // Handle start new chat
  const handleStartNewChat = useCallback(() => {
    // Clean up reference image
    if (referenceImage?.preview) {
      URL.revokeObjectURL(referenceImage.preview);
    }
    setReferenceImage(null);
    setIsSessionLocked(false);
    setGeneratedAsset(null);
    setInputValue('');
    setLocalError(null);
    resetGeneration();
    startNewSession();
    onEndSession?.();
  }, [referenceImage, resetGeneration, startNewSession, onEndSession]);

  // Cleanup reference image on unmount
  useEffect(() => {
    return () => {
      if (referenceImage?.preview) {
        URL.revokeObjectURL(referenceImage.preview);
      }
    };
  }, [referenceImage]);

  // Show error toast for certain error types
  useEffect(() => {
    if (error && error.code === 'COACH_RATE_LIMIT') {
      showErrorToast(
        { error: { code: 'COACH_RATE_LIMIT', message: error.message } },
        { onRetry: error.canRetry ? handleRetry : undefined }
      );
    }
  }, [error, handleRetry]);

  // Combined error - prefer structured error over local error string
  const displayError = error || (localError ? { code: 'UNKNOWN_ERROR' as const, message: localError, canRetry: true } : null);

  // Show empty state
  const showEmptyState = messages.length === 0;

  // Check if generation is in progress
  const isGenerating = generationStatus === 'queued' || generationStatus === 'processing';

  // Get streaming progress message for enhanced UX feedback
  const getStreamingProgressMessage = useCallback((): string | null => {
    if (!isStreaming) return null;
    
    switch (streamingStage) {
      case 'connecting':
        return 'Connecting...';
      case 'thinking':
        return 'Coach is thinking...';
      case 'reconnecting':
        return `Reconnecting... (attempt ${retryCount + 1})`;
      case 'streaming':
        return isGrounding ? `Searching for "${groundingQuery}"...` : 'Responding...';
      case 'validating':
        return 'Validating your prompt...';
      default:
        return null;
    }
  }, [isStreaming, streamingStage, isGrounding, groundingQuery, retryCount]);

  const streamingProgressMessage = getStreamingProgressMessage();

  return (
    <div
      data-testid={testId}
      className={cn('flex flex-col h-full bg-background-base', className)}
    >
      {/* Session Context Bar (Task 6) */}
      {sessionId && (
        <SessionContextBar
          sessionId={sessionId}
          assetType={assetType}
          brandKitName={brandKitName}
          turnsUsed={turnsUsed}
          turnsRemaining={Math.max(0, 10 - turnsUsed)}
          totalTurns={10}
          sessionStartTime={sessionStartTime || undefined}
          isSessionExpired={isSessionExpired}
          onEndSession={handleEndSession}
          onStartNewSession={handleStartNewSessionFromError}
          isCollapsed={isContextBarCollapsed}
          onToggleCollapse={() => setIsContextBarCollapsed(!isContextBarCollapsed)}
          testId={`${testId}-context-bar`}
        />
      )}

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
            {messages.map((message, index) => (
              <EnhancedCoachMessage
                key={message.id}
                message={message}
                streamingStage={streamingStage}
                isLastMessage={index === messages.length - 1}
              />
            ))}

            {/* Inline Generation Card (Task 5) */}
            {activeJobId && (generationStatus === 'queued' || generationStatus === 'processing' || generationStatus === 'completed' || generationStatus === 'failed') && (
              <div className="flex gap-3" role="article" aria-label="Generation status">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-background-elevated text-text-secondary border border-border-default">
                  <SparklesIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 max-w-full sm:max-w-[85%]">
                  <CardBase
                    title={generationStatus === 'completed' ? 'Asset Ready' : generationStatus === 'failed' ? 'Generation Failed' : 'Generating Asset'}
                    icon={
                      generationStatus === 'completed' ? (
                        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : generationStatus === 'failed' ? (
                        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <SparklesIcon className="w-5 h-5 animate-pulse" />
                      )
                    }
                    testId={`${testId}-generation-card`}
                  >
                    {(generationStatus === 'queued' || generationStatus === 'processing') && (
                      <GenerationProgress
                        status={generationStatus}
                        progress={generationProgress}
                        statusMessage={generationStatus === 'queued' ? 'Starting generation...' : 'Creating your asset...'}
                      />
                    )}
                    {generationStatus === 'completed' && generationAsset && (
                      <GenerationResult
                        asset={generationAsset}
                        onDownload={() => {
                          downloadAsset({
                            url: generationAsset.url,
                            filename: getAssetFilename(generationAsset.assetType, generationAsset.id),
                            onShowIOSInstructions: () => {
                              // Toast will be shown by the download utility
                            },
                          });
                        }}
                        onShare={() => {
                          // Share the asset URL
                          if (navigator.share) {
                            navigator.share({
                              title: `Generated ${generationAsset.assetType}`,
                              url: generationAsset.url,
                            });
                          } else {
                            navigator.clipboard.writeText(generationAsset.url);
                          }
                        }}
                        onRegenerate={() => {
                          resetGeneration();
                          handleGenerateNow();
                        }}
                        onViewFullscreen={() => {
                          openImage({
                            src: generationAsset.url,
                            alt: `Generated ${generationAsset.assetType}`,
                            assetId: generationAsset.id,
                            assetType: generationAsset.assetType,
                          });
                        }}
                      />
                    )}
                    {generationStatus === 'failed' && (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-red-400">Generation Failed</p>
                            <p className="text-sm text-text-secondary mt-1">{generationError || 'An unknown error occurred'}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            resetGeneration();
                            handleGenerateNow();
                          }}
                          className={cn(
                            'w-full py-2.5 rounded-lg',
                            'text-sm font-medium',
                            'bg-white/10 hover:bg-white/20',
                            'text-text-primary',
                            'transition-colors',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500'
                          )}
                        >
                          Try Again
                        </button>
                      </div>
                    )}
                  </CardBase>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Streaming Progress Indicator */}
      {streamingProgressMessage && (
        <div
          className="flex items-center gap-2 px-4 py-2 bg-accent-500/10 border-t border-accent-500/20 text-accent-400 text-sm"
          role="status"
          aria-live="polite"
        >
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{streamingProgressMessage}</span>
        </div>
      )}

      {/* Grounding Status (only show when not covered by streaming progress) */}
      {isGrounding && !streamingProgressMessage && (
        <div
          className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 border-t border-primary-500/20 text-primary-400 text-sm"
          role="status"
          aria-live="polite"
        >
          <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
          <span>Searching the web{groundingQuery ? ` for "${groundingQuery}"` : ''}...</span>
        </div>
      )}

      {/* Error Banner with Enterprise Recovery Actions */}
      {displayError && (
        <ErrorBanner 
          error={displayError}
          message={generationError || undefined}
          onDismiss={handleDismissError}
          onRetry={displayError.canRetry ? handleRetry : undefined}
          onUpgrade={displayError.code === 'COACH_TIER_REQUIRED' ? handleUpgrade : undefined}
          onStartNewSession={displayError.code === 'COACH_SESSION_EXPIRED' ? handleStartNewSessionFromError : undefined}
        />
      )}

      {/* Input Area (Task 4) */}
      <CoachInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onSuggestionSelect={handleSuggestionSelect}
        suggestions={suggestions}
        isStreaming={isStreaming || isGenerating}
        isGenerationReady={isGenerationReady && !isGenerating && !isSessionLocked}
        onGenerateNow={handleGenerateNow}
        isSessionLocked={isSessionLocked}
        onStartNewChat={handleStartNewChat}
        onImageUpload={handleImageUpload}
        referenceImage={referenceImage}
        onRemoveImage={handleRemoveImage}
        placeholder={
          isStreaming
            ? 'Waiting for response...'
            : 'Describe what you want to create...'
        }
        testId={`${testId}-input`}
      />
    </div>
  );
});

CoachChatIntegrated.displayName = 'CoachChatIntegrated';

export default CoachChatIntegrated;

// Re-export types
export type { StartCoachRequest };
export { COACH_UX_2025_ENABLED };
