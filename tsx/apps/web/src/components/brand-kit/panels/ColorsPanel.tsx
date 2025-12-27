'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SectionCard, SectionHeader, SaveButton } from '../shared';
import { PaletteIcon, PlusIcon, TrashIcon } from '../icons';
import { BRAND_KIT_LIMITS, type ColorPaletteInput } from '@aurastream/api-client';
import type { ColorsPanelProps } from '../types';

interface ExtendedColor {
  hex: string;
  name: string;
  usage: string;
}

interface Gradient {
  name: string;
  type: 'linear' | 'radial';
  angle: number;
  stops: { color: string; position: number }[];
}

function ColorInput({ color, onChange, onRemove }: {
  color: ExtendedColor;
  onChange: (color: ExtendedColor) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group relative bg-background-elevated/50 rounded-xl p-4 border border-border-subtle hover:border-border-default transition-all">
      <div className="flex items-start gap-4">
        <div className="relative">
          <input
            type="color"
            value={color.hex}
            onChange={(e) => onChange({ ...color, hex: e.target.value.toUpperCase() })}
            className="w-16 h-16 rounded-xl border-2 border-border-default cursor-pointer appearance-none bg-transparent"
            style={{ backgroundColor: color.hex }}
          />
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={color.name}
              onChange={(e) => onChange({ ...color, name: e.target.value.slice(0, 50) })}
              placeholder="Color name (optional)"
              className="flex-1 px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-interactive-600"
            />
            <input
              type="text"
              value={color.hex}
              onChange={(e) => onChange({ ...color, hex: e.target.value.toUpperCase() })}
              className="w-24 px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-text-primary text-sm font-mono focus:outline-none focus:border-interactive-600"
            />
          </div>
          <textarea
            value={color.usage}
            onChange={(e) => onChange({ ...color, usage: e.target.value.slice(0, 200) })}
            placeholder="Usage guidelines (optional)"
            rows={2}
            className="w-full px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-text-secondary text-sm placeholder-text-muted focus:outline-none focus:border-interactive-600 resize-none"
          />
        </div>
        
        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-text-muted hover:text-error-light hover:bg-error-dark/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

function GradientEditor({ gradient, onChange, onRemove }: {
  gradient: Gradient;
  onChange: (gradient: Gradient) => void;
  onRemove: () => void;
}) {
  const gradientStyle = useMemo(() => {
    const stops = gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ');
    return gradient.type === 'linear'
      ? `linear-gradient(${gradient.angle}deg, ${stops})`
      : `radial-gradient(circle, ${stops})`;
  }, [gradient]);

  return (
    <div className="group bg-background-elevated/50 rounded-xl p-4 border border-border-subtle hover:border-border-default transition-all">
      <div className="flex items-start gap-4">
        <div className="w-24 h-24 rounded-xl border border-border-default flex-shrink-0" style={{ background: gradientStyle }} />
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={gradient.name}
              onChange={(e) => onChange({ ...gradient, name: e.target.value.slice(0, 50) })}
              placeholder="Gradient name"
              className="flex-1 px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-interactive-600"
            />
            <select
              value={gradient.type}
              onChange={(e) => onChange({ ...gradient, type: e.target.value as 'linear' | 'radial' })}
              className="px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-interactive-600"
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
            {gradient.type === 'linear' && (
              <input
                type="number"
                value={gradient.angle}
                onChange={(e) => onChange({ ...gradient, angle: Math.min(360, Math.max(0, parseInt(e.target.value) || 0)) })}
                min={0}
                max={360}
                className="w-20 px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-interactive-600"
              />
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {gradient.stops.map((stop, index) => (
              <div key={index} className="flex items-center gap-1 bg-background-base rounded-lg p-1">
                <input
                  type="color"
                  value={stop.color}
                  onChange={(e) => {
                    const newStops = [...gradient.stops];
                    newStops[index] = { ...stop, color: e.target.value };
                    onChange({ ...gradient, stops: newStops });
                  }}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <input
                  type="number"
                  value={stop.position}
                  onChange={(e) => {
                    const newStops = [...gradient.stops];
                    newStops[index] = { ...stop, position: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) };
                    onChange({ ...gradient, stops: newStops });
                  }}
                  min={0}
                  max={100}
                  className="w-12 px-1 py-1 bg-transparent text-text-primary text-xs text-center focus:outline-none"
                />
                <span className="text-text-tertiary text-xs">%</span>
                {gradient.stops.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...gradient, stops: gradient.stops.filter((_, i) => i !== index) })}
                    className="p-1 text-text-muted hover:text-error-light"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {gradient.stops.length < 10 && (
              <button
                type="button"
                onClick={() => onChange({ ...gradient, stops: [...gradient.stops, { color: '#000000', position: 100 }] })}
                className="p-2 text-text-tertiary hover:text-interactive-600 hover:bg-interactive-600/10 rounded-lg transition-colors"
              >
                <PlusIcon />
              </button>
            )}
          </div>
        </div>
        
        <button type="button" onClick={onRemove} className="p-2 text-text-muted hover:text-error-light hover:bg-error-dark/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

export function ColorsPanel({ brandKitId, colors, onChange, onSave, isSaving, isNew }: ColorsPanelProps) {
  const addColor = (category: 'primary' | 'secondary' | 'accent' | 'neutral') => {
    const maxCounts = BRAND_KIT_LIMITS.colors;
    if (colors[category].length < maxCounts[category]) {
      onChange({ ...colors, [category]: [...colors[category], { hex: '#3B82F6', name: '', usage: '' }] });
    }
  };

  const addGradient = () => {
    if (colors.gradients.length < BRAND_KIT_LIMITS.colors.gradients) {
      onChange({
        ...colors,
        gradients: [...colors.gradients, { name: 'New Gradient', type: 'linear', angle: 135, stops: [{ color: '#3B82F6', position: 0 }, { color: '#F59E0B', position: 100 }] }]
      });
    }
  };

  const colorCategories = [
    { key: 'primary' as const, label: 'Primary Colors', desc: 'Your main brand colors' },
    { key: 'secondary' as const, label: 'Secondary Colors', desc: 'Supporting colors' },
    { key: 'accent' as const, label: 'Accent Colors', desc: 'Highlight colors for CTAs' },
    { key: 'neutral' as const, label: 'Neutral Colors', desc: 'Background and text colors' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {colorCategories.map(({ key, label, desc }) => (
        <SectionCard key={key}>
          <SectionHeader
            icon={<PaletteIcon />}
            title={label}
            description={`${desc} (${colors[key].length}/${BRAND_KIT_LIMITS.colors[key]})`}
            optional
            action={key === 'primary' ? <SaveButton onClick={onSave} isSaving={isSaving} label="Save Colors" /> : undefined}
          />
          
          <div className="space-y-3">
            {colors[key].map((color, index) => (
              <ColorInput
                key={index}
                color={color}
                onChange={(updated) => {
                  const newColors = [...colors[key]];
                  newColors[index] = updated;
                  onChange({ ...colors, [key]: newColors });
                }}
                onRemove={() => onChange({ ...colors, [key]: colors[key].filter((_, i) => i !== index) })}
              />
            ))}
            
            {colors[key].length < BRAND_KIT_LIMITS.colors[key] && (
              <button
                type="button"
                onClick={() => addColor(key)}
                className="w-full py-4 border-2 border-dashed border-border-subtle hover:border-interactive-600 rounded-xl text-text-muted hover:text-interactive-600 flex items-center justify-center gap-2 transition-colors"
              >
                <PlusIcon />
                Add {label.replace('Colors', 'Color')}
              </button>
            )}
          </div>
        </SectionCard>
      ))}

      {/* Gradients */}
      <SectionCard>
        <SectionHeader
          icon={<PaletteIcon />}
          title="Gradients"
          description={`Custom gradient definitions (${colors.gradients.length}/${BRAND_KIT_LIMITS.colors.gradients})`}
          optional
        />
        
        <div className="space-y-4">
          {colors.gradients.map((gradient, index) => (
            <GradientEditor
              key={index}
              gradient={gradient}
              onChange={(updated) => {
                const newGradients = [...colors.gradients];
                newGradients[index] = updated;
                onChange({ ...colors, gradients: newGradients });
              }}
              onRemove={() => onChange({ ...colors, gradients: colors.gradients.filter((_, i) => i !== index) })}
            />
          ))}
          
          {colors.gradients.length < BRAND_KIT_LIMITS.colors.gradients && (
            <button
              type="button"
              onClick={addGradient}
              className="w-full py-4 border-2 border-dashed border-border-subtle hover:border-interactive-600 rounded-xl text-text-muted hover:text-interactive-600 flex items-center justify-center gap-2 transition-colors"
            >
              <PlusIcon />
              Add Gradient
            </button>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
