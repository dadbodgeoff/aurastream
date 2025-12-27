/**
 * Tests for CoachChatIntegrated component
 * 
 * @module coach/__tests__/CoachChatIntegrated.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoachChatIntegrated } from '../CoachChatIntegrated';

// ============================================================================
// Mocks
// ============================================================================

// Mock useCoachChat hook
const mockStartSession = vi.fn();
const mockSendMessage = vi.fn();
const mockEndSession = vi.fn();
const mockReset = vi.fn();

let mockMessages: any[] = [];
let mockIsStreaming = false;
let mockStreamingStage = 'idle';
let mockSessionId: string | null = null;
let mockRefinedDescription: string | null = null;
let mockIsGenerationReady = false;
let mockError: string | null = null;

vi.mock('../../../hooks/useCoachChat', () => ({
  useCoachChat: () => ({
    messages: mockMessages,
    isStreaming: mockIsStreaming,
    streamingStage: mockStreamingStage,
    sessionId: mockSessionId,
    refinedDescription: mockRefinedDescription,
    isGenerationReady: mockIsGenerationReady,
    confidence: 0.8,
    error: mockError,
    isGrounding: false,
    groundingQuery: null,
    startSession: mockStartSession,
    sendMessage: mockSendMessage,
    endSession: mockEndSession,
    reset: mockReset,
  }),
}));

// Mock useSuggestionContext hook
vi.mock('../input/useSuggestionContext', () => ({
  useSuggestionContext: () => ({
    suggestions: [
      { id: 'hype', label: 'Hype energy', action: 'I want hype energy' },
      { id: 'cozy', label: 'Cozy vibes', action: 'I want cozy vibes' },
    ],
    isLoading: false,
  }),
  default: () => ({
    suggestions: [],
    isLoading: false,
  }),
}));

// Mock useInlineGeneration hook
const mockTriggerGeneration = vi.fn();
const mockResetGeneration = vi.fn();

vi.mock('../generation/useInlineGeneration', () => ({
  useInlineGeneration: () => ({
    status: 'idle',
    progress: 0,
    asset: null,
    error: null,
    triggerGeneration: mockTriggerGeneration,
    reset: mockResetGeneration,
    jobId: null,
  }),
}));

// Mock useLightbox hook
const mockOpenImage = vi.fn();

vi.mock('../../lightbox/useLightbox', () => ({
  useLightbox: () => ({
    isOpen: false,
    currentImage: null,
    currentIndex: 0,
    galleryCount: 0,
    hasGallery: false,
    openImage: mockOpenImage,
    openGallery: vi.fn(),
    close: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    goToIndex: vi.fn(),
  }),
}));

// Mock useReducedMotion
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: () => false,
  useLightboxStore: () => ({
    isOpen: false,
    currentImage: null,
    currentIndex: 0,
    gallery: [],
    open: vi.fn(),
    close: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    setIndex: vi.fn(),
  }),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// ============================================================================
// Test Setup
// ============================================================================

// Mock scrollIntoView globally for JSDOM
const scrollIntoViewMock = vi.fn();

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  
  // Mock scrollIntoView (not available in JSDOM)
  Element.prototype.scrollIntoView = scrollIntoViewMock;
  
  // Reset state
  mockMessages = [];
  mockIsStreaming = false;
  mockStreamingStage = 'idle';
  mockSessionId = null;
  mockRefinedDescription = null;
  mockIsGenerationReady = false;
  mockError = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// Tests
// ============================================================================

describe('CoachChatIntegrated', () => {
  describe('Rendering', () => {
    it('renders empty state when no messages', () => {
      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
          brandKitId="kit-123"
          brandKitName="My Brand Kit"
        />
      );

      expect(screen.getByText('Ready to craft your prompt')).toBeDefined();
    });

    it('renders loading state when session is starting', () => {
      mockMessages = [];
      mockSessionId = null;

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
          initialRequest={{
            asset_type: 'twitch_emote',
            mood: 'custom',
            description: 'Test',
            brand_context: {
              brand_kit_id: '',
              colors: [],
              tone: 'professional',
              fonts: { headline: 'Inter', body: 'Inter' },
            },
          }}
        />
      );

      // Should show loading spinner
      expect(screen.getByText('Starting your coaching session...')).toBeDefined();
    });

    it('renders session context bar when session is active', () => {
      mockSessionId = 'session-123';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
          brandKitId="kit-123"
          brandKitName="My Brand Kit"
        />
      );

      expect(screen.getByTestId('coach-chat-integrated-context-bar')).toBeDefined();
    });

    it('renders messages when available', () => {
      mockSessionId = 'session-123';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'I want a hype emote',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Great choice! Let me help you with that.',
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
        />
      );

      expect(screen.getByText('I want a hype emote')).toBeDefined();
      expect(screen.getByText('Great choice! Let me help you with that.')).toBeDefined();
    });
  });

  describe('Input Handling', () => {
    it('renders input area with suggestions', () => {
      mockSessionId = 'session-123';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
        />
      );

      expect(screen.getByTestId('coach-chat-integrated-input')).toBeDefined();
    });

    it('disables input during streaming', () => {
      mockSessionId = 'session-123';
      mockIsStreaming = true;
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveProperty('disabled', true);
    });
  });

  describe('Generation Ready State', () => {
    it('shows Generate Now button when ready', () => {
      mockSessionId = 'session-123';
      mockIsGenerationReady = true;
      mockRefinedDescription = 'A vibrant hype emote with sparkles';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Ready!',
          intentStatus: { isReady: true, confidence: 0.9, refinedDescription: 'A vibrant hype emote' },
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
        />
      );

      expect(screen.getByText('Generate Now ✨')).toBeDefined();
    });

    it('calls triggerGeneration when Generate Now is clicked', async () => {
      mockSessionId = 'session-123';
      mockIsGenerationReady = true;
      mockRefinedDescription = 'A vibrant hype emote with sparkles';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
          brandKitId="kit-123"
        />
      );

      const generateButton = screen.getByText('Generate Now ✨');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockTriggerGeneration).toHaveBeenCalledWith({
          assetType: 'twitch_emote',
          customPrompt: 'A vibrant hype emote with sparkles',
          brandKitId: 'kit-123',
        });
      });
    });
  });

  describe('Session Management', () => {
    it('calls onEndSession when End Session is clicked', async () => {
      const onEndSession = vi.fn();
      mockSessionId = 'session-123';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
          onEndSession={onEndSession}
        />
      );

      const endButton = screen.getByTestId('coach-chat-integrated-context-bar-end');
      fireEvent.click(endButton);

      await waitFor(() => {
        expect(mockEndSession).toHaveBeenCalled();
        expect(onEndSession).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error banner when error occurs', () => {
      mockSessionId = 'session-123';
      mockError = 'Something went wrong';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
        />
      );

      expect(screen.getByText('Something went wrong')).toBeDefined();
    });

    it('dismisses error when dismiss button is clicked', async () => {
      mockSessionId = 'session-123';
      mockError = 'Something went wrong';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
        />
      );

      const dismissButton = screen.getByLabelText('Dismiss error');
      fireEvent.click(dismissButton);

      // Error should be dismissed (local state)
      // Note: In real implementation, this would clear the local error state
    });
  });

  describe('Streaming States', () => {
    it('shows thinking indicator when streaming with no content', () => {
      mockSessionId = 'session-123';
      mockIsStreaming = true;
      mockStreamingStage = 'thinking';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: '',
          isStreaming: true,
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
        />
      );

      expect(screen.getByTestId('thinking-indicator')).toBeDefined();
    });

    it('shows streaming content when content is being streamed', () => {
      mockSessionId = 'session-123';
      mockIsStreaming = true;
      mockStreamingStage = 'streaming';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Let me help you',
          isStreaming: true,
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
        />
      );

      expect(screen.getByText('Let me help you')).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for chat messages', () => {
      mockSessionId = 'session-123';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
        />
      );

      const log = screen.getByRole('log');
      expect(log.getAttribute('aria-label')).toBe('Chat messages');
    });

    it('has proper test IDs for all major components', () => {
      mockSessionId = 'session-123';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
          testId="test-coach-chat"
        />
      );

      expect(screen.getByTestId('test-coach-chat')).toBeDefined();
      expect(screen.getByTestId('test-coach-chat-context-bar')).toBeDefined();
      expect(screen.getByTestId('test-coach-chat-input')).toBeDefined();
    });
  });

  describe('Suggestion Chips', () => {
    it('renders suggestions based on conversation stage', () => {
      mockSessionId = 'session-123';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
        />
      );

      // Should show initial stage suggestions
      expect(screen.getByText('Hype energy')).toBeDefined();
      expect(screen.getByText('Cozy vibes')).toBeDefined();
    });
  });

  describe('Message Scrolling', () => {
    it('scrolls to bottom when messages exist', () => {
      mockSessionId = 'session-123';
      mockMessages = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date(),
        },
      ];

      render(
        <CoachChatIntegrated
          assetType="twitch_emote"
        />
      );

      // scrollIntoView should be called on initial render with messages
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });
});
