'use client';

/**
 * Active Effects Bar
 *
 * Displays currently applied effects as compact badges with quick actions.
 * Users can see at a glance what's applied, toggle effects on/off,
 * remove effects, or click to edit in the Property Inspector.
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Settings2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActiveEffectsBarProps, EffectCategory } from './types';
import { extractActiveEffects, EFFECT_COLOR_CLASSES, getCategoryInfo } from './utils';

export const ActiveEffectsBar = memo(function ActiveEffectsBar({
  config,
  onToggleEffect,
  onRemoveEffect,
  onSelectEffect,
  selectedEffect,
  className,
}: ActiveEffectsBarProps) {
  const activeEffects = extractActiveEffects(config);
  
  if (activeEffects.length === 0) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/30 border border-dashed border-gray-700",
        className
      )}>
        <Sparkles className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-500">No effects applied</span>
        <span className="text-xs text-gray-600">— Select from Effects tab</span>
      </div>
    );
  }
  
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-1">
        Active:
      </span>
      
      <AnimatePresence mode="popLayout">
        {activeEffects.map((effect) => {
          const colors = EFFECT_COLOR_CLASSES[effect.color];
          const isSelected = selectedEffect === effect.category;
          
          return (
            <motion.div
              key={effect.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "group flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg border transition-all cursor-pointer",
                colors.bg,
                isSelected ? colors.border : "border-transparent hover:border-gray-600",
                isSelected && "ring-1 ring-white/20"
              )}
              onClick={() => onSelectEffect(isSelected ? null : effect.category)}
            >
              {/* Icon & Label */}
              <span className="text-sm">{effect.icon}</span>
              <span className={cn("text-xs font-medium", colors.text)}>
                {effect.label}
              </span>
              
              {/* Category Badge */}
              <span className="text-[10px] text-gray-500 px-1">
                {getCategoryInfo(effect.category).label}
              </span>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Edit Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEffect(effect.category);
                  }}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  title="Edit properties"
                >
                  <Settings2 className="h-3 w-3 text-gray-400" />
                </button>
                
                {/* Toggle Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleEffect(effect.category, !effect.enabled);
                  }}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  title={effect.enabled ? "Disable effect" : "Enable effect"}
                >
                  {effect.enabled ? (
                    <Eye className="h-3 w-3 text-gray-400" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-gray-500" />
                  )}
                </button>
                
                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveEffect(effect.category);
                  }}
                  className="p-1 rounded hover:bg-red-500/20 transition-colors"
                  title="Remove effect"
                >
                  <X className="h-3 w-3 text-gray-400 hover:text-red-400" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      {/* Effect Count */}
      <span className="text-xs text-gray-600 ml-2">
        {activeEffects.length} effect{activeEffects.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
});
