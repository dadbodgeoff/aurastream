/**
 * Prompt Coach Page.
 * 
 * Main page for the Prompt Coach feature that combines the Context Capture UI
 * and Chat Interface. Premium users get the full AI-powered coaching experience,
 * while free/pro users see static tips with an upgrade CTA.
 * 
 * Now uses CoachChatIntegrated for inline generation (Coach UX 2025).
 * 
 * @module CoachPage
 */

'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@aurastream/shared';
import { CoachContextForm } from '../../../components/coach/CoachContextForm';
import { CoachChatIntegrated, COACH_UX_2025_ENABLED } from '../../../components/coach';
import { CoachChat } from '../../../components/coach/CoachChat';
import { CoachTips } from '../../../components/coach/CoachTips';
import type { StartCoachRequest } from '../../../hooks/useCoachContext';
import type { Asset } from '../../../components/coach/generation';

// ============================================================================
// Type Definitions
// ============================================================================

/** Phase of the coach flow */
type CoachPhase = 'context' | 'chat';

// ============================================================================
// Icon Components
// ============================================================================

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
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
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
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

// ============================================================================
// Sub-Components
// ============================================================================

interface ChatHeaderProps {
  onBack: () => void;
}

/**
 * Header for the chat phase with back button.
 */
function ChatHeader({ onBack }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background-surface rounded-lg transition-colors"
        aria-label="Back to context selection"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        <span>Back to Context</span>
      </button>
      <div className="flex-1">
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-accent-600" />
          Prompt Coach
        </h1>
      </div>
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
}

/**
 * Loading state component.
 */
function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <LoadingSpinner className="w-8 h-8 text-accent-600 mb-4" />
      <p className="text-text-secondary">{message}</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Prompt Coach Page.
 * 
 * Implements a two-phase flow:
 * 1. Context Capture: User selects brand kit, asset type, mood, game, and description
 * 2. Chat: User interacts with AI coach to refine their prompt
 * 
 * Non-premium users see static tips with an upgrade CTA instead.
 * 
 * @example
 * ```tsx
 * // Used as a Next.js page at /dashboard/coach
 * export default CoachPage;
 * ```
 */
export default function CoachPage() {
  const user = useUser();

  // Phase state
  const [phase, setPhase] = useState<CoachPhase>('context');
  
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [contextRequest, setContextRequest] = useState<StartCoachRequest | null>(null);
  
  // Loading state for starting session
  const [isStartingSession, setIsStartingSession] = useState(false);

  /**
   * Check if user has premium access.
   * Premium tier is 'studio' in this system.
   */
  const isPremium = user?.subscriptionTier === 'studio';

  /**
   * Handle starting the chat from context form.
   */
  const handleStartChat = useCallback((request: StartCoachRequest) => {
    setIsStartingSession(true);
    setContextRequest(request);
    setPhase('chat');
    // Loading state will be cleared when session starts
    setIsStartingSession(false);
  }, []);

  /**
   * Handle session start from CoachChat (legacy).
   */
  const handleSessionStart = useCallback((newSessionId: string) => {
    setSessionId(newSessionId);
  }, []);

  /**
   * Handle generation complete from CoachChatIntegrated (new UX).
   */
  const handleGenerateComplete = useCallback((asset: Asset) => {
    console.log('[CoachPage] Asset generated:', asset);
    // Asset is saved automatically by the generation service
    // User can continue chatting or navigate to assets
  }, []);

  /**
   * Handle going back to context phase.
   */
  const handleBackToContext = useCallback(() => {
    setPhase('context');
    // Keep the context request so user can modify and restart
    // Clear session ID as we'll start a new session
    setSessionId(null);
  }, []);

  // Show loading state while user data is being fetched
  if (user === null && typeof window !== 'undefined') {
    // User is loading - show loading state
    return (
      <div className="p-6">
        <LoadingState message="Loading your profile..." />
      </div>
    );
  }

  // Non-premium users see tips with upgrade CTA
  if (!isPremium) {
    return (
      <div className="p-6">
        <CoachTips />
      </div>
    );
  }

  // Premium users get the full coach experience
  return (
    <div className="h-full flex flex-col">
      {phase === 'context' ? (
        // Phase 1: Context Capture
        <div className="p-6 overflow-y-auto">
          <CoachContextForm
            onStartChat={handleStartChat}
            isLoading={isStartingSession}
          />
        </div>
      ) : (
        // Phase 2: Chat
        <div className="flex flex-col h-full">
          <div className="px-6 pt-6">
            <ChatHeader onBack={handleBackToContext} />
          </div>
          <div className="flex-1 min-h-0">
            {COACH_UX_2025_ENABLED ? (
              // New UX: Inline generation within chat
              <CoachChatIntegrated
                assetType={contextRequest?.asset_type || 'thumbnail'}
                brandKitId={contextRequest?.brand_context.brand_kit_id || undefined}
                onGenerateComplete={handleGenerateComplete}
                onEndSession={handleBackToContext}
                initialRequest={contextRequest ?? undefined}
                className="h-full"
                testId="coach-page-chat"
              />
            ) : (
              // Legacy: Redirect to generate page
              <CoachChat
                sessionId={sessionId}
                onSessionStart={handleSessionStart}
                onGenerateNow={(prompt) => {
                  // Legacy fallback - this shouldn't be reached when COACH_UX_2025_ENABLED is true
                  console.warn('[CoachPage] Legacy onGenerateNow called - this should not happen with new UX');
                }}
                initialRequest={contextRequest ?? undefined}
                className="h-full"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
