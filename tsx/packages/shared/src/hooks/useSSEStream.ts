/**
 * SSE Stream Hook with State Machine Pattern
 * 
 * Provides a robust SSE streaming implementation with:
 * - Explicit state machine (idle → connecting → streaming → reconnecting → complete → error)
 * - Token batching for smooth DOM updates
 * - Partial data preservation on errors
 * - Retry mechanism with exponential backoff
 * - Automatic reconnection via ResilientEventSource
 * - Completion recovery for interrupted streams
 * 
 * @example
 * ```tsx
 * const { state, data, partialData, error, start, retry } = useSSEStream<CoachResponse>({
 *   onToken: (token) => console.log('Token:', token),
 *   onComplete: (data) => console.log('Complete:', data),
 *   batchInterval: 50, // ms between DOM updates
 * });
 * 
 * // Start streaming
 * start('/api/v1/coach/start', { body: { ... } });
 * 
 * // Retry on error
 * if (state === 'error') {
 *   <button onClick={retry}>Retry</button>
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ResilientEventSource, type SSEEvent } from '@aurastream/api-client';

// ============================================================================
// Types
// ============================================================================

/**
 * SSE stream state machine states
 * Added 'reconnecting' state for ResilientEventSource integration
 */
export type SSEState = 'idle' | 'connecting' | 'streaming' | 'reconnecting' | 'complete' | 'error';

/**
 * SSE chunk types matching backend coach.py StreamChunkTypeEnum
 */
export type SSEChunkType = 
  | 'token' 
  | 'intent_ready'
  | 'grounding' 
  | 'grounding_complete' 
  | 'validation' 
  | 'done' 
  | 'error';

/**
 * SSE chunk structure from backend
 */
export interface SSEChunk {
  /** Type of the chunk */
  type: SSEChunkType;
  /** Content of the chunk (token text, error message, etc.) */
  content: string;
  /** Optional metadata (session_id, validation results, etc.) */
  metadata?: Record<string, unknown>;
}

/**
 * Options for the useSSEStream hook
 */
export interface SSEStreamOptions<T> {
  /** Called for each token received (batched) */
  onToken?: (token: string) => void;
  /** Called for each chunk received */
  onChunk?: (chunk: SSEChunk) => void;
  /** Called when streaming completes successfully */
  onComplete?: (data: T) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called when state changes */
  onStateChange?: (state: SSEState) => void;
  /** Called when reconnecting (with attempt number) */
  onReconnect?: (attempt: number) => void;
  /** Milliseconds between DOM updates (default: 50ms) */
  batchInterval?: number;
  /** Authorization token */
  authToken?: string;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Heartbeat timeout in ms (default: 35000) */
  heartbeatTimeout?: number;
}

/**
 * Return type for the useSSEStream hook
 */
export interface SSEStreamResult<T> {
  /** Current state of the stream */
  state: SSEState;
  /** Final data when complete */
  data: T | null;
  /** Accumulated partial data (tokens joined) */
  partialData: string;
  /** Error if state is 'error' */
  error: Error | null;
  /** Current stream ID from server */
  streamId: string | null;
  /** Start a new stream */
  start: (url: string, options?: { body?: unknown }) => void;
  /** Retry the last stream */
  retry: () => void;
  /** Abort the current stream */
  abort: () => void;
  /** Reset to idle state */
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * SSE Stream Hook with State Machine Pattern
 * 
 * Provides robust SSE streaming with state management, token batching,
 * error recovery, retry capabilities, and automatic reconnection via ResilientEventSource.
 * 
 * @param options - Configuration options for the stream
 * @returns SSEStreamResult with state, data, and control functions
 */
export function useSSEStream<T = unknown>(
  options: SSEStreamOptions<T> = {}
): SSEStreamResult<T> {
  const {
    onToken,
    onChunk,
    onComplete,
    onError,
    onStateChange,
    onReconnect,
    batchInterval = 50,
    authToken,
    maxRetries = 3,
    heartbeatTimeout = 35000,
  } = options;

  // State
  const [state, setState] = useState<SSEState>('idle');
  const [data, setData] = useState<T | null>(null);
  const [partialData, setPartialData] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);

  // Refs for batching and cleanup
  const tokenBuffer = useRef<string[]>([]);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resilientSourceRef = useRef<ResilientEventSource | null>(null);
  const lastRequestRef = useRef<{ url: string; body?: unknown } | null>(null);

  // Store callbacks in refs to avoid stale closures
  const onTokenRef = useRef(onToken);
  const onChunkRef = useRef(onChunk);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const onStateChangeRef = useRef(onStateChange);
  const onReconnectRef = useRef(onReconnect);

  // Update refs when callbacks change
  useEffect(() => {
    onTokenRef.current = onToken;
    onChunkRef.current = onChunk;
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
    onStateChangeRef.current = onStateChange;
    onReconnectRef.current = onReconnect;
  }, [onToken, onChunk, onComplete, onError, onStateChange, onReconnect]);

  // Update state and notify
  const updateState = useCallback((newState: SSEState) => {
    setState(newState);
    onStateChangeRef.current?.(newState);
  }, []);

  // Flush token buffer to state
  const flushTokenBuffer = useCallback(() => {
    if (tokenBuffer.current.length > 0) {
      const tokens = tokenBuffer.current.join('');
      tokenBuffer.current = [];
      setPartialData(prev => prev + tokens);
      onTokenRef.current?.(tokens);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      if (resilientSourceRef.current) {
        resilientSourceRef.current.abort();
      }
    };
  }, []);

  // Start streaming with ResilientEventSource
  const start = useCallback((url: string, requestOptions?: { body?: unknown }) => {
    // Save for retry
    lastRequestRef.current = { url, body: requestOptions?.body };

    // Reset state
    setData(null);
    setPartialData('');
    setError(null);
    setStreamId(null);
    tokenBuffer.current = [];

    // Abort any existing stream
    if (resilientSourceRef.current) {
      resilientSourceRef.current.abort();
    }

    updateState('connecting');

    // Create ResilientEventSource
    const source = new ResilientEventSource({
      url,
      method: 'POST',
      body: requestOptions?.body,
      authToken,
      maxRetries,
      heartbeatTimeout,
      onMessage: (event: SSEEvent) => {
        const chunk = event.data as SSEChunk;
        onChunkRef.current?.(chunk);

        if (chunk.type === 'token') {
          // Buffer tokens for batched updates
          tokenBuffer.current.push(chunk.content);

          // Update state to streaming on first token
          setState(prev => prev === 'connecting' || prev === 'reconnecting' ? 'streaming' : prev);

          // Schedule batch flush
          if (!batchTimeoutRef.current) {
            batchTimeoutRef.current = setTimeout(() => {
              flushTokenBuffer();
              batchTimeoutRef.current = null;
            }, batchInterval);
          }
        } else if (chunk.type === 'done') {
          // Flush remaining tokens
          flushTokenBuffer();
          
          // Set final data
          if (chunk.metadata) {
            setData(chunk.metadata as T);
            onCompleteRef.current?.(chunk.metadata as T);
          }
          
          updateState('complete');
        } else if (chunk.type === 'error') {
          const err = new Error(chunk.content);
          setError(err);
          updateState('error');
          onErrorRef.current?.(err);
        }
      },
      onError: (err) => {
        // Preserve partial data on error
        flushTokenBuffer();
        setError(err);
        updateState('error');
        onErrorRef.current?.(err);
      },
      onReconnect: (attempt) => {
        updateState('reconnecting');
        onReconnectRef.current?.(attempt);
      },
      onComplete: () => {
        // Flush any remaining tokens
        flushTokenBuffer();
        // Only update to complete if not already in error state
        setState(prev => prev !== 'error' ? 'complete' : prev);
      },
      onStreamId: (id) => {
        setStreamId(id);
      },
    });

    resilientSourceRef.current = source;
    source.connect().catch((err) => {
      setError(err);
      updateState('error');
      onErrorRef.current?.(err);
    });
  }, [authToken, batchInterval, flushTokenBuffer, updateState, maxRetries, heartbeatTimeout]);

  // Retry last request
  const retry = useCallback(() => {
    if (lastRequestRef.current) {
      start(lastRequestRef.current.url, { body: lastRequestRef.current.body });
    }
  }, [start]);

  // Abort current stream
  const abort = useCallback(() => {
    if (resilientSourceRef.current) {
      resilientSourceRef.current.abort();
    }
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    updateState('idle');
  }, [updateState]);

  // Reset to initial state
  const reset = useCallback(() => {
    abort();
    setData(null);
    setPartialData('');
    setError(null);
    setStreamId(null);
    tokenBuffer.current = [];
    lastRequestRef.current = null;
  }, [abort]);

  return {
    state,
    data,
    partialData,
    error,
    streamId,
    start,
    retry,
    abort,
    reset,
  };
}

export default useSSEStream;
