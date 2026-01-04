/**
 * Resilient SSE Event Source
 * 
 * Enterprise-grade SSE client with:
 * - Automatic reconnection with exponential backoff
 * - Last-Event-ID tracking for resume
 * - Completion recovery via /api/v1/sse/recovery/{streamId}
 * - Heartbeat timeout detection
 * - X-Stream-ID header parsing
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface SSEEvent {
  /** Unique event ID for resume */
  id?: string;
  /** Event type (token, done, error, etc.) */
  type: string;
  /** Event data payload */
  data: unknown;
}

export interface ResilientSSEOptions {
  /** API endpoint URL */
  url: string;
  /** HTTP method (default: POST) */
  method?: 'GET' | 'POST';
  /** Request body for POST requests */
  body?: unknown;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Called for each SSE event received */
  onMessage: (event: SSEEvent) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called when attempting to reconnect */
  onReconnect?: (attempt: number) => void;
  /** Called when stream completes successfully */
  onComplete?: () => void;
  /** Called when stream ID is received from server */
  onStreamId?: (streamId: string) => void;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in ms (default: 1000) */
  retryDelay?: number;
  /** Maximum retry delay in ms (default: 8000) */
  maxRetryDelay?: number;
  /** Heartbeat timeout in ms (default: 35000) */
  heartbeatTimeout?: number;
  /** Auth token for requests */
  authToken?: string;
  /** Known stream ID for recovery */
  streamId?: string;
}

export type ResilientSSEState = 
  | 'idle' 
  | 'connecting' 
  | 'streaming' 
  | 'reconnecting' 
  | 'recovering'
  | 'complete' 
  | 'error';

// =============================================================================
// ResilientEventSource Class
// =============================================================================

export class ResilientEventSource {
  private options: Required<Omit<ResilientSSEOptions, 'body' | 'streamId' | 'authToken' | 'onStreamId'>> & 
    Pick<ResilientSSEOptions, 'body' | 'streamId' | 'authToken' | 'onStreamId'>;
  private abortController: AbortController | null = null;
  private lastEventId: string | null = null;
  private retryCount = 0;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private streamId: string | null = null;
  private state: ResilientSSEState = 'idle';
  private isAborted = false;

  constructor(options: ResilientSSEOptions) {
    this.options = {
      method: 'POST',
      headers: {},
      maxRetries: 3,
      retryDelay: 1000,
      maxRetryDelay: 8000,
      heartbeatTimeout: 35000,
      onError: () => {},
      onReconnect: () => {},
      onComplete: () => {},
      ...options,
    };
    this.streamId = options.streamId || null;
  }

  /**
   * Get the current stream ID
   */
  getStreamId(): string | null {
    return this.streamId;
  }

  /**
   * Get the current state
   */
  getState(): ResilientSSEState {
    return this.state;
  }

  /**
   * Connect to the SSE stream
   */
  async connect(): Promise<void> {
    this.isAborted = false;
    this.state = 'connecting';

    // If we have a stream ID, check for completion first
    if (this.streamId) {
      const recovered = await this.checkCompletion();
      if (recovered) {
        return;
      }
    }

    await this.establishConnection();
  }

  /**
   * Check if stream has completion data available
   */
  private async checkCompletion(): Promise<boolean> {
    if (!this.streamId) return false;

    this.state = 'recovering';

    try {
      const apiBase = this.getApiBase();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (this.options.authToken) {
        headers['Authorization'] = `Bearer ${this.options.authToken}`;
      }

      const response = await fetch(`${apiBase}/api/v1/sse/recovery/${this.streamId}`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const completion = await response.json();
        
        // Emit the completion event
        this.options.onMessage({
          id: `${this.streamId}:recovery`,
          type: completion.terminal_event_type,
          data: completion.terminal_event_data,
        });

        this.state = 'complete';
        this.options.onComplete?.();
        return true;
      }

      // 404 means no completion data - continue to connect
      return false;
    } catch (error) {
      // Error checking completion - continue to connect
      console.warn('[ResilientSSE] Error checking completion:', error);
      return false;
    }
  }

  /**
   * Establish the SSE connection
   */
  private async establishConnection(): Promise<void> {
    if (this.isAborted) return;

    this.abortController = new AbortController();
    this.state = this.retryCount > 0 ? 'reconnecting' : 'connecting';

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...this.options.headers,
      };

      if (this.options.authToken) {
        headers['Authorization'] = `Bearer ${this.options.authToken}`;
      }

      // Add Last-Event-ID for resume
      if (this.lastEventId) {
        headers['Last-Event-ID'] = this.lastEventId;
      }

      const fetchOptions: RequestInit = {
        method: this.options.method,
        headers,
        signal: this.abortController.signal,
        credentials: 'include',
      };

      if (this.options.method === 'POST' && this.options.body) {
        fetchOptions.body = JSON.stringify(this.options.body);
      }

      const response = await fetch(this.options.url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse X-Stream-ID header
      const streamIdHeader = response.headers.get('X-Stream-ID');
      if (streamIdHeader) {
        this.streamId = streamIdHeader;
        this.options.onStreamId?.(streamIdHeader);
      }

      // Reset retry count on successful connection
      this.retryCount = 0;
      this.state = 'streaming';

      // Start heartbeat timer
      this.resetHeartbeatTimer();

      // Process the stream
      await this.processStream(response);

    } catch (error) {
      if (this.isAborted) return;

      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('[ResilientSSE] Connection error:', error);
      await this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Process the SSE stream
   */
  private async processStream(response: Response): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        if (this.isAborted) break;

        const { done, value } = await reader.read();
        if (done) break;

        // Reset heartbeat timer on data received
        this.resetHeartbeatTimer();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            
            if (dataStr === '[DONE]') {
              this.state = 'complete';
              this.options.onComplete?.();
              return;
            }

            try {
              const data = JSON.parse(dataStr);
              const event: SSEEvent = {
                id: data.id,
                type: data.type,
                data,
              };

              // Track last event ID
              if (event.id) {
                this.lastEventId = event.id;
              }

              // Emit the event
              this.options.onMessage(event);

              // Check for terminal events
              if (this.isTerminalEvent(event.type)) {
                this.state = 'complete';
                this.options.onComplete?.();
                return;
              }
            } catch (parseError) {
              console.warn('[ResilientSSE] Failed to parse SSE data:', dataStr);
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith('data: ')) {
        const dataStr = buffer.slice(6).trim();
        if (dataStr && dataStr !== '[DONE]') {
          try {
            const data = JSON.parse(dataStr);
            this.options.onMessage({
              id: data.id,
              type: data.type,
              data,
            });
          } catch {
            // Ignore parse errors for incomplete data
          }
        }
      }

      // Stream ended normally
      this.state = 'complete';
      this.options.onComplete?.();

    } finally {
      reader.releaseLock();
      this.clearHeartbeatTimer();
    }
  }

  /**
   * Check if an event type is terminal
   */
  private isTerminalEvent(type: string): boolean {
    const terminalTypes = ['done', 'error', 'completed', 'failed', 'timeout'];
    return terminalTypes.includes(type);
  }

  /**
   * Handle connection errors with retry logic
   */
  private async handleError(error: Error): Promise<void> {
    this.clearHeartbeatTimer();

    if (this.retryCount >= this.options.maxRetries) {
      this.state = 'error';
      this.options.onError?.(error);
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.options.retryDelay * Math.pow(2, this.retryCount),
      this.options.maxRetryDelay
    );

    this.retryCount++;
    this.state = 'reconnecting';
    this.options.onReconnect?.(this.retryCount);

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay));

    if (!this.isAborted) {
      await this.establishConnection();
    }
  }

  /**
   * Reset the heartbeat timer
   */
  private resetHeartbeatTimer(): void {
    this.clearHeartbeatTimer();
    
    this.heartbeatTimer = setTimeout(() => {
      console.warn('[ResilientSSE] Heartbeat timeout - attempting reconnect');
      this.handleError(new Error('Heartbeat timeout'));
    }, this.options.heartbeatTimeout);
  }

  /**
   * Clear the heartbeat timer
   */
  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Get API base URL
   */
  private getApiBase(): string {
    // Extract base URL from the options URL
    try {
      const url = new URL(this.options.url);
      return `${url.protocol}//${url.host}`;
    } catch {
      // Relative URL - use current origin
      if (typeof window !== 'undefined') {
        return window.location.origin;
      }
      return '';
    }
  }

  /**
   * Abort the connection
   */
  abort(): void {
    this.isAborted = true;
    this.clearHeartbeatTimer();
    this.abortController?.abort();
    this.abortController = null;
    this.state = 'idle';
  }

  /**
   * Reset state for a new connection
   */
  reset(): void {
    this.abort();
    this.lastEventId = null;
    this.retryCount = 0;
    this.streamId = null;
  }
}

// =============================================================================
// React Hook
// =============================================================================

export interface UseResilientSSEOptions extends Omit<ResilientSSEOptions, 'onMessage'> {
  /** Called for each SSE event */
  onMessage?: (event: SSEEvent) => void;
}

export interface UseResilientSSEResult {
  /** Current connection state */
  state: ResilientSSEState;
  /** Error if state is 'error' */
  error: Error | null;
  /** Current stream ID */
  streamId: string | null;
  /** Start the connection */
  connect: () => void;
  /** Abort the connection */
  abort: () => void;
  /** Reset and prepare for new connection */
  reset: () => void;
}

/**
 * React hook for resilient SSE connections
 */
export function useResilientSSE(options: UseResilientSSEOptions): UseResilientSSEResult {
  const [state, setState] = useState<ResilientSSEState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const sourceRef = useRef<ResilientEventSource | null>(null);
  const optionsRef = useRef(options);
  
  // Update options ref
  optionsRef.current = options;

  const connect = useCallback(() => {
    setError(null);
    setState('connecting');

    const source = new ResilientEventSource({
      ...optionsRef.current,
      onMessage: (event) => {
        optionsRef.current.onMessage?.(event);
      },
      onError: (err) => {
        setError(err);
        setState('error');
        optionsRef.current.onError?.(err);
      },
      onReconnect: (attempt) => {
        setState('reconnecting');
        optionsRef.current.onReconnect?.(attempt);
      },
      onComplete: () => {
        setState('complete');
        optionsRef.current.onComplete?.();
      },
      onStreamId: (id) => {
        setStreamId(id);
        optionsRef.current.onStreamId?.(id);
      },
    });

    sourceRef.current = source;
    source.connect().catch((err) => {
      setError(err);
      setState('error');
    });
  }, []);

  const abort = useCallback(() => {
    sourceRef.current?.abort();
    setState('idle');
  }, []);

  const reset = useCallback(() => {
    sourceRef.current?.reset();
    setError(null);
    setStreamId(null);
    setState('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sourceRef.current?.abort();
    };
  }, []);

  return {
    state,
    error,
    streamId,
    connect,
    abort,
    reset,
  };
}

export default ResilientEventSource;
