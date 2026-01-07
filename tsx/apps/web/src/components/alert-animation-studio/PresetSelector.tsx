'use client';

/**
 * Preset Selector
 *
 * UI for selecting animation presets organized by category.
 * Includes stream event presets for quick selection.
 */

import { useState } from 'react';
import { 
  useAnimationPresets, 
  useStreamEventPresets,
  type AnimationPreset, 
  type AnimationConfig,
  type AnimationSuggestion,
  type StreamEventPreset,
} from '@aurastream/api-client';
import { cn } from '@/lib/utils';
import { Loader2, Wand2, Zap } from 'lucide-react';
import type { PresetSelectorProps } from './types';

// Stream event display info
const EVENT_INFO: Record<string, { label: string; icon: string; color: string }> = {
  new_subscriber: { label: 'New Sub', icon: '🎉', color: 'from-green-600 to-emerald-600' },
  raid: { label: 'Raid', icon: '⚔️', color: 'from-red-600 to-orange-600' },
  donation_small: { label: '$5-20', icon: '💚', color: 'from-green-500 to-teal-500' },
  donation_medium: { label: '$20-100', icon: '💛', color: 'from-yellow-500 to-amber-500' },
  donation_large: { label: '$100+', icon: '💎', color: 'from-cyan-500 to-blue-500' },
  new_follower: { label: 'Follow', icon: '👋', color: 'from-purple-500 to-pink-500' },
  milestone: { label: 'Milestone', icon: '🏆', color: 'from-yellow-600 to-orange-500' },
  bits: { label: 'Bits', icon: '💜', color: 'from-purple-600 to-violet-600' },
  gift_sub: { label: 'Gift Sub', icon: '🎁', color: 'from-pink-500 to-rose-500' },
};

interface ExtendedPresetSelectorProps extends PresetSelectorProps {
  suggestion?: AnimationSuggestion | null;
  onApplySuggestion?: (suggestion: AnimationSuggestion) => void;
}

export function PresetSelector({ 
  config, 
  onChange,
  suggestion,
  onApplySuggestion,
}: ExtendedPresetSelectorProps) {
  const [activeTab, setActiveTab] = useState<'events' | 'custom'>('events');
  
  const { data: presets, isLoading: isLoadingPresets } = useAnimationPresets();
  const { data: eventPresets, isLoading: isLoadingEvents } = useStreamEventPresets();

  if (isLoadingPresets || isLoadingEvents) {
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
    <div className="flex flex-col h-full">
      {/* Tab Switcher */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('events')}
          className={cn(
            'flex-1 px-4 py-3 text-sm font-medium transition-colors',
            activeTab === 'events'
              ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/5'
              : 'text-gray-400 hover:text-gray-300'
          )}
        >
          <Zap className="h-4 w-4 inline mr-1.5" />
          Stream Events
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={cn(
            'flex-1 px-4 py-3 text-sm font-medium transition-colors',
            activeTab === 'custom'
              ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/5'
              : 'text-gray-400 hover:text-gray-300'
          )}
        >
          Custom
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'events' ? (
          <div className="p-4 space-y-4">
            {/* AI Suggestion Quick Apply */}
            {suggestion && onApplySuggestion && (
              <div className="mb-4">
                <button
                  onClick={() => onApplySuggestion(suggestion)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 hover:border-purple-500/50 transition-all group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/30 group-hover:bg-purple-600/40 transition-colors">
                    <Wand2 className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-purple-200">AI Recommended</p>
                    <p className="text-xs text-purple-400">{suggestion.vibe} style • {suggestion.recommendedPreset}</p>
                  </div>
                </button>
              </div>
            )}

            {/* Stream Event Presets */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                Quick Presets by Event
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {eventPresets?.map((preset) => {
                  const info = EVENT_INFO[preset.eventType] || { 
                    label: preset.name, 
                    icon: '🎯', 
                    color: 'from-gray-600 to-gray-700' 
                  };
                  
                  return (
                    <button
                      key={preset.id}
                      onClick={() => onChange(preset.animationConfig)}
                      className="flex flex-col items-center gap-1 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all group"
                    >
                      <span className="text-2xl">{info.icon}</span>
                      <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
                        {info.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration hint */}
            <p className="text-xs text-gray-500 text-center mt-4">
              Event presets include optimized duration and effects
            </p>
          </div>
        ) : (
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
        )}
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
