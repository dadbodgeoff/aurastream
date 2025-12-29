'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Download, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OutputSize, OutputFormat, BackgroundType } from '@aurastream/api-client/src/types/profileCreator';
import { OUTPUT_SIZES } from '@aurastream/api-client/src/types/profileCreator';

interface GenerationOptionsProps {
  refinedDescription: string;
  isGenerating: boolean;
  onGenerate: (options: {
    outputSize: OutputSize;
    outputFormat: OutputFormat;
    background: BackgroundType;
    backgroundColor?: string;
  }) => void;
  onBack: () => void;
}

export function GenerationOptions({ refinedDescription, isGenerating, onGenerate, onBack }: GenerationOptionsProps) {
  const [outputSize, setOutputSize] = useState<OutputSize>('medium');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('png');
  const [background, setBackground] = useState<BackgroundType>('transparent');
  const [backgroundColor, setBackgroundColor] = useState('#1F2121');

  const handleGenerate = () => {
    onGenerate({
      outputSize,
      outputFormat,
      background,
      backgroundColor: background === 'solid' ? backgroundColor : undefined,
    });
  };

  return (
    <div className="space-y-3">
      <button onClick={onBack} disabled={isGenerating} className="flex items-center gap-1 text-text-secondary hover:text-text-primary text-xs disabled:opacity-50">
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </button>

      <div className="text-center mb-3">
        <h2 className="text-base font-semibold text-text-primary">Output Settings</h2>
        <p className="text-xs text-text-secondary mt-0.5">Configure your generation</p>
      </div>

      {/* Description Preview */}
      <div className="p-2.5 bg-background-surface rounded-lg border border-border-subtle">
        <p className="text-[10px] text-text-tertiary mb-1">What will be generated:</p>
        <p className="text-xs text-text-primary line-clamp-2">{refinedDescription}</p>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Size Selection */}
        <div className="p-2.5 bg-background-surface rounded-lg border border-border-subtle">
          <h3 className="text-[11px] font-semibold text-text-primary mb-2">Size</h3>
          <div className="space-y-1">
            {OUTPUT_SIZES.map((size) => (
              <button
                key={size.id}
                onClick={() => setOutputSize(size.id)}
                className={cn(
                  "w-full p-2 rounded-lg border text-left transition-all",
                  outputSize === size.id
                    ? "bg-interactive-600/10 border-interactive-600/50"
                    : "bg-background-base border-border-subtle hover:border-border-default"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-[11px] font-medium", outputSize === size.id ? "text-interactive-400" : "text-text-primary")}>
                    {size.name}
                  </span>
                  <span className="text-[9px] text-text-tertiary">{size.pixels}px</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Format & Background */}
        <div className="space-y-3">
          {/* Format */}
          <div className="p-2.5 bg-background-surface rounded-lg border border-border-subtle">
            <h3 className="text-[11px] font-semibold text-text-primary mb-2">Format</h3>
            <div className="flex gap-1.5">
              {(['png', 'webp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setOutputFormat(fmt)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg border text-center text-[11px] font-medium transition-all",
                    outputFormat === fmt
                      ? "bg-interactive-600/10 border-interactive-600/50 text-interactive-400"
                      : "bg-background-base border-border-subtle text-text-primary hover:border-border-default"
                  )}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="p-2.5 bg-background-surface rounded-lg border border-border-subtle">
            <h3 className="text-[11px] font-semibold text-text-primary mb-2">Background</h3>
            <div className="flex gap-1.5">
              {(['transparent', 'solid'] as const).map((bg) => (
                <button
                  key={bg}
                  onClick={() => setBackground(bg)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg border text-center text-[10px] font-medium transition-all capitalize",
                    background === bg
                      ? "bg-interactive-600/10 border-interactive-600/50 text-interactive-400"
                      : "bg-background-base border-border-subtle text-text-primary hover:border-border-default"
                  )}
                >
                  {bg}
                </button>
              ))}
            </div>

            {background === 'solid' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1 px-2 py-1 text-[10px] bg-background-base border border-border-subtle rounded-lg text-text-primary"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={cn(
            "flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-medium transition-all",
            isGenerating
              ? "bg-background-elevated text-text-muted cursor-not-allowed"
              : "bg-gradient-to-r from-interactive-600 to-accent-600 text-white hover:from-interactive-500 hover:to-accent-500 shadow-lg shadow-interactive-600/25"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Generate
            </>
          )}
        </button>
      </div>
    </div>
  );
}
