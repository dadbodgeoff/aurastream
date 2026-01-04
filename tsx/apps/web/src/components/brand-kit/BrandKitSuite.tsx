'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useBrandKit,
  useCreateBrandKit,
  useUpdateBrandKit,
  useExtendedColors,
  useUpdateExtendedColors,
  useTypography as useTypographyHook,
  useUpdateTypography,
  useBrandVoice as useBrandVoiceHook,
  useUpdateBrandVoice,
  useBrandGuidelines,
  useUpdateBrandGuidelines,
  useUploadLogo,
  DEFAULT_COLOR_PALETTE,
  DEFAULT_TYPOGRAPHY,
  DEFAULT_BRAND_VOICE,
  DEFAULT_BRAND_GUIDELINES,
  type BrandKitTone,
} from '@aurastream/api-client';

import { BrandKitNav } from './BrandKitNav';
import {
  OverviewPanel,
  IdentityPanel,
  LogosPanel,
  ColorsPanel,
  TypographyPanel,
  VoicePanel,
  GuidelinesPanel,
} from './panels';
import {
  type PanelId,
  type BrandKitIdentity,
  type BrandKitState,
  calculateCompletionStatus,
} from './types';
import { DEFAULT_IDENTITY } from './constants';
import { showSuccessToast, showErrorToast } from '@/utils/errorMessages';
import { AsyncErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorRecovery } from '@/components/ErrorRecovery';
import { BrandKitCardSkeleton } from '@/components/ui/skeletons';

interface BrandKitSuiteProps {
  brandKitId?: string;
}

/**
 * Brand Kit Suite with Enterprise UX Patterns
 * 
 * Features:
 * - AsyncErrorBoundary for error handling
 * - Loading skeletons during data fetch
 * - showSuccessToast/showErrorToast for user feedback
 * - Proper error recovery with retry options
 */
export function BrandKitSuite({ brandKitId }: BrandKitSuiteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = !brandKitId;

  // Get initial panel from URL or default to overview
  const initialPanel = (searchParams.get('panel') as PanelId) || 'overview';
  const [activePanel, setActivePanel] = useState<PanelId>(initialPanel);

  // API hooks
  const { data: brandKit, isLoading, error: loadError, refetch } = useBrandKit(brandKitId || '');
  const createMutation = useCreateBrandKit();
  const updateMutation = useUpdateBrandKit();

  // Extended data hooks (only when editing)
  const { data: extendedColorsData } = useExtendedColors(brandKitId);
  const { data: typographyData } = useTypographyHook(brandKitId);
  const { data: voiceData } = useBrandVoiceHook(brandKitId);
  const { data: guidelinesData } = useBrandGuidelines(brandKitId);

  // Extended mutations
  const updateColorsMutation = useUpdateExtendedColors();
  const updateTypographyMutation = useUpdateTypography();
  const updateVoiceMutation = useUpdateBrandVoice();
  const updateGuidelinesMutation = useUpdateBrandGuidelines();

  // Local state
  const [identity, setIdentity] = useState<BrandKitIdentity>(DEFAULT_IDENTITY);
  const [colors, setColors] = useState(DEFAULT_COLOR_PALETTE);
  const [typography, setTypography] = useState(DEFAULT_TYPOGRAPHY);
  const [voice, setVoice] = useState(DEFAULT_BRAND_VOICE);
  const [guidelines, setGuidelines] = useState(DEFAULT_BRAND_GUIDELINES);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);

  // Logo upload mutation
  const uploadLogoMutation = useUploadLogo();
  
  // Track in-progress saves to prevent concurrent mutations
  const savingRef = useRef<Set<string>>(new Set());

  // Populate from API data
  useEffect(() => {
    if (brandKit) {
      setIdentity({
        name: brandKit.name || '',
        primaryColors: brandKit.primary_colors || ['#21808D'],
        accentColors: brandKit.accent_colors || [],
        headlineFont: brandKit.fonts?.headline || 'Montserrat',
        bodyFont: brandKit.fonts?.body || 'Inter',
        tone: (brandKit.tone as BrandKitTone) || 'professional',
        styleReference: brandKit.style_reference || '',
      });
    }
  }, [brandKit]);

  useEffect(() => {
    if (extendedColorsData?.colors) setColors(extendedColorsData.colors);
  }, [extendedColorsData]);

  useEffect(() => {
    if (typographyData?.typography) setTypography(typographyData.typography);
  }, [typographyData]);

  useEffect(() => {
    if (voiceData?.voice) setVoice(voiceData.voice);
  }, [voiceData]);

  useEffect(() => {
    if (guidelinesData?.guidelines) setGuidelines(guidelinesData.guidelines);
  }, [guidelinesData]);

  // Navigation with URL update
  const handleNavigate = useCallback((panel: PanelId) => {
    setActivePanel(panel);
    const url = new URL(window.location.href);
    url.searchParams.set('panel', panel);
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Save handlers with enterprise toast feedback and mutation deduplication
  const handleSaveIdentity = async () => {
    // Prevent concurrent identity saves
    if (savingRef.current.has('identity')) return;
    savingRef.current.add('identity');
    
    try {
      if (isNew) {
        const result = await createMutation.mutateAsync({
          name: identity.name || 'Untitled Brand Kit',
          primary_colors: identity.primaryColors.filter(c => c),
          accent_colors: identity.accentColors.filter(c => c),
          fonts: { headline: identity.headlineFont, body: identity.bodyFont },
          tone: identity.tone,
          style_reference: identity.styleReference,
        });
        
        // Upload pending logo if one was selected
        if (pendingLogoFile && result.id) {
          try {
            await uploadLogoMutation.mutateAsync({
              brandKitId: result.id,
              logoType: 'primary',
              file: pendingLogoFile,
            });
          } catch (logoErr) {
            // Show warning but don't fail - brand kit was created
            showErrorToast({ code: 'BRAND_KIT_UPLOAD_FAILED' }, {
              onRetry: () => {
                if (result.id) {
                  uploadLogoMutation.mutate({
                    brandKitId: result.id,
                    logoType: 'primary',
                    file: pendingLogoFile!,
                  });
                }
              },
            });
          }
          setPendingLogoFile(null);
        }
        
        // Show success toast with action
        showSuccessToast('Brand kit created!', {
          description: `"${result.name}" is ready to use`,
          actionLabel: 'View Brand Kit',
          onAction: () => router.push(`/dashboard/brand-kits?id=${result.id}&panel=overview`),
        });
        
        // Redirect to edit mode with the new ID
        router.push(`/dashboard/brand-kits?id=${result.id}&panel=overview`);
      } else if (brandKitId) {
        await updateMutation.mutateAsync({
          id: brandKitId,
          data: {
            name: identity.name,
            primary_colors: identity.primaryColors.filter(c => c),
            accent_colors: identity.accentColors.filter(c => c),
            fonts: { headline: identity.headlineFont, body: identity.bodyFont },
            tone: identity.tone,
            style_reference: identity.styleReference,
          },
        });
        
        showSuccessToast('Brand kit updated!', {
          description: 'Your changes have been saved',
        });
      }
    } catch (err) {
      showErrorToast(err, {
        onRetry: handleSaveIdentity,
        onNavigate: (path) => router.push(path),
      });
    } finally {
      savingRef.current.delete('identity');
    }
  };

  const handleSaveColors = async () => {
    if (!brandKitId || savingRef.current.has('colors')) return;
    savingRef.current.add('colors');
    
    try {
      await updateColorsMutation.mutateAsync({ brandKitId, colors });
      showSuccessToast('Colors saved!', {
        description: 'Your color palette has been updated',
      });
    } catch (err) {
      showErrorToast(err, {
        onRetry: handleSaveColors,
      });
    } finally {
      savingRef.current.delete('colors');
    }
  };

  const handleSaveTypography = async () => {
    if (!brandKitId || savingRef.current.has('typography')) return;
    savingRef.current.add('typography');
    
    try {
      await updateTypographyMutation.mutateAsync({ brandKitId, typography });
      showSuccessToast('Typography saved!', {
        description: 'Your font settings have been updated',
      });
    } catch (err) {
      showErrorToast(err, {
        onRetry: handleSaveTypography,
      });
    } finally {
      savingRef.current.delete('typography');
    }
  };

  const handleSaveVoice = async () => {
    if (!brandKitId || savingRef.current.has('voice')) return;
    savingRef.current.add('voice');
    
    try {
      await updateVoiceMutation.mutateAsync({ brandKitId, voice });
      showSuccessToast('Brand voice saved!', {
        description: 'Your tone and messaging settings have been updated',
      });
    } catch (err) {
      showErrorToast(err, {
        onRetry: handleSaveVoice,
      });
    } finally {
      savingRef.current.delete('voice');
    }
  };

  const handleSaveGuidelines = async () => {
    if (!brandKitId || savingRef.current.has('guidelines')) return;
    savingRef.current.add('guidelines');
    
    try {
      await updateGuidelinesMutation.mutateAsync({ brandKitId, guidelines });
      showSuccessToast('Guidelines saved!', {
        description: 'Your brand guidelines have been updated',
      });
    } catch (err) {
      showErrorToast(err, {
        onRetry: handleSaveGuidelines,
      });
    } finally {
      savingRef.current.delete('guidelines');
    }
  };

  // Build state for completion calculation
  const state: BrandKitState = {
    id: brandKitId || null,
    identity,
    colors,
    typography,
    voice,
    guidelines,
    logos: { primary: null, secondary: null, icon: null, monochrome: null, watermark: null },
    isActive: brandKit?.is_active || false,
    isDirty: false,
  };

  const completionStatus = calculateCompletionStatus(state);

  // Loading state with skeleton
  if (isLoading && brandKitId) {
    return (
      <div className="flex h-[calc(100vh-4rem)] -m-8">
        {/* Side Navigation Skeleton */}
        <div className="w-64 border-r border-border-subtle bg-background-surface/50 p-4 space-y-4">
          <div className="h-8 w-32 bg-background-surface/60 rounded-lg animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-10 bg-background-surface/60 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        
        {/* Main Content Skeleton */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="h-8 w-48 bg-background-surface/60 rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-background-surface/60 rounded-lg animate-pulse" />
            <BrandKitCardSkeleton count={2} />
          </div>
        </div>
      </div>
    );
  }

  // Error state with recovery
  if (loadError && brandKitId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <ErrorRecovery
          error={loadError}
          onRetry={() => { refetch(); }}
          variant="card"
          customActions={[
            {
              label: 'Back to Brand Kits',
              onClick: () => router.push('/dashboard/brand-kits'),
              variant: 'secondary',
            },
          ]}
        />
      </div>
    );
  }

  return (
    <AsyncErrorBoundary resourceName="Brand Kit Editor" onRefetch={() => refetch()}>
      <div className="flex h-[calc(100vh-4rem)] -m-8">
        {/* Side Navigation */}
        <BrandKitNav
          activePanel={activePanel}
          onNavigate={handleNavigate}
          completionStatus={completionStatus}
          brandKitName={identity.name}
          isNew={isNew}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-8">
            {/* Panel Content */}
            {activePanel === 'overview' && (
              <OverviewPanel
                identity={identity}
                completionStatus={completionStatus}
                onNavigate={handleNavigate}
                isNew={isNew}
                isActive={brandKit?.is_active || false}
                currentBrandKitId={brandKitId}
              />
            )}

            {activePanel === 'identity' && (
              <IdentityPanel
                brandKitId={brandKitId || null}
                isNew={isNew}
                onNavigate={handleNavigate}
                identity={identity}
                onChange={setIdentity}
                onSave={handleSaveIdentity}
                isSaving={createMutation.isPending || updateMutation.isPending || uploadLogoMutation.isPending}
                pendingLogoFile={pendingLogoFile}
                onPendingLogoChange={setPendingLogoFile}
              />
            )}

            {activePanel === 'logos' && (
              <LogosPanel
                brandKitId={brandKitId || null}
                isNew={isNew}
                onNavigate={handleNavigate}
                logos={{ primary: null, secondary: null, icon: null, monochrome: null, watermark: null }}
              />
            )}

            {activePanel === 'colors' && (
              <ColorsPanel
                brandKitId={brandKitId || null}
                isNew={isNew}
                onNavigate={handleNavigate}
                colors={colors}
                onChange={setColors}
                onSave={handleSaveColors}
                isSaving={updateColorsMutation.isPending}
              />
            )}

            {activePanel === 'typography' && (
              <TypographyPanel
                brandKitId={brandKitId || null}
                isNew={isNew}
                onNavigate={handleNavigate}
                typography={typography}
                onChange={setTypography}
                onSave={handleSaveTypography}
                isSaving={updateTypographyMutation.isPending}
              />
            )}

            {activePanel === 'voice' && (
              <VoicePanel
                brandKitId={brandKitId || null}
                isNew={isNew}
                onNavigate={handleNavigate}
                voice={voice}
                onChange={setVoice}
                onSave={handleSaveVoice}
                isSaving={updateVoiceMutation.isPending}
              />
            )}

            {activePanel === 'guidelines' && (
              <GuidelinesPanel
                brandKitId={brandKitId || null}
                isNew={isNew}
                onNavigate={handleNavigate}
                guidelines={guidelines}
                onChange={setGuidelines}
                onSave={handleSaveGuidelines}
                isSaving={updateGuidelinesMutation.isPending}
              />
            )}
          </div>
        </div>
      </div>
    </AsyncErrorBoundary>
  );
}
