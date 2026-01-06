'use client';

/**
 * Preset Selector
 *
 * UI for selecting animation presets organized by category.
 */

import { useAnimationPresets, type AnimationPreset, type AnimationConfig } from '@aurastream/api-client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { PresetSelectorProps } from './types';

export function PresetSelector({ config, onChange }: PresetSelectorProps) {
  const { data: presets, isLoading } = useAnimationPresets();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const entryPresets = presets?.filter((p) => p.category === 'entry') || [];
  const loopPresets = presets?.filter((p) => p.category === 'loop') || [];
  const depthPresets = presets?.filter((p) => p.category === 'depth') || [];
  const particlePresets = presets?.filter((p) => p.category === 'particles') || [];

  return (
    <div className="space-y-6 p-4">
      <PresetCategory
        title="Entry Animation"
        icon="🎯"
        presets={entryPresets}
        selectedType={config.entry?.type || null}
        onSelect={(preset) =>
          onChange({
            ...config,
            entry: preset ? (preset.config as any) : null,
          })
        }
      />

      <PresetCategory
        title="Loop Animation"
        icon="💫"
        presets={loopPresets}
        selectedType={config.loop?.type || null}
        onSelect={(preset) =>
          onChange({
            ...config,
            loop: preset ? (preset.config as any) : null,
          })
        }
      />

      <PresetCategory
        title="3D Depth Effect"
        icon="🌀"
        presets={depthPresets}
        selectedType={config.depthEffect?.type || null}
        onSelect={(preset) =>
          onChange({
            ...config,
            depthEffect: preset ? (preset.config as any) : null,
          })
        }
      />

      <PresetCategory
        title="Particles"
        icon="✨"
        presets={particlePresets}
        selectedType={config.particles?.type || null}
        onSelect={(preset) =>
          onChange({
            ...config,
            particles: preset ? (preset.config as any) : null,
          })
        }
      />

      {/* Duration Control */}
      <div className="border-t border-gray-800 pt-4">
        <label className="mb-2 block text-sm font-medium text-gray-300">
          Duration: {(config.durationMs / 1000).toFixed(1)}s
        </label>
        <input
          type="range"
          min={500}
          max={10000}
          step={500}
          value={config.durationMs}
          onChange={(e) =>
            onChange({
              ...config,
              durationMs: parseInt(e.target.value, 10),
            })
          }
          className="w-full accent-purple-500"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>0.5s</span>
          <span>10s</span>
        </div>
      </div>

      {/* Loop Count Control */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">
          Loop: {config.loopCount === 0 ? '∞' : `${config.loopCount}x`}
        </label>
        <input
          type="range"
          min={0}
          max={10}
          value={config.loopCount}
          onChange={(e) =>
            onChange({
              ...config,
              loopCount: parseInt(e.target.value, 10),
            })
          }
          className="w-full accent-purple-500"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>∞</span>
          <span>10x</span>
        </div>
      </div>
    </div>
  );
}

interface PresetCategoryProps {
  title: string;
  icon: string;
  presets: AnimationPreset[];
  selectedType: string | null;
  onSelect: (preset: AnimationPreset | null) => void;
}

function PresetCategory({ title, icon, presets, selectedType, onSelect }: PresetCategoryProps) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-gray-300">
        {icon} {title}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const presetType = (preset.config as any)?.type;
          const isSelected = selectedType === presetType;

          return (
            <button
              key={preset.id}
              onClick={() => onSelect(isSelected ? null : preset)}
              className={cn(
                'flex items-center gap-2 rounded-lg border p-2 text-left transition-all',
                isSelected
                  ? 'border-purple-500 bg-purple-500/10 text-white'
                  : 'border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800/50'
              )}
            >
              <span className="text-lg">{preset.icon || '🎨'}</span>
              <span className="text-sm">{preset.name}</span>
            </button>
          );
        })}

        {/* None option */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'flex items-center justify-center rounded-lg border p-2 text-sm transition-all',
            !selectedType
              ? 'border-gray-500 bg-gray-800/50 text-gray-300'
              : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
          )}
        >
          None
        </button>
      </div>
    </div>
  );
}
