/**
 * Hook for managing Prompt Coach context capture state.
 * 
 * This hook manages the form state for Phase 1 of the Prompt Coach flow,
 * where users select their context before starting a coaching session.
 * 
 * @module useCoachContext
 */

import { useState, useMemo, useCallback } from 'react';
import type { BrandKit } from '@aurastream/api-client';

// ============================================================================
// Type Definitions
// ============================================================================

/** Asset types supported by the Prompt Coach (matches backend coach.py) */
export type AssetType = 
  // General asset types (matching generation.py)
  | 'thumbnail'
  | 'overlay'
  | 'banner'
  | 'story_graphic'
  | 'clip_cover'
  // Twitch-specific asset types
  | 'twitch_emote' 
  | 'twitch_badge' 
  | 'twitch_panel'
  | 'twitch_offline'
  // Legacy/extended types for backwards compatibility
  | 'youtube_thumbnail' 
  | 'twitch_banner' 
  | 'tiktok_story'
  | 'instagram_story'
  | 'instagram_reel';

/** Mood options for asset generation */
export type Mood = 'hype' | 'cozy' | 'rage' | 'chill' | 'custom';

/** Color information for brand context */
export interface ColorInfo {
  hex: string;
  name: string;
}

/** Font information for brand context */
export interface FontInfo {
  headline: string;
  body: string;
}

/** Brand context to send with coach request (all fields optional per backend) */
export interface BrandContext {
  brand_kit_id?: string | null;  // Optional - users can proceed without a brand kit
  colors: ColorInfo[];           // Empty array if no brand kit
  tone: string;                  // Defaults to 'professional'
  fonts?: FontInfo | null;       // Optional - system defaults used if not specified
  logo_url?: string | null;      // Optional
}

/** Request payload for starting a coach session (brand_context is optional) */
export interface StartCoachRequest {
  brand_context?: BrandContext | null;  // Optional - defaults provided for users without brand kits
  asset_type: AssetType;
  mood: Mood;
  custom_mood?: string | null;  // Required when mood='custom'
  game_id?: string | null;
  game_name?: string | null;
  description: string;  // min 5, max 500 chars
  // Creator Media Library integration
  media_asset_ids?: string[] | null;  // Max 2 assets
  media_asset_placements?: SerializedMediaPlacement[] | null;  // Precise placement data
  // Canvas Studio integration - single-image mode for complex compositions
  canvas_snapshot_url?: string | null;  // URL of canvas snapshot for single-image mode
  canvas_snapshot_description?: string | null;  // Description of canvas contents for AI context
}

/** Serialized media placement for API transmission */
export interface SerializedMediaPlacement {
  asset_id: string;
  display_name: string;
  asset_type: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  size_unit: 'percent' | 'px';
  z_index: number;
  rotation: number;
  opacity: number;
}

/** Game selection state */
export interface GameSelection {
  id?: string;
  name: string;
}

/** State managed by the useCoachContext hook */
export interface CoachContextState {
  selectedBrandKit: BrandKit | null;
  assetType: AssetType | null;
  mood: Mood | null;
  customMood: string;
  game: GameSelection | null;
  description: string;
}

/** Return type for the useCoachContext hook */
export interface UseCoachContextReturn {
  /** Current form state */
  state: CoachContextState;
  /** Whether the form is valid and ready to submit */
  isValid: boolean;
  /** Validation errors for each field */
  errors: {
    brandKit?: string;
    assetType?: string;
    mood?: string;
    customMood?: string;
    description?: string;
  };
  /** Set the selected brand kit */
  setSelectedBrandKit: (kit: BrandKit | null) => void;
  /** Set the asset type */
  setAssetType: (type: AssetType | null) => void;
  /** Set the mood */
  setMood: (mood: Mood | null) => void;
  /** Set the custom mood text */
  setCustomMood: (text: string) => void;
  /** Set the game selection */
  setGame: (game: GameSelection | null) => void;
  /** Set the description */
  setDescription: (text: string) => void;
  /** Build the StartCoachRequest from current state */
  buildStartRequest: () => StartCoachRequest | null;
  /** Reset all form state */
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum description length */
const MIN_DESCRIPTION_LENGTH = 5;

/** Maximum description length */
export const MAX_DESCRIPTION_LENGTH = 500;

/** Maximum custom mood length */
export const MAX_CUSTOM_MOOD_LENGTH = 100;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate color name from hex value.
 * This is a simple implementation - in production, you might want
 * to use a color naming library.
 */
function generateColorName(_hex: string, index: number): string {
  return `Color ${index + 1}`;
}

/**
 * Convert a BrandKit to BrandContext format.
 */
function brandKitToBrandContext(kit: BrandKit): BrandContext {
  // Combine primary and accent colors
  const allColors = [...kit.primary_colors, ...kit.accent_colors];
  const colors: ColorInfo[] = allColors.map((hex, index) => ({
    hex: hex.startsWith('#') ? hex : `#${hex}`,
    name: generateColorName(hex, index),
  }));

  return {
    brand_kit_id: kit.id,
    colors,
    tone: kit.tone,
    fonts: {
      headline: kit.fonts.headline,
      body: kit.fonts.body,
    },
    logo_url: kit.logo_url || undefined,
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing Prompt Coach context capture state.
 * 
 * Provides form state management, validation, and request building
 * for the Context Capture UI (Phase 1 of Prompt Coach flow).
 * 
 * @example
 * ```tsx
 * const {
 *   state,
 *   isValid,
 *   errors,
 *   setSelectedBrandKit,
 *   setAssetType,
 *   setMood,
 *   setDescription,
 *   buildStartRequest,
 *   reset,
 * } = useCoachContext();
 * 
 * const handleStartChat = () => {
 *   const request = buildStartRequest();
 *   if (request) {
 *     onStartChat(request);
 *   }
 * };
 * ```
 */
export function useCoachContext(): UseCoachContextReturn {
  // Form state
  const [selectedBrandKit, setSelectedBrandKit] = useState<BrandKit | null>(null);
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [customMood, setCustomMood] = useState('');
  const [game, setGame] = useState<GameSelection | null>(null);
  const [description, setDescription] = useState('');

  // Compute validation errors
  // Note: Brand kit is now optional - premium users can start without one
  const errors = useMemo(() => {
    const errs: UseCoachContextReturn['errors'] = {};

    // Brand kit is optional - users can proceed without one
    // if (!selectedBrandKit) {
    //   errs.brandKit = 'Please select a brand kit';
    // }

    if (!assetType) {
      errs.assetType = 'Please select an asset type';
    }

    if (!mood) {
      errs.mood = 'Please select a mood';
    }

    if (mood === 'custom' && !customMood.trim()) {
      errs.customMood = 'Please enter a custom mood';
    }

    if (!description.trim()) {
      errs.description = 'Please enter a description';
    } else if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
      errs.description = `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`;
    }

    return errs;
  }, [selectedBrandKit, assetType, mood, customMood, description]);

  // Compute overall validity
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Build the start request
  const buildStartRequest = useCallback((): StartCoachRequest | null => {
    if (!isValid || !assetType || !mood) {
      return null;
    }

    // Create brand context - use selected kit or null (backend accepts null)
    const brandContext: BrandContext | null = selectedBrandKit 
      ? brandKitToBrandContext(selectedBrandKit)
      : null;

    const request: StartCoachRequest = {
      brand_context: brandContext,
      asset_type: assetType,
      mood,
      description: description.trim(),
    };

    // Add custom mood if applicable
    if (mood === 'custom' && customMood.trim()) {
      request.custom_mood = customMood.trim();
    }

    // Add game if selected
    if (game) {
      request.game_name = game.name;
      if (game.id) {
        request.game_id = game.id;
      }
    }

    return request;
  }, [isValid, selectedBrandKit, assetType, mood, customMood, game, description]);

  // Reset all state
  const reset = useCallback(() => {
    setSelectedBrandKit(null);
    setAssetType(null);
    setMood(null);
    setCustomMood('');
    setGame(null);
    setDescription('');
  }, []);

  // Build state object
  const state: CoachContextState = useMemo(() => ({
    selectedBrandKit,
    assetType,
    mood,
    customMood,
    game,
    description,
  }), [selectedBrandKit, assetType, mood, customMood, game, description]);

  return {
    state,
    isValid,
    errors,
    setSelectedBrandKit,
    setAssetType,
    setMood,
    setCustomMood,
    setGame,
    setDescription,
    buildStartRequest,
    reset,
  };
}

export default useCoachContext;
