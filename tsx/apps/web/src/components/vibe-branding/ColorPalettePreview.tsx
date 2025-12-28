'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ColorPalettePreviewProps {
  primaryColors: string[];
  accentColors: string[];
}

export function ColorPalettePreview({
  primaryColors,
  accentColors,
}: ColorPalettePreviewProps) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  
  const handleCopy = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
      setCopiedColor(color);
      setTimeout(() => setCopiedColor(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <div className="space-y-3">
      {/* Primary colors */}
      <div>
        <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Primary Colors</p>
        <div className="flex rounded-lg overflow-hidden h-12">
          {primaryColors.map((color, i) => (
            <motion.button
              key={`primary-${i}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleCopy(color)}
              className="flex-1 relative group cursor-pointer transition-transform hover:scale-105 hover:z-10"
              style={{ backgroundColor: color }}
              title={`Click to copy ${color}`}
            >
              {/* Hover overlay with hex */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <span className="text-xs font-mono text-white font-bold">
                  {copiedColor === color ? 'Copied!' : color}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Accent colors */}
      <div>
        <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Accent Colors</p>
        <div className="flex gap-2">
          {accentColors.map((color, i) => (
            <motion.button
              key={`accent-${i}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              onClick={() => handleCopy(color)}
              className="w-12 h-12 rounded-lg relative group cursor-pointer transition-transform hover:scale-110 shadow-lg"
              style={{ backgroundColor: color }}
              title={`Click to copy ${color}`}
            >
              {/* Hover overlay with hex */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                <span className="text-[10px] font-mono text-white font-bold">
                  {copiedColor === color ? '✓' : color.slice(1, 4)}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
