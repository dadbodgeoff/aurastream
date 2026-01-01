'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StylePreset } from '@aurastream/api-client';
import { STYLE_PRESETS } from '@aurastream/api-client';

interface StyleSelectorProps {
  selected: StylePreset | null;
  onSelect: (style: StylePreset) => void;
}

export function StyleSelector({ selected, onSelect }: StyleSelectorProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
      {STYLE_PRESETS.map((preset) => {
        const isSelected = selected === preset.id;
        
        return (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className={cn(
              "relative p-2 rounded-lg border text-left transition-all",
              isSelected
                ? "bg-interactive-600/10 border-interactive-600/50"
                : "bg-background-surface border-border-subtle hover:border-border-default"
            )}
          >
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 w-3.5 h-3.5 bg-interactive-600 rounded-full flex items-center justify-center"
              >
                <Check className="w-2 h-2 text-white" />
              </motion.div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-sm">{preset.icon}</span>
              <h3 className={cn("font-medium text-[11px]", isSelected ? "text-interactive-400" : "text-text-primary")}>
                {preset.name}
              </h3>
            </div>

            <p className="text-[9px] text-text-tertiary mt-0.5 line-clamp-1">
              {preset.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
