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

/**
 * Stream SSE (Server-Sent Events) from the coach API.
 * 
 * @param url - The API endpoint URL
 * @param body - The request body to send
 * @param accessToken - Optional access token for authentication
 * @yields StreamChunk objects parsed from the SSE stream
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
