'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBrandKits, useLogos, useGenerateAsset, useTemplate } from '@aurastream/api-client';
import type { LogoPosition, LogoSize, LogoType, BrandIntensity, ClassifiedError, MediaAsset } from '@aurastream/api-client';
import { showErrorToast, showSuccessToast } from '@/utils/errorMessages';
import type { AssetPlacement } from '../media-library/placement';
import { serializePlacements } from '@aurastream/api-client';
import { getCanvasDimensions } from '../media-library/placement/constants';
import { useCanvasGeneration } from '../../hooks/useCanvasGeneration';

import { StepIndicator } from './shared';
import { BoltIcon } from './icons';
import { TemplateGrid, CustomizeForm, ReviewPanel } from './panels';
import { getVibeUIMeta } from './constants';
import type { QuickTemplate, TemplateCategory, WizardStep, TemplateField } from './types';

const STEPS = ['Choose Template', 'Customize', 'Review'];

export function QuickCreateWizard() {
  const router = useRouter();
  const { data: brandKitsData, isLoading } = useBrandKits();
  
  // Enhanced generation mutation with enterprise error handling
  const generateMutation = useGenerateAsset({
    onSuccess: (data) => {
      // Redirect to generation progress page with SSE streaming
      router.push(`/intel/generate/${data.id}`);
    },
    onError: (classifiedError: ClassifiedError) => {
      // Show appropriate error toast based on error type
      handleGenerationError(classifiedError);
    },
  });

  // State
  const [step, setStep] = useState<WizardStep>('select');
  const [category, setCategory] = useState<TemplateCategory>('all');
  const [template, setTemplate] = useState<QuickTemplate | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<string>('');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [brandKitId, setBrandKitId] = useState('');
  const [includeLogo, setIncludeLogo] = useState(false);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('bottom-right');
  const [logoSize, setLogoSize] = useState<LogoSize>('medium');
  const [logoType, setLogoType] = useState<LogoType>('primary');
  const [brandIntensity, setBrandIntensity] = useState<BrandIntensity>('balanced');
  
  // Media Library assets for injection (Pro/Studio only)
  const [selectedMediaAssets, setSelectedMediaAssets] = useState<MediaAsset[]>([]);
  // Asset placements with precise positioning
  const [mediaAssetPlacements, setMediaAssetPlacements] = useState<AssetPlacement[]>([]);
  // Sketch elements for canvas annotations
  const [sketchElements, setSketchElements] = useState<import('../media-library/canvas-export/types').AnySketchElement[]>([]);

  // Canvas generation hook for preparing snapshot at generation time
  // We need to get dimensions based on template, so we use a default until template is selected
  const canvasDimensions = template ? getCanvasDimensions(template.assetType) : { width: 1280, height: 720 };
  const { prepareCanvasForGeneration, isPreparing: isPreparingCanvas } = useCanvasGeneration({
    width: canvasDimensions.width,
    height: canvasDimensions.height,
    assetType: template?.assetType || 'thumbnail',
  });

  // Handle generation errors with appropriate toasts
  const handleGenerationError = useCallback((error: ClassifiedError) => {
    switch (error.code) {
      case 'GENERATION_RATE_LIMIT':
        showErrorToast(
          { code: error.code, message: error.message },
          {
            onRetry: error.retryAfter 
              ? undefined // Don't show retry if there's a cooldown
              : () => generateMutation.retry(),
          }
        );
        break;
      case 'GENERATION_LIMIT_EXCEEDED':
        showErrorToast(
          { code: error.code, message: error.message },
          {
            onUpgrade: () => router.push('/pricing'),
          }
        );
        break;
      case 'GENERATION_CONTENT_POLICY':
        showErrorToast(
          { code: error.code, message: error.message },
          {
            onNavigate: (path) => router.push(path),
          }
        );
        break;
      default:
        // For retryable errors, show retry action
        showErrorToast(
          { code: error.code, message: error.message },
          {
            onRetry: error.retryable ? () => generateMutation.retry() : undefined,
          }
        );
    }
  }, [generateMutation, router]);

  // Fetch dynamic fields from backend when template is selected
  const { data: backendTemplate } = useTemplate(template?.id ?? null);

  const brandKits = brandKitsData?.brandKits ?? [];
  const { data: logosData } = useLogos(brandKitId || undefined);
  const hasLogo = logosData?.logos?.primary != null;

  // Merge backend fields with frontend template
  // Backend fields take precedence (they have the latest placeholders)
  const mergedTemplate = useMemo(() => {
    if (!template) return null;
    if (!backendTemplate) return template;

    // Merge fields: use backend fields, but keep frontend-only fields
    // This includes platform/size for emotes (dynamic_select)
    const backendFieldIds = new Set(backendTemplate.fields.map(f => f.id));
    // Keep ALL frontend fields that don't exist in backend
    const frontendOnlyFields = template.fields.filter(f => 
      !backendFieldIds.has(f.id)
    );

    // Convert backend fields to frontend format
    const convertedBackendFields: TemplateField[] = backendTemplate.fields.map(f => ({
      id: f.id,
      label: f.label,
      type: f.type as any,
      required: f.required,
      placeholder: f.placeholder,
      hint: f.hint,
      description: f.description,
      maxLength: f.maxLength,
      options: f.options,
      default: f.default,
      showForVibes: f.showForVibes,
      // Color picker presets
      presets: f.presets,
      showPresets: f.showPresets,
    }));

    // Merge vibes: use backend vibes but add UI metadata from frontend
    const mergedVibes = backendTemplate.vibes.map(bv => {
      const uiMeta = getVibeUIMeta(template.id, bv.id);
      return {
        id: bv.id,
        name: bv.name,
        tagline: uiMeta.tagline || bv.description || '',
        icon: uiMeta.icon || '✨',
        gradient: uiMeta.gradient || 'from-primary-600 to-primary-800',
      };
    });

    return {
      ...template,
      fields: [...convertedBackendFields, ...frontendOnlyFields],
      vibes: mergedVibes.length > 0 ? mergedVibes : template.vibes,
    };
  }, [template, backendTemplate]);

  // Auto-select active brand kit
  useMemo(() => {
    if (!brandKitId && brandKits.length > 0) {
      const active = brandKits.find(k => k.is_active);
      if (active) setBrandKitId(active.id);
    }
  }, [brandKits, brandKitId]);

  // Initialize form values with defaults when template changes
  useEffect(() => {
    if (mergedTemplate && Object.keys(formValues).length === 0) {
      const defaults: Record<string, string> = {};
      mergedTemplate.fields.forEach(f => {
        if (f.default && !f.required) {
          // Only set defaults for optional fields
          defaults[f.id] = f.default;
        }
      });
      if (Object.keys(defaults).length > 0) {
        setFormValues(prev => ({ ...defaults, ...prev }));
      }
    }
  }, [mergedTemplate, formValues]);

  const stepIndex = step === 'select' ? 0 : step === 'customize' ? 1 : 2;

  const isFormValid = useMemo(() => {
    if (!mergedTemplate) return false;
    return mergedTemplate.fields.filter(f => f.required).every(f => formValues[f.id]?.trim());
  }, [mergedTemplate, formValues]);

  const selectedVibeOption = useMemo(() => {
    if (!mergedTemplate || !selectedVibe) return null;
    return mergedTemplate.vibes.find(v => v.id === selectedVibe) || null;
  }, [mergedTemplate, selectedVibe]);

  const handleSelectTemplate = useCallback((t: QuickTemplate) => {
    setTemplate(t);
    setFormValues({});
    // Auto-select first vibe
    setSelectedVibe(t.vibes[0]?.id || '');
    setStep('customize');
  }, []);

  const handleFieldChange = useCallback((id: string, val: string) => {
    setFormValues(prev => ({ ...prev, [id]: val }));
  }, []);

  /**
   * Build the custom prompt that gets sent to backend.
   * Format: template_id:vibe_id | field1:value1 | field2:value2
   * 
   * The backend will use template_id and vibe_id to load the actual
   * proprietary prompt from YAML files.
   */
  const buildPrompt = useCallback(() => {
    if (!mergedTemplate || !selectedVibe) return '';
    
    const parts: string[] = [];
    
    // Template and vibe identifier (backend uses this to load YAML prompt)
    parts.push(`__quick_create__:${mergedTemplate.id}:${selectedVibe}`);
    
    // User field values (these get injected into placeholders)
    mergedTemplate.fields.forEach(f => {
      const v = formValues[f.id];
      if (v) parts.push(`${f.id}:${v}`);
    });
    
    return parts.join(' | ');
  }, [mergedTemplate, formValues, selectedVibe]);

  const handleGenerate = async () => {
    if (!mergedTemplate || !selectedVibe) return;
    
    // Determine the asset type - for emotes, use platform + size-specific type
    let assetType = mergedTemplate.assetType;
    if (mergedTemplate.id === 'emote' && formValues.size && formValues.platform) {
      // Build platform-specific emote type: twitch_emote_112, tiktok_emote_300, etc.
      assetType = `${formValues.platform}_emote_${formValues.size}`;
    }
    
    // Check if we should use canvas snapshot mode
    const hasCanvasContent = mediaAssetPlacements.length > 0 || sketchElements.length > 0;
    
    // Prepare canvas snapshot if there's canvas content
    let canvasSnapshotUrl: string | undefined;
    let canvasSnapshotDescription: string | undefined;
    
    if (hasCanvasContent) {
      try {
        console.log('[CANVAS DEBUG] QuickCreate: Preparing canvas snapshot...', {
          placementsCount: mediaAssetPlacements.length,
          sketchElementsCount: sketchElements.length,
        });
        
        const canvasResult = await prepareCanvasForGeneration(
          mediaAssetPlacements,
          sketchElements,
          [] // No labeled regions in Quick Create
        );
        canvasSnapshotUrl = canvasResult.snapshotUrl;
        canvasSnapshotDescription = canvasResult.description;
        
        console.log('[CANVAS DEBUG] QuickCreate: Canvas snapshot prepared', {
          snapshotUrl: canvasSnapshotUrl,
          description: canvasSnapshotDescription,
        });
      } catch (canvasError) {
        console.error('[CANVAS DEBUG] QuickCreate: Canvas snapshot preparation failed:', canvasError);
        // Fall back to regular placements mode - don't fail the generation
      }
    }
    
    // Extract media asset IDs for injection (fallback if no placements and no canvas snapshot)
    const mediaAssetIds = selectedMediaAssets.length > 0 && mediaAssetPlacements.length === 0 && !canvasSnapshotUrl
      ? selectedMediaAssets.map(a => a.id) 
      : undefined;
    
    // Serialize placements for API if present and NOT using canvas snapshot
    const serializedPlacements = !canvasSnapshotUrl && mediaAssetPlacements.length > 0
      ? serializePlacements(mediaAssetPlacements)
      : undefined;
    
    // DEBUG: Log what we're sending to the API
    console.log('[CANVAS DEBUG] QuickCreate: Calling generateMutation with:', {
      assetType,
      hasCanvasSnapshotUrl: !!canvasSnapshotUrl,
      canvasSnapshotUrl,
      canvasSnapshotDescription,
      mediaAssetIds,
      serializedPlacements: serializedPlacements?.length,
    });
    
    generateMutation.mutate({
      assetType: assetType as any,
      brandKitId: brandKitId || undefined,
      customPrompt: buildPrompt(),
      brandCustomization: brandKitId ? {
        include_logo: includeLogo && hasLogo,
        logo_type: logoType,
        logo_position: logoPosition,
        logo_size: logoSize,
        brand_intensity: brandIntensity,
      } : undefined,
      mediaAssetIds,
      mediaAssetPlacements: serializedPlacements,
      // Canvas snapshot mode - more cost-effective for complex compositions
      canvasSnapshotUrl,
      canvasSnapshotDescription,
    });
  };

  return (
    <div className="max-w-5xl mx-auto pb-6">
      {/* Header - Compact */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/20 ring-1 ring-white/10">
          <BoltIcon />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-text-primary tracking-tight">Quick Create</h1>
          <p className="text-xs text-text-secondary">Professional templates, instant results</p>
        </div>
      </div>

      <StepIndicator currentStep={stepIndex} steps={STEPS} />

      {step === 'select' && (
        <TemplateGrid
          category={category}
          onCategoryChange={setCategory}
          onSelect={handleSelectTemplate}
        />
      )}

      {step === 'customize' && mergedTemplate && (
        <CustomizeForm
          template={mergedTemplate}
          formValues={formValues}
          onFieldChange={handleFieldChange}
          selectedVibe={selectedVibe}
          onVibeChange={setSelectedVibe}
          brandKits={brandKits}
          selectedBrandKitId={brandKitId}
          onBrandKitChange={setBrandKitId}
          includeLogo={includeLogo}
          onIncludeLogoChange={setIncludeLogo}
          hasLogo={hasLogo}
          logoPosition={logoPosition}
          onLogoPositionChange={(v) => setLogoPosition(v as LogoPosition)}
          logoSize={logoSize}
          onLogoSizeChange={(v) => setLogoSize(v as LogoSize)}
          logoType={logoType}
          onLogoTypeChange={(v) => setLogoType(v as LogoType)}
          brandIntensity={brandIntensity}
          onBrandIntensityChange={(v) => setBrandIntensity(v as BrandIntensity)}
          isFormValid={isFormValid}
          onBack={() => { setStep('select'); setTemplate(null); setSelectedVibe(''); }}
          onNext={() => setStep('review')}
          isLoading={isLoading}
          selectedMediaAssets={selectedMediaAssets}
          onMediaAssetsChange={setSelectedMediaAssets}
          mediaAssetPlacements={mediaAssetPlacements}
          onMediaAssetPlacementsChange={setMediaAssetPlacements}
          sketchElements={sketchElements}
          onSketchElementsChange={setSketchElements}
        />
      )}

      {step === 'review' && mergedTemplate && (
        <ReviewPanel
          template={mergedTemplate}
          formValues={formValues}
          selectedVibe={selectedVibeOption}
          brandKitName={brandKits.find(k => k.id === brandKitId)?.name || null}
          includeLogo={includeLogo && hasLogo}
          logoPosition={logoPosition}
          logoSize={logoSize}
          onBack={() => setStep('customize')}
          onGenerate={handleGenerate}
          onRetry={() => generateMutation.retry()}
          isGenerating={generateMutation.isPending || isPreparingCanvas}
          error={generateMutation.error}
          classifiedError={generateMutation.classifiedError}
          selectedMediaAssets={selectedMediaAssets}
          mediaAssetPlacements={mediaAssetPlacements}
          sketchElements={sketchElements}
        />
      )}
    </div>
  );
}
