'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Download, ArrowLeft } from 'lucide-react';
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

/**
 * Generation options panel before final generation.
 */
export function GenerationOptions({
  refinedDescription,
  isGenerating,
  onGenerate,
  onBack,
}: GenerationOptionsProps) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Generation Options
        </h2>
        <p className="text-gray-400 max-w-lg mx-auto">
          Configure the output settings for your creation
        </p>
      </div>

      {/* Preview of description */}
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <p className="text-sm text-gray-400 mb-1">What will be generated:</p>
        <p className="text-white">{refinedDescription}</p>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Size Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Output Size
          </label>
          <div className="space-y-2">
            {OUTPUT_SIZES.map((size) => (
              <button
                key={size.id}
                onClick={() => setOutputSize(size.id)}
                className={`
                  w-full p-2.5 rounded-lg border text-left transition-all
                  ${outputSize === size.id
                    ? 'bg-pink-500/20 border-pink-500/50'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${outputSize === size.id ? 'text-pink-400' : 'text-white'}`}>
                      {size.name}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {size.pixels}×{size.pixels}px
                    </span>
                  </div>
                  {outputSize === size.id && (
                    <div className="w-2 h-2 bg-pink-500 rounded-full" />
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{size.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Format & Background */}
        <div className="space-y-6">
          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Format
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setOutputFormat('png')}
                className={`
                  flex-1 p-3 rounded-lg border text-center transition-all
                  ${outputFormat === 'png'
                    ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                    : 'bg-gray-800/50 border-gray-700 text-white hover:border-gray-600'
                  }
                `}
              >
                PNG
              </button>
              <button
                onClick={() => setOutputFormat('webp')}
                className={`
                  flex-1 p-3 rounded-lg border text-center transition-all
                  ${outputFormat === 'webp'
                    ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                    : 'bg-gray-800/50 border-gray-700 text-white hover:border-gray-600'
                  }
                `}
              >
                WebP
              </button>
            </div>
          </div>

          {/* Background */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Background
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setBackground('transparent')}
                className={`
                  flex-1 p-3 rounded-lg border text-center transition-all
                  ${background === 'transparent'
                    ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                    : 'bg-gray-800/50 border-gray-700 text-white hover:border-gray-600'
                  }
                `}
              >
                Transparent
              </button>
              <button
                onClick={() => setBackground('solid')}
                className={`
                  flex-1 p-3 rounded-lg border text-center transition-all
                  ${background === 'solid'
                    ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                    : 'bg-gray-800/50 border-gray-700 text-white hover:border-gray-600'
                  }
                `}
              >
                Solid
              </button>
            </div>

            {/* Color picker for solid background */}
            {background === 'solid' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </button>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-pink-500/25"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Generate
            </>
          )}
        </button>
      </div>
    </div>
  );
}
