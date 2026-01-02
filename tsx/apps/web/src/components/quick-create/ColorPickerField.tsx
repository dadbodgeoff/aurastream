'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ColorPreset {
  label: string;
  value: string;
  category?: string;
}

interface ColorPickerFieldProps {
  value: string;
  onChange: (color: string) => void;
  presets?: ColorPreset[];
}

export function ColorPickerField({ value, onChange, presets = [] }: ColorPickerFieldProps) {
  const [showCustom, setShowCustom] = useState(false);
  
  // Group presets by category
  const darkPresets = presets.filter(p => p.category === 'dark');
  const vibrantPresets = presets.filter(p => p.category === 'vibrant');
  const allPresets = darkPresets.length > 0 ? [...darkPresets, ...vibrantPresets] : presets;

  return (
    <div className="space-y-2">
      {/* Preset swatches */}
      <div className="flex flex-wrap gap-1.5">
        {allPresets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={cn(
              "w-7 h-7 rounded-lg border-2 transition-all",
              value === preset.value 
                ? "border-interactive-600 ring-2 ring-interactive-600/30" 
                : "border-transparent hover:border-border-default"
            )}
            style={{ backgroundColor: preset.value }}
            title={preset.label}
          />
        ))}
        
        {/* Custom color toggle */}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            "w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs font-mono",
            showCustom 
              ? "border-interactive-600 bg-interactive-600/10 text-interactive-600" 
              : "border-border-subtle hover:border-border-default text-text-muted"
          )}
          title="Custom color"
        >
          #
        </button>
      </div>
      
      {/* Custom hex input */}
      {showCustom && (
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg border border-border-subtle shrink-0"
            style={{ backgroundColor: value }}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#1a0a2e"
            className="flex-1 px-2.5 py-1.5 text-xs bg-background-base border border-border-subtle rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600 font-mono"
          />
        </div>
      )}
    </div>
  );
}
