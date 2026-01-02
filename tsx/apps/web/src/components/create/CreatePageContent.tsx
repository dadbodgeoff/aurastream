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

import { useState, useMemo, useEffect, useCallback } from 'react';
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
import type { Platform, CreatePhase, BrandKitOption } from './types';

// =============================================================================
// Types
// =============================================================================

export interface CreatePageContentProps {
  /** Additional className for the container */
  className?: string;
  /** Callback when user navigates to coach (for tab switching) */
  onNavigateToCoach?: () => void;
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
 * <CreatePageContent 
 *   onNavigateToCoach={() => setActiveTab('coach')}
 *   className="p-4"
 * />
 * ```
 */
export function CreatePageContent({
  className,
  onNavigateToCoach,
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

  const isPremium = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio';
  const brandKits: BrandKitOption[] = brandKitsData?.brandKits ?? [];
  
  // Fetch logos for selected brand kit (used to check if logo exists)
  const { data: logosData } = useLogos(selectedBrandKitId || undefined);
  const hasLogo = logosData?.logos?.primary != null;

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
    // If parent provides navigation handler, use it (for tab switching)
    if (onNavigateToCoach) {
      onNavigateToCoach();
    } else {
      setPhase('coach');
    }
  }, [isPremium, router, onNavigateToCoach]);

  const handleBackToSelect = useCallback(() => {
    setPhase('select');
  }, []);

  const handleGenerateFromCoach = useCallback((refinedPrompt: string) => {
    log.info('handleGenerateFromCoach called with:', refinedPrompt);
    setPrompt(refinedPrompt);
    handleGenerate(refinedPrompt);
  }, []);

  const handleGenerate = async (promptOverride?: string) => {
    const finalPrompt = promptOverride ?? prompt;

    try {
      const isTwitchAsset = selectedAssetType.startsWith('twitch_');
      
      // Extract media asset IDs for injection (fallback if no placements)
      const mediaAssetIds = selectedMediaAssets.length > 0 && mediaAssetPlacements.length === 0
        ? selectedMediaAssets.map(a => a.id) 
        : undefined;
      
      // Serialize placements for API if present
      const serializedPlacements = mediaAssetPlacements.length > 0
        ? serializePlacementsFn(mediaAssetPlacements)
        : undefined;
      
      if (isTwitchAsset) {
        const result = await generateTwitchMutation.mutateAsync({
          assetType: selectedAssetType as any,
          brandKitId: selectedBrandKitId || undefined,
          customPrompt: finalPrompt || undefined,
          includeLogo: brandCustomization.include_logo && hasLogo && !!selectedBrandKitId,
        });
        router.push(`/dashboard/generate/${result.id}`);
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
        });
        router.push(`/dashboard/generate/${result.id}`);
      }
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  const isGenerating = generateMutation.isPending || generateTwitchMutation.isPending;
  const canGenerate = !isGenerating && hasGenerationsRemaining;

  // Build coach initial request from current selections
  const selectedBrandKit = brandKits.find(k => k.id === selectedBrandKitId);

  // =========================================================================
  // Render: Coach Phase (internal - when not using tab navigation)
  // =========================================================================
  if (phase === 'coach' && !onNavigateToCoach) {
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
            <h2 className="text-lg font-semibold text-text-primary">Prompt Coach</h2>
            <p className="text-sm text-text-secondary">
              Creating {filteredAssetTypes.find(a => a.id === selectedAssetType)?.label}
              {selectedBrandKit ? ` with ${selectedBrandKit.name}` : ''}
            </p>
          </div>
        </div>

        {/* Coach Integration */}
        <div className="flex-1 min-h-0">
          <CreateCoachIntegration
            assetType={selectedAssetType}
            brandKitId={selectedBrandKitId || undefined}
            onGenerateNow={handleGenerateFromCoach}
            onGenerateComplete={() => {}}
            className="h-full"
          />
        </div>
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
              assetType={selectedAssetType}
            />
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
    <div className={cn('space-y-8', className)} data-testid={testId}>
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
        <div className="flex items-center gap-3 mb-4">
          <span className="w-6 h-6 rounded-md bg-interactive-600/10 flex items-center justify-center text-interactive-600 text-sm font-bold">1</span>
          <label className="text-base font-semibold text-text-primary">Choose Platform</label>
        </div>
        <PlatformFilter selected={platform} onChange={setPlatform} />
      </section>

      {/* Asset Type Selection */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-6 h-6 rounded-md bg-interactive-600/10 flex items-center justify-center text-interactive-600 text-sm font-bold">2</span>
          <label className="text-base font-semibold text-text-primary">Select Asset Type</label>
          <span className="text-sm text-text-muted">({filteredAssetTypes.length} available)</span>
        </div>
        <AssetTypeSelector
          platform={platform}
          selected={selectedAssetType}
          onChange={setSelectedAssetType}
        />
      </section>

      {/* Brand Kit Selection (Optional) */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-6 h-6 rounded-md bg-interactive-600/10 flex items-center justify-center text-interactive-600 text-sm font-bold">3</span>
          <label className="text-base font-semibold text-text-primary">Brand Kit</label>
          <span className="px-2 py-0.5 text-xs font-medium bg-background-elevated text-text-muted rounded">Optional</span>
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
        <section className="pt-6 border-t border-border-subtle">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-6 rounded-md bg-interactive-600/10 flex items-center justify-center text-interactive-600 text-sm font-bold">4</span>
            <label className="text-base font-semibold text-text-primary">Describe Your Asset</label>
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
