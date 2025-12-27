'use client';

import { cn } from '@/lib/utils';
import { SectionCard, SectionHeader, SaveButton } from '../shared';
import { DocumentIcon, PaletteIcon, PlusIcon, TrashIcon } from '../icons';
import { BRAND_KIT_LIMITS, type BrandGuidelinesInput } from '@aurastream/api-client';
import type { GuidelinesPanelProps } from '../types';

export function GuidelinesPanel({ guidelines, onChange, onSave, isSaving }: GuidelinesPanelProps) {
  const colorRatioSum = guidelines.primaryColorRatio + guidelines.secondaryColorRatio + guidelines.accentColorRatio;
  const isColorRatioValid = colorRatioSum <= 100;

  const addProhibitedModification = () => {
    if (guidelines.prohibitedModifications.length < BRAND_KIT_LIMITS.guidelines.prohibitedModificationsMax) {
      onChange({ ...guidelines, prohibitedModifications: [...guidelines.prohibitedModifications, ''] });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <SectionCard>
        <SectionHeader
          icon={<DocumentIcon />}
          title="Logo Guidelines"
          description="Define how your logo should be used"
          optional
          action={<SaveButton onClick={onSave} isSaving={isSaving} disabled={!isColorRatioValid} label="Save Guidelines" />}
        />
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Minimum Logo Size: {guidelines.logoMinSizePx}px
            </label>
            <input
              type="range"
              min={BRAND_KIT_LIMITS.guidelines.logoMinSizeMin}
              max={BRAND_KIT_LIMITS.guidelines.logoMinSizeMax}
              value={guidelines.logoMinSizePx}
              onChange={(e) => onChange({ ...guidelines, logoMinSizePx: parseInt(e.target.value) })}
              className="w-full h-2 bg-background-elevated rounded-lg appearance-none cursor-pointer accent-interactive-600"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>{BRAND_KIT_LIMITS.guidelines.logoMinSizeMin}px</span>
              <span>{BRAND_KIT_LIMITS.guidelines.logoMinSizeMax}px</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Clear Space Ratio: {guidelines.logoClearSpaceRatio.toFixed(2)}
            </label>
            <input
              type="range"
              min={BRAND_KIT_LIMITS.guidelines.clearSpaceRatioMin * 100}
              max={BRAND_KIT_LIMITS.guidelines.clearSpaceRatioMax * 100}
              value={guidelines.logoClearSpaceRatio * 100}
              onChange={(e) => onChange({ ...guidelines, logoClearSpaceRatio: parseInt(e.target.value) / 100 })}
              className="w-full h-2 bg-background-elevated rounded-lg appearance-none cursor-pointer accent-interactive-600"
            />
            <p className="text-xs text-text-tertiary mt-2">
              Clear space around logo as a ratio of logo size
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={<PaletteIcon />}
          title="Color Usage Ratios"
          description="Recommended color distribution in your designs"
          optional
        />
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Primary: {guidelines.primaryColorRatio}%
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={guidelines.primaryColorRatio}
                onChange={(e) => onChange({ ...guidelines, primaryColorRatio: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                className="w-full px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-interactive-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Secondary: {guidelines.secondaryColorRatio}%
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={guidelines.secondaryColorRatio}
                onChange={(e) => onChange({ ...guidelines, secondaryColorRatio: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                className="w-full px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-interactive-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Accent: {guidelines.accentColorRatio}%
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={guidelines.accentColorRatio}
                onChange={(e) => onChange({ ...guidelines, accentColorRatio: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                className="w-full px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-interactive-600"
              />
            </div>
          </div>
          
          <div className={cn(
            "p-3 rounded-lg text-sm",
            isColorRatioValid ? "bg-success-dark/20 text-success-light" : "bg-error-dark/20 text-error-light"
          )}>
            Total: {colorRatioSum}% {isColorRatioValid ? '✓' : '(must be ≤ 100%)'}
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={<DocumentIcon />}
          title="Prohibited Modifications"
          description={`Things that should never be done to your brand assets (${guidelines.prohibitedModifications.length}/${BRAND_KIT_LIMITS.guidelines.prohibitedModificationsMax})`}
          optional
        />
        
        <div className="space-y-2">
          {guidelines.prohibitedModifications.map((mod, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={mod}
                onChange={(e) => {
                  const newMods = [...guidelines.prohibitedModifications];
                  newMods[index] = e.target.value;
                  onChange({ ...guidelines, prohibitedModifications: newMods });
                }}
                placeholder="e.g., Stretching, Color changes, Adding effects"
                className="flex-1 px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-interactive-600"
              />
              <button
                type="button"
                onClick={() => onChange({ ...guidelines, prohibitedModifications: guidelines.prohibitedModifications.filter((_, i) => i !== index) })}
                className="p-2 text-text-muted hover:text-error-light hover:bg-error-dark/20 rounded-lg transition-colors"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
          
          {guidelines.prohibitedModifications.length < BRAND_KIT_LIMITS.guidelines.prohibitedModificationsMax && (
            <button
              type="button"
              onClick={addProhibitedModification}
              className="w-full py-3 border-2 border-dashed border-border-subtle hover:border-interactive-600 rounded-lg text-text-muted hover:text-interactive-600 flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <PlusIcon />
              Add Prohibited Modification
            </button>
          )}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={<DocumentIcon />}
          title="Style Guidelines"
          description="Do's and don'ts for your brand style"
          optional
        />
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Style Do&apos;s
            </label>
            <textarea
              value={guidelines.styleDo || ''}
              onChange={(e) => onChange({ ...guidelines, styleDo: e.target.value.slice(0, BRAND_KIT_LIMITS.guidelines.styleDoMaxLength) })}
              maxLength={BRAND_KIT_LIMITS.guidelines.styleDoMaxLength}
              rows={4}
              className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600 transition-colors resize-none"
              placeholder="Use bold colors, maintain consistent spacing... (optional)"
            />
            <p className="text-xs text-text-muted mt-1">
              {(guidelines.styleDo || '').length}/{BRAND_KIT_LIMITS.guidelines.styleDoMaxLength}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Style Don&apos;ts
            </label>
            <textarea
              value={guidelines.styleDont || ''}
              onChange={(e) => onChange({ ...guidelines, styleDont: e.target.value.slice(0, BRAND_KIT_LIMITS.guidelines.styleDontMaxLength) })}
              maxLength={BRAND_KIT_LIMITS.guidelines.styleDontMaxLength}
              rows={4}
              className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600 transition-colors resize-none"
              placeholder="Avoid cluttered layouts, don't use more than 3 colors... (optional)"
            />
            <p className="text-xs text-text-muted mt-1">
              {(guidelines.styleDont || '').length}/{BRAND_KIT_LIMITS.guidelines.styleDontMaxLength}
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
