/**
 * useSuggestionContext Hook Tests
 * 
 * Tests for the context-aware suggestions hook.
 * 
 * @module coach/input/__tests__/useSuggestionContext.test
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSuggestionContext } from '../useSuggestionContext';
import type { ConversationStage } from '../useSuggestionContext';

describe('useSuggestionContext', () => {
  describe('initial stage suggestions', () => {
    it('should return initial suggestions for initial stage', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'initial',
          assetType: 'twitch_emote',
        })
      );

      expect(result.current.suggestions).toHaveLength(5);
      expect(result.current.suggestions.map((s) => s.label)).toEqual([
        'Hype energy',
        'Cozy vibes',
        'Minimalist',
        'Retro style',
        'Neon glow',
      ]);
    });

    it('should have correct action strings for initial suggestions', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'initial',
          assetType: 'twitch_emote',
        })
      );

      const hypeSuggestion = result.current.suggestions.find((s) => s.id === 'hype');
      expect(hypeSuggestion?.action).toContain('hype energy');
    });

    it('should have unique IDs for all suggestions', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'initial',
          assetType: 'twitch_emote',
        })
      );

      const ids = result.current.suggestions.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('refining stage suggestions', () => {
    it('should return refining suggestions for refining stage', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'refining',
          assetType: 'twitch_emote',
        })
      );

      // Should include asset-specific suggestion + 4 base refining suggestions
      expect(result.current.suggestions.length).toBeGreaterThanOrEqual(5);
      
      // Check for base refining suggestions
      const labels = result.current.suggestions.map((s) => s.label);
      expect(labels).toContain('More vibrant');
    });

    it('should include asset-specific suggestions for twitch_emote', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'refining',
          assetType: 'twitch_emote',
        })
      );

      const labels = result.current.suggestions.map((s) => s.label);
      expect(labels).toContain('More expressive');
    });

    it('should include asset-specific suggestions for youtube_thumbnail', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'refining',
          assetType: 'youtube_thumbnail',
        })
      );

      const labels = result.current.suggestions.map((s) => s.label);
      expect(labels).toContain('More eye-catching');
    });

    it('should include asset-specific suggestions for twitch_banner', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'refining',
          assetType: 'twitch_banner',
        })
      );

      const labels = result.current.suggestions.map((s) => s.label);
      expect(labels).toContain('More branded');
    });

    it('should include asset-specific suggestions for overlay', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'refining',
          assetType: 'overlay',
        })
      );

      const labels = result.current.suggestions.map((s) => s.label);
      expect(labels).toContain('More subtle');
    });

    it('should not include asset-specific suggestions for unknown asset type', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'refining',
          assetType: 'unknown_type',
        })
      );

      // Should only have base refining suggestions
      expect(result.current.suggestions).toHaveLength(5);
    });
  });

  describe('post_generation stage suggestions', () => {
    it('should return post-generation suggestions', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'post_generation',
          assetType: 'twitch_emote',
        })
      );

      expect(result.current.suggestions).toHaveLength(4);
      expect(result.current.suggestions.map((s) => s.label)).toEqual([
        'Try another style',
        'Adjust colors',
        'New concept',
        'Similar but different',
      ]);
    });

    it('should not include asset-specific suggestions in post_generation', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'post_generation',
          assetType: 'twitch_emote',
        })
      );

      const labels = result.current.suggestions.map((s) => s.label);
      expect(labels).not.toContain('More expressive');
    });
  });

  describe('loading state', () => {
    it('should return isLoading as false', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'initial',
          assetType: 'twitch_emote',
        })
      );

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('memoization', () => {
    it('should return same suggestions array for same inputs', () => {
      const { result, rerender } = renderHook(
        ({ stage, assetType }) =>
          useSuggestionContext({
            conversationStage: stage,
            assetType,
          }),
        {
          initialProps: {
            stage: 'initial' as ConversationStage,
            assetType: 'twitch_emote',
          },
        }
      );

      const firstSuggestions = result.current.suggestions;

      // Rerender with same props
      rerender({ stage: 'initial', assetType: 'twitch_emote' });

      expect(result.current.suggestions).toBe(firstSuggestions);
    });

    it('should return new suggestions array when stage changes', () => {
      const { result, rerender } = renderHook(
        ({ stage, assetType }) =>
          useSuggestionContext({
            conversationStage: stage,
            assetType,
          }),
        {
          initialProps: {
            stage: 'initial' as ConversationStage,
            assetType: 'twitch_emote',
          },
        }
      );

      const firstSuggestions = result.current.suggestions;

      // Rerender with different stage
      rerender({ stage: 'refining', assetType: 'twitch_emote' });

      expect(result.current.suggestions).not.toBe(firstSuggestions);
      expect(result.current.suggestions[0].label).not.toBe(firstSuggestions[0].label);
    });

    it('should return new suggestions array when asset type changes', () => {
      const { result, rerender } = renderHook(
        ({ stage, assetType }) =>
          useSuggestionContext({
            conversationStage: stage,
            assetType,
          }),
        {
          initialProps: {
            stage: 'refining' as ConversationStage,
            assetType: 'twitch_emote',
          },
        }
      );

      const firstSuggestions = result.current.suggestions;

      // Rerender with different asset type
      rerender({ stage: 'refining', assetType: 'youtube_thumbnail' });

      expect(result.current.suggestions).not.toBe(firstSuggestions);
    });
  });

  describe('edge cases', () => {
    it('should handle empty asset type', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'refining',
          assetType: '',
        })
      );

      // Should return base refining suggestions without asset-specific ones
      expect(result.current.suggestions).toHaveLength(5);
    });

    it('should handle optional currentPrompt parameter', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'initial',
          assetType: 'twitch_emote',
          currentPrompt: 'Some prompt text',
        })
      );

      expect(result.current.suggestions).toHaveLength(5);
    });

    it('should handle optional lastMessage parameter', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'initial',
          assetType: 'twitch_emote',
          lastMessage: 'Some message from coach',
        })
      );

      expect(result.current.suggestions).toHaveLength(5);
    });

    it('should default to initial suggestions for unknown stage', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'unknown' as ConversationStage,
          assetType: 'twitch_emote',
        })
      );

      // Should fall back to initial suggestions
      expect(result.current.suggestions).toHaveLength(5);
      expect(result.current.suggestions[0].label).toBe('Hype energy');
    });
  });

  describe('suggestion structure', () => {
    it('should have id, label, and action for each suggestion', () => {
      const { result } = renderHook(() =>
        useSuggestionContext({
          conversationStage: 'initial',
          assetType: 'twitch_emote',
        })
      );

      result.current.suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty('id');
        expect(suggestion).toHaveProperty('label');
        expect(suggestion).toHaveProperty('action');
        expect(typeof suggestion.id).toBe('string');
        expect(typeof suggestion.label).toBe('string');
        expect(typeof suggestion.action).toBe('string');
        expect(suggestion.id.length).toBeGreaterThan(0);
        expect(suggestion.label.length).toBeGreaterThan(0);
        expect(suggestion.action.length).toBeGreaterThan(0);
      });
    });
  });
});
