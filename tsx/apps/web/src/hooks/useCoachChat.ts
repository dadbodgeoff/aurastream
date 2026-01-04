/**
 * Hook for managing Prompt Coach chat state and SSE streaming.
 * 
 * This hook manages Phase 2 of the Prompt Coach flow - the chat interface
 * where users interact with the AI coach to refine their prompts.
 * 
 * Enterprise UX Features:
 * - Connection loss recovery with auto-reconnect via ResilientEventSource
 * - Streaming progress feedback (Thinking, Searching, Responding, Reconnecting)
 * - Session timeout recovery
 * - Rate limit handling with countdown
 * - Completion recovery for interrupted streams
 * 
 * @module useCoachChat
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient, ResilientEventSource, type SSEEvent } from '@aurastream/api-client';
import type { StartCoachRequest } from './useCoachContext';

// ============================================================================
// Type Definitions
// ============================================================================

/** SSE stream chunk types */
export type StreamChunkType =
  | 'token'
  | 'intent_ready'
  | 'grounding'
  | 'grounding_complete'
  | 'done'
  | 'error'
  | 'redirect';

/** Intent status from the coach */
export interface IntentStatus {
  isReady: boolean;
  confidence: number;
  refinedDescription: string;
  turn?: number;
}

/** Validation issue from the coach (legacy support) */
export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion?: string;
}

/** Validation result attached to messages (legacy support) */
export interface ValidationResult {
  isValid: boolean;
  isGenerationReady: boolean;
  qualityScore: number;
  issues: ValidationIssue[];
  fixedPrompt?: string;
  promptVersion?: number;
}

/** Metadata for stream chunks */
export interface StreamChunkMetadata {
  // For intent_ready
  is_ready?: boolean;
  confidence?: number;
  refined_description?: string;
  turn?: number;
  // For done
  session_id?: string;
  total_tokens?: number;
  turns_used?: number;
  turns_remaining?: number;
  // For grounding
  searching?: string;
  context?: string;
  // Legacy validation support
  is_valid?: boolean;
  is_generation_ready?: boolean;
  quality_score?: number;
  issues?: Array<{ severity: string; code: string; message: string; suggestion?: string }>;
  prompt_version?: number;
}

/** Single chunk in SSE streaming response */
export interface StreamChunk {
  type: StreamChunkType;
  content: string;
  metadata?: StreamChunkMetadata;
}

/** Chat message in the conversation */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  intentStatus?: IntentStatus;
  groundingUsed?: boolean;
  /** Reference assets attached to this message (user messages only) */
  referenceAssets?: ReferenceAsset[];
  timestamp: Date;
}

/** Reference asset from user's media library */
export interface ReferenceAsset {
  assetId: string;
  displayName: string;
  assetType: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
}

/**
 * Streaming stage for enhanced UX feedback
 * 
 * State transitions:
 * - On start: 'idle' → 'connecting' → 'thinking'
 * - On first token: 'thinking' → 'streaming'
 * - On validation event: 'streaming' → 'validating'
 * - On done: 'validating' → 'complete'
 * - On error: any → 'error'
 * - On reconnect: 'error' → 'reconnecting' → 'streaming'
 * - On heartbeat timeout: 'streaming' → 'reconnecting'
 */
export type StreamingStage =
  | 'idle'
  | 'connecting'
  | 'thinking'
  | 'streaming'
  | 'validating'
  | 'complete'
  | 'error'
  | 'reconnecting';

/** Error codes for coach-specific errors */
export type CoachErrorCode =
  | 'COACH_SESSION_EXPIRED'
  | 'COACH_RATE_LIMIT'
  | 'COACH_TIER_REQUIRED'
  | 'COACH_CONNECTION_LOST'
  | 'COACH_GROUNDING_FAILED'
  | 'UNKNOWN_ERROR';

/** Structured error with code and retry info */
export interface CoachError {
  code: CoachErrorCode;
  message: string;
  retryAfter?: number; // seconds until retry is allowed
  canRetry: boolean;
}

/** State returned by the useCoachChat hook */
export interface UseCoachChatState {
  /** All messages in the conversation */
  messages: ChatMessage[];
  /** Whether currently streaming a response */
  isStreaming: boolean;
  /** Current streaming stage for enhanced UX */
  streamingStage: StreamingStage;
  /** Current session ID (null if not started) */
  sessionId: string | null;
  /** Current stream ID for recovery (null if not streaming) */
  streamId: string | null;
  /** Current refined description from coach */
  refinedDescription: string | null;
  /** Whether the intent is ready for generation */
  isGenerationReady: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Any error that occurred (structured) */
  error: CoachError | null;
  /** Legacy error string for backward compatibility */
  errorMessage: string | null;
  /** Whether grounding is currently in progress */
  isGrounding: boolean;
  /** What the grounding is searching for */
  groundingQuery: string | null;
  /** Whether session has timed out */
  isSessionExpired: boolean;
  /** Session start time for timeout tracking */
  sessionStartTime: Date | null;
  /** Connection retry count */
  retryCount: number;
}

/** Return type for the useCoachChat hook */
export interface UseCoachChatReturn extends UseCoachChatState {
  /** Start a new coaching session */
  startSession: (request: StartCoachRequest) => Promise<void>;
  /** Send a message to continue the chat, optionally with reference assets */
  sendMessage: (message: string, referenceAssets?: ReferenceAsset[]) => Promise<void>;
  /** End the current session */
  endSession: () => Promise<void>;
  /** Clear all messages and reset state */
  reset: () => void;
  /** Retry the last failed operation */
  retry: () => Promise<void>;
  /** Clear the current error */
  clearError: () => void;
  /** Start a new session after timeout */
  startNewSession: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for messages.
 */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Parse error response to extract error code and details.
 */
function parseErrorResponse(error: unknown, status?: number): CoachError {
  // Check for rate limit (429)
  if (status === 429) {
    const retryAfter = typeof error === 'object' && error !== null 
      ? (error as Record<string, unknown>).retry_after as number 
      : 60;
    return {
      code: 'COACH_RATE_LIMIT',
      message: 'You\'ve sent too many messages. Please wait before sending another.',
      retryAfter: retryAfter || 60,
      canRetry: true,
    };
  }

  // Check for session expired (401 or specific error)
  if (status === 401) {
    return {
      code: 'COACH_SESSION_EXPIRED',
      message: 'Your coaching session has timed out.',
      canRetry: false,
    };
  }

  // Check for tier required (403)
  if (status === 403) {
    return {
      code: 'COACH_TIER_REQUIRED',
      message: 'The Prompt Coach is available for Studio tier subscribers.',
      canRetry: false,
    };
  }

  // Parse error message for specific codes
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'string' 
      ? error 
      : 'An error occurred';

  if (errorMessage.toLowerCase().includes('session') && errorMessage.toLowerCase().includes('expired')) {
    return {
      code: 'COACH_SESSION_EXPIRED',
      message: errorMessage,
      canRetry: false,
    };
  }

  if (errorMessage.toLowerCase().includes('rate') || errorMessage.toLowerCase().includes('limit')) {
    return {
      code: 'COACH_RATE_LIMIT',
      message: errorMessage,
      retryAfter: 60,
      canRetry: true,
    };
  }

  if (errorMessage.toLowerCase().includes('grounding') || errorMessage.toLowerCase().includes('search')) {
    return {
      code: 'COACH_GROUNDING_FAILED',
      message: 'Web search failed. Continuing without game context.',
      canRetry: true,
    };
  }

  if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
    return {
      code: 'COACH_CONNECTION_LOST',
      message: 'Connection lost. Attempting to reconnect...',
      canRetry: true,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: errorMessage,
    canRetry: true,
  };
}

/**
 * Stream SSE events from a POST endpoint using ResilientEventSource.
 * Returns a controller object for managing the stream.
 */
interface StreamController {
  /** Abort the stream */
  abort: () => void;
  /** Get the stream ID */
  getStreamId: () => string | null;
}

function createResilientStream(
  url: string,
  body: object,
  accessToken: string | null,
  callbacks: {
    onChunk: (chunk: StreamChunk) => void;
    onError: (error: Error, status?: number) => void;
    onReconnect: (attempt: number) => void;
    onComplete: () => void;
    onStreamId: (streamId: string) => void;
  }
): StreamController {
  const source = new ResilientEventSource({
    url,
    method: 'POST',
    body,
    authToken: accessToken || undefined,
    maxRetries: MAX_RETRY_ATTEMPTS,
    heartbeatTimeout: 35000,
    onMessage: (event: SSEEvent) => {
      const chunk = event.data as StreamChunk;
      callbacks.onChunk(chunk);
    },
    onError: (error) => {
      callbacks.onError(error);
    },
    onReconnect: (attempt) => {
      callbacks.onReconnect(attempt);
    },
    onComplete: () => {
      callbacks.onComplete();
    },
    onStreamId: (streamId) => {
      callbacks.onStreamId(streamId);
    },
  });

  source.connect().catch((err) => {
    callbacks.onError(err);
  });

  return {
    abort: () => source.abort(),
    getStreamId: () => source.getStreamId(),
  };
}

/**
 * Stream SSE events from a POST endpoint.
 * @deprecated Use createResilientStream for new code
 */
async function* streamSSE(
  url: string,
  body: object,
  accessToken: string | null
): AsyncGenerator<StreamChunk> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') {
            return;
          }
          try {
            const data = JSON.parse(dataStr);
            yield data as StreamChunk;
          } catch {
            // Skip malformed JSON
            console.warn('Failed to parse SSE data:', dataStr);
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.startsWith('data: ')) {
      const dataStr = buffer.slice(6).trim();
      if (dataStr && dataStr !== '[DONE]') {
        try {
          const data = JSON.parse(dataStr);
          yield data as StreamChunk;
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing Creative Director Coach chat state and SSE streaming.
 * 
 * Provides state management for the chat interface, including:
 * - Message list with streaming support
 * - Session management (start, continue, end)
 * - Intent readiness tracking (NOT prompt exposure)
 * - Refined description for generation
 * 
 * @example
 * ```tsx
 * const {
 *   messages,
 *   isStreaming,
 *   sessionId,
 *   refinedDescription,
 *   isGenerationReady,
 *   startSession,
 *   sendMessage,
 *   endSession,
 * } = useCoachChat();
 * 
 * // Start a new session
 * await startSession(contextRequest);
 * 
 * // Send a refinement message
 * await sendMessage("Add sparkles and make it more energetic");
 * ```
 */
export function useCoachChat(): UseCoachChatReturn {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStage, setStreamingStage] = useState<StreamingStage>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [refinedDescription, setRefinedDescription] = useState<string | null>(null);
  const [isGenerationReady, setIsGenerationReady] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<CoachError | null>(null);
  const [isGrounding, setIsGrounding] = useState(false);
  const [groundingQuery, setGroundingQuery] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Track if we've received the first token (for stage transitions)
  const hasReceivedFirstTokenRef = useRef(false);

  // Refs for stream controller
  const streamControllerRef = useRef<StreamController | null>(null);
  
  // Ref for last request (for retry functionality)
  const lastRequestRef = useRef<{ 
    type: 'start' | 'message'; 
    data: StartCoachRequest | string;
    referenceAssets?: ReferenceAsset[];
  } | null>(null);

  // Token batching refs to reduce re-renders during streaming
  // Instead of updating on every token, we batch updates every 100ms
  const tokenBufferRef = useRef<string>('');
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const accumulatedContentRef = useRef<string>('');
  
  // Session timeout check interval
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Legacy error string for backward compatibility
  const errorMessage = error?.message ?? null;

  // Get access token from apiClient (following existing pattern)
  const getAccessToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    // The apiClient stores tokens in memory after login
    return apiClient.getAccessToken();
  }, []);

  /**
   * Clear the current error.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check if session has timed out.
   */
  const checkSessionTimeout = useCallback(() => {
    if (sessionStartTime) {
      const elapsed = Date.now() - sessionStartTime.getTime();
      if (elapsed >= SESSION_TIMEOUT_MS) {
        setIsSessionExpired(true);
        setError({
          code: 'COACH_SESSION_EXPIRED',
          message: 'Your coaching session has timed out.',
          canRetry: false,
        });
        // Clear the timeout interval
        if (sessionTimeoutRef.current) {
          clearInterval(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
      }
    }
  }, [sessionStartTime]);

  // Set up session timeout checking
  useEffect(() => {
    if (sessionId && sessionStartTime && !isSessionExpired) {
      // Check every minute
      sessionTimeoutRef.current = setInterval(checkSessionTimeout, 60 * 1000);
      return () => {
        if (sessionTimeoutRef.current) {
          clearInterval(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
      };
    }
  }, [sessionId, sessionStartTime, isSessionExpired, checkSessionTimeout]);

  /**
   * Flush the token buffer and update the message with accumulated content.
   * This batches multiple token updates into a single state update.
   * 
   * Note: accumulatedContentRef is already updated when tokens arrive in onChunk,
   * so we only need to clear the buffer and trigger a re-render with the current content.
   */
  const flushTokenBuffer = useCallback(() => {
    if (tokenBufferRef.current && currentMessageIdRef.current) {
      const newContent = accumulatedContentRef.current;
      const messageId = currentMessageIdRef.current;
      
      // Clear the buffer (content already in accumulatedContentRef)
      tokenBufferRef.current = '';
      
      // Update the message with the current accumulated content
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: newContent, isStreaming: true }
            : msg
        )
      );
    }
  }, []);

  /**
   * Start the flush interval for batching token updates.
   * The interval flushes accumulated tokens every 100ms.
   */
  const startFlushInterval = useCallback(() => {
    if (!flushIntervalRef.current) {
      flushIntervalRef.current = setInterval(() => {
        flushTokenBuffer();
      }, 100);
    }
  }, [flushTokenBuffer]);

  /**
   * Stop the flush interval and flush any remaining tokens.
   */
  const stopFlushInterval = useCallback(() => {
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
    // Flush any remaining tokens in the buffer
    flushTokenBuffer();
  }, [flushTokenBuffer]);

  /**
   * Process SSE stream and update messages.
   */
  const processStream = useCallback(
    async (
      stream: AsyncGenerator<StreamChunk>,
      assistantMessageId: string
    ): Promise<void> => {
      let accumulatedContent = '';
      let intentStatus: IntentStatus | undefined;
      let groundingUsed = false;
      
      // Reset first token tracking for this stream
      hasReceivedFirstTokenRef.current = false;
      
      // Initialize batching refs for this stream
      tokenBufferRef.current = '';
      accumulatedContentRef.current = '';
      currentMessageIdRef.current = assistantMessageId;

      try {
        for await (const chunk of stream) {
          switch (chunk.type) {
            case 'token':
              // Transition to 'streaming' on first token
              if (!hasReceivedFirstTokenRef.current) {
                hasReceivedFirstTokenRef.current = true;
                setStreamingStage('streaming');
                // Start the flush interval for batching
                startFlushInterval();
              }
              
              // Add token to buffer instead of updating state directly
              // This batches updates to reduce re-renders
              tokenBufferRef.current += chunk.content;
              accumulatedContent += chunk.content;
              break;

            case 'intent_ready':
              // Flush buffer before handling intent_ready to ensure content is up to date
              stopFlushInterval();
              
              if (chunk.metadata) {
                intentStatus = {
                  isReady: chunk.metadata.is_ready ?? false,
                  confidence: chunk.metadata.confidence ?? 0,
                  refinedDescription: chunk.metadata.refined_description ?? '',
                  turn: chunk.metadata.turn,
                };
                setIsGenerationReady(intentStatus.isReady);
                setConfidence(intentStatus.confidence);
                if (intentStatus.refinedDescription) {
                  setRefinedDescription(intentStatus.refinedDescription);
                }
                // Transition to 'validating' when intent is being evaluated
                setStreamingStage('validating');
              }
              break;

            case 'grounding':
              // Flush buffer before handling grounding state change
              stopFlushInterval();
              
              setIsGrounding(true);
              setGroundingQuery(chunk.metadata?.searching || null);
              groundingUsed = true;
              break;

            case 'grounding_complete':
              setIsGrounding(false);
              setGroundingQuery(null);
              // Restart flush interval if we're still streaming
              if (hasReceivedFirstTokenRef.current) {
                startFlushInterval();
              }
              break;

            case 'done':
              // Flush any remaining tokens before finalizing
              stopFlushInterval();
              
              if (chunk.metadata?.session_id) {
                setSessionId(chunk.metadata.session_id);
              }
              // Transition to 'complete' on done
              setStreamingStage('complete');
              break;

            case 'error':
              // Flush any remaining tokens before handling error
              stopFlushInterval();
              
              const errorInfo = parseErrorResponse(chunk.content || 'An error occurred');
              setError(errorInfo);
              setStreamingStage('error');
              
              // For grounding errors, we can continue - just log and move on
              if (errorInfo.code === 'COACH_GROUNDING_FAILED') {
                // Don't break the stream for grounding errors
                console.warn('Grounding failed, continuing without game context');
              }
              break;

            case 'redirect':
              // Transition to 'streaming' on first redirect token too
              if (!hasReceivedFirstTokenRef.current) {
                hasReceivedFirstTokenRef.current = true;
                setStreamingStage('streaming');
                // Start the flush interval for batching
                startFlushInterval();
              }
              
              // Add redirect content to buffer (same batching as tokens)
              tokenBufferRef.current += chunk.content;
              accumulatedContent += chunk.content;
              break;
          }
        }

        // Ensure flush interval is stopped and buffer is flushed
        stopFlushInterval();

        // Finalize the message with the complete accumulated content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: accumulatedContent,
                  isStreaming: false,
                  intentStatus,
                  groundingUsed,
                }
              : msg
          )
        );
        
        // Ensure we're in complete state if we finished without explicit done
        if (streamingStage !== 'error') {
          setStreamingStage('complete');
        }
      } catch (err) {
        // Stop flush interval on error
        stopFlushInterval();
        
        const errorInfo = parseErrorResponse(err);
        setError(errorInfo);
        setStreamingStage('error');
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false }
              : msg
          )
        );
      } finally {
        setIsStreaming(false);
        setIsGrounding(false);
        setGroundingQuery(null);
        // Clean up refs
        currentMessageIdRef.current = null;
      }
    },
    [streamingStage, startFlushInterval, stopFlushInterval]
  );

  /**
   * Start a new coaching session.
   */
  const startSession = useCallback(
    async (request: StartCoachRequest): Promise<void> => {
      // Cancel any existing stream
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
      }

      // Store request for retry
      lastRequestRef.current = { type: 'start', data: request };

      setError(null);
      setIsStreaming(true);
      setStreamingStage('connecting');
      setIsSessionExpired(false);
      setRetryCount(0);
      setStreamId(null);

      // Add user message (the initial description)
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: request.description,
        timestamp: new Date(),
      };

      // Add placeholder assistant message
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: new Date(),
      };

      setMessages([userMessage, assistantMessage]);

      // Initialize batching refs for this stream
      hasReceivedFirstTokenRef.current = false;
      tokenBufferRef.current = '';
      accumulatedContentRef.current = '';
      currentMessageIdRef.current = assistantMessage.id;

      const accessToken = getAccessToken();
      
      // Transition to thinking after connection is established
      setStreamingStage('thinking');
      
      // Create resilient stream with callbacks
      streamControllerRef.current = createResilientStream(
        `${API_BASE_URL}/api/v1/coach/start`,
        request,
        accessToken,
        {
          onChunk: (chunk) => {
            switch (chunk.type) {
              case 'token':
              case 'redirect':
                // Transition to 'streaming' on first token
                if (!hasReceivedFirstTokenRef.current) {
                  hasReceivedFirstTokenRef.current = true;
                  setStreamingStage('streaming');
                  startFlushInterval();
                }
                tokenBufferRef.current += chunk.content;
                accumulatedContentRef.current += chunk.content;
                break;

              case 'intent_ready':
                stopFlushInterval();
                if (chunk.metadata) {
                  const intentStatus: IntentStatus = {
                    isReady: chunk.metadata.is_ready ?? false,
                    confidence: chunk.metadata.confidence ?? 0,
                    refinedDescription: chunk.metadata.refined_description ?? '',
                    turn: chunk.metadata.turn,
                  };
                  setIsGenerationReady(intentStatus.isReady);
                  setConfidence(intentStatus.confidence);
                  if (intentStatus.refinedDescription) {
                    setRefinedDescription(intentStatus.refinedDescription);
                  }
                  setStreamingStage('validating');
                  
                  // Update message with intent status
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessage.id
                        ? { ...msg, intentStatus }
                        : msg
                    )
                  );
                }
                break;

              case 'grounding':
                stopFlushInterval();
                setIsGrounding(true);
                setGroundingQuery(chunk.metadata?.searching || null);
                break;

              case 'grounding_complete':
                setIsGrounding(false);
                setGroundingQuery(null);
                if (hasReceivedFirstTokenRef.current) {
                  startFlushInterval();
                }
                break;

              case 'done':
                stopFlushInterval();
                if (chunk.metadata?.session_id) {
                  setSessionId(chunk.metadata.session_id);
                }
                setStreamingStage('complete');
                setIsStreaming(false);
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: accumulatedContentRef.current, isStreaming: false }
                      : msg
                  )
                );
                setSessionStartTime(new Date());
                break;

              case 'error':
                stopFlushInterval();
                const errorInfo = parseErrorResponse(chunk.content || 'An error occurred');
                setError(errorInfo);
                setStreamingStage('error');
                setIsStreaming(false);
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                );
                break;
            }
          },
          onError: (err) => {
            stopFlushInterval();
            const errorInfo = parseErrorResponse(err);
            setError(errorInfo);
            setStreamingStage('error');
            setIsStreaming(false);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            );
          },
          onReconnect: (attempt) => {
            setStreamingStage('reconnecting');
            setRetryCount(attempt);
          },
          onComplete: () => {
            stopFlushInterval();
            setIsStreaming(false);
            setIsGrounding(false);
            setGroundingQuery(null);
          },
          onStreamId: (id) => {
            setStreamId(id);
          },
        }
      );
    },
    [getAccessToken, startFlushInterval, stopFlushInterval]
  );

  /**
   * Send a message to continue the chat, optionally with reference assets.
   */
  const sendMessage = useCallback(
    async (message: string, referenceAssets?: ReferenceAsset[]): Promise<void> => {
      if (!sessionId) {
        setError({
          code: 'COACH_SESSION_EXPIRED',
          message: 'No active session. Please start a session first.',
          canRetry: false,
        });
        return;
      }

      if (isStreaming) {
        return; // Don't allow sending while streaming
      }
      
      // Check if session has expired
      if (isSessionExpired) {
        setError({
          code: 'COACH_SESSION_EXPIRED',
          message: 'Your coaching session has timed out. Please start a new session.',
          canRetry: false,
        });
        return;
      }

      // Cancel any existing stream
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
      }

      // Store message for retry (include reference assets)
      lastRequestRef.current = { type: 'message', data: message, referenceAssets };

      setError(null);
      setIsStreaming(true);
      setStreamingStage('connecting');
      setStreamId(null);

      // Add user message with reference assets
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: message,
        referenceAssets,
        timestamp: new Date(),
      };

      // Add placeholder assistant message
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Initialize batching refs for this stream
      hasReceivedFirstTokenRef.current = false;
      tokenBufferRef.current = '';
      accumulatedContentRef.current = '';
      currentMessageIdRef.current = assistantMessage.id;

      const accessToken = getAccessToken();
      
      // Transition to thinking after connection is established
      setStreamingStage('thinking');
      
      // Build request body with optional reference assets
      const requestBody: { message: string; reference_assets?: Array<{
        asset_id: string;
        display_name: string;
        asset_type: string;
        url: string;
        description?: string;
      }> } = { message };
      
      if (referenceAssets && referenceAssets.length > 0) {
        requestBody.reference_assets = referenceAssets.map(asset => ({
          asset_id: asset.assetId,
          display_name: asset.displayName,
          asset_type: asset.assetType,
          url: asset.url,
          description: asset.description,
        }));
      }
      
      // Create resilient stream with callbacks
      streamControllerRef.current = createResilientStream(
        `${API_BASE_URL}/api/v1/coach/sessions/${sessionId}/messages`,
        requestBody,
        accessToken,
        {
          onChunk: (chunk) => {
            switch (chunk.type) {
              case 'token':
              case 'redirect':
                if (!hasReceivedFirstTokenRef.current) {
                  hasReceivedFirstTokenRef.current = true;
                  setStreamingStage('streaming');
                  startFlushInterval();
                }
                tokenBufferRef.current += chunk.content;
                accumulatedContentRef.current += chunk.content;
                break;

              case 'intent_ready':
                stopFlushInterval();
                if (chunk.metadata) {
                  const intentStatus: IntentStatus = {
                    isReady: chunk.metadata.is_ready ?? false,
                    confidence: chunk.metadata.confidence ?? 0,
                    refinedDescription: chunk.metadata.refined_description ?? '',
                    turn: chunk.metadata.turn,
                  };
                  setIsGenerationReady(intentStatus.isReady);
                  setConfidence(intentStatus.confidence);
                  if (intentStatus.refinedDescription) {
                    setRefinedDescription(intentStatus.refinedDescription);
                  }
                  setStreamingStage('validating');
                  
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessage.id
                        ? { ...msg, intentStatus }
                        : msg
                    )
                  );
                }
                break;

              case 'grounding':
                stopFlushInterval();
                setIsGrounding(true);
                setGroundingQuery(chunk.metadata?.searching || null);
                break;

              case 'grounding_complete':
                setIsGrounding(false);
                setGroundingQuery(null);
                if (hasReceivedFirstTokenRef.current) {
                  startFlushInterval();
                }
                break;

              case 'done':
                stopFlushInterval();
                setStreamingStage('complete');
                setIsStreaming(false);
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: accumulatedContentRef.current, isStreaming: false }
                      : msg
                  )
                );
                break;

              case 'error':
                stopFlushInterval();
                const errorInfo = parseErrorResponse(chunk.content || 'An error occurred');
                setError(errorInfo);
                setStreamingStage('error');
                setIsStreaming(false);
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                );
                break;
            }
          },
          onError: (err) => {
            stopFlushInterval();
            const errorInfo = parseErrorResponse(err);
            setError(errorInfo);
            setStreamingStage('error');
            setIsStreaming(false);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            );
          },
          onReconnect: (attempt) => {
            setStreamingStage('reconnecting');
            setRetryCount(attempt);
          },
          onComplete: () => {
            stopFlushInterval();
            setIsStreaming(false);
            setIsGrounding(false);
            setGroundingQuery(null);
          },
          onStreamId: (id) => {
            setStreamId(id);
          },
        }
      );
    },
    [sessionId, isStreaming, isSessionExpired, getAccessToken, startFlushInterval, stopFlushInterval]
  );

  /**
   * End the current session.
   */
  const endSession = useCallback(async (): Promise<void> => {
    if (!sessionId) {
      return;
    }

    // Cancel any existing stream
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
    }

    try {
      const accessToken = getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      await fetch(`${API_BASE_URL}/api/v1/coach/sessions/${sessionId}/end`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch {
      // Ignore errors when ending session
    }

    setSessionId(null);
    setStreamId(null);
  }, [sessionId, getAccessToken]);

  /**
   * Reset all state.
   */
  const reset = useCallback((): void => {
    // Cancel any existing stream
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
    }
    
    // Clean up flush interval
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
    
    // Clean up session timeout interval
    if (sessionTimeoutRef.current) {
      clearInterval(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }

    setMessages([]);
    setIsStreaming(false);
    setStreamingStage('idle');
    setSessionId(null);
    setStreamId(null);
    setRefinedDescription(null);
    setIsGenerationReady(false);
    setConfidence(0);
    setError(null);
    setIsGrounding(false);
    setGroundingQuery(null);
    setIsSessionExpired(false);
    setSessionStartTime(null);
    setRetryCount(0);
    hasReceivedFirstTokenRef.current = false;
    tokenBufferRef.current = '';
    accumulatedContentRef.current = '';
    currentMessageIdRef.current = null;
    lastRequestRef.current = null;
  }, []);

  /**
   * Retry the last failed operation with exponential backoff.
   */
  const retry = useCallback(async (): Promise<void> => {
    if (!lastRequestRef.current || !error?.canRetry) {
      return;
    }

    // Check retry count
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      setError({
        code: error.code,
        message: 'Maximum retry attempts reached. Please try again later.',
        canRetry: false,
      });
      return;
    }

    // Check rate limit countdown
    if (error.code === 'COACH_RATE_LIMIT' && error.retryAfter && error.retryAfter > 0) {
      return; // Don't retry until countdown is complete
    }

    setStreamingStage('reconnecting');
    setRetryCount((prev) => prev + 1);

    // Exponential backoff delay
    const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
    await new Promise((resolve) => setTimeout(resolve, delay));

    const lastRequest = lastRequestRef.current;
    if (lastRequest.type === 'start') {
      await startSession(lastRequest.data as StartCoachRequest);
    } else {
      await sendMessage(lastRequest.data as string, lastRequest.referenceAssets);
    }
  }, [error, retryCount, startSession, sendMessage]);

  /**
   * Start a new session after timeout (clears state and allows fresh start).
   */
  const startNewSession = useCallback((): void => {
    reset();
  }, [reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
      }
      // Clean up flush interval on unmount
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
      // Clean up session timeout interval on unmount
      if (sessionTimeoutRef.current) {
        clearInterval(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    // State
    messages,
    isStreaming,
    streamingStage,
    sessionId,
    streamId,
    refinedDescription,
    isGenerationReady,
    confidence,
    error,
    errorMessage, // Legacy compatibility
    isGrounding,
    groundingQuery,
    isSessionExpired,
    sessionStartTime,
    retryCount,
    // Actions
    startSession,
    sendMessage,
    endSession,
    reset,
    retry,
    clearError,
    startNewSession,
  };
}

export default useCoachChat;
