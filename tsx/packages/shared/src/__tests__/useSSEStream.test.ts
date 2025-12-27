/**
 * useSSEStream Hook Tests
 * 
 * Comprehensive tests for the SSE stream state machine hook.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSSEStream, SSEState, SSEChunk } from '../hooks/useSSEStream';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Creates a mock ReadableStream that yields SSE data
 */
function createMockSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

/**
 * Creates SSE formatted data string
 */
function sseData(chunk: SSEChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

// ============================================================================
// Test Setup
// ============================================================================

describe('useSSEStream', () => {
  let mockFetch: Mock;


  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Initial State
  // ==========================================================================

  describe('initial state', () => {
    it('should start in idle state', () => {
      const { result } = renderHook(() => useSSEStream());

      expect(result.current.state).toBe('idle');
      expect(result.current.data).toBeNull();
      expect(result.current.partialData).toBe('');
      expect(result.current.error).toBeNull();
    });

    it('should provide all control functions', () => {
      const { result } = renderHook(() => useSSEStream());

      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.retry).toBe('function');
      expect(typeof result.current.abort).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  // ==========================================================================
  // State Transitions
  // ==========================================================================

  describe('state transitions', () => {
    it('should transition from idle to connecting when start is called', async () => {
      const onStateChange = vi.fn();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useSSEStream({ onStateChange }));

      act(() => {
        result.current.start('/api/test');
      });

      expect(result.current.state).toBe('connecting');
      expect(onStateChange).toHaveBeenCalledWith('connecting');
    });

    it('should transition from connecting to streaming when response is received', async () => {
      const onStateChange = vi.fn();
      const stream = createMockSSEStream([
        sseData({ type: 'token', content: 'Hello' }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream({ onStateChange }));

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(onStateChange).toHaveBeenCalledWith('connecting');
      expect(onStateChange).toHaveBeenCalledWith('streaming');
    });

    it('should transition to complete when stream ends', async () => {
      const onStateChange = vi.fn();
      const stream = createMockSSEStream([
        sseData({ type: 'done', content: '', metadata: { sessionId: '123' } }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream({ onStateChange }));

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.state).toBe('complete');
      expect(onStateChange).toHaveBeenCalledWith('complete');
    });

    it('should transition to error on HTTP error', async () => {
      const onStateChange = vi.fn();
      const onError = vi.fn();

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useSSEStream({ onStateChange, onError }));

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error?.message).toBe('HTTP 500: Internal Server Error');
      expect(onStateChange).toHaveBeenCalledWith('error');
      expect(onError).toHaveBeenCalled();
    });

    it('should transition to idle when aborted', async () => {
      const onStateChange = vi.fn();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useSSEStream({ onStateChange }));

      act(() => {
        result.current.start('/api/test');
      });

      expect(result.current.state).toBe('connecting');

      act(() => {
        result.current.abort();
      });

      expect(result.current.state).toBe('idle');
    });
  });


  // ==========================================================================
  // Token Batching
  // ==========================================================================

  describe('token batching', () => {
    it('should batch tokens and update partialData', async () => {
      const onToken = vi.fn();
      const stream = createMockSSEStream([
        sseData({ type: 'token', content: 'Hello' }),
        sseData({ type: 'token', content: ' ' }),
        sseData({ type: 'token', content: 'World' }),
        sseData({ type: 'done', content: '' }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream({ onToken, batchInterval: 50 }));

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.partialData).toBe('Hello World');
      expect(onToken).toHaveBeenCalled();
    });

    it('should respect custom batch interval', async () => {
      const onToken = vi.fn();
      const stream = createMockSSEStream([
        sseData({ type: 'token', content: 'A' }),
        sseData({ type: 'token', content: 'B' }),
        sseData({ type: 'done', content: '' }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream({ onToken, batchInterval: 100 }));

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.partialData).toBe('AB');
    });

    it('should flush tokens on done event', async () => {
      const stream = createMockSSEStream([
        sseData({ type: 'token', content: 'Test' }),
        sseData({ type: 'done', content: '', metadata: { complete: true } }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.partialData).toBe('Test');
      expect(result.current.state).toBe('complete');
    });
  });

  // ==========================================================================
  // Chunk Handling
  // ==========================================================================

  describe('chunk handling', () => {
    it('should call onChunk for each chunk', async () => {
      const onChunk = vi.fn();
      const stream = createMockSSEStream([
        sseData({ type: 'grounding', content: 'Searching...' }),
        sseData({ type: 'grounding_complete', content: 'Found context' }),
        sseData({ type: 'token', content: 'Response' }),
        sseData({ type: 'done', content: '' }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream({ onChunk }));

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(onChunk).toHaveBeenCalledTimes(4);
      expect(onChunk).toHaveBeenCalledWith(expect.objectContaining({ type: 'grounding' }));
      expect(onChunk).toHaveBeenCalledWith(expect.objectContaining({ type: 'grounding_complete' }));
      expect(onChunk).toHaveBeenCalledWith(expect.objectContaining({ type: 'token' }));
      expect(onChunk).toHaveBeenCalledWith(expect.objectContaining({ type: 'done' }));
    });

    it('should handle error chunk type', async () => {
      const onError = vi.fn();
      const stream = createMockSSEStream([
        sseData({ type: 'token', content: 'Partial' }),
        sseData({ type: 'error', content: 'Something went wrong' }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream({ onError }));

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error?.message).toBe('Something went wrong');
      expect(onError).toHaveBeenCalled();
    });

    it('should set data from done chunk metadata', async () => {
      const onComplete = vi.fn();
      const metadata = { sessionId: 'abc123', turnsRemaining: 5 };
      const stream = createMockSSEStream([
        sseData({ type: 'done', content: '', metadata }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream({ onComplete }));

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.data).toEqual(metadata);
      expect(onComplete).toHaveBeenCalledWith(metadata);
    });
  });


  // ==========================================================================
  // Error Handling and Partial Data Preservation
  // ==========================================================================

  describe('error handling and partial data preservation', () => {
    it('should preserve partial data on error', async () => {
      const stream = createMockSSEStream([
        sseData({ type: 'token', content: 'Partial ' }),
        sseData({ type: 'token', content: 'response ' }),
        sseData({ type: 'error', content: 'Connection lost' }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.partialData).toBe('Partial response ');
      expect(result.current.error?.message).toBe('Connection lost');
    });

    it('should handle network errors', async () => {
      const onError = vi.fn();
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSSEStream({ onError }));

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error?.message).toBe('Network error');
      expect(onError).toHaveBeenCalled();
    });

    it('should handle null response body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        body: null,
      });

      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error?.message).toBe('Response body is null');
    });

    it('should handle malformed JSON gracefully', async () => {
      const stream = createMockSSEStream([
        'data: not valid json\n\n',
        sseData({ type: 'token', content: 'Valid' }),
        sseData({ type: 'done', content: '' }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      // Should complete despite malformed JSON
      expect(result.current.state).toBe('complete');
      expect(result.current.partialData).toBe('Valid');
      expect(consoleWarn).toHaveBeenCalled();

      consoleWarn.mockRestore();
    });
  });

  // ==========================================================================
  // Retry Mechanism
  // ==========================================================================

  describe('retry mechanism', () => {
    it('should retry the last request', async () => {
      const stream1 = createMockSSEStream([
        sseData({ type: 'error', content: 'First attempt failed' }),
      ]);
      const stream2 = createMockSSEStream([
        sseData({ type: 'token', content: 'Success' }),
        sseData({ type: 'done', content: '' }),
      ]);

      mockFetch
        .mockResolvedValueOnce({ ok: true, body: stream1 })
        .mockResolvedValueOnce({ ok: true, body: stream2 });

      const { result } = renderHook(() => useSSEStream());

      // First attempt fails
      await act(async () => {
        result.current.start('/api/test', { body: { data: 'test' } });
        await vi.runAllTimersAsync();
      });

      expect(result.current.state).toBe('error');

      // Retry succeeds
      await act(async () => {
        result.current.retry();
        await vi.runAllTimersAsync();
      });

      expect(result.current.state).toBe('complete');
      expect(result.current.partialData).toBe('Success');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should preserve request body on retry', async () => {
      const requestBody = { message: 'test', sessionId: '123' };
      
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' })
        .mockResolvedValueOnce({
          ok: true,
          body: createMockSSEStream([sseData({ type: 'done', content: '' })]),
        });

      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test', { body: requestBody });
        await vi.runAllTimersAsync();
      });

      await act(async () => {
        result.current.retry();
        await vi.runAllTimersAsync();
      });

      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/test',
        expect.objectContaining({
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should do nothing if no previous request', () => {
      const { result } = renderHook(() => useSSEStream());

      act(() => {
        result.current.retry();
      });

      expect(result.current.state).toBe('idle');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });


  // ==========================================================================
  // Abort Functionality
  // ==========================================================================

  describe('abort functionality', () => {
    it('should abort ongoing stream', async () => {
      let resolveStream: () => void;
      const streamPromise = new Promise<void>((resolve) => {
        resolveStream = resolve;
      });

      mockFetch.mockImplementation(() => 
        new Promise((resolve) => {
          streamPromise.then(() => {
            resolve({
              ok: true,
              body: createMockSSEStream([sseData({ type: 'done', content: '' })]),
            });
          });
        })
      );

      const { result } = renderHook(() => useSSEStream());

      act(() => {
        result.current.start('/api/test');
      });

      expect(result.current.state).toBe('connecting');

      act(() => {
        result.current.abort();
      });

      expect(result.current.state).toBe('idle');
    });

    it('should handle abort gracefully', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useSSEStream());

      act(() => {
        result.current.start('/api/test');
      });

      expect(result.current.state).toBe('connecting');

      act(() => {
        result.current.abort();
      });

      // Should transition to idle without error
      expect(result.current.state).toBe('idle');
      expect(result.current.error).toBeNull();
    });

    it('should not treat abort as error', async () => {
      const onError = vi.fn();
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      mockFetch.mockRejectedValue(abortError);

      const { result } = renderHook(() => useSSEStream({ onError }));

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Reset Functionality
  // ==========================================================================

  describe('reset functionality', () => {
    it('should reset all state to initial values', async () => {
      const stream = createMockSSEStream([
        sseData({ type: 'token', content: 'Data' }),
        sseData({ type: 'done', content: '', metadata: { id: '123' } }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.state).toBe('complete');
      expect(result.current.partialData).toBe('Data');
      expect(result.current.data).toEqual({ id: '123' });

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.partialData).toBe('');
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should clear last request on reset', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        body: createMockSSEStream([sseData({ type: 'done', content: '' })]),
      });

      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      act(() => {
        result.current.reset();
      });

      // Retry should do nothing after reset
      act(() => {
        result.current.retry();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Authentication
  // ==========================================================================

  describe('authentication', () => {
    it('should include auth token in headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        body: createMockSSEStream([sseData({ type: 'done', content: '' })]),
      });

      const { result } = renderHook(() => useSSEStream({ authToken: 'test-token-123' }));

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123',
          }),
        })
      );
    });

    it('should not include auth header when no token provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        body: createMockSSEStream([sseData({ type: 'done', content: '' })]),
      });

      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['Authorization']).toBeUndefined();
    });
  });


  // ==========================================================================
  // Request Body Handling
  // ==========================================================================

  describe('request body handling', () => {
    it('should send JSON body when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        body: createMockSSEStream([sseData({ type: 'done', content: '' })]),
      });

      const requestBody = { assetType: 'twitch_emote', mood: 'playful' };
      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test', { body: requestBody });
        await vi.runAllTimersAsync();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should not include body when not provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        body: createMockSSEStream([sseData({ type: 'done', content: '' })]),
      });

      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          body: undefined,
        })
      );
    });
  });

  // ==========================================================================
  // Multiple Streams
  // ==========================================================================

  describe('multiple streams', () => {
    it('should reset partialData when starting new stream', async () => {
      const stream1 = createMockSSEStream([
        sseData({ type: 'token', content: 'First' }),
        sseData({ type: 'done', content: '' }),
      ]);
      const stream2 = createMockSSEStream([
        sseData({ type: 'token', content: 'Second' }),
        sseData({ type: 'done', content: '' }),
      ]);

      mockFetch
        .mockResolvedValueOnce({ ok: true, body: stream1 })
        .mockResolvedValueOnce({ ok: true, body: stream2 });

      const { result } = renderHook(() => useSSEStream());

      // Complete first stream
      await act(async () => {
        result.current.start('/api/test1');
        await vi.runAllTimersAsync();
      });

      expect(result.current.partialData).toBe('First');

      // Start second stream (should reset partialData)
      await act(async () => {
        result.current.start('/api/test2');
        await vi.runAllTimersAsync();
      });

      // Should only have second stream's data
      expect(result.current.partialData).toBe('Second');
    });

    it('should reset state when starting new stream', async () => {
      const stream1 = createMockSSEStream([
        sseData({ type: 'token', content: 'First' }),
        sseData({ type: 'done', content: '', metadata: { id: '1' } }),
      ]);
      const stream2 = createMockSSEStream([
        sseData({ type: 'token', content: 'Second' }),
        sseData({ type: 'done', content: '', metadata: { id: '2' } }),
      ]);

      mockFetch
        .mockResolvedValueOnce({ ok: true, body: stream1 })
        .mockResolvedValueOnce({ ok: true, body: stream2 });

      const { result } = renderHook(() => useSSEStream());

      // Complete first stream
      await act(async () => {
        result.current.start('/api/test1');
        await vi.runAllTimersAsync();
      });

      expect(result.current.partialData).toBe('First');
      expect(result.current.data).toEqual({ id: '1' });

      // Start second stream
      await act(async () => {
        result.current.start('/api/test2');
        await vi.runAllTimersAsync();
      });

      expect(result.current.partialData).toBe('Second');
      expect(result.current.data).toEqual({ id: '2' });
    });
  });

  // ==========================================================================
  // Cleanup on Unmount
  // ==========================================================================

  describe('cleanup on unmount', () => {
    it('should abort stream on unmount', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result, unmount } = renderHook(() => useSSEStream());

      act(() => {
        result.current.start('/api/test');
      });

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should not cause errors when unmounting during idle state', () => {
      const { unmount } = renderHook(() => useSSEStream());

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty stream', async () => {
      const stream = createMockSSEStream([]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.state).toBe('complete');
      expect(result.current.partialData).toBe('');
    });

    it('should handle stream with only whitespace', async () => {
      const stream = createMockSSEStream(['\n\n', '\n']);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.state).toBe('complete');
    });

    it('should handle very long tokens', async () => {
      const longContent = 'A'.repeat(10000);
      const stream = createMockSSEStream([
        sseData({ type: 'token', content: longContent }),
        sseData({ type: 'done', content: '' }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.partialData).toBe(longContent);
    });

    it('should handle special characters in tokens', async () => {
      const specialContent = '🎮 <script>alert("xss")</script> "quotes" & ampersand';
      const stream = createMockSSEStream([
        sseData({ type: 'token', content: specialContent }),
        sseData({ type: 'done', content: '' }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream());

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.partialData).toBe(specialContent);
    });
  });

  // ==========================================================================
  // Type Safety
  // ==========================================================================

  describe('type safety', () => {
    it('should return typed data', async () => {
      interface SessionData {
        sessionId: string;
        turnsRemaining: number;
      }

      const metadata: Record<string, unknown> = { sessionId: 'abc', turnsRemaining: 5 };
      const stream = createMockSSEStream([
        sseData({ type: 'done', content: '', metadata }),
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() => useSSEStream<SessionData>());

      await act(async () => {
        result.current.start('/api/test');
        await vi.runAllTimersAsync();
      });

      expect(result.current.data?.sessionId).toBe('abc');
      expect(result.current.data?.turnsRemaining).toBe(5);
    });
  });
});
