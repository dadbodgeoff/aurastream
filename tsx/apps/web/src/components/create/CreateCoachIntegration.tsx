/**
 * Coach integration for the Create flow.
 * 
 * This component wraps CoachChatIntegrated to work within the create flow,
 * where we have asset type and brand kit selected but need the coach
 * to help the user craft their prompt from scratch.
 * 
 * Supports both the new Coach UX 2025 and legacy fallback.
 * 
 * @module create/CreateCoachIntegration
 */

'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useBrandKits } from '@aurastream/api-client';
import { cn } from '@/lib/utils';
import { 
  CoachChatIntegrated, 
  COACH_UX_2025_ENABLED,
  CoachMessage,
} from '../coach';
import { useCoachChat } from '../../hooks/useCoachChat';
import type { StartCoachRequest } from '../../hooks/useCoachContext';
import type { Asset } from '../coach/generation';
import { SparklesIcon } from './icons';

// ============================================================================
// Types
// ============================================================================

export interface CreateCoachIntegrationProps {
  /** Selected asset type ID */
  assetType: string;
  /** Selected brand kit ID (optional) */
  brandKitId?: string;
  /** Callback when user clicks "Generate Now" with refined prompt */
  onGenerateNow: (prompt: string) => void;
  /** Callback when generation completes (for new UX) */
  onGenerateComplete?: (asset: Asset) => void;
  /** Callback when session ends */
  onEndSession?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const LoadingSpinner = ({ className }: { className?: string }) => (
  <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ============================================================================
// Legacy Component (Fallback)
// ============================================================================

interface LegacyCoachIntegrationProps {
  assetType: string;
  brandKitId?: string;
  onGenerateNow: (prompt: string) => void;
  className?: string;
}

/**
 * Legacy coach integration for backwards compatibility
 */
function LegacyCoachIntegration({
  assetType,
  brandKitId,
  onGenerateNow,
  className,
}: LegacyCoachIntegrationProps) {
  const { data: brandKitsData } = useBrandKits();
  const brandKits = brandKitsData?.brandKits ?? [];
  const selectedBrandKit = brandKits.find(k => k.id === brandKitId);

  const {
    messages,
    isStreaming,
    sessionId,
    refinedDescription,
    isGenerationReady,
    error,
    startSession,
    sendMessage,
  } = useCoachChat();

  const [inputValue, setInputValue] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-start session when component mounts with valid context
  useEffect(() => {
    if (!hasStarted && assetType) {
      setHasStarted(true);
      
      // Build a minimal StartCoachRequest - brand kit is optional
      const request: StartCoachRequest = {
        brand_context: selectedBrandKit ? {
          brand_kit_id: brandKitId || '',
          colors: [
            ...selectedBrandKit.primary_colors,
            ...selectedBrandKit.accent_colors,
          ].map((hex, i) => ({ hex, name: `Color ${i + 1}` })),
          tone: selectedBrandKit.tone || 'professional',
          fonts: {
            headline: selectedBrandKit.fonts?.headline || 'Inter',
            body: selectedBrandKit.fonts?.body || 'Inter',
          },
        } : {
          brand_kit_id: '',
          colors: [],
          tone: 'professional',
          fonts: { headline: 'Inter', body: 'Inter' },
        },
        asset_type: assetType as any,
        mood: 'custom',
        custom_mood: 'Help me figure out the perfect mood',
        description: `I want to create a ${assetType.replace(/_/g, ' ')}. Help me describe exactly what I'm looking for.`,
      };

      startSession(request);
    }
  }, [hasStarted, selectedBrandKit, assetType, brandKitId, startSession]);

  const handleSend = useCallback(async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || isStreaming || !sessionId) return;
    
    setInputValue('');
    await sendMessage(trimmedValue);
  }, [inputValue, isStreaming, sessionId, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleGenerateNow = useCallback(() => {
    if (refinedDescription && isGenerationReady) {
      onGenerateNow(refinedDescription);
    }
  }, [refinedDescription, isGenerationReady, onGenerateNow]);

  const showEmptyState = messages.length === 0;

  return (
    <div className={cn('flex flex-col h-full bg-background-base', className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-label="Chat messages">
        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <LoadingSpinner className="w-8 h-8 text-interactive-600 mb-4" />
            <p className="text-text-secondary">Starting your coaching session...</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <CoachMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-3 bg-error-dark/10 border-t border-error-dark/20 text-error-light text-sm">
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border-subtle p-4">
        {/* Generate Now Button */}
        {refinedDescription && isGenerationReady && !isStreaming && (
          <button
            onClick={handleGenerateNow}
            className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-success-dark hover:bg-success-dark/80 text-white font-medium transition-colors"
          >
            <SparklesIcon />
            Create Now
          </button>
        )}

        {/* Input Field */}
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'Waiting for response...' : 'Describe what you want to create...'}
            disabled={isStreaming || !sessionId}
            rows={1}
            className="flex-1 px-4 py-3 rounded-lg resize-none bg-background-surface border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600 disabled:opacity-50 transition-colors"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming || !sessionId}
            className="flex-shrink-0 p-3 rounded-lg bg-interactive-600 text-white hover:bg-interactive-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? <LoadingSpinner className="w-5 h-5" /> : <SendIcon className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * CreateCoachIntegration - Coach integration for the Create flow
 * 
 * Uses the new CoachChatIntegrated component when COACH_UX_2025 is enabled,
 * otherwise falls back to the legacy implementation.
 * 
 * @example
 * ```tsx
 * <CreateCoachIntegration
 *   assetType="twitch_emote"
 *   brandKitId="kit-123"
 *   onGenerateNow={(prompt) => handleGenerate(prompt)}
 *   onGenerateComplete={(asset) => handleComplete(asset)}
 * />
 * ```
 */
export function CreateCoachIntegration({
  assetType,
  brandKitId,
  onGenerateNow,
  onGenerateComplete,
  onEndSession,
  className,
}: CreateCoachIntegrationProps) {
  const { data: brandKitsData } = useBrandKits();
  const brandKits = brandKitsData?.brandKits ?? [];
  const selectedBrandKit = brandKits.find(k => k.id === brandKitId);

  // Build initial request for the new UX
  const initialRequest = useMemo((): StartCoachRequest => {
    return {
      brand_context: selectedBrandKit ? {
        brand_kit_id: brandKitId || '',
        colors: [
          ...selectedBrandKit.primary_colors,
          ...selectedBrandKit.accent_colors,
        ].map((hex, i) => ({ hex, name: `Color ${i + 1}` })),
        tone: selectedBrandKit.tone || 'professional',
        fonts: {
          headline: selectedBrandKit.fonts?.headline || 'Inter',
          body: selectedBrandKit.fonts?.body || 'Inter',
        },
      } : {
        brand_kit_id: '',
        colors: [],
        tone: 'professional',
        fonts: { headline: 'Inter', body: 'Inter' },
      },
      asset_type: assetType as any,
      mood: 'custom',
      custom_mood: 'Help me figure out the perfect mood',
      description: `I want to create a ${assetType.replace(/_/g, ' ')}. Help me describe exactly what I'm looking for.`,
    };
  }, [selectedBrandKit, assetType, brandKitId]);

  // Handle generate complete - also call onGenerateNow for backwards compatibility
  const handleGenerateComplete = useCallback((asset: Asset) => {
    onGenerateComplete?.(asset);
  }, [onGenerateComplete]);

  // Use new UX if enabled
  console.log('[CreateCoachIntegration] COACH_UX_2025_ENABLED:', COACH_UX_2025_ENABLED);
  if (COACH_UX_2025_ENABLED) {
    console.log('[CreateCoachIntegration] Using CoachChatIntegrated (new UX)');
    return (
      <CoachChatIntegrated
        assetType={assetType}
        brandKitId={brandKitId}
        brandKitName={selectedBrandKit?.name}
        onGenerateComplete={handleGenerateComplete}
        onEndSession={onEndSession}
        initialRequest={initialRequest}
        className={className}
        testId="create-coach-integration"
      />
    );
  }

  console.log('[CreateCoachIntegration] Using LegacyCoachIntegration (fallback)');
  // Fallback to legacy implementation
  return (
    <LegacyCoachIntegration
      assetType={assetType}
      brandKitId={brandKitId}
      onGenerateNow={onGenerateNow}
      className={className}
    />
  );
}

export default CreateCoachIntegration;
