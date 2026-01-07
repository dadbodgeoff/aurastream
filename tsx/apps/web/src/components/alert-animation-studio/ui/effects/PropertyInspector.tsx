'use client';

/**
 * Property Inspector
 *
 * Unified panel for fine-tuning effect parameters.
 * Shows contextual controls based on the selected effect type.
 */

import { memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PropertyInspectorProps, EffectCategory, PropertyDefinition } from './types';
import { getEffectPropertySchema, getEffectMeta, EFFECT_COLOR_CLASSES } from './utils';
import type { AnimationConfig } from '@aurastream/api-client';

export const PropertyInspector = memo(function PropertyInspector({
  config,
  selectedEffect,
  onConfigChange,
  onClose,
  className,
}: PropertyInspectorProps) {
  // Get the current effect config and schema
  const effectData = useMemo(() => {
    if (!selectedEffect) return null;
    
    let effectConfig: Record<string, unknown> | null = null;
    let effectType: string | null = null;
    
    switch (selectedEffect) {
      case 'entry':
        effectConfig = config.entry as Record<string, unknown> | null;
        effectType = config.entry?.type ?? null;
        break;
      case 'loop':
        effectConfig = config.loop as Record<string, unknown> | null;
        effectType = config.loop?.type ?? null;
        break;
      case 'depth':
        effectConfig = config.depthEffect as Record<string, unknown> | null;
        effectType = config.depthEffect?.type ?? null;
        break;
      case 'particles':
        effectConfig = config.particles as Record<string, unknown> | null;
        effectType = config.particles?.type ?? null;
        break;
    }
    
    if (!effectType || !effectConfig) return null;
    
    const schema = getEffectPropertySchema(selectedEffect, effectType);
    const meta = getEffectMeta(effectType);
    
    return { effectConfig, effectType, schema, meta };
  }, [selectedEffect, config]);
  
  // Handle property change
  const handlePropertyChange = useCallback((key: string, value: number | string | boolean) => {
    if (!selectedEffect || !effectData) return;
    
    const newConfig = { ...config };
    
    switch (selectedEffect) {
      case 'entry':
        if (config.entry) {
          newConfig.entry = { ...config.entry, [key]: value };
        }
        break;
      case 'loop':
        if (config.loop) {
          newConfig.loop = { ...config.loop, [key]: value };
        }
        break;
      case 'depth':
        if (config.depthEffect) {
          newConfig.depthEffect = { ...config.depthEffect, [key]: value };
        }
        break;
      case 'particles':
        if (config.particles) {
          newConfig.particles = { ...config.particles, [key]: value };
        }
        break;
    }
    
    onConfigChange(newConfig);
  }, [selectedEffect, effectData, config, onConfigChange]);
  
  // Handle reset to defaults
  const handleReset = useCallback(() => {
    if (!selectedEffect || !effectData) return;
    
    const newConfig = { ...config };
    const defaults: Record<string, unknown> = { type: effectData.effectType };
    
    effectData.schema.properties.forEach(prop => {
      if (prop.defaultValue !== undefined) {
        defaults[prop.key] = prop.defaultValue;
      }
    });
    
    switch (selectedEffect) {
      case 'entry':
        newConfig.entry = defaults as unknown as AnimationConfig['entry'];
        break;
      case 'loop':
        newConfig.loop = defaults as unknown as AnimationConfig['loop'];
        break;
      case 'depth':
        newConfig.depthEffect = defaults as unknown as AnimationConfig['depthEffect'];
        break;
      case 'particles':
        newConfig.particles = defaults as unknown as AnimationConfig['particles'];
        break;
    }
    
    onConfigChange(newConfig);
  }, [selectedEffect, effectData, config, onConfigChange]);
  
  // Handle remove effect
  const handleRemove = useCallback(() => {
    if (!selectedEffect) return;
    
    const newConfig = { ...config };
    
    switch (selectedEffect) {
      case 'entry':
        newConfig.entry = null;
        break;
      case 'loop':
        newConfig.loop = null;
        break;
      case 'depth':
        newConfig.depthEffect = null;
        break;
      case 'particles':
        newConfig.particles = null;
        break;
    }
    
    onConfigChange(newConfig);
    onClose();
  }, [selectedEffect, config, onConfigChange, onClose]);
  
  return (
    <AnimatePresence>
      {selectedEffect && effectData && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex flex-col rounded-xl bg-gray-800/50 border border-gray-700/50 overflow-hidden",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/30">
            <div className="flex items-center gap-2">
              <span className="text-lg">{effectData.meta.icon}</span>
              <div>
                <h3 className="text-sm font-medium text-white">{effectData.schema.label}</h3>
                <p className="text-xs text-gray-500 capitalize">{selectedEffect} Effect</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                title="Reset to defaults"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={handleRemove}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                title="Remove effect"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                title="Close inspector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Properties */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {effectData.schema.properties.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No adjustable properties for this effect
              </p>
            ) : (
              effectData.schema.properties.map((prop) => (
                <PropertyControl
                  key={prop.key}
                  definition={prop}
                  value={effectData.effectConfig[prop.key] as number | string | boolean}
                  onChange={(value) => handlePropertyChange(prop.key, value)}
                />
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ============================================================================
// Property Control Component
// ============================================================================

interface PropertyControlProps {
  definition: PropertyDefinition;
  value: number | string | boolean | undefined;
  onChange: (value: number | string | boolean) => void;
}

function PropertyControl({ definition, value, onChange }: PropertyControlProps) {
  const currentValue = value ?? definition.defaultValue;
  
  switch (definition.type) {
    case 'slider':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-400">{definition.label}</label>
            <span className="text-xs font-mono text-purple-400">
              {typeof currentValue === 'number' ? currentValue.toFixed(2) : currentValue}
              {definition.suffix}
            </span>
          </div>
          <input
            type="range"
            min={definition.min}
            max={definition.max}
            step={definition.step}
            value={currentValue as number}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>{definition.min}{definition.suffix}</span>
            <span>{definition.max}{definition.suffix}</span>
          </div>
        </div>
      );
    
    case 'select':
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400">{definition.label}</label>
          <select
            value={currentValue as string}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {definition.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    
    case 'color':
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400">{definition.label}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentValue as string}
              onChange={(e) => onChange(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
            />
            <input
              type="text"
              value={currentValue as string}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      );
    
    case 'toggle':
      return (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-400">{definition.label}</label>
          <button
            onClick={() => onChange(!currentValue)}
            className={cn(
              "w-10 h-6 rounded-full transition-colors relative",
              currentValue ? "bg-purple-600" : "bg-gray-700"
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                currentValue ? "translate-x-5" : "translate-x-1"
              )}
            />
          </button>
        </div>
      );
    
    case 'number':
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400">{definition.label}</label>
          <input
            type="number"
            min={definition.min}
            max={definition.max}
            step={definition.step}
            value={currentValue as number}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      );
    
    default:
      return null;
  }
}
