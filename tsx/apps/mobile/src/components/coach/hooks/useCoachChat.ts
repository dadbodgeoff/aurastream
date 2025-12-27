/**
 * Custom hook for coach chat state and logic.
 * @module coach/hooks/useCoachChat
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { FlatList } from 'react-native';
import type { ChatMessage, StartCoachRequest, ValidationResult, StreamChunk, StreamChunkMetadata } from '../types';
import { API_BASE_URL } from '../constants';
import {
  generateId,
  extractPromptFromContent,
  parseValidationResult,
  getAccessToken,
  streamSSE,
} from '../utils';

interface UseCoachChatOptions {
  externalSessionId: string | null;
  onSessionStart: (sessionId: string) => void;
  initialRequest?: StartCoachRequest;
}

interface UseCoachChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  activeSessionId: string | null;
  currentPrompt: string | null;
  isGenerationReady: boolean;
  error: string | null;
  isGrounding: boolean;
  groundingQuery: string | null;
  hasStarted: boolean;
  flatListRef: React.RefObject<FlatList>;
  sendMessage: (message: string) => Promise<void>;
  dismissError: () => void;
}

export function useCoachChat({
  externalSessionId,
  onSessionStart,
  initialRequest,
}: UseCoachChatOptions): UseCoachChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [internalSessionId, setInternalSessionId] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [isGenerationReady, setIsGenerationReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGrounding, setIsGrounding] = useState(false);
  const [groundingQuery, setGroundingQuery] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const activeSessionId = externalSessionId || internalSessionId;

  const processStream = useCallback(
    async (
      stream: AsyncGenerator<StreamChunk>,
      assistantMessageId: string
    ): Promise<void> => {
      let accumulatedContent = '';
      let validation: ValidationResult | undefined;
      let groundingUsed = false;

      try {
        for await (const chunk of stream) {
          switch (chunk.type) {
            case 'token':
              accumulatedContent += chunk.content;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent, isStreaming: true }
                    : msg
                )
              );
              break;

            case 'validation':
              if (chunk.metadata) {
                validation = parseValidationResult(chunk.metadata as StreamChunkMetadata);
                setIsGenerationReady(validation.isGenerationReady);
              }
              break;

            case 'grounding':
              setIsGrounding(true);
              setGroundingQuery(chunk.metadata?.searching || null);
              groundingUsed = true;
              break;

            case 'grounding_complete':
              setIsGrounding(false);
              setGroundingQuery(null);
              break;

            case 'done':
              if (chunk.metadata?.session_id) {
                setInternalSessionId(chunk.metadata.session_id);
                onSessionStart(chunk.metadata.session_id);
              }
              break;

            case 'error':
              setError(chunk.content || 'An error occurred');
              break;

            case 'redirect':
              accumulatedContent += chunk.content;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent, isStreaming: true }
                    : msg
                )
              );
              break;
          }
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: accumulatedContent,
                  isStreaming: false,
                  validation,
                  groundingUsed,
                }
              : msg
          )
        );

        const extractedPrompt = extractPromptFromContent(accumulatedContent);
        if (extractedPrompt) {
          setCurrentPrompt(extractedPrompt);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Stream error occurred';
        setError(errorMessage);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
          )
        );
      } finally {
        setIsStreaming(false);
        setIsGrounding(false);
        setGroundingQuery(null);
      }
    },
    [onSessionStart]
  );

  const startSession = useCallback(
    async (request: StartCoachRequest): Promise<void> => {
      setError(null);
      setIsStreaming(true);

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: request.description,
        timestamp: new Date(),
      };

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: new Date(),
      };

      setMessages([userMessage, assistantMessage]);

      try {
        const accessToken = await getAccessToken();
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
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessage.id));
      }
    },
    [processStream]
  );

  const sendMessage = useCallback(
    async (message: string): Promise<void> => {
      if (!activeSessionId) {
        setError('No active session. Please start a session first.');
        return;
      }

      if (isStreaming) return;

      setError(null);
      setIsStreaming(true);

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      try {
        const accessToken = await getAccessToken();
        const stream = streamSSE(
          `${API_BASE_URL}/api/v1/coach/sessions/${activeSessionId}/messages`,
          { message },
          accessToken
        );
        await processStream(stream, assistantMessage.id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        setIsStreaming(false);
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessage.id));
      }
    },
    [activeSessionId, isStreaming, processStream]
  );

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  // Start session when initialRequest is provided
  useEffect(() => {
    if (initialRequest && !hasStarted && !activeSessionId) {
      setHasStarted(true);
      startSession(initialRequest);
    }
  }, [initialRequest, hasStarted, activeSessionId, startSession]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  return {
    messages,
    isStreaming,
    activeSessionId,
    currentPrompt,
    isGenerationReady,
    error,
    isGrounding,
    groundingQuery,
    hasStarted,
    flatListRef,
    sendMessage,
    dismissError,
  };
}
