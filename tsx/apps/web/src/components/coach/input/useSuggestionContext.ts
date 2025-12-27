'use client';

/**
 * useSuggestionContext Hook
 * 
 * Provides context-aware suggestions based on conversation stage and asset type.
 * Returns appropriate suggestion chips for the current state of the coach conversation.
 * 
 * @module coach/input/useSuggestionContext
 */

import { useMemo } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Conversation stages in the coach flow
 */
export type ConversationStage = 'initial' | 'refining' | 'post_generation';

/**
 * Individual suggestion item
 */
export interface Suggestion {
  /** Unique identifier for the suggestion */
  id: string;
  /** Display label for the chip */
  label: string;
  /** Message to send when selected */
  action: string;
}

/**
 * Options for the useSuggestionContext hook
 */
export interface UseSuggestionContextOptions {
  /** Current stage of the conversation */
  conversationStage: ConversationStage;
  /** Type of asset being created */
  assetType: string;
  /** Current prompt text (optional) */
  currentPrompt?: string;
  /** Last message from the coach (optional) */
  lastMessage?: string;
}

/**
 * Return type for the useSuggestionContext hook
 */
export interface UseSuggestionContextResult {
  /** Array of suggestions for the current context */
  suggestions: Suggestion[];
  /** Loading state (reserved for future async suggestions) */
  isLoading: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Suggestions for the initial stage - style and mood options
 */
const INITIAL_SUGGESTIONS: Suggestion[] = [
  { id: 'hype', label: 'Hype energy', action: 'I want a hype energy vibe with bold, exciting elements' },
  { id: 'cozy', label: 'Cozy vibes', action: 'I want cozy vibes with warm, inviting aesthetics' },
  { id: 'minimalist', label: 'Minimalist', action: 'I want a minimalist style with clean, simple design' },
  { id: 'retro', label: 'Retro style', action: 'I want a retro style with vintage aesthetics' },
  { id: 'neon', label: 'Neon glow', action: 'I want a neon glow effect with vibrant colors' },
];

/**
 * Suggestions for the refining stage - adjustment options
 */
const REFINING_SUGGESTIONS: Suggestion[] = [
  { id: 'vibrant', label: 'More vibrant', action: 'Make it more vibrant with brighter colors' },
  { id: 'energy', label: 'Add energy', action: 'Add more energy and dynamic elements' },
  { id: 'simplify', label: 'Simplify', action: 'Simplify the design, make it cleaner' },
  { id: 'colors', label: 'Change colors', action: 'I want to change the color scheme' },
  { id: 'detail', label: 'More detail', action: 'Add more detail and complexity' },
];

/**
 * Suggestions for post-generation stage - iteration options
 */
const POST_GENERATION_SUGGESTIONS: Suggestion[] = [
  { id: 'another-style', label: 'Try another style', action: 'Let me try a completely different style' },
  { id: 'adjust-colors', label: 'Adjust colors', action: 'I want to adjust the colors in this design' },
  { id: 'new-concept', label: 'New concept', action: 'Let me start with a new concept entirely' },
  { id: 'similar', label: 'Similar but different', action: 'Create something similar but with a twist' },
];

/**
 * Asset-type specific suggestions that can augment base suggestions
 */
const ASSET_TYPE_SUGGESTIONS: Record<string, Suggestion[]> = {
  twitch_emote: [
    { id: 'expressive', label: 'More expressive', action: 'Make the emote more expressive and readable at small sizes' },
  ],
  youtube_thumbnail: [
    { id: 'clickbait', label: 'More eye-catching', action: 'Make it more eye-catching and click-worthy' },
  ],
  twitch_banner: [
    { id: 'branded', label: 'More branded', action: 'Make it feel more branded and professional' },
  ],
  overlay: [
    { id: 'subtle', label: 'More subtle', action: 'Make the overlay more subtle so it does not distract from gameplay' },
  ],
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook that provides context-aware suggestions based on conversation stage.
 * 
 * Features:
 * - Stage-specific suggestions (initial, refining, post_generation)
 * - Asset-type aware suggestions
 * - Memoized for performance
 * - Extensible for future async suggestions
 * 
 * @example
 * ```tsx
 * const { suggestions, isLoading } = useSuggestionContext({
 *   conversationStage: 'initial',
 *   assetType: 'twitch_emote',
 * });
 * ```
 */
export function useSuggestionContext({
  conversationStage,
  assetType,
  currentPrompt,
  lastMessage,
}: UseSuggestionContextOptions): UseSuggestionContextResult {
  const suggestions = useMemo(() => {
    // Get base suggestions for the current stage
    let baseSuggestions: Suggestion[];
    
    switch (conversationStage) {
      case 'initial':
        baseSuggestions = [...INITIAL_SUGGESTIONS];
        break;
      case 'refining':
        baseSuggestions = [...REFINING_SUGGESTIONS];
        break;
      case 'post_generation':
        baseSuggestions = [...POST_GENERATION_SUGGESTIONS];
        break;
      default:
        baseSuggestions = [...INITIAL_SUGGESTIONS];
    }

    // Add asset-type specific suggestions if available (only in refining stage)
    if (conversationStage === 'refining' && assetType) {
      const assetSpecific = ASSET_TYPE_SUGGESTIONS[assetType];
      if (assetSpecific) {
        // Insert asset-specific suggestions at the beginning
        baseSuggestions = [...assetSpecific, ...baseSuggestions.slice(0, 4)];
      }
    }

    return baseSuggestions;
  }, [conversationStage, assetType]);

  return {
    suggestions,
    isLoading: false, // Reserved for future async suggestions
  };
}

export default useSuggestionContext;
