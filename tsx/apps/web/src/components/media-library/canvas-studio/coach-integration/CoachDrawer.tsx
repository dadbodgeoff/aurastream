/**
 * Coach Drawer Component
 * 
 * Slide-out drawer for Coach chat within Canvas Studio.
 * Integrates with the existing Coach system (useCoachChat) for real functionality.
 * Now includes inline generation progress and results.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useCoachChat } from '../../../../hooks/useCoachChat';
import type { StartCoachRequest } from '../../../../hooks/useCoachContext';
import type { CanvasCoachContext } from './types';
import { getAssetTypeInfo } from './assetTypeInfo';
import { buildCoachRequest } from './useSendToCoach';
import { 
  useInlineGeneration,
  GenerationProgress,
  GenerationResult,
  type Asset,
} from '../../../coach/generation';

// ============================================================================
// Icons
// ============================================================================

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
      <path d="M19 13l1 2 1-2 2-1-2-1-1-2-1 2-2 1 2 1z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ============================================================================
// Types
// ============================================================================

interface CoachDrawerProps {
  /** Whether drawer is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Canvas context for Coach */
  context: CanvasCoachContext | null;
  /** Whether currently loading (exporting/uploading canvas) */
  isLoading?: boolean;
  /** Error message from canvas preparation */
  error?: string | null;
  /** Callback when generation completes with asset */
  onGenerateComplete?: (asset: Asset) => void;
}

// ============================================================================
// Content Cleaner
// ============================================================================

/**
 * Clean message content - remove technical markers and prompts.
 * Users should see natural conversation, not internal markers.
 */
function cleanMessageContent(content: string): string {
  let cleaned = content;
  
  // Remove [INTENT_READY] markers (internal use only) - case insensitive, with optional whitespace
  cleaned = cleaned.replace(/\s*\[INTENT_READY\]\s*/gi, ' ');
  
  // Remove any ```prompt blocks
  cleaned = cleaned.replace(/```prompt\n?[\s\S]*?```/g, '');
  
  // Remove the "✨ Ready!" prefix followed by detailed prompt (keep just a simple acknowledgment)
  // This prevents showing the full generation prompt to users
  const readyMatch = cleaned.match(/✨\s*Ready!\s*(.+)/s);
  if (readyMatch) {
    // Replace with a simple confirmation instead of the full prompt
    cleaned = cleaned.replace(/✨\s*Ready!\s*.+/s, "✨ Got it! I understand exactly what you want.");
  }
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  return cleaned;
}

/**
 * Map canvas asset types to backend generation asset types
 */
function mapAssetTypeForGeneration(canvasAssetType: string): string {
  const mapping: Record<string, string> = {
    youtube_thumbnail: 'thumbnail',
    youtube_banner: 'banner',
    twitch_emote: 'twitch_emote',
    tiktok_emote: 'tiktok_emote',
    twitch_banner: 'banner',
    twitch_badge: 'twitch_badge',
    twitch_panel: 'twitch_panel',
    twitch_offline: 'twitch_offline',
    tiktok_story: 'story_graphic',
    instagram_story: 'story_graphic',
    instagram_reel: 'story_graphic',
    thumbnail: 'thumbnail',
    overlay: 'overlay',
    banner: 'banner',
    story_graphic: 'story_graphic',
  };
  return mapping[canvasAssetType] || 'thumbnail';
}

// ============================================================================
// Message Component
// ============================================================================

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

function Message({ role, content, isStreaming }: MessageProps) {
  const isUser = role === 'user';
  
  // Clean content to remove technical markers
  const displayContent = cleanMessageContent(content);
  
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
        isUser 
          ? 'bg-interactive-500/20 text-interactive-400'
          : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
      )}>
        {isUser ? (
          <span className="text-sm font-medium">You</span>
        ) : (
          <span className="text-xs font-bold">A</span>
        )}
      </div>
      <div className={cn(
        'flex-1 max-w-[85%]',
        isUser ? 'text-right' : 'text-left'
      )}>
        {!isUser && (
          <span className="text-xs font-medium text-purple-400 mb-1 block">AuraBot</span>
        )}
        <div className={cn(
          'rounded-lg p-3',
          isUser 
            ? 'bg-interactive-500/10 rounded-tr-none'
            : 'bg-white/5 rounded-tl-none'
        )}>
          <p className="text-sm text-white/90 whitespace-pre-wrap">
            {displayContent}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-purple-400 animate-pulse" />
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CoachDrawer({
  isOpen,
  onClose,
  context,
  isLoading = false,
  error = null,
  onGenerateComplete,
}: CoachDrawerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [hasStartedSession, setHasStartedSession] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAsset, setGeneratedAsset] = useState<Asset | null>(null);
  
  // Use the real coach chat hook
  const {
    messages,
    isStreaming,
    sessionId,
    refinedDescription,
    isGenerationReady,
    error: coachError,
    streamingStage,
    startSession,
    sendMessage,
    reset: resetCoach,
  } = useCoachChat();
  
  // Inline generation hook
  const {
    triggerGeneration,
    status: generationStatus,
    progress: generationProgress,
    asset: generationAsset,
    error: generationError,
    reset: resetGeneration,
  } = useInlineGeneration({
    sessionId: sessionId || '',
    onComplete: (asset) => {
      console.log('[CoachDrawer] Generation complete:', asset);
      setGeneratedAsset(asset);
      setIsGenerating(false);
      onGenerateComplete?.(asset);
    },
    onError: (error) => {
      console.error('[CoachDrawer] Generation error:', error);
      setIsGenerating(false);
    },
  });
  
  const assetInfo = context ? getAssetTypeInfo(context.assetType) : null;
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generationStatus]);
  
  // Focus input when drawer opens and context is ready
  useEffect(() => {
    if (isOpen && context && !isLoading && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, context, isLoading]);
  
  // Start coach session when context is ready
  useEffect(() => {
    if (isOpen && context && !hasStartedSession && !isLoading && !error) {
      setHasStartedSession(true);
      
      // Build the request from canvas context
      const request = buildCoachRequest(context);
      startSession(request as StartCoachRequest);
    }
  }, [isOpen, context, hasStartedSession, isLoading, error, startSession]);
  
  // Reset when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setHasStartedSession(false);
      setInputValue('');
      setIsGenerating(false);
      setGeneratedAsset(null);
      resetCoach();
      resetGeneration();
    }
  }, [isOpen, resetCoach, resetGeneration]);
  
  // Handle send message
  const handleSend = useCallback(async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || isStreaming || !sessionId) return;
    
    setInputValue('');
    await sendMessage(trimmedValue);
  }, [inputValue, isStreaming, sessionId, sendMessage]);
  
  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);
  
  // Handle generate - triggers inline generation
  const handleGenerate = useCallback(async () => {
    if (!refinedDescription || !isGenerationReady || !sessionId || !context) return;
    
    console.log('[CoachDrawer] Starting generation:', {
      prompt: refinedDescription.substring(0, 100),
      sessionId,
      snapshotUrl: context.snapshotUrl,
    });
    
    setIsGenerating(true);
    setGeneratedAsset(null);
    
    try {
      const backendAssetType = mapAssetTypeForGeneration(context.assetType);
      
      await triggerGeneration({
        assetType: backendAssetType as any,
        customPrompt: refinedDescription,
        canvasSnapshotUrl: context.snapshotUrl,
        canvasSnapshotDescription: context.description?.summary,
      });
    } catch (err) {
      console.error('[CoachDrawer] Generation trigger failed:', err);
      setIsGenerating(false);
    }
  }, [refinedDescription, isGenerationReady, sessionId, context, triggerGeneration]);
  
  // Handle download
  const handleDownload = useCallback((asset: Asset) => {
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = `canvas-asset-${asset.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);
  
  // Combined error
  const displayError = error || (coachError ? coachError.message : null);
  
  // Streaming stage indicator
  const getStageText = () => {
    switch (streamingStage) {
      case 'connecting': return 'Connecting...';
      case 'thinking': return 'Thinking...';
      case 'streaming': return 'Responding...';
      case 'validating': return 'Analyzing...';
      default: return null;
    }
  };
  
  const stageText = getStageText();
  
  // Determine if we should show generation UI
  const showGenerationProgress = isGenerating && (generationStatus === 'queued' || generationStatus === 'processing');
  const showGenerationResult = generatedAsset && generationStatus === 'completed';
  const showGenerationError = generationStatus === 'failed' && generationError;
  
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 transition-opacity z-[10000]',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[480px] max-w-[90vw] bg-[#1a1d21] border-l border-white/10 shadow-2xl z-[10001]',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <SparklesIcon />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">AI Coach</h2>
              <p className="text-xs text-white/50">Refine your design</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <XIcon />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex flex-col h-[calc(100%-3.5rem)]">
          {/* Loading State - Canvas Export */}
          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-white/60">Preparing your canvas...</p>
              </div>
            </div>
          )}
          
          {/* Error State */}
          {displayError && !isLoading && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-sm text-red-400 mb-4">{displayError}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
          
          {/* Ready State - Chat Interface */}
          {context && !isLoading && !displayError && (
            <>
              {/* Canvas Preview */}
              <div className="p-4 border-b border-white/5">
                <div className="flex gap-3">
                  <img
                    src={context.snapshotUrl}
                    alt="Canvas preview"
                    className="w-20 h-20 rounded-lg object-cover border border-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {assetInfo?.displayName || context.assetType}
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      {context.description.dimensions.width} × {context.description.dimensions.height}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      {context.description.elements.length} elements
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Tips - Only show before session starts */}
              {assetInfo && messages.length === 0 && !hasStartedSession && (
                <div className="p-4 border-b border-white/5 bg-purple-500/5">
                  <p className="text-xs font-medium text-purple-400 mb-2">
                    💡 Tips for {assetInfo.displayName}
                  </p>
                  <ul className="text-xs text-white/60 space-y-1">
                    {assetInfo.tips.slice(0, 3).map((tip, i) => (
                      <li key={i}>• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Loading indicator while starting session */}
                {hasStartedSession && messages.length === 0 && (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner className="w-6 h-6 text-purple-400" />
                    <span className="ml-2 text-sm text-white/50">Starting session...</span>
                  </div>
                )}
                
                {/* Messages */}
                {messages.map((msg) => (
                  <Message
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    isStreaming={msg.isStreaming}
                  />
                ))}
                
                {/* Streaming stage indicator */}
                {stageText && !messages.some(m => m.isStreaming) && (
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <LoadingSpinner className="w-3 h-3" />
                    {stageText}
                  </div>
                )}
                
                {/* Generation Progress - Inline */}
                {showGenerationProgress && (
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <LoadingSpinner className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {generationStatus === 'queued' ? 'Starting generation...' : 'Creating your asset...'}
                        </p>
                        <p className="text-xs text-white/50">This usually takes 10-30 seconds</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${Math.max(generationProgress, 5)}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/40 mt-2 text-center">{generationProgress}% complete</p>
                  </div>
                )}
                
                {/* Generation Result - Inline */}
                {showGenerationResult && generatedAsset && (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckIcon />
                      </div>
                      <span className="text-sm font-medium text-green-400">Asset Generated!</span>
                    </div>
                    
                    {/* Preview */}
                    <div className="relative rounded-lg overflow-hidden border border-white/10 mb-3">
                      <img 
                        src={generatedAsset.url} 
                        alt="Generated asset"
                        className="w-full h-auto max-h-[200px] object-contain bg-black/50"
                      />
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(generatedAsset)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-interactive-500 text-white text-sm font-medium hover:bg-interactive-400 transition-colors"
                      >
                        <DownloadIcon />
                        Download
                      </button>
                    </div>
                    <p className="text-xs text-white/40 mt-2 text-center">
                      Asset saved to your library
                    </p>
                  </div>
                )}
                
                {/* Generation Error - Inline */}
                {showGenerationError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">⚠️</span>
                      <span className="text-sm font-medium text-red-400">Generation Failed</span>
                    </div>
                    <p className="text-xs text-white/60 mb-3">{generationError}</p>
                    <button
                      onClick={handleGenerate}
                      className="w-full px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
              
              {/* Ready to Generate Card */}
              {refinedDescription && isGenerationReady && !isStreaming && !isGenerating && !generatedAsset && (
                <div className="px-4 pb-2">
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckIcon />
                      </div>
                      <span className="text-sm font-medium text-green-400">Ready to generate</span>
                    </div>
                    <p className="text-xs text-white/60">
                      Your vision is clear! Click below to create your {assetInfo?.displayName || 'asset'}.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors"
                  >
                    <SparklesIcon />
                    Generate Now
                  </button>
                </div>
              )}
              
              {/* Input Area - Hide when generating or showing result */}
              {!isGenerating && !generatedAsset && (
                <div className="p-4 border-t border-white/10">
                  <div className="relative">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        isStreaming 
                          ? 'Waiting for response...' 
                          : !sessionId 
                            ? 'Starting session...'
                            : "Describe your vision... (e.g., 'Make it pop with neon effects')"
                      }
                      disabled={isStreaming || !sessionId}
                      className="w-full h-20 px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isStreaming || !sessionId}
                      className="absolute right-3 bottom-3 p-2 rounded-lg bg-purple-500 text-white hover:bg-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isStreaming ? (
                        <LoadingSpinner className="w-4 h-4" />
                      ) : (
                        <SendIcon />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-white/30 mt-2 text-center">
                    Press Enter to send • Coach will help refine your design
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
