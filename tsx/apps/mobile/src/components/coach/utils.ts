/**
 * Utility functions for Prompt Coach.
 * @module coach/utils
 */

import type { StreamChunk, StreamChunkMetadata, ValidationResult } from './types';

/**
 * Generate a unique message ID.
 */
export function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract prompt from coach response content.
 * Looks for ```prompt blocks in the response.
 */
export function extractPromptFromContent(content: string): string | null {
  const promptMatch = content.match(/```prompt\n?([\s\S]*?)```/);
  return promptMatch ? promptMatch[1].trim() : null;
}

/**
 * Parse validation result from stream metadata.
 * Converts snake_case backend fields to camelCase frontend fields.
 */
export function parseValidationResult(metadata: StreamChunkMetadata): ValidationResult {
  return {
    isValid: metadata.is_valid ?? false,
    isGenerationReady: metadata.is_generation_ready ?? false,
    qualityScore: metadata.quality_score ?? 0,
    issues: (metadata.issues ?? []).map((issue) => ({
      severity: issue.severity as 'error' | 'warning' | 'info',
      code: issue.code,
      message: issue.message,
      suggestion: issue.suggestion,
    })),
    promptVersion: metadata.prompt_version,
  };
}

/**
 * Get the access token for API authentication.
 * 
 * This is an async function that retrieves the token from secure storage.
 * Uses TokenStorage which handles SecureStore on native and localStorage on web.
 * 
 * @returns Promise resolving to the access token or null if not authenticated
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    // Import TokenStorage - this will be mocked in tests
    const { TokenStorage } = require('@/lib/tokenStorage');
    return await TokenStorage.getAccessToken();
  } catch (error) {
    console.warn('Failed to get access token:', error);
    return null;
  }
}

// =============================================================================
// Reconnection Configuration
// =============================================================================

export interface ReconnectionConfig {
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in ms (default: 1000) */
  retryDelay?: number;
  /** Maximum retry delay in ms (default: 8000) */
  maxRetryDelay?: number;
  /** Heartbeat timeout in ms (default: 35000) */
  heartbeatTimeout?: number;
}

const DEFAULT_RECONNECTION_CONFIG: Required<ReconnectionConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  maxRetryDelay: 8000,
  heartbeatTimeout: 35000,
};

// =============================================================================
// Resilient SSE Stream
// =============================================================================

export interface ResilientStreamCallbacks {
  /** Called for each chunk received */
  onChunk: (chunk: StreamChunk) => void;
  /** Called when an error occurs */
  onError: (error: Error) => void;
  /** Called when attempting to reconnect */
  onReconnect?: (attempt: number) => void;
  /** Called when stream completes */
  onComplete?: () => void;
  /** Called when stream ID is received */
  onStreamId?: (streamId: string) => void;
}

export interface StreamController {
  /** Abort the stream */
  abort: () => void;
  /** Get the current stream ID */
  getStreamId: () => string | null;
}

/**
 * Create a resilient SSE stream with automatic reconnection.
 * 
 * @param url - The API endpoint URL
 * @param body - The request body to send
 * @param accessToken - Optional access token for authentication
 * @param callbacks - Callbacks for stream events
 * @param config - Reconnection configuration
 * @returns StreamController for managing the stream
 */
export function createResilientStream(
  url: string,
  body: object,
  accessToken: string | null,
  callbacks: ResilientStreamCallbacks,
  config: ReconnectionConfig = {}
): StreamController {
  const { maxRetries, retryDelay, maxRetryDelay, heartbeatTimeout } = {
    ...DEFAULT_RECONNECTION_CONFIG,
    ...config,
  };

  let abortController: AbortController | null = null;
  let isAborted = false;
  let retryCount = 0;
  let lastEventId: string | null = null;
  let streamId: string | null = null;
  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

  const resetHeartbeatTimer = () => {
    if (heartbeatTimer) {
      clearTimeout(heartbeatTimer);
    }
    heartbeatTimer = setTimeout(() => {
      if (!isAborted) {
        console.warn('[ResilientSSE] Heartbeat timeout - attempting reconnect');
        reconnect();
      }
    }, heartbeatTimeout);
  };

  const clearHeartbeatTimer = () => {
    if (heartbeatTimer) {
      clearTimeout(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const reconnect = async () => {
    if (isAborted || retryCount >= maxRetries) {
      if (retryCount >= maxRetries) {
        callbacks.onError(new Error('Maximum retry attempts reached'));
      }
      return;
    }

    retryCount++;
    callbacks.onReconnect?.(retryCount);

    // Exponential backoff
    const delay = Math.min(retryDelay * Math.pow(2, retryCount - 1), maxRetryDelay);
    await new Promise(resolve => setTimeout(resolve, delay));

    if (!isAborted) {
      connect();
    }
  };

  const connect = async () => {
    if (isAborted) return;

    abortController = new AbortController();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    if (lastEventId) {
      headers['Last-Event-ID'] = lastEventId;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        credentials: 'include',
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Request failed with status ${response.status}`;
        
        // Handle specific HTTP errors
        if (response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'Prompt Coach requires a Studio subscription.';
        } else if (response.status === 404) {
          errorMessage = 'Session not found or expired.';
        } else if (response.status === 422) {
          errorMessage = 'Invalid request data.';
        } else {
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.detail?.message || errorJson.error?.message || errorMessage;
          } catch {
            // Use default error message
          }
        }
        throw new Error(errorMessage);
      }

      // Parse X-Stream-ID header
      const streamIdHeader = response.headers.get('X-Stream-ID');
      if (streamIdHeader) {
        streamId = streamIdHeader;
        callbacks.onStreamId?.(streamIdHeader);
      }

      // Reset retry count on successful connection
      retryCount = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Start heartbeat timer
      resetHeartbeatTimer();

      try {
        while (true) {
          if (isAborted) break;

          const { done, value } = await reader.read();
          if (done) break;

          // Reset heartbeat timer on data received
          resetHeartbeatTimer();

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                clearHeartbeatTimer();
                callbacks.onComplete?.();
                return;
              }
              try {
                const data = JSON.parse(dataStr) as StreamChunk;
                
                // Track event ID if present
                if ((data as unknown as { id?: string }).id) {
                  lastEventId = (data as unknown as { id: string }).id;
                }

                callbacks.onChunk(data);

                // Check for terminal events
                if (data.type === 'done' || data.type === 'error') {
                  clearHeartbeatTimer();
                  callbacks.onComplete?.();
                  return;
                }
              } catch {
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
              const data = JSON.parse(dataStr) as StreamChunk;
              callbacks.onChunk(data);
            } catch {
              // Skip malformed JSON
            }
          }
        }

        clearHeartbeatTimer();
        callbacks.onComplete?.();
      } finally {
        reader.releaseLock();
        clearHeartbeatTimer();
      }
    } catch (error) {
      clearHeartbeatTimer();

      if (isAborted) return;

      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('[ResilientSSE] Connection error:', error);
      
      // Attempt reconnect for network errors
      if (retryCount < maxRetries) {
        reconnect();
      } else {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  // Start the connection
  connect();

  return {
    abort: () => {
      isAborted = true;
      clearHeartbeatTimer();
      abortController?.abort();
    },
    getStreamId: () => streamId,
  };
}

/**
 * Stream SSE (Server-Sent Events) from the coach API.
 * 
 * @param url - The API endpoint URL
 * @param body - The request body to send
 * @param accessToken - Optional access token for authentication
 * @param lastEventId - Optional last event ID for resuming streams
 * @yields StreamChunk objects parsed from the SSE stream
 * @deprecated Use createResilientStream for new code with automatic reconnection
 */
export async function* streamSSE(
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
    
    // Handle specific HTTP errors
    if (response.status === 401) {
      errorMessage = 'Authentication required. Please log in again.';
    } else if (response.status === 403) {
      errorMessage = 'Prompt Coach requires a Studio subscription.';
    } else if (response.status === 404) {
      errorMessage = 'Session not found or expired.';
    } else if (response.status === 422) {
      errorMessage = 'Invalid request data.';
    } else {
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail?.message || errorJson.error?.message || errorMessage;
      } catch {
        // Use default error message
      }
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
            console.warn('Failed to parse SSE data:', dataStr);
          }
        }
      }
    }

    // Process any remaining data in buffer
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
