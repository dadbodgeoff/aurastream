/**
 * Context Capture Form for Prompt Coach.
 * 
 * This component implements Phase 1 of the Prompt Coach flow where users
 * select their context (brand kit, asset type, mood, game, description)
 * before starting a coaching session.
 * 
 * @module CoachContextForm
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useBrandKits } from '@aurastream/api-client';
import type { BrandKit } from '@aurastream/api-client';
import { 
  useCoachContext, 
  MAX_DESCRIPTION_LENGTH,
  MAX_CUSTOM_MOOD_LENGTH,
} from '../../hooks/useCoachContext';
import { useCoachAccess } from '../../hooks/useCoachAccess';
import type { 
  StartCoachRequest, 
  AssetType, 
  Mood 
} from '../../hooks/useCoachContext';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CoachContextFormProps {
  /** Callback when user clicks "Start Chat" with valid form data */
  onStartChat: (request: StartCoachRequest) => void;
  /** Whether the form is in a loading state (e.g., starting session) */
  isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Asset type configuration with labels and descriptions */
const ASSET_TYPES: Array<{
  id: AssetType;
  label: string;
  description: string;
}> = [
  { id: 'twitch_emote', label: 'Twitch Emote', description: 'Custom emotes for your channel' },
  { id: 'youtube_thumbnail', label: 'YouTube Thumbnail', description: 'Eye-catching video thumbnails' },
  { id: 'twitch_banner', label: 'Twitch Banner', description: 'Channel header banners' },
  { id: 'twitch_badge', label: 'Twitch Badge', description: 'Subscriber badges' },
  { id: 'overlay', label: 'Stream Overlay', description: 'Live stream overlays' },
  { id: 'story_graphic', label: 'Story Graphic', description: 'Social media stories' },
];

/** Mood configuration with labels and emojis */
const MOODS: Array<{
  id: Mood;
  label: string;
  emoji: string;
}> = [
  { id: 'hype', label: 'Hype', emoji: '🔥' },
  { id: 'cozy', label: 'Cozy', emoji: '☕' },
  { id: 'rage', label: 'Rage', emoji: '😤' },
  { id: 'chill', label: 'Chill', emoji: '😎' },
  { id: 'custom', label: 'Custom', emoji: '✨' },
];

// ============================================================================
// Icon Components
// ============================================================================

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" 
    />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4" 
    />
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
    />
  </svg>
);

const GiftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

// ============================================================================
// Trial Banner Component
// ============================================================================

interface TrialBannerProps {
  trialAvailable: boolean;
  trialUsed: boolean;
  upgradeMessage?: string;
}

function TrialBanner({ trialAvailable, trialUsed, upgradeMessage }: TrialBannerProps) {
  if (trialAvailable) {
    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-accent-600/10 to-purple-600/10 border border-accent-600/20 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-600/20 flex items-center justify-center text-accent-500 flex-shrink-0">
            <GiftIcon />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-text-primary">🎉 Free Trial Session!</h3>
            <p className="text-sm text-text-secondary mt-1">
              Experience the full power of Prompt Coach with your free trial. 
              Get AI-powered prompt refinement to create amazing assets.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (trialUsed) {
    return (
      <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0">
            <SparklesIcon />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-text-primary">Loved your trial?</h3>
            <p className="text-sm text-text-secondary mt-1">
              {upgradeMessage || "Upgrade to Studio for unlimited Prompt Coach sessions with game context and more."}
            </p>
            <Link
              href="/dashboard/settings?tab=subscription"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-accent-600 text-white text-sm rounded-lg hover:bg-accent-500 transition-colors"
            >
              Upgrade to Studio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface BrandKitSelectorProps {
  brandKits: BrandKit[];
  selectedKit: BrandKit | null;
  onSelect: (kit: BrandKit) => void;
  isLoading: boolean;
}

function BrandKitSelector({ brandKits, selectedKit, onSelect, isLoading }: BrandKitSelectorProps) {
  if (isLoading) {
    return (
      <div className="p-6 bg-background-surface border border-border-default rounded-lg text-center">
        <LoadingSpinner />
        <p className="text-text-secondary mt-2">Loading brand kits...</p>
      </div>
    );
  }

  if (brandKits.length === 0) {
    return (
      <div className="p-6 bg-background-surface border border-border-default rounded-lg">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-text-primary font-medium mb-1">No brand kits yet</p>
            <p className="text-text-secondary text-sm mb-3">
              You can still use Prompt Coach without a brand kit. For best results, create one to get personalized suggestions.
            </p>
            <Link
              href="/dashboard/brand-kits"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white text-sm rounded-lg hover:bg-accent-500 transition-colors"
            >
              Create Brand Kit
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      role="radiogroup"
      aria-label="Select a brand kit"
    >
      {brandKits.map((kit) => {
        const isSelected = selectedKit?.id === kit.id;
        const allColors = [...kit.primary_colors, ...kit.accent_colors];
        
        return (
          <button
            key={kit.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(kit)}
            className={`p-4 rounded-lg border text-left transition-all ${
              isSelected
                ? 'border-accent-600 bg-accent-600/5 ring-2 ring-accent-600/20'
                : 'border-border-default bg-background-surface hover:border-border-hover'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-text-primary truncate">{kit.name}</h3>
                <p className="text-xs text-text-tertiary mt-1 capitalize">{kit.tone}</p>
                <div className="flex gap-1 mt-2 flex-wrap" aria-label="Brand colors">
                  {allColors.slice(0, 5).map((color, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border border-border-default"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  {allColors.length > 5 && (
                    <span className="text-xs text-text-tertiary self-center ml-1">
                      +{allColors.length - 5}
                    </span>
                  )}
                </div>
              </div>
              {isSelected && (
                <div className="text-accent-600 ml-2 flex-shrink-0">
                  <CheckIcon />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface AssetTypeSelectorProps {
  selectedType: AssetType | null;
  onSelect: (type: AssetType) => void;
}

function AssetTypeSelector({ selectedType, onSelect }: AssetTypeSelectorProps) {
  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      role="radiogroup"
      aria-label="Select an asset type"
    >
      {ASSET_TYPES.map((type) => {
        const isSelected = selectedType === type.id;
        
        return (
          <button
            key={type.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(type.id)}
            className={`p-4 rounded-lg border text-left transition-all ${
              isSelected
                ? 'border-accent-600 bg-accent-600/5 ring-2 ring-accent-600/20'
                : 'border-border-default bg-background-surface hover:border-border-hover'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-text-primary">{type.label}</h3>
                <p className="text-sm text-text-secondary mt-1">{type.description}</p>
              </div>
              {isSelected && (
                <div className="text-accent-600 ml-2 flex-shrink-0">
                  <CheckIcon />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface MoodSelectorProps {
  selectedMood: Mood | null;
  customMood: string;
  onSelectMood: (mood: Mood) => void;
  onCustomMoodChange: (text: string) => void;
  error?: string;
}

function MoodSelector({ 
  selectedMood, 
  customMood, 
  onSelectMood, 
  onCustomMoodChange,
  error,
}: MoodSelectorProps) {
  return (
    <div>
      <div 
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Select a mood"
      >
        {MOODS.map((mood) => {
          const isSelected = selectedMood === mood.id;
          
          return (
            <button
              key={mood.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectMood(mood.id)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                isSelected
                  ? 'border-accent-600 bg-accent-600/5 ring-2 ring-accent-600/20'
                  : 'border-border-default bg-background-surface hover:border-border-hover'
              }`}
            >
              <span className="mr-1">{mood.emoji}</span>
              <span className="text-text-primary">{mood.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Custom mood input */}
      {selectedMood === 'custom' && (
        <div className="mt-3">
          <label htmlFor="custom-mood" className="sr-only">
            Custom mood description
          </label>
          <input
            id="custom-mood"
            type="text"
            value={customMood}
            onChange={(e) => onCustomMoodChange(e.target.value)}
            placeholder="Describe your custom mood (e.g., 'nostalgic retro vibes')"
            maxLength={MAX_CUSTOM_MOOD_LENGTH}
            className={`w-full px-4 py-2 bg-background-surface border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-600/20 focus:border-accent-600 ${
              error ? 'border-red-500' : 'border-border-default'
            }`}
            aria-invalid={!!error}
            aria-describedby={error ? 'custom-mood-error' : undefined}
          />
          <div className="flex justify-between mt-1">
            {error && (
              <span id="custom-mood-error" className="text-xs text-red-500">
                {error}
              </span>
            )}
            <span className="text-xs text-text-tertiary ml-auto">
              {customMood.length}/{MAX_CUSTOM_MOOD_LENGTH}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface GameSelectorProps {
  gameName: string;
  onGameChange: (name: string) => void;
}

function GameSelector({ gameName, onGameChange }: GameSelectorProps) {
  return (
    <div>
      <label htmlFor="game-input" className="sr-only">
        Game name (optional)
      </label>
      <input
        id="game-input"
        type="text"
        value={gameName}
        onChange={(e) => onGameChange(e.target.value)}
        placeholder="Enter game name (e.g., 'Fortnite', 'Valorant')"
        className="w-full px-4 py-2 bg-background-surface border border-border-default rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-600/20 focus:border-accent-600"
      />
      <p className="text-xs text-text-tertiary mt-1">
        Adding a game helps tailor the asset to your content
      </p>
    </div>
  );
}

interface DescriptionInputProps {
  description: string;
  onChange: (text: string) => void;
  error?: string;
}

function DescriptionInput({ description, onChange, error }: DescriptionInputProps) {
  return (
    <div className="bg-background-surface border border-border-default rounded-lg p-4">
      <label htmlFor="description-input" className="sr-only">
        Asset description
      </label>
      <textarea
        id="description-input"
        value={description}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe what you want to create... (e.g., 'Victory celebration emote with my character doing a fist pump')"
        className={`w-full h-24 bg-transparent text-text-primary placeholder-text-tertiary resize-none focus:outline-none ${
          error ? 'border-red-500' : ''
        }`}
        maxLength={MAX_DESCRIPTION_LENGTH}
        aria-invalid={!!error}
        aria-describedby={error ? 'description-error' : 'description-hint'}
      />
      <div className="flex justify-between mt-2">
        {error ? (
          <span id="description-error" className="text-xs text-red-500">
            {error}
          </span>
        ) : (
          <span id="description-hint" className="text-xs text-text-tertiary">
            Be specific about what you want
          </span>
        )}
        <span className="text-xs text-text-tertiary">
          {description.length}/{MAX_DESCRIPTION_LENGTH}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Context Capture Form for Prompt Coach.
 * 
 * Allows users to select their brand kit, asset type, mood, game, and
 * description before starting a coaching session.
 * 
 * @example
 * ```tsx
 * <CoachContextForm
 *   onStartChat={(request) => startCoachSession(request)}
 *   isLoading={isStartingSession}
 * />
 * ```
 */
export function CoachContextForm({ onStartChat, isLoading = false }: CoachContextFormProps) {
  // Check coach access and trial status
  const { hasAccess, trialAvailable, trialUsed, upgradeMessage, isLoading: isAccessLoading } = useCoachAccess();
  
  // Load brand kits
  const { data: brandKitsData, isLoading: isBrandKitsLoading } = useBrandKits();
  
  // Form state management
  const {
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
  } = useCoachContext();

  // Extract brand kits from response
  const brandKits = useMemo(() => {
    return brandKitsData?.brandKits ?? [];
  }, [brandKitsData]);

  // Handle game name change
  const handleGameChange = (name: string) => {
    if (name.trim()) {
      setGame({ name: name.trim() });
    } else {
      setGame(null);
    }
  };

  // Handle form submission
  const handleStartChat = () => {
    const request = buildStartRequest();
    if (request) {
      onStartChat(request);
    }
  };

  // Show loading state while checking access
  if (isAccessLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="ml-2 text-text-secondary">Loading...</span>
      </div>
    );
  }

  // Show upgrade prompt if no access (trial used and not premium)
  if (!hasAccess && trialUsed) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Prompt Coach</h1>
          <p className="mt-1 text-text-secondary">
            AI-powered prompt refinement for stunning assets.
          </p>
        </div>
        <TrialBanner trialAvailable={false} trialUsed={true} upgradeMessage={upgradeMessage} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Prompt Coach</h1>
        <p className="mt-1 text-text-secondary">
          Let&apos;s craft the perfect prompt for your asset. Select your context below.
        </p>
      </div>

      {/* Trial Banner */}
      <TrialBanner 
        trialAvailable={trialAvailable} 
        trialUsed={trialUsed} 
        upgradeMessage={upgradeMessage} 
      />

      {/* Step 1: Select Brand Kit (Optional) */}
      <section className="mb-8" aria-labelledby="brand-kit-heading">
        <h2 id="brand-kit-heading" className="text-lg font-semibold text-text-primary mb-4">
          1. Select Brand Kit <span className="text-text-tertiary font-normal">(Optional)</span>
        </h2>
        <BrandKitSelector
          brandKits={brandKits}
          selectedKit={state.selectedBrandKit}
          onSelect={setSelectedBrandKit}
          isLoading={isBrandKitsLoading}
        />
      </section>

      {/* Step 2: Select Asset Type */}
      <section className="mb-8" aria-labelledby="asset-type-heading">
        <h2 id="asset-type-heading" className="text-lg font-semibold text-text-primary mb-4">
          2. Select Asset Type
        </h2>
        <AssetTypeSelector
          selectedType={state.assetType}
          onSelect={setAssetType}
        />
      </section>

      {/* Step 3: Select Mood */}
      <section className="mb-8" aria-labelledby="mood-heading">
        <h2 id="mood-heading" className="text-lg font-semibold text-text-primary mb-4">
          3. Select Mood
        </h2>
        <MoodSelector
          selectedMood={state.mood}
          customMood={state.customMood}
          onSelectMood={setMood}
          onCustomMoodChange={setCustomMood}
          error={errors.customMood}
        />
      </section>

      {/* Step 4: Game (Optional) */}
      <section className="mb-8" aria-labelledby="game-heading">
        <h2 id="game-heading" className="text-lg font-semibold text-text-primary mb-4">
          4. Game <span className="text-text-tertiary font-normal">(Optional)</span>
        </h2>
        <GameSelector
          gameName={state.game?.name ?? ''}
          onGameChange={handleGameChange}
        />
      </section>

      {/* Step 5: Description */}
      <section className="mb-8" aria-labelledby="description-heading">
        <h2 id="description-heading" className="text-lg font-semibold text-text-primary mb-4">
          5. Describe Your Asset
        </h2>
        <DescriptionInput
          description={state.description}
          onChange={setDescription}
          error={errors.description}
        />
      </section>

      {/* Start Chat Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleStartChat}
          disabled={isLoading || !isValid}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            isLoading || !isValid
              ? 'bg-background-elevated text-text-tertiary cursor-not-allowed'
              : 'bg-accent-600 text-white hover:bg-accent-500'
          }`}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinner />
              Starting...
            </>
          ) : (
            <>
              <SparklesIcon />
              Start Chat
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default CoachContextForm;

// Re-export types for convenience
export type { StartCoachRequest, AssetType, Mood };
