/**
 * Hook for managing Prompt Coach chat state and SSE streaming.
 * 
 * This hook manages Phase 2 of the Prompt Coach flow - the chat interface
 * where users interact with the AI coach to refine their prompts.
 * 
 * @module useCoachChat
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@aurastream/api-client';
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
  timestamp: Date;
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
 */
export type StreamingStage =
  | 'idle'
  | 'connecting'
  | 'thinking'
  | 'streaming'
  | 'validating'
  | 'complete'
  | 'error';

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
  /** Current refined description from coach */
  refinedDescription: string | null;
  /** Whether the intent is ready for generation */
  isGenerationReady: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Any error that occurred */
  error: string | null;
  /** Whether grounding is currently in progress */
  isGrounding: boolean;
  /** What the grounding is searching for */
  groundingQuery: string | null;
}

/** Return type for the useCoachChat hook */
export interface UseCoachChatReturn extends UseCoachChatState {
  /** Start a new coaching session */
  startSession: (request: StartCoachRequest) => Promise<void>;
  /** Send a message to continue the chat */
  sendMessage: (message: string) => Promise<void>;
  /** End the current session */
  endSession: () => Promise<void>;
  /** Clear all messages and reset state */
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
 * Stream SSE events from a POST endpoint.
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
  const [refinedDescription, setRefinedDescription] = useState<string | null>(null);
  const [isGenerationReady, setIsGenerationReady] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isGrounding, setIsGrounding] = useState(false);
  const [groundingQuery, setGroundingQuery] = useState<string | null>(null);

  // Track if we've received the first token (for stage transitions)
  const hasReceivedFirstTokenRef = useRef(false);

  // Refs for abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Token batching refs to reduce re-renders during streaming
  // Instead of updating on every token, we batch updates every 100ms
  const tokenBufferRef = useRef<string>('');
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const accumulatedContentRef = useRef<string>('');

  // Get access token from apiClient (following existing pattern)
  const getAccessToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    // The apiClient stores tokens in memory after login
    return apiClient.getAccessToken();
  }, []);

  /**
   * Flush the token buffer and update the message with accumulated content.
   * This batches multiple token updates into a single state update.
   */
  const flushTokenBuffer = useCallback(() => {
    if (tokenBufferRef.current && currentMessageIdRef.current) {
      // Append buffered tokens to accumulated content
      accumulatedContentRef.current += tokenBufferRef.current;
      const newContent = accumulatedContentRef.current;
      const messageId = currentMessageIdRef.current;
      
      // Clear the buffer
      tokenBufferRef.current = '';
      
      // Update the message with the new accumulated content
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
              
              setError(chunk.content || 'An error occurred');
              setStreamingStage('error');
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
        
        const errorMessage = err instanceof Error ? err.message : 'Stream error occurred';
        setError(errorMessage);
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setError(null);
      setIsStreaming(true);
      setStreamingStage('connecting');

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

      try {
        const accessToken = getAccessToken();
        
        // Transition to thinking after connection is established
        setStreamingStage('thinking');
        
        const stream = streamSSE(
          `${API_BASE_URL}/api/v1/coach/start`,
          request,
          accessToken
        );
        await processStream(stream, assistantMessage.id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start session';
        setError(errorMessage);
        setIsStreaming(false);
        setStreamingStage('error');
        // Remove the placeholder assistant message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessage.id));
      }
    },
    [getAccessToken, processStream]
  );

  /**
   * Send a message to continue the chat.
   */
  const sendMessage = useCallback(
    async (message: string): Promise<void> => {
      if (!sessionId) {
        setError('No active session. Please start a session first.');
        return;
      }

      if (isStreaming) {
        return; // Don't allow sending while streaming
      }

      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setError(null);
      setIsStreaming(true);
      setStreamingStage('connecting');

      // Add user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: message,
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

      try {
        const accessToken = getAccessToken();
        
        // Transition to thinking after connection is established
        setStreamingStage('thinking');
        
        const stream = streamSSE(
          `${API_BASE_URL}/api/v1/coach/sessions/${sessionId}/messages`,
          { message },
          accessToken
        );
        await processStream(stream, assistantMessage.id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        setIsStreaming(false);
        setStreamingStage('error');
        // Remove the placeholder assistant message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessage.id));
      }
    },
    [sessionId, isStreaming, getAccessToken, processStream]
  );

  /**
   * End the current session.
   */
  const endSession = useCallback(async (): Promise<void> => {
    if (!sessionId) {
      return;
    }

    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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
  }, [sessionId, getAccessToken]);

  /**
   * Reset all state.
   */
  const reset = useCallback((): void => {
    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clean up flush interval
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }

    setMessages([]);
    setIsStreaming(false);
    setStreamingStage('idle');
    setSessionId(null);
    setRefinedDescription(null);
    setIsGenerationReady(false);
    setConfidence(0);
    setError(null);
    setIsGrounding(false);
    setGroundingQuery(null);
    hasReceivedFirstTokenRef.current = false;
    tokenBufferRef.current = '';
    accumulatedContentRef.current = '';
    currentMessageIdRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clean up flush interval on unmount
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
    };
  }, []);

  return {
    // State
    messages,
    isStreaming,
    streamingStage,
    sessionId,
    refinedDescription,
    isGenerationReady,
    confidence,
    error,
    isGrounding,
    groundingQuery,
    // Actions
    startSession,
    sendMessage,
    endSession,
    reset,
  };
}

export default useCoachChat;
