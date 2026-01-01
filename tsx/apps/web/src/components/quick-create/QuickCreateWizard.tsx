'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBrandKits, useLogos, useGenerateAsset, useTemplate } from '@aurastream/api-client';
import type { LogoPosition, LogoSize, ClassifiedError } from '@aurastream/api-client';
import { showErrorToast, showSuccessToast } from '@/utils/errorMessages';

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
      router.push(`/dashboard/generate/${data.id}`);
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

    // Merge fields: use backend fields, but keep frontend-only fields (like dynamic_select)
    const backendFieldIds = new Set(backendTemplate.fields.map(f => f.id));
    const frontendOnlyFields = template.fields.filter(f => 
      !backendFieldIds.has(f.id) && (f.type === 'dynamic_select' || f.dependsOn)
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
    
    generateMutation.mutate({
      assetType: assetType as any,
      brandKitId: brandKitId || undefined,
      customPrompt: buildPrompt(),
      brandCustomization: brandKitId ? {
        include_logo: includeLogo && hasLogo,
        logo_type: 'primary' as const,
        logo_position: logoPosition,
        logo_size: logoSize,
        brand_intensity: 'balanced' as const,
      } : undefined,
    });
  };

  return (
    <div className="max-w-5xl mx-auto pb-8">
      {/* Header - More refined */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/25 ring-1 ring-white/10">
          <BoltIcon />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-primary tracking-tight">Quick Create</h1>
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
          isFormValid={isFormValid}
          onBack={() => { setStep('select'); setTemplate(null); setSelectedVibe(''); }}
          onNext={() => setStep('review')}
          isLoading={isLoading}
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
          isGenerating={generateMutation.isPending}
          error={generateMutation.error}
          classifiedError={generateMutation.classifiedError}
        />
      )}
    </div>
  );
}
