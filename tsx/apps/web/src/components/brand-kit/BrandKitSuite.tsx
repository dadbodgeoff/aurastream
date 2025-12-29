'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface BrandKitSuiteProps {
  brandKitId?: string;
}

export function BrandKitSuite({ brandKitId }: BrandKitSuiteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = !brandKitId;

  // Get initial panel from URL or default to overview
  const initialPanel = (searchParams.get('panel') as PanelId) || 'overview';
  const [activePanel, setActivePanel] = useState<PanelId>(initialPanel);

  // API hooks
  const { data: brandKit, isLoading } = useBrandKit(brandKitId || '');
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

  // Save handlers
  const handleSaveIdentity = async () => {
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
            console.error('Failed to upload logo:', logoErr);
            // Continue anyway - brand kit was created
          }
          setPendingLogoFile(null);
        }
        
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
      }
    } catch (err) {
      console.error('Failed to save identity:', err);
    }
  };

  const handleSaveColors = async () => {
    if (!brandKitId) return;
    try {
      await updateColorsMutation.mutateAsync({ brandKitId, colors });
    } catch (err) {
      console.error('Failed to save colors:', err);
    }
  };

  const handleSaveTypography = async () => {
    if (!brandKitId) return;
    try {
      await updateTypographyMutation.mutateAsync({ brandKitId, typography });
    } catch (err) {
      console.error('Failed to save typography:', err);
    }
  };

  const handleSaveVoice = async () => {
    if (!brandKitId) return;
    try {
      await updateVoiceMutation.mutateAsync({ brandKitId, voice });
    } catch (err) {
      console.error('Failed to save voice:', err);
    }
  };

  const handleSaveGuidelines = async () => {
    if (!brandKitId) return;
    try {
      await updateGuidelinesMutation.mutateAsync({ brandKitId, guidelines });
    } catch (err) {
      console.error('Failed to save guidelines:', err);
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

  if (isLoading && brandKitId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-interactive-600/30 border-t-interactive-600 rounded-full animate-spin" />
          <p className="text-text-secondary">Loading brand kit...</p>
        </div>
      </div>
    );
  }

  return (
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
  );
}
