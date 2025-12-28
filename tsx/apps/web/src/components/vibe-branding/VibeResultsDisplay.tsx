'use client';

import { motion } from 'framer-motion';
import { Check, ArrowRight, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { analytics } from '@aurastream/shared';
import { ColorPalettePreview } from './ColorPalettePreview';
import { LIGHTING_MOOD_LABELS, TONE_LABELS } from './constants';
import type { VibeAnalysis } from './types';

interface VibeResultsDisplayProps {
  analysis: VibeAnalysis;
  brandKitId: string | null;
  onClose: () => void;
  onReset: () => void;
}

export function VibeResultsDisplay({
  analysis,
  brandKitId,
  onClose,
  onReset,
}: VibeResultsDisplayProps) {
  const router = useRouter();
  
  const handleGenerateNow = () => {
    // Track generate assets click
    if (brandKitId) {
      analytics.track('vibe_branding_generate_clicked', {
        brandKitId,
      }, 'feature');
      router.push(`/dashboard/create?vibe_kit=${brandKitId}`);
    }
    onClose();
  };
  
  const handleSaveAndClose = () => {
    onClose();
    router.push('/dashboard/brand-kits');
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Success header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-green-400">
          <Check className="w-5 h-5" />
          <span className="font-bold">Aesthetic Extracted Successfully</span>
        </div>
        <button
          onClick={onReset}
          className="p-2 text-text-tertiary hover:text-text-secondary rounded-lg hover:bg-background-elevated transition-colors"
          title="Analyze another image"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      
      {/* Color palette */}
      <ColorPalettePreview
        primaryColors={analysis.primaryColors}
        accentColors={analysis.accentColors}
      />
      
      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-background-elevated/50 p-4 rounded-lg">
          <p className="text-xs text-text-tertiary uppercase font-bold mb-1">
            Detected Vibe
          </p>
          <p className="text-text-primary">
            {TONE_LABELS[analysis.tone] || analysis.tone}
          </p>
        </div>
        <div className="bg-background-elevated/50 p-4 rounded-lg">
          <p className="text-xs text-text-tertiary uppercase font-bold mb-1">
            Lighting
          </p>
          <p className="text-text-primary">
            {LIGHTING_MOOD_LABELS[analysis.lightingMood] || analysis.lightingMood}
          </p>
        </div>
        <div className="bg-background-elevated/50 p-4 rounded-lg">
          <p className="text-xs text-text-tertiary uppercase font-bold mb-1">
            Headline Font
          </p>
          <p className="text-text-primary" style={{ fontFamily: analysis.fonts.headline }}>
            {analysis.fonts.headline}
          </p>
        </div>
        <div className="bg-background-elevated/50 p-4 rounded-lg">
          <p className="text-xs text-text-tertiary uppercase font-bold mb-1">
            Body Font
          </p>
          <p className="text-text-primary" style={{ fontFamily: analysis.fonts.body }}>
            {analysis.fonts.body}
          </p>
        </div>
      </div>
      
      {/* Style keywords */}
      <div className="flex flex-wrap gap-2">
        {analysis.styleKeywords.map((keyword, i) => (
          <span
            key={i}
            className="px-3 py-1 bg-interactive-500/20 text-interactive-300 text-xs rounded-full border border-interactive-500/30"
          >
            {keyword}
          </span>
        ))}
      </div>
      
      {/* Confidence indicator */}
      <div className="flex items-center gap-2 text-xs text-text-tertiary">
        <div className="flex-1 h-1 bg-background-elevated rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${analysis.confidence * 100}%` }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="h-full bg-interactive-500 rounded-full"
          />
        </div>
        <span>{Math.round(analysis.confidence * 100)}% confidence</span>
      </div>
      
      {/* CTAs */}
      <div className="pt-4 flex gap-3">
        <button
          onClick={handleSaveAndClose}
          className="flex-1 py-3 bg-background-elevated hover:bg-border-default text-text-primary rounded-lg font-medium transition-colors border border-border-default"
        >
          Save to Brand Kits
        </button>
        <button
          onClick={handleGenerateNow}
          className="flex-[2] py-3 bg-interactive-600 hover:bg-interactive-500 text-white rounded-lg font-bold shadow-lg shadow-interactive-900/30 flex items-center justify-center gap-2 transition-colors"
        >
          Generate Assets Now
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
