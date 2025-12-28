'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  useBrandKits, 
  useLogos,
  useGenerateAsset,
  useGenerateTwitchAsset,
} from '@aurastream/api-client';
import type { LogoPosition, LogoSize } from '@aurastream/api-client';
import { useUser, createDevLogger } from '@aurastream/shared';
import { cn } from '@/lib/utils';

// Dev logger for this page
const log = createDevLogger({ prefix: '[CreatePage]' });
import {
  PlatformFilter,
  AssetTypeSelector,
  BrandKitSelector,
  PromptMethodSelector,
  LogoOptionsPanel,
  PromptInput,
  CreateCoachIntegration,
  SparklesIcon,
  ArrowLeftIcon,
  ASSET_TYPES,
} from '../../../components/create';
import { UsageDisplay } from '../../../components/usage';
import { useUsageStats } from '../../../hooks/useUsageStats';
import { Sparkles } from 'lucide-react';
import type { Platform, CreatePhase, BrandKitOption } from '../../../components/create';

// =============================================================================
// Main Page Component
// =============================================================================

export default function CreatePage() {
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
  
  // Logo options
  const [includeLogo, setIncludeLogo] = useState(false);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('bottom-right');
  const [logoSize, setLogoSize] = useState<LogoSize>('medium');

  const isPremium = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio';
  const brandKits: BrandKitOption[] = brandKitsData?.brandKits ?? [];
  
  // Fetch logos for selected brand kit
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
    setPhase('coach');
  }, [isPremium, router]);

  const handleBackToSelect = useCallback(() => {
    setPhase('select');
  }, []);

  const handleGenerateFromCoach = useCallback((refinedPrompt: string) => {
    log.info('handleGenerateFromCoach called with:', refinedPrompt);
    log.warn('This should NOT be called when using new UX!');
    setPrompt(refinedPrompt);
    handleGenerate(refinedPrompt);
  }, []);

  const handleGenerate = async (promptOverride?: string) => {
    const finalPrompt = promptOverride ?? prompt;

    try {
      const isTwitchAsset = selectedAssetType.startsWith('twitch_');
      
      if (isTwitchAsset) {
        const result = await generateTwitchMutation.mutateAsync({
          assetType: selectedAssetType as any,
          brandKitId: selectedBrandKitId || undefined,
          customPrompt: finalPrompt || undefined,
          includeLogo: includeLogo && hasLogo && !!selectedBrandKitId,
        });
        // Redirect to generation progress page with SSE streaming
        router.push(`/dashboard/generate/${result.id}`);
      } else {
        const result = await generateMutation.mutateAsync({
          assetType: selectedAssetType as any,
          brandKitId: selectedBrandKitId || undefined,
          customPrompt: finalPrompt || undefined,
          brandCustomization: selectedBrandKitId ? {
            include_logo: includeLogo && hasLogo,
            logo_type: 'primary',
            logo_position: logoPosition,
            logo_size: logoSize,
            brand_intensity: 'balanced',
          } : undefined,
        });
        // Redirect to generation progress page with SSE streaming
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
  // Render: Coach Phase
  // =========================================================================
  if (phase === 'coach') {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBackToSelect}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background-surface rounded-lg transition-colors"
          >
            <ArrowLeftIcon />
            Back
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <SparklesIcon />
              Prompt Coach
            </h1>
            <p className="text-sm text-text-tertiary">
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
            onGenerateComplete={() => {
              // For the new UX 2025, generation happens inline in the chat
              // Asset is displayed in the chat UI - no additional action needed
            }}
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
      <div className="space-y-8">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToSelect}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background-surface rounded-lg transition-colors"
          >
            <ArrowLeftIcon />
            Back
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Describe Your Asset</h1>
            <p className="text-sm text-text-tertiary">
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

        {/* Logo Options */}
        {selectedBrandKitId && (
          <LogoOptionsPanel
            hasLogo={hasLogo}
            includeLogo={includeLogo}
            logoPosition={logoPosition}
            logoSize={logoSize}
            onIncludeLogoChange={setIncludeLogo}
            onPositionChange={setLogoPosition}
            onSizeChange={setLogoSize}
          />
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-interactive-600 to-interactive-700 flex items-center justify-center text-white shadow-lg shadow-interactive-600/20">
              <SparklesIcon />
            </span>
            Create Asset
          </h1>
          <p className="mt-2 text-text-secondary">
            Generate AI-powered assets for your streams and content
          </p>
        </div>
        {/* Usage Indicator */}
        <UsageDisplay 
          variant="minimal" 
          showUpgrade={false}
        />
      </div>

      {/* Vibe Kit Banner */}
      {isVibeKit && (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <p className="text-sm text-purple-300">
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
              <h3 className="font-medium text-red-400">Generation limit reached</h3>
              <p className="text-sm text-text-secondary mt-1">
                You've used all your generations for this period. Upgrade to continue creating.
              </p>
              <button
                onClick={() => router.push('/dashboard/settings?tab=billing')}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Filter */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">Platform</label>
        <PlatformFilter selected={platform} onChange={setPlatform} />
      </div>

      {/* Asset Type Selection */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">Asset Type</label>
        <AssetTypeSelector
          platform={platform}
          selected={selectedAssetType}
          onChange={setSelectedAssetType}
        />
      </div>

      {/* Brand Kit Selection (Optional) */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Brand Kit <span className="text-text-muted font-normal">(Optional)</span>
        </label>
        <BrandKitSelector
          brandKits={brandKits}
          selected={selectedBrandKitId}
          onChange={setSelectedBrandKitId}
          isLoading={isLoadingBrandKits}
        />
      </div>

      {/* Prompt Method Selection - Only show when selections are complete */}
      {canProceedToPrompt && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            How would you like to describe your asset?
          </label>
          <PromptMethodSelector
            onSelectManual={handleSelectManualPrompt}
            onSelectCoach={handleSelectCoach}
            isPremium={isPremium}
          />
        </div>
      )}
    </div>
  );
}
