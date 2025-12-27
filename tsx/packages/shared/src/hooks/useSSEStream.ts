/**
 * SSE Stream Hook with State Machine Pattern
 * 
 * Provides a robust SSE streaming implementation with:
 * - Explicit state machine (idle → connecting → streaming → complete → error)
 * - Token batching for smooth DOM updates
 * - Partial data preservation on errors
 * - Retry mechanism
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

// ============================================================================
// Types
// ============================================================================

/**
 * SSE stream state machine states
 */
export type SSEState = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

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
  /** Milliseconds between DOM updates (default: 50ms) */
  batchInterval?: number;
  /** Authorization token */
  authToken?: string;
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
 * error recovery, and retry capabilities.
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
    batchInterval = 50,
    authToken,
  } = options;

  // State
  const [state, setState] = useState<SSEState>('idle');
  const [data, setData] = useState<T | null>(null);
  const [partialData, setPartialData] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);

  // Refs for batching and cleanup
  const tokenBuffer = useRef<string[]>([]);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<{ url: string; body?: unknown } | null>(null);

  // Store callbacks in refs to avoid stale closures
  const onTokenRef = useRef(onToken);
  const onChunkRef = useRef(onChunk);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const onStateChangeRef = useRef(onStateChange);

  // Update refs when callbacks change
  useEffect(() => {
    onTokenRef.current = onToken;
    onChunkRef.current = onChunk;
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
    onStateChangeRef.current = onStateChange;
  }, [onToken, onChunk, onComplete, onError, onStateChange]);

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Start streaming
  const start = useCallback(async (url: string, requestOptions?: { body?: unknown }) => {
    // Save for retry
    lastRequestRef.current = { url, body: requestOptions?.body };

    // Reset state
    setData(null);
    setPartialData('');
    setError(null);
    tokenBuffer.current = [];

    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    updateState('connecting');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: requestOptions?.body ? JSON.stringify(requestOptions.body) : undefined,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      updateState('streaming');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Flush any remaining tokens
          flushTokenBuffer();
          updateState('complete');
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk: SSEChunk = JSON.parse(line.slice(6));
              onChunkRef.current?.(chunk);

              if (chunk.type === 'token') {
                // Buffer tokens for batched updates
                tokenBuffer.current.push(chunk.content);

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
                throw new Error(chunk.content);
              }
            } catch (parseError) {
              // Log but don't fail on parse errors for non-JSON lines
              if (parseError instanceof SyntaxError) {
                console.warn('Failed to parse SSE chunk:', line, parseError);
              } else {
                // Re-throw actual errors (like the error chunk type)
                throw parseError;
              }
            }
          }
        }
      }
    } catch (err) {
      // Preserve partial data on error
      flushTokenBuffer();

      const error = err instanceof Error ? err : new Error(String(err));
      
      // Don't treat abort as error
      if (error.name === 'AbortError') {
        updateState('idle');
        return;
      }

      setError(error);
      updateState('error');
      onErrorRef.current?.(error);
    }
  }, [authToken, batchInterval, flushTokenBuffer, updateState]);

  // Retry last request
  const retry = useCallback(() => {
    if (lastRequestRef.current) {
      start(lastRequestRef.current.url, { body: lastRequestRef.current.body });
    }
  }, [start]);

  // Abort current stream
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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
    tokenBuffer.current = [];
    lastRequestRef.current = null;
  }, [abort]);

  return {
    state,
    data,
    partialData,
    error,
    start,
    retry,
    abort,
    reset,
  };
}

export default useSSEStream;
