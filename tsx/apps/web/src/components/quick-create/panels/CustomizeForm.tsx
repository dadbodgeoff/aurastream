'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon, CheckIcon, ImageIcon } from '../icons';
import { MediaAssetPicker } from '../../media-library/MediaAssetPicker';
import { ColorPickerField } from '../ColorPickerField';
import type { QuickTemplate, VibeOption } from '../types';
import type { MediaAsset } from '@aurastream/api-client';
import type { AssetPlacement } from '../../media-library/placement';
import type { AnySketchElement } from '../../media-library/canvas-export/types';

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
  logoType?: string;
  onLogoTypeChange?: (v: string) => void;
  brandIntensity?: string;
  onBrandIntensityChange?: (v: string) => void;
  isFormValid: boolean;
  onBack: () => void;
  onNext: () => void;
  isLoading: boolean;
  // Media Library integration (optional)
  selectedMediaAssets?: MediaAsset[];
  onMediaAssetsChange?: (assets: MediaAsset[]) => void;
  // Asset placements (optional)
  mediaAssetPlacements?: AssetPlacement[];
  onMediaAssetPlacementsChange?: (placements: AssetPlacement[]) => void;
  // Sketch elements (optional)
  sketchElements?: AnySketchElement[];
  onSketchElementsChange?: (elements: AnySketchElement[]) => void;
}

const LOGO_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];
const LOGO_SIZES = ['small', 'medium', 'large'];
const LOGO_TYPES = [
  { id: 'primary', label: 'Primary' },
  { id: 'secondary', label: 'Secondary' },
  { id: 'icon', label: 'Icon' },
  { id: 'monochrome', label: 'Mono' },
  { id: 'watermark', label: 'Watermark' },
];
const BRAND_INTENSITIES = [
  { id: 'subtle', label: 'Subtle' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'strong', label: 'Strong' },
];

function VibeCard({ vibe, selected, onClick, compact }: { vibe: VibeOption; selected: boolean; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-lg border text-left transition-all group overflow-hidden",
        compact ? "p-2" : "p-2.5",
        selected 
          ? "border-interactive-600 bg-interactive-600/5" 
          : "border-border-subtle hover:border-border-default bg-background-surface/50"
      )}
    >
      <div className={cn("flex items-center", compact ? "gap-2" : "gap-2")}>
        <div className={cn(
          "rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0",
          compact ? "w-6 h-6 text-xs" : "w-7 h-7 text-sm",
          vibe.gradient
        )}>
          {vibe.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className={cn("font-medium text-text-primary truncate", compact ? "text-xs" : "text-xs")}>{vibe.name}</h4>
            {selected && (
              <div className="w-3.5 h-3.5 bg-interactive-600 rounded-full flex items-center justify-center text-white shrink-0">
                <CheckIcon />
              </div>
            )}
          </div>
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
    logoSize, onLogoSizeChange, logoType = 'primary', onLogoTypeChange,
    brandIntensity = 'balanced', onBrandIntensityChange,
    isFormValid, onBack, onNext, isLoading,
    selectedMediaAssets = [], onMediaAssetsChange,
    mediaAssetPlacements = [], onMediaAssetPlacementsChange,
    sketchElements = [], onSketchElementsChange,
  } = props;

  const hasLotsOfVibes = template.vibes.length > 6;

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm">
        <ChevronLeftIcon />
        <span className="font-medium">Back</span>
      </button>

      {/* Header - Compact */}
      <div className="flex items-center gap-3 p-2.5 bg-background-surface rounded-lg border border-border-subtle">
        <span className="text-xl">{template.emoji}</span>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{template.name}</h2>
          <p className="text-xs text-text-secondary">{template.tagline} • {template.dimensions}</p>
        </div>
      </div>

      {/* Two Column Layout for Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left Column - Vibes & Details */}
        <div className="space-y-3">
          {/* Vibe Selection - Compact */}
          <div className="p-2.5 bg-background-surface rounded-lg border border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-text-primary">Style</h3>
              <span className="px-1.5 py-0.5 bg-interactive-600/10 text-interactive-600 text-micro font-medium rounded">
                {template.vibes.length}
              </span>
            </div>
            
            <div className={cn(
              "grid gap-1.5",
              hasLotsOfVibes ? "grid-cols-3 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3"
            )}>
              {template.vibes.map(vibe => (
                <VibeCard
                  key={vibe.id}
                  vibe={vibe}
                  selected={selectedVibe === vibe.id}
                  onClick={() => onVibeChange(vibe.id)}
                  compact={hasLotsOfVibes}
                />
              ))}
            </div>
          </div>

          {/* Fields - Compact */}
          <div className="p-2.5 bg-background-surface rounded-lg border border-border-subtle">
            <h3 className="text-xs font-semibold text-text-primary mb-2">Details</h3>
            <div className="space-y-2">
              {template.fields
                .filter(field => !field.showForVibes || field.showForVibes.includes(selectedVibe))
                .map(field => {
                let options = field.options;
                if (field.type === 'dynamic_select' && field.dependsOn && field.optionsMap) {
                  const parentValue = formValues[field.dependsOn] || '';
                  options = field.optionsMap[parentValue] || [];
                }
                
                // Handle color picker fields
                if (field.type === 'color') {
                  return (
                    <div key={field.id}>
                      <label className="block text-micro font-medium text-text-secondary mb-1">
                        {field.label}
                        {field.required && <span className="text-error-light ml-0.5">*</span>}
                      </label>
                      <ColorPickerField
                        value={formValues[field.id] || field.default || ''}
                        onChange={(color) => onFieldChange(field.id, color)}
                        presets={field.presets}
                      />
                      {field.hint && (
                        <p className="text-micro text-text-muted mt-0.5">{field.hint}</p>
                      )}
                    </div>
                  );
                }
                
                return (
                <div key={field.id}>
                  <label className="block text-micro font-medium text-text-secondary mb-1">
                    {field.label}
                    {field.required && <span className="text-error-light ml-0.5">*</span>}
                  </label>
                  {(field.type === 'select' || field.type === 'dynamic_select') ? (
                    <select
                      value={formValues[field.id] || ''}
                      onChange={(e) => {
                        onFieldChange(field.id, e.target.value);
                        template.fields.forEach(f => {
                          if (f.dependsOn === field.id) {
                            onFieldChange(f.id, '');
                          }
                        });
                      }}
                      disabled={field.type === 'dynamic_select' && field.dependsOn ? !formValues[field.dependsOn] : false}
                      className="w-full px-2.5 py-1.5 text-xs bg-background-base border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-interactive-600 disabled:opacity-50"
                    >
                      <option value="">{field.required ? 'Select...' : 'AI Decides'}</option>
                      {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formValues[field.id] || ''}
                      onChange={(e) => onFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      maxLength={field.maxLength}
                      className="w-full px-2.5 py-1.5 text-xs bg-background-base border border-border-subtle rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600"
                    />
                  )}
                </div>
              )})}
            </div>
          </div>
        </div>

        {/* Right Column - Brand Kit & Logo */}
        <div className="space-y-3">
          {/* Brand Kit - Compact */}
          <div className="p-2.5 bg-background-surface rounded-lg border border-border-subtle">
            <h3 className="text-xs font-semibold text-text-primary mb-2">Brand Kit</h3>
            {isLoading ? (
              <div className="flex justify-center py-3">
                <div className="w-5 h-5 border-2 border-interactive-600/30 border-t-interactive-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => onBrandKitChange('')}
                  className={cn(
                    "w-full p-2 rounded-lg border text-left transition-all flex items-center justify-between",
                    selectedBrandKitId === '' ? "border-interactive-600 bg-interactive-600/5" : "border-border-subtle hover:border-border-default"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🎨</span>
                    <span className="text-xs font-medium text-text-primary">AI decides</span>
                  </div>
                  {selectedBrandKitId === '' && <div className="w-3.5 h-3.5 bg-interactive-600 rounded-full flex items-center justify-center text-white"><CheckIcon /></div>}
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  {brandKits.map(kit => (
                    <button
                      key={kit.id}
                      type="button"
                      onClick={() => onBrandKitChange(kit.id)}
                      className={cn(
                        "p-2 rounded-lg border text-left transition-all",
                        selectedBrandKitId === kit.id ? "border-interactive-600 bg-interactive-600/5" : "border-border-subtle hover:border-border-default"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-medium text-text-primary truncate">{kit.name}</p>
                        {selectedBrandKitId === kit.id && <div className="w-3.5 h-3.5 bg-interactive-600 rounded-full flex items-center justify-center text-white shrink-0"><CheckIcon /></div>}
                      </div>
                      <div className="flex gap-0.5 mt-1">
                        {[...(kit.primary_colors || []), ...(kit.accent_colors || [])].slice(0, 4).map((c, i) => (
                          <div key={i} className="w-2.5 h-2.5 rounded" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {brandKits.length === 0 && (
                  <p className="text-center text-text-tertiary text-micro py-2">
                    No brand kits. <Link href="/dashboard/brand-kits" className="text-interactive-600 hover:underline">Create one</Link>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Logo Options - Compact */}
          {selectedBrandKitId && (
            <div className="p-2.5 bg-background-surface rounded-lg border border-border-subtle space-y-2">
              {/* Brand Intensity */}
              {onBrandIntensityChange && (
                <div>
                  <label className="block text-micro font-medium text-text-secondary mb-1">Brand Intensity</label>
                  <div className="grid grid-cols-3 gap-1">
                    {BRAND_INTENSITIES.map(i => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => onBrandIntensityChange(i.id)}
                        className={cn(
                          "px-2 py-1.5 text-xs rounded-lg border transition-all",
                          brandIntensity === i.id
                            ? "border-interactive-600 bg-interactive-600/10 text-text-primary"
                            : "border-border-subtle text-text-secondary hover:border-border-default"
                        )}
                      >
                        {i.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Logo Toggle */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-background-elevated rounded flex items-center justify-center text-text-muted"><ImageIcon /></div>
                  <span className="text-xs font-medium text-text-primary">Include Logo</span>
                </div>
                <button
                  type="button"
                  onClick={() => onIncludeLogoChange(!includeLogo)}
                  disabled={!hasLogo}
                  className={cn("relative w-8 h-5 rounded-full transition-colors", includeLogo && hasLogo ? "bg-interactive-600" : "bg-background-elevated", !hasLogo && "opacity-50")}
                >
                  <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm", includeLogo && hasLogo ? "translate-x-3.5" : "translate-x-0.5")} />
                </button>
              </div>
              {includeLogo && hasLogo && (
                <div className="space-y-2 pt-1">
                  {/* Logo Type */}
                  {onLogoTypeChange && (
                    <div>
                      <label className="block text-micro font-medium text-text-secondary mb-1">Logo Type</label>
                      <div className="grid grid-cols-3 gap-1">
                        {LOGO_TYPES.slice(0, 3).map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => onLogoTypeChange(t.id)}
                            className={cn(
                              "px-2 py-1 text-xs rounded border transition-all",
                              logoType === t.id
                                ? "border-interactive-600 bg-interactive-600/10 text-text-primary"
                                : "border-border-subtle text-text-secondary hover:border-border-default"
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Position & Size */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-micro font-medium text-text-secondary mb-1">Position</label>
                      <select value={logoPosition} onChange={(e) => onLogoPositionChange(e.target.value)} className="w-full px-2 py-1.5 text-xs bg-background-base border border-border-subtle rounded-lg text-text-primary">
                        {LOGO_POSITIONS.map(p => <option key={p} value={p}>{p.replace('-', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-micro font-medium text-text-secondary mb-1">Size</label>
                      <select value={logoSize} onChange={(e) => onLogoSizeChange(e.target.value)} className="w-full px-2 py-1.5 text-xs bg-background-base border border-border-subtle rounded-lg text-text-primary">
                        {LOGO_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Your Assets - Optional (Pro/Studio) */}
          {onMediaAssetsChange && (
            <div className="p-2.5 bg-background-surface rounded-lg border border-border-subtle">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-text-primary">Your Assets</h3>
                <span className="text-micro text-text-muted">Optional</span>
              </div>
              <MediaAssetPicker
                selectedAssets={selectedMediaAssets}
                onSelectionChange={onMediaAssetsChange}
                placements={mediaAssetPlacements}
                onPlacementsChange={onMediaAssetPlacementsChange}
                sketchElements={sketchElements}
                onSketchElementsChange={onSketchElementsChange}
                assetType={template.assetType}
              />
            </div>
          )}
        </div>
      </div>

      {/* Continue - Compact */}
      <div className="flex items-center justify-between pt-1">
        {!isFormValid && <p className="text-micro text-text-tertiary">Fill required fields</p>}
        {isFormValid && !selectedVibe && <p className="text-micro text-text-tertiary">Select a style</p>}
        {isFormValid && selectedVibe && <div />}
        <button
          onClick={onNext}
          disabled={!isFormValid || !selectedVibe}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all",
            isFormValid && selectedVibe ? "bg-interactive-600 text-white hover:bg-interactive-500" : "bg-background-elevated text-text-muted cursor-not-allowed"
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
