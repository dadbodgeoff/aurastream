/**
 * Context Capture Form for Prompt Coach.
 * 
 * This component implements Phase 1 of the Prompt Coach flow where users
 * select their context (brand kit, asset type, mood, game, description)
 * before starting a coaching session.
 * 
 * Enterprise UX Features:
 * - Loading skeletons during data fetch
 * - Tier-specific upgrade CTAs
 * - Clear error states with recovery actions
 * 
 * @module CoachContextForm
 */

'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useBrandKits } from '@aurastream/api-client';
import type { BrandKit } from '@aurastream/api-client';
import { 
  useCoachContext, 
  MAX_DESCRIPTION_LENGTH,
  MAX_CUSTOM_MOOD_LENGTH,
} from '../../hooks/useCoachContext';
import { useCoachAccess } from '../../hooks/useCoachAccess';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
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

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

// ============================================================================
// Loading Skeleton Component
// ============================================================================

/**
 * Loading skeleton for the coach context form.
 */
function CoachContextFormSkeleton() {
  return (
    <div className="max-w-4xl mx-auto" role="status" aria-label="Loading coach form...">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Step 1: Brand Kit skeleton */}
      <section className="mb-8">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </section>

      {/* Step 2: Asset Type skeleton */}
      <section className="mb-8">
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </section>

      {/* Step 3: Mood skeleton */}
      <section className="mb-8">
        <Skeleton className="h-6 w-28 mb-4" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-lg" />
          ))}
        </div>
      </section>

      {/* Step 4: Game skeleton */}
      <section className="mb-8">
        <Skeleton className="h-6 w-20 mb-4" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </section>

      {/* Step 5: Description skeleton */}
      <section className="mb-8">
        <Skeleton className="h-6 w-44 mb-4" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </section>

      {/* Button skeleton */}
      <div className="flex justify-end">
        <Skeleton className="h-12 w-36 rounded-lg" />
      </div>
    </div>
  );
}

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
      <div className="mb-6 p-4 bg-gradient-to-r from-accent-600/10 to-primary-600/10 border border-accent-600/20 rounded-lg">
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
// Tier Required Banner Component
// ============================================================================

interface TierRequiredBannerProps {
  upgradeMessage?: string;
}

/**
 * Banner shown when user doesn't have access to Prompt Coach.
 * Provides clear upgrade CTA with tier-specific messaging.
 */
function TierRequiredBanner({ upgradeMessage }: TierRequiredBannerProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Prompt Coach</h1>
        <p className="mt-1 text-text-secondary">
          AI-powered prompt refinement for stunning assets.
        </p>
      </div>
      
      <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
            <LockIcon />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Studio Tier Required
            </h3>
            <p className="text-text-secondary mb-4">
              {upgradeMessage || "The Prompt Coach is available for Studio tier subscribers. Upgrade to unlock AI-powered coaching that helps you create better prompts for stunning assets."}
            </p>
            
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-medium text-text-primary">What you&apos;ll get:</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>AI-powered prompt refinement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>Game context integration for better results</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>Unlimited coaching sessions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>Priority asset generation</span>
                </li>
              </ul>
            </div>
            
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent-600 text-white font-medium rounded-lg hover:bg-accent-500 transition-colors"
            >
              <SparklesIcon />
              Upgrade to Studio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface BrandKitSelectorProps {
  brandKits: BrandKit[];
  selectedKit: BrandKit | null;
  onSelect: (kit: BrandKit) => void;
  onClear: () => void;
  isLoading: boolean;
}

// Default teal gradient when no colors
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #21808D 0%, #32B8C6 100%)';

function BrandKitSelector({ brandKits, selectedKit, onSelect, onClear, isLoading }: BrandKitSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="h-11 bg-background-surface border border-border-default rounded-lg flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const selectedColors = selectedKit 
    ? [...(selectedKit.primary_colors || []), ...(selectedKit.accent_colors || [])]
    : [];

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
          isOpen 
            ? 'border-accent-600 ring-2 ring-accent-600/20 bg-background-surface' 
            : 'border-border-default bg-background-surface hover:border-border-hover'
        }`}
      >
        {/* Color indicator */}
        {selectedKit ? (
          <div 
            className="w-5 h-5 rounded flex-shrink-0"
            style={{ 
              background: selectedColors.length > 0 
                ? `linear-gradient(135deg, ${selectedColors[0]} 0%, ${selectedColors[1] || selectedColors[0]} 100%)`
                : DEFAULT_GRADIENT 
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded bg-background-elevated flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        )}
        
        <span className={`flex-1 text-sm truncate ${selectedKit ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
          {selectedKit?.name || 'No brand kit selected'}
        </span>

        {selectedKit?.is_active && (
          <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/10 text-emerald-500 rounded uppercase">
            Active
          </span>
        )}
        
        <svg 
          className={`w-4 h-4 text-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 py-1 rounded-lg border border-border-default bg-background-surface shadow-lg max-h-56 overflow-y-auto">
          {/* None option */}
          <button
            type="button"
            onClick={() => { onClear(); setIsOpen(false); }}
            className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors hover:bg-background-elevated ${
              !selectedKit ? 'bg-accent-600/5' : ''
            }`}
          >
            <div className="w-5 h-5 rounded bg-background-elevated flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <span className={`flex-1 text-sm ${!selectedKit ? 'text-accent-600 font-medium' : 'text-text-primary'}`}>
              No brand kit
            </span>
            {!selectedKit && <CheckIcon />}
          </button>

          {brandKits.length > 0 && <div className="h-px bg-border-default mx-2 my-1" />}

          {/* Brand kit options */}
          {brandKits.map((kit) => {
            const colors = [...(kit.primary_colors || []), ...(kit.accent_colors || [])];
            const isSelected = selectedKit?.id === kit.id;
            
            return (
              <button
                key={kit.id}
                type="button"
                onClick={() => { onSelect(kit); setIsOpen(false); }}
                className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors hover:bg-background-elevated ${
                  isSelected ? 'bg-accent-600/5' : ''
                }`}
              >
                <div 
                  className="w-5 h-5 rounded flex-shrink-0"
                  style={{ 
                    background: colors.length > 0 
                      ? `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1] || colors[0]} 100%)`
                      : DEFAULT_GRADIENT 
                  }}
                />
                <span className={`flex-1 text-sm truncate ${isSelected ? 'text-accent-600 font-medium' : 'text-text-primary'}`}>
                  {kit.name}
                </span>
                {kit.is_active && (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/10 text-emerald-500 rounded uppercase">
                    Active
                  </span>
                )}
                {isSelected && <CheckIcon />}
              </button>
            );
          })}

          {/* Create new link */}
          {brandKits.length === 0 && (
            <div className="px-3 py-2 border-t border-border-default">
              <Link
                href="/dashboard/brand-kits"
                className="inline-flex items-center gap-1 text-sm text-accent-600 hover:text-accent-500 font-medium"
                onClick={() => setIsOpen(false)}
              >
                Create a brand kit
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Asset type icons
const ASSET_TYPE_ICONS: Record<string, string> = {
  twitch_emote: '😎',
  youtube_thumbnail: '🖼️',
  twitch_banner: '🎨',
  twitch_badge: '🏅',
  overlay: '✨',
  story_graphic: '📱',
};

interface AssetTypeSelectorProps {
  selectedType: AssetType | null;
  onSelect: (type: AssetType) => void;
}

function AssetTypeSelector({ selectedType, onSelect }: AssetTypeSelectorProps) {
  return (
    <div 
      className="grid grid-cols-2 sm:grid-cols-3 gap-2"
      role="radiogroup"
      aria-label="Select an asset type"
    >
      {ASSET_TYPES.map((type) => {
        const isSelected = selectedType === type.id;
        const icon = ASSET_TYPE_ICONS[type.id] || '🎯';
        
        return (
          <button
            key={type.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(type.id)}
            className={`relative p-3 rounded-lg border text-left transition-all ${
              isSelected
                ? 'border-accent-600 bg-accent-600/5 ring-1 ring-accent-600/20'
                : 'border-border-default bg-background-surface hover:border-border-hover'
            }`}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 w-4 h-4 bg-accent-600 rounded-full flex items-center justify-center text-white">
                <CheckIcon />
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="text-base flex-shrink-0">{icon}</span>
              <div className="min-w-0">
                <h3 className={`font-medium text-sm leading-tight ${isSelected ? 'text-accent-600' : 'text-text-primary'}`}>
                  {type.label}
                </h3>
                <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{type.description}</p>
              </div>
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

  // Show loading skeleton while checking access
  if (isAccessLoading) {
    return <CoachContextFormSkeleton />;
  }

  // Show tier required banner if no access (trial used and not premium)
  if (!hasAccess && trialUsed) {
    return <TierRequiredBanner upgradeMessage={upgradeMessage} />;
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
          onClear={() => setSelectedBrandKit(null as unknown as BrandKit)}
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
