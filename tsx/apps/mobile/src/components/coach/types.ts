/**
 * Type definitions for Prompt Coach chat.
 * @module coach/types
 */

import type { StartCoachRequest } from '../../app/(tabs)/coach/index';

export type { StartCoachRequest };

/** SSE stream chunk types */
export type StreamChunkType =
  | 'token'
  | 'validation'
  | 'grounding'
  | 'grounding_complete'
  | 'done'
  | 'error'
  | 'redirect';

/** Validation issue from the coach */
export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion?: string;
}

/** Validation result attached to messages */
export interface ValidationResult {
  isValid: boolean;
  isGenerationReady: boolean;
  qualityScore: number;
  issues: ValidationIssue[];
  promptVersion?: number;
}

/** Chat message in the conversation */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  validation?: ValidationResult;
  groundingUsed?: boolean;
  timestamp: Date;
}

/** Metadata for stream chunks */
export interface StreamChunkMetadata {
  is_valid?: boolean;
  is_generation_ready?: boolean;
  quality_score?: number;
  issues?: Array<{ severity: string; code: string; message: string; suggestion?: string }>;
  prompt_version?: number;
  session_id?: string;
  total_tokens?: number;
  searching?: string;
  context?: string;
}

/** Single chunk in SSE streaming response */
export interface StreamChunk {
  type: StreamChunkType;
  content: string;
  metadata?: StreamChunkMetadata;
}

/** Props for CoachChatView */
export interface CoachChatViewProps {
  /** Current session ID (null if not started) */
  sessionId: string | null;
  /** Callback when a new session starts */
  onSessionStart: (sessionId: string) => void;
  /** Callback when user clicks "Generate Now" */
  onGenerateNow: (prompt: string) => void;
  /** Callback when user wants to go back */
  onBack: () => void;
  /** Initial request for starting a new session */
  initialRequest?: StartCoachRequest;
}
