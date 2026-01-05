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
import { createDevLogger } from '@aurastream/shared';
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

// Dev logger for this component
const log = createDevLogger({ prefix: '[CreateCoach]' });

// ============================================================================
// Types
// ============================================================================

export interface CreateCoachIntegrationProps {
  /** Selected asset type ID */
  assetType: string;
  /** Selected brand kit ID (optional) */
  brandKitId?: string;
  /** User's selected mood */
  mood?: string;
  /** User's custom mood (when mood is 'custom') */
  customMood?: string;
  /** User's game context (optional) */
  game?: string;
  /** User's description of what they want to create */
  description?: string;
  /** @deprecated Legacy callback - no longer used with new UX */
  onGenerateNow?: (prompt: string) => void;
  /** Callback when generation completes (inline generation) */
  onGenerateComplete?: (asset: Asset) => void;
  /** Callback when session ends */
  onEndSession?: () => void;
  /** Selected media assets for injection (max 2) */
  selectedMediaAssets?: MediaAsset[];
  /** Media asset placements with precise positioning */
  mediaAssetPlacements?: AssetPlacement[];
  /** Sketch elements from canvas studio */
  sketchElements?: AnySketchElement[];
  /** Pre-prepared canvas snapshot URL (if already uploaded) */
  canvasSnapshotUrl?: string;
  /** Canvas snapshot description for AI context */
  canvasSnapshotDescription?: string;
  /** Whether to use canvas mode for generation (prepares snapshot at generation time) */
  useCanvasMode?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Import media types
import type { MediaAsset } from '@aurastream/api-client';
import type { AssetPlacement } from '../media-library/placement';
import type { AnySketchElement } from '../media-library/canvas-export/types';

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
  mood?: string;
  customMood?: string;
  game?: string;
  description?: string;
  onGenerateNow: (prompt: string) => void;
  className?: string;
}

/**
 * Legacy coach integration for backwards compatibility
 */
function LegacyCoachIntegration({
  assetType,
  brandKitId,
  mood,
  customMood,
  game,
  description,
  onGenerateNow,
  className,
}: LegacyCoachIntegrationProps) {
  const { data: brandKitsData, isLoading: isLoadingBrandKits } = useBrandKits();
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

  // Build the start request from user input
  const buildStartRequest = useCallback((): StartCoachRequest => {
    // Determine the effective mood
    // If no mood is selected, default to 'chill' (not 'custom' which requires custom_mood)
    const effectiveMood = mood || 'chill';
    const effectiveCustomMood = mood === 'custom' ? (customMood || 'creative and unique') : undefined;
    
    // Build description with game context if provided
    let fullDescription = description || `I want to create a ${assetType.replace(/_/g, ' ')}.`;
    if (game) {
      fullDescription = `${fullDescription} This is for ${game}.`;
    }
    
    return {
      brand_context: selectedBrandKit ? {
        brand_kit_id: brandKitId || '',
        colors: [
          ...(selectedBrandKit.primary_colors || []),
          ...(selectedBrandKit.accent_colors || []),
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
      mood: effectiveMood as any,
      custom_mood: effectiveCustomMood,
      description: fullDescription,
    };
  }, [assetType, brandKitId, selectedBrandKit, mood, customMood, game, description]);

  // Handle starting the chat session
  const handleStartChat = useCallback(() => {
    if (hasStarted || isLoadingBrandKits) return;
    
    setHasStarted(true);
    const request = buildStartRequest();
    log.info('Starting coach session with user input:', {
      mood: request.mood,
      customMood: request.custom_mood,
      description: request.description,
    });
    startSession(request);
  }, [hasStarted, isLoadingBrandKits, buildStartRequest, startSession]);

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

  // Show start button if session hasn't started yet
  if (!hasStarted) {
    return (
      <div className={cn('flex flex-col h-full bg-background-base', className)}>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-16 h-16 rounded-full bg-interactive-600/10 flex items-center justify-center mb-6">
            <SparklesIcon />
          </div>
          <h3 className="text-xl font-semibold text-text-primary mb-3">
            Ready to start?
          </h3>
          <p className="text-sm text-text-secondary text-center max-w-md mb-6">
            The AI Coach will help you refine your vision into the perfect prompt based on your inputs.
          </p>
          
          {/* Summary of user input */}
          <div className="w-full max-w-md bg-background-surface rounded-xl p-4 mb-6 space-y-2">
            {mood && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-tertiary">Mood:</span>
                <span className="text-text-primary">{mood === 'custom' ? customMood : mood}</span>
              </div>
            )}
            {game && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-tertiary">Game:</span>
                <span className="text-text-primary">{game}</span>
              </div>
            )}
            {description && (
              <div className="text-sm">
                <span className="text-text-tertiary">Description:</span>
                <p className="text-text-primary mt-1">{description}</p>
              </div>
            )}
          </div>
          
          <button
            onClick={handleStartChat}
            disabled={isLoadingBrandKits}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-interactive-600 text-white font-medium hover:bg-interactive-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingBrandKits ? (
              <>
                <LoadingSpinner className="w-5 h-5" />
                Loading...
              </>
            ) : (
              <>
                <SparklesIcon />
                Start Chat
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

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
          {typeof error === 'string' ? error : error.message || 'An error occurred'}
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
  mood,
  customMood,
  game,
  description,
  onGenerateNow,
  onGenerateComplete,
  onEndSession,
  selectedMediaAssets,
  mediaAssetPlacements,
  sketchElements,
  canvasSnapshotUrl,
  canvasSnapshotDescription,
  useCanvasMode,
  className,
}: CreateCoachIntegrationProps) {
  const { data: brandKitsData, isLoading: isLoadingBrandKits } = useBrandKits();
  const brandKits = brandKitsData?.brandKits ?? [];
  const selectedBrandKit = brandKits.find(k => k.id === brandKitId);

  // Build initial request for the new UX - using user's actual input
  // Only build when brand kits are loaded (or no brandKitId was provided)
  const initialRequest = useMemo((): StartCoachRequest | null => {
    // If brandKitId is provided but brand kits are still loading, wait
    if (brandKitId && isLoadingBrandKits) {
      log.debug('Waiting for brand kits to load before building initialRequest');
      return null;
    }
    
    // If brandKitId is provided but not found in loaded kits, log warning
    if (brandKitId && !selectedBrandKit && !isLoadingBrandKits) {
      log.warn('Brand kit not found:', brandKitId);
    }
    
    // Determine the effective mood from user input
    // If no mood is selected, default to 'chill' (not 'custom' which requires custom_mood)
    const effectiveMood = mood || 'chill';
    const effectiveCustomMood = mood === 'custom' ? (customMood || 'creative and unique') : undefined;
    
    // Build description with game context if provided
    let fullDescription = description || `I want to create a ${assetType.replace(/_/g, ' ')}.`;
    if (game) {
      fullDescription = `${fullDescription} This is for ${game}.`;
    }
    
    log.info('Building initialRequest with user input:', {
      brandKitId,
      selectedBrandKit: selectedBrandKit?.name,
      mood: effectiveMood,
      customMood: effectiveCustomMood,
      game,
      description: fullDescription,
    });
    
    return {
      brand_context: selectedBrandKit ? {
        brand_kit_id: brandKitId || '',
        colors: [
          ...(selectedBrandKit.primary_colors || []),
          ...(selectedBrandKit.accent_colors || []),
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
      mood: effectiveMood as any,
      custom_mood: effectiveCustomMood,
      description: fullDescription,
      // Include canvas snapshot data if provided (for AI context during coaching)
      canvas_snapshot_url: canvasSnapshotUrl,
      canvas_snapshot_description: canvasSnapshotDescription,
    };
  }, [selectedBrandKit, assetType, brandKitId, isLoadingBrandKits, mood, customMood, game, description, canvasSnapshotUrl, canvasSnapshotDescription]);

  // Handle generate complete - also call onGenerateNow for backwards compatibility
  const handleGenerateComplete = useCallback((asset: Asset) => {
    onGenerateComplete?.(asset);
  }, [onGenerateComplete]);

  // Use new UX if enabled
  log.info('COACH_UX_2025_ENABLED:', COACH_UX_2025_ENABLED);
  if (COACH_UX_2025_ENABLED) {
    log.info('Using CoachChatIntegrated (new UX)');
    log.debug('initialRequest:', initialRequest);
    log.debug('selectedMediaAssets:', selectedMediaAssets?.length || 0);
    return (
      <CoachChatIntegrated
        assetType={assetType}
        brandKitId={brandKitId}
        brandKitName={selectedBrandKit?.name}
        onGenerateComplete={handleGenerateComplete}
        onEndSession={onEndSession}
        initialRequest={initialRequest ?? undefined}
        selectedMediaAssets={selectedMediaAssets}
        mediaAssetPlacements={mediaAssetPlacements}
        sketchElements={sketchElements}
        canvasSnapshotUrl={canvasSnapshotUrl}
        canvasSnapshotDescription={canvasSnapshotDescription}
        useCanvasMode={useCanvasMode}
        className={className}
        testId="create-coach-integration"
      />
    );
  }

  // Legacy fallback removed - always use new UX with inline generation
  // This code path should never be reached since COACH_UX_2025_ENABLED is always true
  log.warn('Unexpected: COACH_UX_2025_ENABLED is false, but legacy fallback was removed');
  return (
    <CoachChatIntegrated
      assetType={assetType}
      brandKitId={brandKitId}
      brandKitName={selectedBrandKit?.name}
      onGenerateComplete={handleGenerateComplete}
      onEndSession={onEndSession}
      initialRequest={initialRequest ?? undefined}
      selectedMediaAssets={selectedMediaAssets}
      mediaAssetPlacements={mediaAssetPlacements}
      sketchElements={sketchElements}
      canvasSnapshotUrl={canvasSnapshotUrl}
      canvasSnapshotDescription={canvasSnapshotDescription}
      useCanvasMode={useCanvasMode}
      className={className}
      testId="create-coach-integration"
    />
  );
}

export default CreateCoachIntegration;
