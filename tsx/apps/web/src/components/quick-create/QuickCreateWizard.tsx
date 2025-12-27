'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useBrandKits, useLogos, useGenerateAsset } from '@aurastream/api-client';
import type { LogoPosition, LogoSize } from '@aurastream/api-client';

import { StepIndicator } from './shared';
import { BoltIcon } from './icons';
import { TemplateGrid, CustomizeForm, ReviewPanel } from './panels';
import type { QuickTemplate, TemplateCategory, WizardStep } from './types';

const STEPS = ['Choose Template', 'Customize', 'Review'];

export function QuickCreateWizard() {
  const router = useRouter();
  const { data: brandKitsData, isLoading } = useBrandKits();
  const generateMutation = useGenerateAsset();

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

  const brandKits = brandKitsData?.brandKits ?? [];
  const { data: logosData } = useLogos(brandKitId || undefined);
  const hasLogo = logosData?.logos?.primary != null;

  // Auto-select active brand kit
  useMemo(() => {
    if (!brandKitId && brandKits.length > 0) {
      const active = brandKits.find(k => k.is_active);
      if (active) setBrandKitId(active.id);
    }
  }, [brandKits, brandKitId]);

  const stepIndex = step === 'select' ? 0 : step === 'customize' ? 1 : 2;

  const isFormValid = useMemo(() => {
    if (!template) return false;
    return template.fields.filter(f => f.required).every(f => formValues[f.id]?.trim());
  }, [template, formValues]);

  const selectedVibeOption = useMemo(() => {
    if (!template || !selectedVibe) return null;
    return template.vibes.find(v => v.id === selectedVibe) || null;
  }, [template, selectedVibe]);

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
    if (!template || !selectedVibe) return '';
    
    const parts: string[] = [];
    
    // Template and vibe identifier (backend uses this to load YAML prompt)
    parts.push(`__quick_create__:${template.id}:${selectedVibe}`);
    
    // User field values (these get injected into placeholders)
    template.fields.forEach(f => {
      const v = formValues[f.id];
      if (v) parts.push(`${f.id}:${v}`);
    });
    
    return parts.join(' | ');
  }, [template, formValues, selectedVibe]);

  const handleGenerate = async () => {
    if (!template || !selectedVibe) return;
    try {
      // Determine the asset type - for emotes, use platform + size-specific type
      let assetType = template.assetType;
      if (template.id === 'emote' && formValues.size && formValues.platform) {
        // Build platform-specific emote type: twitch_emote_112, tiktok_emote_300, etc.
        assetType = `${formValues.platform}_emote_${formValues.size}`;
      }
      
      const result = await generateMutation.mutateAsync({
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
      // Redirect to generation progress page with SSE streaming
      router.push(`/dashboard/generate/${result.id}`);
    } catch (e) {
      console.error('Generation failed:', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-interactive-600 to-interactive-500 flex items-center justify-center shadow-lg shadow-interactive-600/25">
          <BoltIcon />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Quick Create</h1>
          <p className="text-text-secondary">Professional templates, instant results</p>
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

      {step === 'customize' && template && (
        <CustomizeForm
          template={template}
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

      {step === 'review' && template && (
        <ReviewPanel
          template={template}
          formValues={formValues}
          selectedVibe={selectedVibeOption}
          brandKitName={brandKits.find(k => k.id === brandKitId)?.name || null}
          includeLogo={includeLogo && hasLogo}
          logoPosition={logoPosition}
          logoSize={logoSize}
          onBack={() => setStep('customize')}
          onGenerate={handleGenerate}
          isGenerating={generateMutation.isPending}
          error={generateMutation.error}
        />
      )}
    </div>
  );
}
