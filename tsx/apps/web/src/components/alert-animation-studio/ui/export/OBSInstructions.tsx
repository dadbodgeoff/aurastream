'use client';

/**
 * OBS Instructions Component
 *
 * Step-by-step guide for setting up OBS browser source.
 * Includes copy functionality and preview.
 *
 * @module ui/export/OBSInstructions
 */

import { useState, useCallback, memo } from 'react';
import { Copy, Check, ExternalLink, Monitor, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface OBSInstructionsProps {
  /** Generated HTML blob URL or content */
  htmlBlob: string | null;
  /** Alert dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  /** Callback when copy button is clicked */
  onCopy: () => void;
  /** Whether the HTML has been copied */
  copied?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STEPS = [
  {
    title: 'Open OBS Studio',
    description: 'Launch OBS Studio on your computer.',
    icon: '1',
  },
  {
    title: 'Add Browser Source',
    description: 'In the Sources panel, click "+" and select "Browser".',
    icon: '2',
  },
  {
    title: 'Configure Source',
    description: 'Name your source (e.g., "Alert Animation") and click OK.',
    icon: '3',
  },
  {
    title: 'Set Local File',
    description: 'Check "Local file" and browse to select the downloaded HTML file.',
    icon: '4',
  },
  {
    title: 'Set Dimensions',
    description: 'Set the width and height to match your alert dimensions.',
    icon: '5',
  },
  {
    title: 'Position & Test',
    description: 'Position the source in your scene and test the animation.',
    icon: '6',
  },
];

// ============================================================================
// Component
// ============================================================================

/**
 * OBS setup instructions with copy functionality.
 */
export const OBSInstructions = memo(function OBSInstructions({
  htmlBlob,
  dimensions,
  onCopy,
  copied = false,
  className,
}: OBSInstructionsProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [showAllSteps, setShowAllSteps] = useState(false);

  // Toggle step expansion
  const toggleStep = useCallback((index: number) => {
    setExpandedStep((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className={cn('flex flex-col bg-gray-900 rounded-lg border border-gray-800', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <Monitor className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-white">OBS Setup Guide</span>
      </div>

      {/* Quick Start */}
      <div className="p-4 space-y-3">
        {/* Download/Copy Section */}
        {htmlBlob && (
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">HTML Browser Source</span>
              <button
                onClick={onCopy}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
                  copied
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy HTML
                  </>
                )}
              </button>
            </div>
            <div className="text-xs text-gray-500 font-mono truncate bg-gray-900/50 px-2 py-1 rounded">
              {htmlBlob.substring(0, 50)}...
            </div>
          </div>
        )}

        {/* Dimensions Info */}
        <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
          <span className="text-xs text-purple-300">Required Dimensions</span>
          <span className="text-sm font-mono text-white">
            {dimensions.width} × {dimensions.height}
          </span>
        </div>

        {/* Steps Toggle */}
        <button
          onClick={() => setShowAllSteps(!showAllSteps)}
          className="flex items-center gap-2 w-full text-left text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          {showAllSteps ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          {showAllSteps ? 'Hide setup steps' : 'Show setup steps'}
        </button>

        {/* Steps List */}
        {showAllSteps && (
          <div className="space-y-2">
            {STEPS.map((step, index) => (
              <div
                key={index}
                className="bg-gray-800/30 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleStep(index)}
                  className="flex items-center gap-3 w-full p-3 text-left hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-600/30 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">
                    {step.icon}
                  </div>
                  <span className="text-sm text-gray-200">{step.title}</span>
                  {expandedStep === index ? (
                    <ChevronDown className="w-4 h-4 text-gray-500 ml-auto" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500 ml-auto" />
                  )}
                </button>
                {expandedStep === index && (
                  <div className="px-3 pb-3 pl-12">
                    <p className="text-xs text-gray-400">{step.description}</p>
                    {index === 4 && (
                      <div className="mt-2 p-2 bg-gray-900/50 rounded text-xs font-mono text-gray-300">
                        Width: {dimensions.width}px<br />
                        Height: {dimensions.height}px
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Link */}
      <div className="px-4 pb-4">
        <a
          href="https://obsproject.com/wiki/Sources-Guide#browser-source"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          OBS Browser Source Documentation
        </a>
      </div>
    </div>
  );
});

export default OBSInstructions;
