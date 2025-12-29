'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { StylePreset } from '@aurastream/api-client/src/types/profileCreator';
import { STYLE_PRESETS } from '@aurastream/api-client/src/types/profileCreator';

interface StyleSelectorProps {
  selected: StylePreset | null;
  onSelect: (style: StylePreset) => void;
}

/**
 * Style preset selector grid.
 */
export function StyleSelector({ selected, onSelect }: StyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {STYLE_PRESETS.map((preset) => {
        const isSelected = selected === preset.id;
        
        return (
          <motion.button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`
              relative p-3 rounded-lg border text-left transition-all
              ${isSelected
                ? 'bg-pink-500/20 border-pink-500/50'
                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              }
            `}
          >
            {/* Selection indicator */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1.5 right-1.5 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center"
              >
                <Check className="w-2.5 h-2.5 text-white" />
              </motion.div>
            )}

            {/* Icon + Name inline */}
            <div className="flex items-center gap-2">
              <span className="text-base">{preset.icon}</span>
              <h3 className={`font-medium text-sm ${isSelected ? 'text-pink-400' : 'text-white'}`}>
                {preset.name}
              </h3>
            </div>

            {/* Description */}
            <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
              {preset.description}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}
