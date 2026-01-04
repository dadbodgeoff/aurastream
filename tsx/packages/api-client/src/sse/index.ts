/**
 * SSE Module Exports
 * 
 * Provides resilient SSE streaming with automatic reconnection,
 * completion recovery, and heartbeat timeout detection.
 */

export {
  ResilientEventSource,
  useResilientSSE,
  type SSEEvent,
  type ResilientSSEOptions,
  type ResilientSSEState,
  type UseResilientSSEOptions,
  type UseResilientSSEResult,
} from './ResilientEventSource';
