'use client';

import { cn } from '@/lib/utils';
import { SectionCard } from '../shared';
import { ChevronLeftIcon, SparklesIcon } from '../icons';
import type { QuickTemplate, VibeOption } from '../types';

interface ReviewPanelProps {
  template: QuickTemplate;
  formValues: Record<string, string>;
  selectedVibe: VibeOption | null;
  brandKitName: string | null;
  includeLogo: boolean;
  logoPosition: string;
  logoSize: string;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  error: Error | null;
}

export function ReviewPanel(props: ReviewPanelProps) {
  const { 
    template, formValues, selectedVibe, brandKitName, includeLogo, logoPosition, logoSize,
    onBack, onGenerate, isGenerating, error 
  } = props;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ChevronLeftIcon />
        <span className="text-sm font-medium">Back</span>
      </button>

      <SectionCard className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-interactive-600 to-interactive-400" />
        
        <div className="pt-2">
          <div className="flex items-start gap-4 mb-6">
            <span className="text-5xl">{template.emoji}</span>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">{template.name}</h2>
              <p className="text-text-secondary">{template.dimensions}</p>
            </div>
          </div>

          {/* Selected Vibe */}
          {selectedVibe && (
            <div className="bg-background-base rounded-xl p-4 mb-4">
              <h4 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-3">Style</h4>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br",
                  selectedVibe.gradient
                )}>
                  {selectedVibe.icon}
                </div>
                <div>
                  <p className="font-semibold text-text-primary">{selectedVibe.name}</p>
                  <p className="text-sm text-text-secondary">{selectedVibe.tagline}</p>
                </div>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="bg-background-base rounded-xl p-4 mb-4">
            <h4 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-3">Details</h4>
            <div className="space-y-2">
              {template.fields.map(f => {
                const val = formValues[f.id];
                if (!val) return null;
                const display = f.type === 'select' ? f.options?.find(o => o.value === val)?.label || val : val;
                return (
                  <div key={f.id} className="flex justify-between">
                    <span className="text-text-secondary">{f.label}</span>
                    <span className="font-medium text-text-primary">{display}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Branding */}
          <div className="bg-background-base rounded-xl p-4 mb-4">
            <h4 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-3">Branding</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text-secondary">Brand Kit</span>
                <span className="font-medium text-text-primary">{brandKitName || 'AI Defaults'}</span>
              </div>
              {brandKitName && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Logo</span>
                  <span className="font-medium text-text-primary">{includeLogo ? `${logoPosition}, ${logoSize}` : 'None'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview hint */}
          <div className="bg-interactive-600/5 border border-interactive-600/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <SparklesIcon />
              <div>
                <h4 className="font-medium text-text-primary">What you'll get</h4>
                <p className="text-sm text-text-secondary mt-1">
                  {selectedVibe ? selectedVibe.tagline : template.previewStyle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Generate */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-tertiary">Takes 10-30 seconds</p>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={cn(
            "flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-all",
            isGenerating ? "bg-interactive-600/50 text-white/70" : "bg-interactive-600 text-white hover:bg-interactive-500 shadow-xl"
          )}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon />
              Create Asset
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-error-dark/10 border border-error-main/20 rounded-xl">
          <p className="text-error-light text-sm">Generation failed. Please try again.</p>
        </div>
      )}
    </div>
  );
}
