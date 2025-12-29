'use client';

import { SectionCard, SectionHeader, ToneSelector, SaveButton } from '../shared';
import { SparklesIcon, PaletteIcon, TypeIcon, MicIcon, PlusIcon } from '../icons';
import { SUPPORTED_FONTS, PRESET_PALETTES } from '../constants';
import type { IdentityPanelProps } from '../types';
import { cn } from '@/lib/utils';

export function IdentityPanel({ 
  identity, 
  onChange, 
  onSave, 
  isSaving,
  isNew 
}: IdentityPanelProps) {
  const addPrimaryColor = () => {
    if (identity.primaryColors.length < 5) {
      onChange({ ...identity, primaryColors: [...identity.primaryColors, '#21808D'] });
    }
  };

  const addAccentColor = () => {
    if (identity.accentColors.length < 3) {
      onChange({ ...identity, accentColors: [...identity.accentColors, '#F59E0B'] });
    }
  };

  const applyPreset = (preset: typeof PRESET_PALETTES[number]) => {
    onChange({
      ...identity,
      primaryColors: [...preset.primary],
      accentColors: [...preset.accent],
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Brand Name */}
      <SectionCard>
        <SectionHeader
          icon={<SparklesIcon />}
          title="Brand Name"
          description="Give your brand kit a memorable name"
          optional
          action={<SaveButton onClick={onSave} isSaving={isSaving} />}
        />
        
        <input
          type="text"
          value={identity.name}
          onChange={(e) => onChange({ ...identity, name: e.target.value })}
          className="w-full px-4 py-4 bg-background-base border border-border-subtle rounded-xl text-text-primary text-lg placeholder-text-muted focus:outline-none focus:border-interactive-600 focus:ring-2 focus:ring-interactive-600/20 transition-all"
          placeholder="My Gaming Brand (optional)"
        />
        <p className="text-xs text-text-muted mt-2">
          Leave empty to let AI generate a name based on your content
        </p>
      </SectionCard>

      {/* Color Palette */}
      <SectionCard>
        <SectionHeader
          icon={<PaletteIcon />}
          title="Color Palette"
          description="Choose colors that represent your brand"
          optional
        />
        
        {/* Preset Palettes */}
        <div className="mb-6">
          <p className="text-sm text-text-secondary mb-3">Quick start with a preset</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {PRESET_PALETTES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="p-2 rounded-lg border border-border-subtle hover:border-interactive-600 transition-all group"
              >
                <div className="flex gap-0.5 mb-1">
                  {[...preset.primary, ...preset.accent].map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-xs text-text-tertiary group-hover:text-text-primary truncate">
                  {preset.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border-subtle pt-6 space-y-6">
          {/* Primary Colors */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Primary Colors
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {identity.primaryColors.map((color, index) => (
                <div key={index} className="relative group">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newColors = [...identity.primaryColors];
                      newColors[index] = e.target.value;
                      onChange({ ...identity, primaryColors: newColors });
                    }}
                    className="w-14 h-14 rounded-xl border-2 border-border-default cursor-pointer appearance-none hover:scale-105 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                  {identity.primaryColors.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChange({
                        ...identity,
                        primaryColors: identity.primaryColors.filter((_, i) => i !== index)
                      })}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-background-elevated border border-border-default rounded-full flex items-center justify-center text-text-muted hover:text-error-light hover:border-error-main opacity-0 group-hover:opacity-100 transition-all"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {identity.primaryColors.length < 5 && (
                <button
                  type="button"
                  onClick={addPrimaryColor}
                  className="w-14 h-14 rounded-xl border-2 border-dashed border-border-default hover:border-interactive-600 flex items-center justify-center text-text-muted hover:text-interactive-600 transition-colors"
                >
                  <PlusIcon />
                </button>
              )}
            </div>
          </div>

          {/* Accent Colors */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Accent Colors
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {identity.accentColors.map((color, index) => (
                <div key={index} className="relative group">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newColors = [...identity.accentColors];
                      newColors[index] = e.target.value;
                      onChange({ ...identity, accentColors: newColors });
                    }}
                    className="w-14 h-14 rounded-xl border-2 border-border-default cursor-pointer appearance-none hover:scale-105 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                  <button
                    type="button"
                    onClick={() => onChange({
                      ...identity,
                      accentColors: identity.accentColors.filter((_, i) => i !== index)
                    })}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-background-elevated border border-border-default rounded-full flex items-center justify-center text-text-muted hover:text-error-light hover:border-error-main opacity-0 group-hover:opacity-100 transition-all"
                  >
                    ×
                  </button>
                </div>
              ))}
              {identity.accentColors.length < 3 && (
                <button
                  type="button"
                  onClick={addAccentColor}
                  className="w-14 h-14 rounded-xl border-2 border-dashed border-border-default hover:border-accent-400 flex items-center justify-center text-text-muted hover:text-accent-400 transition-colors"
                >
                  <PlusIcon />
                </button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Typography */}
      <SectionCard>
        <SectionHeader
          icon={<TypeIcon />}
          title="Quick Typography"
          description="Basic font settings for your brand"
          optional
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Headline Font
            </label>
            <select
              value={identity.headlineFont}
              onChange={(e) => onChange({ ...identity, headlineFont: e.target.value })}
              className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-interactive-600 transition-colors"
            >
              {SUPPORTED_FONTS.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Body Font
            </label>
            <select
              value={identity.bodyFont}
              onChange={(e) => onChange({ ...identity, bodyFont: e.target.value })}
              className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-interactive-600 transition-colors"
            >
              {SUPPORTED_FONTS.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      {/* Tone */}
      <SectionCard>
        <SectionHeader
          icon={<MicIcon />}
          title="Brand Tone"
          description="How your brand communicates"
          optional
        />
        <ToneSelector 
          value={identity.tone} 
          onChange={(t) => onChange({ ...identity, tone: t as any })} 
        />
      </SectionCard>

      {/* Style Reference */}
      <SectionCard>
        <SectionHeader
          icon={<SparklesIcon />}
          title="Style Reference"
          description="Describe your brand's visual style and inspirations"
          optional
        />
        <textarea
          value={identity.styleReference}
          onChange={(e) => onChange({ ...identity, styleReference: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600 focus:ring-2 focus:ring-interactive-600/20 transition-all resize-none"
          placeholder="Describe your brand style, inspirations, or reference other creators... (optional)"
        />
      </SectionCard>
    </div>
  );
}
