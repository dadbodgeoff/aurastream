'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SectionCard, SectionHeader, SaveButton } from '../shared';
import { TypeIcon, CheckIcon, ChevronDownIcon } from '../icons';
import { SUPPORTED_FONTS, FONT_WEIGHTS, TYPOGRAPHY_LEVELS } from '../constants';
import type { TypographyInput, FontConfigInput } from '@aurastream/api-client';
import type { TypographyPanelProps } from '../types';

interface FontSelectorProps {
  config: FontConfigInput | undefined;
  onChange: (config: FontConfigInput | undefined) => void;
  level: typeof TYPOGRAPHY_LEVELS[number];
}

function FontSelector({ config, onChange, level }: FontSelectorProps) {
  const [isEnabled, setIsEnabled] = useState(!!config);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const currentConfig = config || { family: 'Inter', weight: 400, style: 'normal' as const };

  useEffect(() => {
    setIsEnabled(!!config);
  }, [config]);

  const handleToggle = () => {
    if (isEnabled) {
      onChange(undefined);
      setIsEnabled(false);
    } else {
      onChange(currentConfig);
      setIsEnabled(true);
    }
  };

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200",
      isEnabled 
        ? "bg-background-elevated/50 border-border-default" 
        : "bg-background-base/30 border-border-subtle"
    )}>
      <button
        type="button"
        onClick={() => isEnabled && setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleToggle(); }}
            className={cn(
              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
              isEnabled 
                ? "bg-interactive-600 border-interactive-600 text-white" 
                : "border-border-default hover:border-interactive-600"
            )}
          >
            {isEnabled && <CheckIcon />}
          </button>
          <div className="text-left">
            <p className={cn(
              "font-medium transition-colors",
              isEnabled ? "text-text-primary" : "text-text-tertiary"
            )}>
              {level.label}
            </p>
            <p className="text-xs text-text-muted">{level.description}</p>
          </div>
        </div>
        
        {isEnabled && (
          <div className="flex items-center gap-3">
            <span 
              className="text-sm text-text-secondary"
              style={{ fontFamily: currentConfig.family, fontWeight: currentConfig.weight }}
            >
              {currentConfig.family}
            </span>
            <ChevronDownIcon />
          </div>
        )}
      </button>
      
      {isEnabled && isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border-subtle space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">Font Family</label>
              <select
                value={currentConfig.family}
                onChange={(e) => onChange({ ...currentConfig, family: e.target.value })}
                className="w-full px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-interactive-600"
              >
                {SUPPORTED_FONTS.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">Weight</label>
              <select
                value={currentConfig.weight}
                onChange={(e) => onChange({ ...currentConfig, weight: parseInt(e.target.value) as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 })}
                className="w-full px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-interactive-600"
              >
                {FONT_WEIGHTS.map((w) => (
                  <option key={w.value} value={w.value}>{w.label} ({w.value})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">Style</label>
              <select
                value={currentConfig.style}
                onChange={(e) => onChange({ ...currentConfig, style: e.target.value as 'normal' | 'italic' })}
                className="w-full px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-interactive-600"
              >
                <option value="normal">Normal</option>
                <option value="italic">Italic</option>
              </select>
            </div>
          </div>
          
          <div className="p-4 bg-background-base rounded-lg">
            <p 
              className="text-text-primary"
              style={{ 
                fontFamily: currentConfig.family, 
                fontWeight: currentConfig.weight,
                fontStyle: currentConfig.style,
                fontSize: level.key === 'display' ? '2rem' : 
                         level.key === 'headline' ? '1.5rem' :
                         level.key === 'subheadline' ? '1.25rem' :
                         level.key === 'body' ? '1rem' :
                         level.key === 'caption' ? '0.875rem' : '1rem'
              }}
            >
              The quick brown fox jumps over the lazy dog
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function TypographyPanel({ typography, onChange, onSave, isSaving }: TypographyPanelProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <SectionCard>
        <SectionHeader
          icon={<TypeIcon />}
          title="Typography Hierarchy"
          description="Define fonts for each level of your content hierarchy"
          optional
          action={<SaveButton onClick={onSave} isSaving={isSaving} label="Save Typography" />}
        />
        
        <div className="space-y-3">
          {TYPOGRAPHY_LEVELS.map((level) => (
            <FontSelector
              key={level.key}
              level={level}
              config={typography[level.key as keyof TypographyInput]}
              onChange={(config) => onChange({ ...typography, [level.key]: config })}
            />
          ))}
        </div>
      </SectionCard>

      {/* Live Preview */}
      <SectionCard>
        <SectionHeader
          icon={<TypeIcon />}
          title="Live Preview"
          description="See how your typography looks together"
        />
        
        <div className="p-6 bg-background-base rounded-xl space-y-4">
          {typography.display && (
            <p style={{ fontFamily: typography.display.family, fontWeight: typography.display.weight, fontStyle: typography.display.style }} className="text-4xl text-text-primary">
              Display Heading
            </p>
          )}
          {typography.headline && (
            <p style={{ fontFamily: typography.headline.family, fontWeight: typography.headline.weight, fontStyle: typography.headline.style }} className="text-2xl text-text-primary">
              Headline Text
            </p>
          )}
          {typography.subheadline && (
            <p style={{ fontFamily: typography.subheadline.family, fontWeight: typography.subheadline.weight, fontStyle: typography.subheadline.style }} className="text-xl text-text-primary">
              Subheadline Text
            </p>
          )}
          {typography.body && (
            <p style={{ fontFamily: typography.body.family, fontWeight: typography.body.weight, fontStyle: typography.body.style }} className="text-base text-text-secondary">
              Body text looks like this. It&apos;s used for the main content of your stream overlays, descriptions, and other longer-form text.
            </p>
          )}
          {typography.caption && (
            <p style={{ fontFamily: typography.caption.family, fontWeight: typography.caption.weight, fontStyle: typography.caption.style }} className="text-sm text-text-tertiary">
              Caption text for labels and small details
            </p>
          )}
          {typography.accent && (
            <p style={{ fontFamily: typography.accent.family, fontWeight: typography.accent.weight, fontStyle: typography.accent.style }} className="text-lg text-interactive-600">
              &ldquo;Accent text for quotes and callouts&rdquo;
            </p>
          )}
          
          {Object.values(typography).every(v => !v) && (
            <p className="text-text-muted text-center py-8">
              Enable typography levels above to see a preview
            </p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
