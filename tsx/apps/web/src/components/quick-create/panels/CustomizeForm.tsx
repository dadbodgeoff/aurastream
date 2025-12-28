'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SectionCard } from '../shared';
import { ChevronLeftIcon, CheckIcon, ImageIcon } from '../icons';
import type { QuickTemplate, VibeOption } from '../types';

interface CustomizeFormProps {
  template: QuickTemplate;
  formValues: Record<string, string>;
  onFieldChange: (id: string, value: string) => void;
  selectedVibe: string;
  onVibeChange: (vibeId: string) => void;
  brandKits: { id: string; name: string; is_active: boolean; primary_colors: string[]; accent_colors: string[] }[];
  selectedBrandKitId: string;
  onBrandKitChange: (id: string) => void;
  includeLogo: boolean;
  onIncludeLogoChange: (v: boolean) => void;
  hasLogo: boolean;
  logoPosition: string;
  onLogoPositionChange: (v: string) => void;
  logoSize: string;
  onLogoSizeChange: (v: string) => void;
  isFormValid: boolean;
  onBack: () => void;
  onNext: () => void;
  isLoading: boolean;
}

const LOGO_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];
const LOGO_SIZES = ['small', 'medium', 'large'];

function VibeCard({ vibe, selected, onClick }: { vibe: VibeOption; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-xl border-2 text-left transition-all group overflow-hidden",
        selected 
          ? "border-interactive-600 bg-interactive-600/5 shadow-lg shadow-interactive-600/10" 
          : "border-border-subtle hover:border-border-default bg-background-surface/50"
      )}
    >
      {/* Gradient accent bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 transition-opacity",
        vibe.gradient,
        selected && "opacity-100"
      )} />
      
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br shrink-0",
          vibe.gradient
        )}>
          {vibe.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-text-primary">{vibe.name}</h4>
            {selected && (
              <div className="w-5 h-5 bg-interactive-600 rounded-full flex items-center justify-center text-white">
                <CheckIcon />
              </div>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-0.5 line-clamp-1">{vibe.tagline}</p>
        </div>
      </div>
    </button>
  );
}

export function CustomizeForm(props: CustomizeFormProps) {
  const { 
    template, formValues, onFieldChange, 
    selectedVibe, onVibeChange,
    brandKits, selectedBrandKitId, onBrandKitChange,
    includeLogo, onIncludeLogoChange, hasLogo, logoPosition, onLogoPositionChange,
    logoSize, onLogoSizeChange, isFormValid, onBack, onNext, isLoading 
  } = props;

  const isEmoteTemplate = template.id === 'emote';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ChevronLeftIcon />
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Header */}
      <SectionCard>
        <div className="flex items-center gap-4">
          <span className="text-4xl">{template.emoji}</span>
          <div>
            <h2 className="text-xl font-bold text-text-primary">{template.name}</h2>
            <p className="text-text-secondary">{template.tagline} • {template.dimensions}</p>
          </div>
        </div>
      </SectionCard>

      {/* Vibe Selection */}
      <SectionCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Choose Your Vibe</h3>
            <p className="text-sm text-text-tertiary mt-0.5">Select the visual style for your asset</p>
          </div>
          <span className="px-3 py-1 bg-interactive-600/10 text-interactive-600 text-xs font-medium rounded-full">
            {template.vibes.length} styles
          </span>
        </div>
        
        <div className={cn(
          "grid gap-3",
          isEmoteTemplate ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3"
        )}>
          {template.vibes.map(vibe => (
            <VibeCard
              key={vibe.id}
              vibe={vibe}
              selected={selectedVibe === vibe.id}
              onClick={() => onVibeChange(vibe.id)}
            />
          ))}
        </div>
      </SectionCard>

      {/* Fields */}
      <SectionCard>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Details</h3>
        <div className="space-y-4">
          {template.fields
            .filter(field => !field.showForVibes || field.showForVibes.includes(selectedVibe))
            .map(field => {
            // For dynamic_select, get options based on parent field value
            let options = field.options;
            if (field.type === 'dynamic_select' && field.dependsOn && field.optionsMap) {
              const parentValue = formValues[field.dependsOn] || '';
              options = field.optionsMap[parentValue] || [];
            }
            
            return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {field.label}{field.required && <span className="text-error-light ml-1">*</span>}
              </label>
              {(field.type === 'select' || field.type === 'dynamic_select') ? (
                <select
                  value={formValues[field.id] || ''}
                  onChange={(e) => {
                    onFieldChange(field.id, e.target.value);
                    // Clear dependent fields when parent changes
                    template.fields.forEach(f => {
                      if (f.dependsOn === field.id) {
                        onFieldChange(f.id, '');
                      }
                    });
                  }}
                  disabled={field.type === 'dynamic_select' && field.dependsOn ? !formValues[field.dependsOn] : false}
                  className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-interactive-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select...</option>
                  {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={formValues[field.id] || ''}
                  onChange={(e) => onFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600"
                />
              )}
              {field.hint && (
                <p className="mt-1.5 text-xs text-text-tertiary">{field.hint}</p>
              )}
            </div>
          )})}
        </div>
      </SectionCard>

      {/* Brand Kit */}
      <SectionCard>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Brand Kit</h3>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-3 border-interactive-600/30 border-t-interactive-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onBrandKitChange('')}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all",
                selectedBrandKitId === '' ? "border-interactive-600 bg-interactive-600/5" : "border-border-subtle hover:border-border-default"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎨</span>
                  <div>
                    <p className="font-medium text-text-primary">Let AI decide</p>
                    <p className="text-sm text-text-tertiary">Creative defaults</p>
                  </div>
                </div>
                {selectedBrandKitId === '' && <div className="w-5 h-5 bg-interactive-600 rounded-full flex items-center justify-center text-white"><CheckIcon /></div>}
              </div>
            </button>

            <div className="grid grid-cols-2 gap-3">
              {brandKits.map(kit => (
                <button
                  key={kit.id}
                  type="button"
                  onClick={() => onBrandKitChange(kit.id)}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    selectedBrandKitId === kit.id ? "border-interactive-600 bg-interactive-600/5" : "border-border-subtle hover:border-border-default"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{kit.name}</p>
                      <div className="flex gap-1 mt-2">
                        {[...(kit.primary_colors || []), ...(kit.accent_colors || [])].slice(0, 4).map((c, i) => (
                          <div key={i} className="w-4 h-4 rounded" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                    {selectedBrandKitId === kit.id && <div className="w-5 h-5 bg-interactive-600 rounded-full flex items-center justify-center text-white"><CheckIcon /></div>}
                  </div>
                </button>
              ))}
            </div>

            {brandKits.length === 0 && (
              <p className="text-center text-text-tertiary text-sm py-4">
                No brand kits. <Link href="/dashboard/brand-kits" className="text-interactive-600 hover:underline">Create one</Link>
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Logo Options */}
      {selectedBrandKitId && (
        <SectionCard>
          <h3 className="text-lg font-semibold text-text-primary mb-4">Logo</h3>
          <div className="flex items-center justify-between p-4 bg-background-base rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-background-elevated rounded-lg flex items-center justify-center text-text-muted"><ImageIcon /></div>
              <p className="font-medium text-text-primary">Include Logo</p>
            </div>
            <button
              type="button"
              onClick={() => onIncludeLogoChange(!includeLogo)}
              disabled={!hasLogo}
              className={cn("relative w-12 h-7 rounded-full transition-colors", includeLogo && hasLogo ? "bg-interactive-600" : "bg-background-elevated", !hasLogo && "opacity-50")}
            >
              <span className={cn("absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm", includeLogo && hasLogo ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>
          {includeLogo && hasLogo && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Position</label>
                <select value={logoPosition} onChange={(e) => onLogoPositionChange(e.target.value)} className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary">
                  {LOGO_POSITIONS.map(p => <option key={p} value={p}>{p.replace('-', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Size</label>
                <select value={logoSize} onChange={(e) => onLogoSizeChange(e.target.value)} className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary">
                  {LOGO_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* Continue */}
      <div className="flex items-center justify-between">
        {!isFormValid && (
          <p className="text-sm text-text-tertiary">
            Fill in required fields to continue
          </p>
        )}
        {isFormValid && !selectedVibe && (
          <p className="text-sm text-text-tertiary">
            Select a vibe to continue
          </p>
        )}
        {isFormValid && selectedVibe && <div />}
        <button
          onClick={onNext}
          disabled={!isFormValid || !selectedVibe}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
            isFormValid && selectedVibe ? "bg-interactive-600 text-white hover:bg-interactive-500 shadow-lg" : "bg-background-elevated text-text-muted cursor-not-allowed"
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
