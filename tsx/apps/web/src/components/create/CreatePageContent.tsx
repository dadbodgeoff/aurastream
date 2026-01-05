/**
 * CreatePageContent Component
 * 
 * Extracted content from the create page for use in the unified create flow.
 * This component contains all the logic and state for the custom asset creation
 * flow without page-level wrappers (PageContainer, etc.).
 * 
 * @module create/CreatePageContent
 * @see UnifiedCreateFlow - Parent container that renders this component
 */

'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  useBrandKits, 
  useLogos,
  useGenerateAsset,
  useGenerateTwitchAsset,
} from '@aurastream/api-client';
import { useUser, createDevLogger } from '@aurastream/shared';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

import {
  PlatformFilter,
  AssetTypeSelector,
  BrandKitSelector,
  PromptMethodSelector,
  LogoOptionsPanel,
  PromptInput,
  CreateCoachIntegration,
  SparklesIcon,
  ASSET_TYPES,
} from './index';
import { BrandCustomizationSection, type BrandCustomizationValue } from './BrandCustomizationSection';
import { UsageDisplay } from '../usage';
import { useUsageStats } from '../../hooks/useUsageStats';
import { MediaAssetPicker } from '../media-library/MediaAssetPicker';
import type { MediaAsset, serializePlacements } from '@aurastream/api-client';
import { serializePlacements as serializePlacementsFn } from '@aurastream/api-client';
import type { AssetPlacement } from '../media-library/placement';
import { getCanvasDimensions } from '../media-library/placement/constants';
import type { AnySketchElement } from '../media-library/canvas-export/types';
import { useCanvasGeneration } from '../../hooks/useCanvasGeneration';
import { CanvasPreview } from './CanvasPreview';
import { useCreateDraft } from '../../hooks/useCreateDraft';
import type { Platform, CreatePhase, BrandKitOption } from './types';
import type { Mood } from '../../hooks/useCoachContext';

// =============================================================================
// Coach Context Constants
// =============================================================================

/** Mood options for Coach-assisted creation */
const MOODS: Array<{ id: Mood; label: string; emoji: string }> = [
  { id: 'hype', label: 'Hype', emoji: '🔥' },
  { id: 'cozy', label: 'Cozy', emoji: '☕' },
  { id: 'rage', label: 'Rage', emoji: '😤' },
  { id: 'chill', label: 'Chill', emoji: '😎' },
  { id: 'custom', label: 'Custom', emoji: '✨' },
];

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_CUSTOM_MOOD_LENGTH = 100;

// =============================================================================
// Types
// =============================================================================

export interface CreatePageContentProps {
  /** Additional className for the container */
  className?: string;
  /** Test ID for e2e testing */
  testId?: string;
}

// =============================================================================
// Constants
// =============================================================================

const log = createDevLogger({ prefix: '[CreatePageContent]' });

// =============================================================================
// Icon Components
// =============================================================================

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

// =============================================================================
// CreatePageContent Component
// =============================================================================

/**
 * CreatePageContent - Standalone content component for custom asset creation.
 * 
 * This component extracts all the logic from the original create page
 * to be used within the UnifiedCreateFlow container.
 * 
 * @example
 * ```tsx
 * <CreatePageContent className="p-4" />
 * ```
 */
export function CreatePageContent({
  className,
  testId = 'create-page-content',
}: CreatePageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUser();
  const { data: brandKitsData, isLoading: isLoadingBrandKits } = useBrandKits();
  const generateMutation = useGenerateAsset();
  const generateTwitchMutation = useGenerateTwitchAsset();
  const { data: usageData, isAtLimit, hasGenerationsRemaining } = useUsageStats();

  // Phase state - controls which step of the flow we're in
  const [phase, setPhase] = useState<CreatePhase>('select');
  
  // Selection state
  const [platform, setPlatform] = useState<Platform>('general');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('thumbnail');
  const [selectedBrandKitId, setSelectedBrandKitId] = useState<string>('');
  
  // Prompt state
  const [prompt, setPrompt] = useState('');
  
  // Brand customization (full customization including colors, typography, voice, logo)
  const [brandCustomization, setBrandCustomization] = useState<BrandCustomizationValue>({
    include_logo: false,
    logo_type: 'primary',
    logo_position: 'bottom-right',
    logo_size: 'medium',
    brand_intensity: 'balanced',
  });
  
  // Media Library assets for injection (Pro/Studio only)
  const [selectedMediaAssets, setSelectedMediaAssets] = useState<MediaAsset[]>([]);
  // Asset placements with precise positioning
  const [mediaAssetPlacements, setMediaAssetPlacements] = useState<AssetPlacement[]>([]);
  // Sketch elements for canvas annotations
  const [sketchElements, setSketchElements] = useState<AnySketchElement[]>([]);
  // Canvas mode - when enabled, uses canvas snapshot for generation (more cost-effective)
  const [useCanvasMode, setUseCanvasMode] = useState(false);

  // Coach context state (mood, game, description)
  const [coachMood, setCoachMood] = useState<Mood | null>(null);
  const [coachCustomMood, setCoachCustomMood] = useState('');
  const [coachGame, setCoachGame] = useState('');
  const [coachDescription, setCoachDescription] = useState('');
  
  // Draft restored flag to prevent overwriting restored state
  const draftRestoredRef = useRef(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Draft persistence hook
  const {
    hasDraft,
    isExpired,
    restoreDraft,
    savePlatform,
    saveAssetType,
    saveBrandKitId,
    savePrompt,
    saveBrandCustomization,
    saveMediaAssets,
    savePlacements,
    saveSketchElements,
    saveCanvasMode,
    saveCoachContext,
    clearDraft,
  } = useCreateDraft({
    onDraftRestored: () => {
      log.info('Draft available for restoration');
    },
  });

  // Restore draft on mount (once)
  useEffect(() => {
    if (draftRestoredRef.current) return;
    if (!hasDraft || isExpired) return;
    
    const draft = restoreDraft();
    if (!draft) return;
    
    draftRestoredRef.current = true;
    log.info('Restoring draft:', draft);
    
    // Restore all state
    setPlatform(draft.platform as Platform);
    setSelectedAssetType(draft.selectedAssetType);
    setSelectedBrandKitId(draft.selectedBrandKitId);
    setPrompt(draft.prompt);
    setBrandCustomization(draft.brandCustomization as BrandCustomizationValue);
    setSelectedMediaAssets(draft.selectedMediaAssets);
    setMediaAssetPlacements(draft.mediaAssetPlacements);
    setSketchElements(draft.sketchElements);
    setUseCanvasMode(draft.useCanvasMode);
    setCoachMood(draft.coachMood as Mood | null);
    setCoachCustomMood(draft.coachCustomMood);
    setCoachGame(draft.coachGame);
    setCoachDescription(draft.coachDescription);
    
    // Show banner if meaningful content was restored
    const hasContent = draft.prompt.trim() || 
                       draft.selectedMediaAssets.length > 0 || 
                       draft.sketchElements.length > 0 ||
                       draft.coachDescription.trim();
    if (hasContent) {
      setShowDraftBanner(true);
    }
  }, [hasDraft, isExpired, restoreDraft]);

  // Auto-save state changes to draft
  useEffect(() => {
    if (!draftRestoredRef.current && !hasDraft) {
      // Don't save until we've checked for existing draft
      return;
    }
    savePlatform(platform);
  }, [platform, savePlatform, hasDraft]);

  useEffect(() => {
    if (!draftRestoredRef.current && !hasDraft) return;
    saveAssetType(selectedAssetType);
  }, [selectedAssetType, saveAssetType, hasDraft]);

  useEffect(() => {
    if (!draftRestoredRef.current && !hasDraft) return;
    saveBrandKitId(selectedBrandKitId);
  }, [selectedBrandKitId, saveBrandKitId, hasDraft]);

  useEffect(() => {
    if (!draftRestoredRef.current && !hasDraft) return;
    savePrompt(prompt);
  }, [prompt, savePrompt, hasDraft]);

  useEffect(() => {
    if (!draftRestoredRef.current && !hasDraft) return;
    saveBrandCustomization(brandCustomization);
  }, [brandCustomization, saveBrandCustomization, hasDraft]);

  useEffect(() => {
    if (!draftRestoredRef.current && !hasDraft) return;
    saveMediaAssets(selectedMediaAssets);
  }, [selectedMediaAssets, saveMediaAssets, hasDraft]);

  useEffect(() => {
    if (!draftRestoredRef.current && !hasDraft) return;
    savePlacements(mediaAssetPlacements);
  }, [mediaAssetPlacements, savePlacements, hasDraft]);

  useEffect(() => {
    if (!draftRestoredRef.current && !hasDraft) return;
    saveSketchElements(sketchElements);
  }, [sketchElements, saveSketchElements, hasDraft]);

  useEffect(() => {
    if (!draftRestoredRef.current && !hasDraft) return;
    saveCanvasMode(useCanvasMode);
  }, [useCanvasMode, saveCanvasMode, hasDraft]);

  useEffect(() => {
    if (!draftRestoredRef.current && !hasDraft) return;
    saveCoachContext(coachMood, coachCustomMood, coachGame, coachDescription);
  }, [coachMood, coachCustomMood, coachGame, coachDescription, saveCoachContext, hasDraft]);

  const isPremium = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio' || user?.subscriptionTier === 'unlimited';
  const brandKits: BrandKitOption[] = brandKitsData?.brandKits ?? [];
  
  // Fetch logos for selected brand kit (used to check if logo exists)
  const { data: logosData } = useLogos(selectedBrandKitId || undefined);
  const hasLogo = logosData?.logos?.primary != null;

  // Canvas generation hook for snapshot mode
  const canvasDimensions = getCanvasDimensions(selectedAssetType);
  const { prepareCanvasForGeneration, isPreparing: isPreparingCanvas } = useCanvasGeneration({
    width: canvasDimensions.width,
    height: canvasDimensions.height,
    assetType: selectedAssetType,
  });

  // Auto-enable canvas mode when user has placements or sketches
  useEffect(() => {
    const hasCanvasContent = mediaAssetPlacements.length > 0 || sketchElements.length > 0;
    if (hasCanvasContent && !useCanvasMode) {
      setUseCanvasMode(true);
    }
  }, [mediaAssetPlacements.length, sketchElements.length, useCanvasMode]);

  // Handle URL params (e.g., from /twitch redirect)
  useEffect(() => {
    const platformParam = searchParams.get('platform');
    if (platformParam && ['general', 'twitch', 'youtube', 'tiktok'].includes(platformParam)) {
      setPlatform(platformParam as Platform);
    }
  }, [searchParams]);

  // Handle vibe_kit param - auto-select brand kit from Vibe Branding
  useEffect(() => {
    const vibeKitId = searchParams.get('vibe_kit');
    if (vibeKitId && brandKits.length > 0) {
      const kit = brandKits.find(k => k.id === vibeKitId);
      if (kit) {
        setSelectedBrandKitId(vibeKitId);
      }
    }
  }, [searchParams, brandKits]);

  // Check if using a vibe kit
  const vibeKitId = searchParams.get('vibe_kit');
  const isVibeKit = vibeKitId && selectedBrandKitId === vibeKitId;

  // Filter asset types by platform and auto-select first valid one
  const filteredAssetTypes = useMemo(() => {
    return ASSET_TYPES.filter(asset => 
      platform === 'general' || asset.platform.includes(platform)
    );
  }, [platform]);

  // Auto-select first asset type when platform changes
  useEffect(() => {
    const currentTypeValid = filteredAssetTypes.some(a => a.id === selectedAssetType);
    if (!currentTypeValid && filteredAssetTypes.length > 0) {
      setSelectedAssetType(filteredAssetTypes[0].id);
    }
  }, [filteredAssetTypes, selectedAssetType]);

  // Auto-select active brand kit
  useEffect(() => {
    if (!selectedBrandKitId && brandKits.length > 0) {
      const activeKit = brandKits.find(kit => kit.is_active);
      if (activeKit) {
        setSelectedBrandKitId(activeKit.id);
      }
    }
  }, [brandKits, selectedBrandKitId]);

  // Check if user can proceed to prompt phase - brand kit is optional
  const canProceedToPrompt = selectedAssetType;

  // Handlers
  const handleSelectManualPrompt = useCallback(() => {
    setPhase('prompt');
  }, []);

  const handleSelectCoach = useCallback(() => {
    if (!isPremium) {
      router.push('/dashboard/settings?upgrade=true');
      return;
    }
    // Always use internal coach phase now (no tab navigation)
    setPhase('coach');
  }, [isPremium, router]);

  const handleBackToSelect = useCallback(() => {
    setPhase('select');
    // Reset coach context when going back
    setCoachMood(null);
    setCoachCustomMood('');
    setCoachGame('');
    setCoachDescription('');
  }, []);

  const handleGenerateFromCoach = useCallback((refinedPrompt: string) => {
    log.info('handleGenerateFromCoach called with:', refinedPrompt);
    setPrompt(refinedPrompt);
    handleGenerate(refinedPrompt);
  }, []);

  // Handle inline generation complete (from coach chat)
  const handleInlineGenerateComplete = useCallback((asset: { id: string; url: string; assetType: string }) => {
    log.info('Inline generation complete:', asset);
    // Clear draft on successful generation
    clearDraft();
    // The asset is already displayed in the coach chat with download/share/tweak options
    // No redirect needed - user stays in the flow
  }, [clearDraft]);

  const handleGenerate = async (promptOverride?: string) => {
    const finalPrompt = promptOverride ?? prompt;

    try {
      const isTwitchAsset = selectedAssetType.startsWith('twitch_');
      
      // Check if we should use canvas snapshot mode
      const hasCanvasContent = mediaAssetPlacements.length > 0 || sketchElements.length > 0;
      const shouldUseCanvasMode = useCanvasMode && hasCanvasContent;
      
      // Prepare canvas snapshot if using canvas mode
      let canvasSnapshotUrl: string | undefined;
      let canvasSnapshotDescription: string | undefined;
      
      if (shouldUseCanvasMode && !isTwitchAsset) {
        log.info('Using canvas snapshot mode for generation');
        try {
          const canvasResult = await prepareCanvasForGeneration(
            mediaAssetPlacements,
            sketchElements,
            [] // No labeled regions in simplified mode
          );
          canvasSnapshotUrl = canvasResult.snapshotUrl;
          canvasSnapshotDescription = canvasResult.description;
          log.info('Canvas snapshot prepared:', { url: canvasSnapshotUrl, description: canvasSnapshotDescription });
        } catch (canvasError) {
          log.error('Canvas snapshot preparation failed, falling back to placements:', canvasError);
          // Fall back to regular placements mode
        }
      }
      
      // Extract media asset IDs for injection (fallback if no placements and no canvas)
      const mediaAssetIds = selectedMediaAssets.length > 0 && mediaAssetPlacements.length === 0 && !canvasSnapshotUrl
        ? selectedMediaAssets.map(a => a.id) 
        : undefined;
      
      // Serialize placements for API if present and NOT using canvas snapshot
      const serializedPlacements = !canvasSnapshotUrl && mediaAssetPlacements.length > 0
        ? serializePlacementsFn(mediaAssetPlacements)
        : undefined;
      
      if (isTwitchAsset) {
        const result = await generateTwitchMutation.mutateAsync({
          assetType: selectedAssetType as any,
          brandKitId: selectedBrandKitId || undefined,
          customPrompt: finalPrompt || undefined,
          includeLogo: brandCustomization.include_logo && hasLogo && !!selectedBrandKitId,
        });
        // Clear draft on successful generation
        clearDraft();
        router.push(`/intel/generate/${result.id}`);
      } else {
        // Build colors only if primary_index is set (required by ColorSelection)
        const colors = brandCustomization.colors?.primary_index !== undefined
          ? {
              primary_index: brandCustomization.colors.primary_index,
              secondary_index: brandCustomization.colors.secondary_index,
              accent_index: brandCustomization.colors.accent_index,
              use_gradient: brandCustomization.colors.use_gradient,
            }
          : undefined;
        
        // Build voice only if use_tagline is set (required by VoiceSelection)
        const voice = brandCustomization.voice?.use_tagline !== undefined
          ? {
              use_tagline: brandCustomization.voice.use_tagline,
              use_catchphrase: brandCustomization.voice.use_catchphrase,
            }
          : undefined;
        
        const result = await generateMutation.mutateAsync({
          assetType: selectedAssetType as any,
          brandKitId: selectedBrandKitId || undefined,
          customPrompt: finalPrompt || undefined,
          brandCustomization: selectedBrandKitId ? {
            colors,
            voice,
            include_logo: brandCustomization.include_logo && hasLogo,
            logo_type: brandCustomization.logo_type,
            logo_position: brandCustomization.logo_position,
            logo_size: brandCustomization.logo_size,
            brand_intensity: brandCustomization.brand_intensity,
          } : undefined,
          mediaAssetIds,
          mediaAssetPlacements: serializedPlacements,
          // Canvas snapshot mode - more cost-effective for multiple assets
          canvasSnapshotUrl,
          canvasSnapshotDescription,
        });
        // Clear draft on successful generation
        clearDraft();
        router.push(`/intel/generate/${result.id}`);
      }
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  const isGenerating = generateMutation.isPending || generateTwitchMutation.isPending || isPreparingCanvas;
  const canGenerate = !isGenerating && hasGenerationsRemaining;

  // Build coach initial request from current selections
  const selectedBrandKit = brandKits.find(k => k.id === selectedBrandKitId);

  // Check if coach context is complete (mood + description required)
  const isCoachContextValid = coachMood && coachDescription.trim().length >= 5 && 
    (coachMood !== 'custom' || coachCustomMood.trim().length > 0);

  // =========================================================================
  // Render: Coach Phase (with integrated context form)
  // =========================================================================
  if (phase === 'coach') {
    return (
      <div className={cn('h-full flex flex-col', className)} data-testid={testId}>
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={handleBackToSelect}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background-surface rounded-lg transition-colors"
            aria-label="Back to selection"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <SparklesIcon />
              AI Coach
            </h2>
            <p className="text-sm text-text-secondary">
              Creating {filteredAssetTypes.find(a => a.id === selectedAssetType)?.label}
              {selectedBrandKit ? ` with ${selectedBrandKit.name}` : ''}
            </p>
          </div>
        </div>

        {/* Coach Context Form - Mood, Game, Description */}
        <div className="space-y-6 mb-6">
          {/* Mood Selection */}
          <section>
            <label className="block text-sm font-medium text-text-primary mb-3">
              What's the vibe?
            </label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select mood">
              {MOODS.map((mood) => (
                <button
                  key={mood.id}
                  type="button"
                  role="radio"
                  aria-checked={coachMood === mood.id}
                  onClick={() => setCoachMood(mood.id)}
                  className={cn(
                    'px-4 py-2 rounded-lg border transition-all',
                    coachMood === mood.id
                      ? 'border-interactive-600 bg-interactive-600/10 ring-2 ring-interactive-600/20'
                      : 'border-border-default bg-background-surface hover:border-border-hover'
                  )}
                >
                  <span className="mr-1.5">{mood.emoji}</span>
                  <span className="text-text-primary">{mood.label}</span>
                </button>
              ))}
            </div>
            {/* Custom mood input */}
            {coachMood === 'custom' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={coachCustomMood}
                  onChange={(e) => setCoachCustomMood(e.target.value)}
                  placeholder="Describe your custom mood (e.g., 'nostalgic retro vibes')"
                  maxLength={MAX_CUSTOM_MOOD_LENGTH}
                  className="w-full px-4 py-2 bg-background-surface border border-border-default rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-interactive-600/20 focus:border-interactive-600"
                />
                <p className="text-xs text-text-tertiary mt-1 text-right">
                  {coachCustomMood.length}/{MAX_CUSTOM_MOOD_LENGTH}
                </p>
              </div>
            )}
          </section>

          {/* Game (Optional) */}
          <section>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Game <span className="text-text-tertiary font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={coachGame}
              onChange={(e) => setCoachGame(e.target.value)}
              placeholder="Enter game name (e.g., 'Fortnite', 'Valorant')"
              className="w-full px-4 py-2 bg-background-surface border border-border-default rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-interactive-600/20 focus:border-interactive-600"
            />
            <p className="text-xs text-text-tertiary mt-1">
              Adding a game helps tailor the asset to your content
            </p>
          </section>

          {/* Description */}
          <section>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Describe what you want to create
            </label>
            <div className="bg-background-surface border border-border-default rounded-lg p-4">
              <textarea
                value={coachDescription}
                onChange={(e) => setCoachDescription(e.target.value)}
                placeholder="Describe your vision... (e.g., 'Victory celebration emote with my character doing a fist pump')"
                className="w-full h-24 bg-transparent text-text-primary placeholder-text-tertiary resize-none focus:outline-none"
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-text-tertiary">
                  Be specific about what you want
                </span>
                <span className="text-xs text-text-tertiary">
                  {coachDescription.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
            </div>
          </section>

          {/* Media Assets - Simple & Canvas Studio (Pro/Studio only) */}
          {isPremium && (
            <section>
              <label className="block text-sm font-medium text-text-primary mb-3">
                Add Your Assets
                <span className="ml-2 text-xs text-text-muted font-normal">(Optional)</span>
              </label>
              <MediaAssetPicker
                selectedAssets={selectedMediaAssets}
                onSelectionChange={setSelectedMediaAssets}
                placements={mediaAssetPlacements}
                onPlacementsChange={setMediaAssetPlacements}
                sketchElements={sketchElements}
                onSketchElementsChange={setSketchElements}
                assetType={selectedAssetType}
              />
              
              {/* Canvas Preview - Show when user has placements or sketches */}
              {(mediaAssetPlacements.length > 0 || sketchElements.length > 0) && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CanvasPreview
                    placements={mediaAssetPlacements}
                    sketchElements={sketchElements}
                    assetType={selectedAssetType}
                  />
                  <p className="text-xs text-emerald-400 mt-3 text-center">
                    This canvas will be shared with the Coach to help refine your prompt
                  </p>
                  <p className="text-xs text-text-muted mt-1 text-center">
                    The AI will intelligently adapt your layout to match the final prompt
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Coach Chat Integration - Only show when context is complete */}
        {isCoachContextValid ? (
          <div className="flex-1 min-h-0">
            <CreateCoachIntegration
              assetType={selectedAssetType}
              brandKitId={selectedBrandKitId || undefined}
              mood={coachMood || undefined}
              customMood={coachCustomMood}
              game={coachGame}
              description={coachDescription}
              onGenerateNow={handleGenerateFromCoach}
              onGenerateComplete={handleInlineGenerateComplete}
              selectedMediaAssets={selectedMediaAssets}
              mediaAssetPlacements={mediaAssetPlacements}
              sketchElements={sketchElements}
              useCanvasMode={useCanvasMode}
              className="h-full"
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8 rounded-xl bg-background-surface/50 border border-border-subtle max-w-md">
              <div className="w-12 h-12 rounded-full bg-interactive-600/10 flex items-center justify-center mx-auto mb-4">
                <SparklesIcon />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Set the scene first
              </h3>
              <p className="text-sm text-text-secondary">
                Select a mood and describe what you want to create. The Coach will help you refine your vision into the perfect prompt.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // Render: Manual Prompt Phase
  // =========================================================================
  if (phase === 'prompt') {
    return (
      <div className={cn('space-y-8', className)} data-testid={testId}>
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBackToSelect}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background-surface rounded-lg transition-colors"
            aria-label="Back to selection"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Describe Your Asset</h2>
            <p className="text-sm text-text-secondary">
              Creating {filteredAssetTypes.find(a => a.id === selectedAssetType)?.label}
              {selectedBrandKit ? ` with ${selectedBrandKit.name}` : ''}
            </p>
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            What do you want to create?
          </label>
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            placeholder="Describe your vision... (e.g., 'A vibrant gaming thumbnail with my character celebrating a victory')"
          />
        </div>

        {/* Brand Customization */}
        {selectedBrandKitId && selectedBrandKit && (
          <BrandCustomizationSection
            brandKitId={selectedBrandKitId}
            brandKitName={selectedBrandKit.name}
            value={brandCustomization}
            onChange={setBrandCustomization}
          />
        )}

        {/* Media Library Assets (Pro/Studio only) */}
        {isPremium && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Add Your Assets
              <span className="ml-2 text-xs text-text-muted">(Optional)</span>
            </label>
            <MediaAssetPicker
              selectedAssets={selectedMediaAssets}
              onSelectionChange={setSelectedMediaAssets}
              placements={mediaAssetPlacements}
              onPlacementsChange={setMediaAssetPlacements}
              sketchElements={sketchElements}
              onSketchElementsChange={setSketchElements}
              assetType={selectedAssetType}
            />
            
            {/* Canvas Mode Indicator */}
            {useCanvasMode && (mediaAssetPlacements.length > 0 || sketchElements.length > 0) && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                  </svg>
                  <span className="font-medium">Canvas Mode Active</span>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Your canvas composition will be sent as a single image, saving ~50% on generation costs.
                </p>
                
                {/* AI Adaptation Notice */}
                <div className="mt-2 p-2 rounded-md bg-interactive-600/10 border border-interactive-500/20">
                  <p className="text-xs text-interactive-400">
                    <span className="font-medium">✨ Smart Adaptation:</span> The AI will intelligently merge your canvas layout with your text prompt. If they differ, it will adapt the composition to best match your vision while preserving your asset placements.
                  </p>
                </div>
                
                {/* Canvas Preview */}
                <CanvasPreview
                  placements={mediaAssetPlacements}
                  sketchElements={sketchElements}
                  assetType={selectedAssetType}
                  className="mt-3"
                />
              </div>
            )}
          </div>
        )}

        {/* Generate Button */}
        <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
          <button
            onClick={handleSelectCoach}
            className="text-sm text-interactive-600 hover:text-interactive-500 font-medium"
          >
            Need help? Try the Coach →
          </button>
          <button
            onClick={() => handleGenerate()}
            disabled={!canGenerate}
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
              canGenerate
                ? "bg-interactive-600 hover:bg-interactive-500 text-white shadow-lg shadow-interactive-600/20"
                : "bg-background-elevated text-text-muted cursor-not-allowed"
            )}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon />
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Render: Selection Phase (Default)
  // =========================================================================
  return (
    <div className={cn('space-y-6', className)} data-testid={testId}>
      {/* Draft Restored Banner */}
      {showDraftBanner && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-emerald-300 font-medium">
              Your previous work has been restored
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                clearDraft();
                setPlatform('general');
                setSelectedAssetType('thumbnail');
                setSelectedBrandKitId('');
                setPrompt('');
                setBrandCustomization({
                  include_logo: false,
                  logo_type: 'primary',
                  logo_position: 'bottom-right',
                  logo_size: 'medium',
                  brand_intensity: 'balanced',
                });
                setSelectedMediaAssets([]);
                setMediaAssetPlacements([]);
                setSketchElements([]);
                setUseCanvasMode(false);
                setCoachMood(null);
                setCoachCustomMood('');
                setCoachGame('');
                setCoachDescription('');
                setShowDraftBanner(false);
              }}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Start Fresh
            </button>
            <button
              onClick={() => setShowDraftBanner(false)}
              className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Usage Indicator */}
      <div className="flex justify-end">
        <UsageDisplay 
          variant="minimal" 
          showUpgrade={false}
        />
      </div>

      {/* Vibe Kit Banner */}
      {isVibeKit && (
        <div className="p-3 rounded-lg bg-interactive-500/10 border border-interactive-500/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-interactive-400" />
            <p className="text-xs text-interactive-300 font-medium">
              Generating with your extracted vibe from Vibe Branding
            </p>
          </div>
        </div>
      )}

      {/* Limit Warning */}
      {isAtLimit && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-400 text-sm">Generation limit reached</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                You've used all your generations for this period. Upgrade to continue creating.
              </p>
              <button
                onClick={() => router.push('/dashboard/settings?tab=billing')}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 text-white text-xs font-semibold rounded-lg transition-colors active:scale-[0.98]"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Filter */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded text-xs bg-interactive-600/10 flex items-center justify-center text-interactive-600 font-bold">1</span>
          <label className="text-sm font-semibold text-text-primary">Choose Platform</label>
        </div>
        <PlatformFilter selected={platform} onChange={setPlatform} />
      </section>

      {/* Asset Type Selection */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded text-xs bg-interactive-600/10 flex items-center justify-center text-interactive-600 font-bold">2</span>
          <label className="text-sm font-semibold text-text-primary">Select Asset Type</label>
          <span className="text-xs text-text-muted">({filteredAssetTypes.length} available)</span>
        </div>
        <AssetTypeSelector
          platform={platform}
          selected={selectedAssetType}
          onChange={setSelectedAssetType}
        />
      </section>

      {/* Brand Kit Selection (Optional) */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded text-xs bg-interactive-600/10 flex items-center justify-center text-interactive-600 font-bold">3</span>
          <label className="text-sm font-semibold text-text-primary">Brand Kit</label>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-background-elevated text-text-muted rounded">Optional</span>
        </div>
        <BrandKitSelector
          brandKits={brandKits}
          selected={selectedBrandKitId}
          onChange={setSelectedBrandKitId}
          isLoading={isLoadingBrandKits}
        />
      </section>

      {/* Prompt Method Selection - Only show when selections are complete */}
      {canProceedToPrompt && (
        <section className="pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded text-xs bg-interactive-600/10 flex items-center justify-center text-interactive-600 font-bold">4</span>
            <label className="text-sm font-semibold text-text-primary">Describe Your Asset</label>
          </div>
          <PromptMethodSelector
            onSelectManual={handleSelectManualPrompt}
            onSelectCoach={handleSelectCoach}
            isPremium={isPremium}
          />
        </section>
      )}
    </div>
  );
}

export default CreatePageContent;
