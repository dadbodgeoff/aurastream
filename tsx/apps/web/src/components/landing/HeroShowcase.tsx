'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { SparklesIcon } from './icons';
import { SHOWCASE_ASSETS, ANIMATION_TIMING } from './constants';
import { ChromaKeyImage } from './ChromaKeyImage';

// =============================================================================
// Hero Showcase Component
// Multi-layer depth glow, phase transitions, typing animation
// Prompts are synced with the displayed asset
// =============================================================================

interface HeroShowcaseProps {
  className?: string;
}

export function HeroShowcase({ className }: HeroShowcaseProps) {
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(true);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const currentAsset = SHOWCASE_ASSETS[currentAssetIndex];

  // Typing animation - synced with current asset's prompt
  useEffect(() => {
    if (!isTyping || !currentAsset) return;

    const prompt = currentAsset.prompt;
    let index = 0;
    setTypedText('');
    
    const typeInterval = setInterval(() => {
      if (index < prompt.length) {
        setTypedText(prompt.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
      }
    }, 35);

    return () => clearInterval(typeInterval);
  }, [currentAssetIndex, isTyping, currentAsset]);

  // Cycle through assets
  useEffect(() => {
    const interval = setInterval(() => {
      setIsGenerating(true);
      setShowResult(false);
      
      setTimeout(() => {
        setCurrentAssetIndex((prev) => (prev + 1) % SHOWCASE_ASSETS.length);
        setIsTyping(true);
        setIsGenerating(false);
        setShowResult(true);
      }, ANIMATION_TIMING.generateDelay);
    }, ANIMATION_TIMING.showcaseCycle);

    // Start initial typing
    setIsTyping(true);

    return () => clearInterval(interval);
  }, []);

  const displayText = isTyping ? typedText : currentAsset?.prompt || '';

  return (
    <div className={cn("relative w-full max-w-lg mx-auto", className)}>
      {/* Multi-layer depth glow */}
      <div className="absolute -inset-4 rounded-2xl opacity-60">
        <div className="absolute inset-0 bg-gradient-radial from-interactive-500/20 via-transparent to-transparent blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute inset-2 bg-gradient-radial from-interactive-600/15 via-transparent to-transparent blur-2xl" />
        <div className="absolute inset-4 bg-gradient-radial from-accent-500/10 via-transparent to-transparent blur-xl" />
      </div>

      {/* Browser-like frame */}
      <div className="relative bg-background-surface rounded-xl border border-border-subtle overflow-hidden shadow-2xl shadow-black/30">
        {/* macOS-style window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle bg-background-elevated/50">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-[#27CA40] shadow-inner" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 rounded-md bg-background-base/80 text-[11px] text-text-tertiary font-medium">
              aurastream.app/create
            </div>
          </div>
        </div>
        
        {/* App content */}
        <div className="p-5 space-y-4">
          {/* Prompt input mockup */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
              Describe your asset
            </label>
            <div className="relative">
              <div className="w-full px-4 py-3 rounded-lg bg-background-base border border-border-default text-sm text-text-primary min-h-[44px] flex items-center transition-all duration-300 focus-within:border-interactive-500/50 focus-within:ring-2 focus-within:ring-interactive-500/20">
                <span className="truncate">{displayText}</span>
                <span className={cn(
                  "ml-0.5 w-0.5 h-5 bg-interactive-500 transition-opacity",
                  isTyping ? "animate-pulse" : "opacity-0"
                )} />
              </div>
            </div>
          </div>

          {/* Generate button with glow */}
          <button 
            className={cn(
              "w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300",
              isGenerating 
                ? "bg-interactive-600/50 text-white/70" 
                : "bg-interactive-600 text-white hover:bg-interactive-500 hover:scale-[1.01] active:scale-[0.99]",
              "shadow-lg shadow-interactive-600/30"
            )}
            disabled
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                Generate Asset
              </>
            )}
          </button>

          {/* Result preview - Fixed dimensions with proper contain */}
          <div className="relative w-full h-52 rounded-lg overflow-hidden bg-background-base border border-border-subtle">
            {showResult && currentAsset ? (
              <div className="absolute inset-0 flex items-center justify-center p-3 animate-fade-in">
                {currentAsset.hasGreenBg ? (
                  <ChromaKeyImage
                    src={currentAsset.src}
                    alt={currentAsset.label}
                    className="w-full h-full"
                    containerClassName="w-full h-full"
                    tolerance={80}
                    smoothing={25}
                  />
                ) : (
                  <img
                    src={currentAsset.src}
                    alt={currentAsset.label}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-contain rounded transition-all duration-500"
                  />
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-interactive-600/30 border-t-interactive-600 rounded-full animate-spin" />
                  <span className="text-sm text-text-tertiary">Creating your asset...</span>
                </div>
              </div>
            )}
            
            {/* Asset type badge with slide-in */}
            {showResult && (
              <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm text-[11px] font-semibold text-white animate-slide-in-left">
                {currentAsset?.label}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Floating accent elements */}
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-interactive-500/20 rounded-full blur-2xl animate-pulse pointer-events-none" style={{ animationDuration: '3s' }} />
      <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-accent-500/15 rounded-full blur-2xl animate-pulse pointer-events-none" style={{ animationDuration: '4s', animationDelay: '1s' }} />
    </div>
  );
}

export default HeroShowcase;
