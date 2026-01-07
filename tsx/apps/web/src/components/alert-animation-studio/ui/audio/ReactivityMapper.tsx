'use client';

/**
 * Reactivity Mapper Component
 *
 * UI for mapping audio sources to animation properties.
 * Supports frequency bands, energy, beats, and more.
 *
 * @module ui/audio/ReactivityMapper
 */

import { useCallback, memo, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Zap, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  AudioReactiveMapping,
  AudioSource,
  TriggerMode,
  FrequencyBandName,
  BeatType,
} from '../../engine/audio/types';

// ============================================================================
// Types
// ============================================================================

export interface ReactivityMapperProps {
  /** Current mappings */
  mappings: AudioReactiveMapping[];
  /** Available target properties */
  availableTargets: { value: string; label: string; category: string }[];
  /** Callback when a mapping changes */
  onMappingChange: (id: string, updates: Partial<AudioReactiveMapping>) => void;
  /** Callback when a mapping is added */
  onMappingAdd: () => void;
  /** Callback when a mapping is removed */
  onMappingRemove: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SOURCE_OPTIONS: { value: AudioSource['type']; label: string; icon: string }[] = [
  { value: 'band', label: 'Frequency Band', icon: '📊' },
  { value: 'energy', label: 'Overall Energy', icon: '⚡' },
  { value: 'beat', label: 'Beat Detection', icon: '🥁' },
  { value: 'beatPhase', label: 'Beat Phase', icon: '🔄' },
  { value: 'bpm', label: 'BPM', icon: '💓' },
  { value: 'spectralCentroid', label: 'Brightness', icon: '✨' },
  { value: 'spectralFlux', label: 'Spectral Change', icon: '📈' },
];

const BAND_OPTIONS: { value: FrequencyBandName; label: string }[] = [
  { value: 'sub', label: 'Sub Bass (20-60Hz)' },
  { value: 'bass', label: 'Bass (60-250Hz)' },
  { value: 'lowMid', label: 'Low Mid (250-500Hz)' },
  { value: 'mid', label: 'Mid (500-2kHz)' },
  { value: 'highMid', label: 'High Mid (2-4kHz)' },
  { value: 'high', label: 'High (4-8kHz)' },
  { value: 'brilliance', label: 'Brilliance (8-20kHz)' },
];

const TRIGGER_OPTIONS: { value: TriggerMode; label: string; description: string }[] = [
  { value: 'continuous', label: 'Continuous', description: 'Always apply' },
  { value: 'onBeat', label: 'On Beat', description: 'Apply on beat' },
  { value: 'onThreshold', label: 'Threshold', description: 'When above value' },
  { value: 'onRise', label: 'On Rise', description: 'When increasing' },
  { value: 'onFall', label: 'On Fall', description: 'When decreasing' },
];

// ============================================================================
// Component
// ============================================================================

/**
 * Audio-to-property mapping configuration UI.
 */
export const ReactivityMapper = memo(function ReactivityMapper({
  mappings,
  availableTargets,
  onMappingChange,
  onMappingAdd,
  onMappingRemove,
  className,
}: ReactivityMapperProps) {
  const [expandedMappings, setExpandedMappings] = useState<Set<string>>(new Set());

  // Toggle mapping expansion
  const toggleExpanded = useCallback((id: string) => {
    setExpandedMappings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-300">Audio Reactivity</span>
        </div>
        <button
          onClick={onMappingAdd}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
          aria-label="Add new mapping"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {/* Mappings List */}
      <div className="flex flex-col gap-1">
        {mappings.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No audio mappings</p>
            <p className="text-xs mt-1">Add a mapping to make animations react to audio</p>
          </div>
        ) : (
          mappings.map((mapping) => (
            <MappingRow
              key={mapping.id}
              mapping={mapping}
              availableTargets={availableTargets}
              isExpanded={expandedMappings.has(mapping.id)}
              onToggleExpand={() => toggleExpanded(mapping.id)}
              onChange={(updates) => onMappingChange(mapping.id, updates)}
              onRemove={() => onMappingRemove(mapping.id)}
            />
          ))
        )}
      </div>
    </div>
  );
});

// ============================================================================
// Mapping Row Sub-component
// ============================================================================

interface MappingRowProps {
  mapping: AudioReactiveMapping;
  availableTargets: { value: string; label: string; category: string }[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChange: (updates: Partial<AudioReactiveMapping>) => void;
  onRemove: () => void;
}

const MappingRow = memo(function MappingRow({
  mapping,
  availableTargets,
  isExpanded,
  onToggleExpand,
  onChange,
  onRemove,
}: MappingRowProps) {
  // Get source label
  const getSourceLabel = (): string => {
    const sourceType = SOURCE_OPTIONS.find((s) => s.value === mapping.source.type);
    if (mapping.source.type === 'band') {
      const band = BAND_OPTIONS.find((b) => b.value === (mapping.source as { type: 'band'; band: FrequencyBandName }).band);
      return band?.label || 'Band';
    }
    return sourceType?.label || 'Unknown';
  };

  // Get target label
  const targetLabel = availableTargets.find((t) => t.value === mapping.target)?.label || mapping.target;

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header Row */}
      <div className="flex items-center gap-2 p-2">
        <button
          onClick={onToggleExpand}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-gray-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-400" />
          )}
        </button>

        {/* Enable Toggle */}
        <button
          onClick={() => onChange({ enabled: !mapping.enabled })}
          className={cn(
            'w-4 h-4 rounded border-2 transition-colors',
            mapping.enabled
              ? 'bg-purple-600 border-purple-600'
              : 'border-gray-600 hover:border-gray-500'
          )}
          aria-label={mapping.enabled ? 'Disable mapping' : 'Enable mapping'}
          aria-pressed={mapping.enabled}
        >
          {mapping.enabled && (
            <svg viewBox="0 0 16 16" className="w-full h-full text-white">
              <path
                fill="currentColor"
                d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"
              />
            </svg>
          )}
        </button>

        {/* Source → Target Summary */}
        <div className={cn('flex-1 text-xs truncate', !mapping.enabled && 'opacity-50')}>
          <span className="text-purple-400">{getSourceLabel()}</span>
          <span className="text-gray-500 mx-1">→</span>
          <span className="text-gray-300">{targetLabel}</span>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="p-1 hover:bg-gray-700 text-gray-500 hover:text-red-400 rounded transition-colors"
          aria-label="Remove mapping"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Expanded Settings */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-700 space-y-3">
          {/* Source Selection */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-1 block">Source</label>
              <select
                value={mapping.source.type}
                onChange={(e) => {
                  const type = e.target.value as AudioSource['type'];
                  let newSource: AudioSource;
                  if (type === 'band') {
                    newSource = { type: 'band', band: 'bass' };
                  } else if (type === 'beat') {
                    newSource = { type: 'beat' };
                  } else {
                    newSource = { type } as AudioSource;
                  }
                  onChange({ source: newSource });
                }}
                className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Band Selection (if source is band) */}
            {mapping.source.type === 'band' && (
              <div>
                <label className="text-[10px] text-gray-500 uppercase mb-1 block">Band</label>
                <select
                  value={(mapping.source as { type: 'band'; band: FrequencyBandName }).band}
                  onChange={(e) => onChange({ source: { type: 'band', band: e.target.value as FrequencyBandName } })}
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200"
                >
                  {BAND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Target Selection */}
            <div className={mapping.source.type !== 'band' ? 'col-span-2' : ''}>
              <label className="text-[10px] text-gray-500 uppercase mb-1 block">Target</label>
              <select
                value={mapping.target}
                onChange={(e) => onChange({ target: e.target.value })}
                className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200"
              >
                {availableTargets.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Range Sliders */}
          <div className="grid grid-cols-2 gap-3">
            <RangeInput
              label="Input Range"
              min={mapping.inputMin}
              max={mapping.inputMax}
              onMinChange={(v) => onChange({ inputMin: v })}
              onMaxChange={(v) => onChange({ inputMax: v })}
            />
            <RangeInput
              label="Output Range"
              min={mapping.outputMin}
              max={mapping.outputMax}
              onMinChange={(v) => onChange({ outputMin: v })}
              onMaxChange={(v) => onChange({ outputMax: v })}
            />
          </div>

          {/* Trigger Mode & Smoothing */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-1 block">Trigger</label>
              <select
                value={mapping.triggerMode}
                onChange={(e) => onChange({ triggerMode: e.target.value as TriggerMode })}
                className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200"
              >
                {TRIGGER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-1 block">
                Smoothing: {(mapping.smoothing * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={mapping.smoothing}
                onChange={(e) => onChange({ smoothing: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={mapping.invert}
                onChange={(e) => onChange({ invert: e.target.checked })}
                className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-purple-600"
              />
              Invert
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={mapping.clamp}
                onChange={(e) => onChange({ clamp: e.target.checked })}
                className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-purple-600"
              />
              Clamp
            </label>
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Range Input Sub-component
// ============================================================================

interface RangeInputProps {
  label: string;
  min: number;
  max: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}

const RangeInput = memo(function RangeInput({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
}: RangeInputProps) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 uppercase mb-1 block">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={min}
          onChange={(e) => onMinChange(parseFloat(e.target.value) || 0)}
          step={0.1}
          className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200 text-center"
          aria-label={`${label} minimum`}
        />
        <span className="text-gray-500 text-xs">-</span>
        <input
          type="number"
          value={max}
          onChange={(e) => onMaxChange(parseFloat(e.target.value) || 0)}
          step={0.1}
          className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200 text-center"
          aria-label={`${label} maximum`}
        />
      </div>
    </div>
  );
});

export default ReactivityMapper;
