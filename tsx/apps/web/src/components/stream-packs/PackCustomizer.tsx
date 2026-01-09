'use client';

/**
 * Pack Customizer Component
 * 
 * Form for customizing a selected stream pack template.
 * Users can set their channel name, colors, and social platforms.
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Sparkles, 
  Palette, 
  Type, 
  Share2, 
  Loader2,
  Check,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  SOCIAL_PLATFORMS, 
  DEFAULT_COLOR_SCHEMES,
  type PackCustomizerProps,
  type SocialPlatform,
  type ColorScheme,
} from './types';

export function PackCustomizer({
  pack,
  customization,
  onCustomizationChange,
  onGenerate,
  onBack,
  isGenerating,
  className,
}: PackCustomizerProps) {
  const [activeAssetIndex, setActiveAssetIndex] = useState(0);
  
  // Update customization helper
  const updateCustomization = useCallback((updates: Partial<typeof customization>) => {
    onCustomizationChange({ ...customization, ...updates });
  }, [customization, onCustomizationChange]);
  
  // Toggle social platform
  const togglePlatform = useCallback((platform: SocialPlatform) => {
    const current = customization.socialPlatforms;
    const updated = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform];
    updateCustomization({ socialPlatforms: updated });
  }, [customization.socialPlatforms, updateCustomization]);
  
  // Select color scheme
  const selectColorScheme = useCallback((scheme: ColorScheme) => {
    updateCustomization({ colorScheme: scheme });
  }, [updateCustomization]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Customize: {pack.name}</h1>
          <p className="text-sm text-gray-400">{pack.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Preview */}
        <div className="space-y-4">
          {/* Main Preview */}
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/10">
            {/* Preview image placeholder */}
            <div 
              className="absolute inset-0"
              style={{
                background: customization.colorScheme.preview.length > 0
                  ? `linear-gradient(135deg, ${customization.colorScheme.preview.join(', ')})`
                  : `linear-gradient(135deg, ${pack.originalColors.preview.join(', ')})`
              }}
            />
            
            {/* Simulated text overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              <div className="text-center">
                <p className="text-4xl font-bold text-white drop-shadow-lg">
                  {pack.assets[activeAssetIndex]?.label || 'STARTING SOON'}
                </p>
                {customization.channelName && (
                  <p className="mt-4 text-xl text-white/80 drop-shadow">
                    {customization.channelName}
                  </p>
                )}
              </div>
              
              {/* Social icons preview */}
              {customization.socialPlatforms.length > 0 && (
                <div className="absolute bottom-6 right-6 flex items-center gap-2">
                  <span className="text-sm text-white/60">
                    {customization.channelName || 'STREAMER'}
                  </span>
                  {customization.socialPlatforms.map(platform => {
                    const info = SOCIAL_PLATFORMS.find(p => p.id === platform);
                    return info ? (
                      <span key={platform} className="text-lg">{info.icon}</span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            
            {/* Preview badge */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs">
              <Eye className="h-3 w-3" />
              <span>Preview</span>
            </div>
          </div>
          
          {/* Asset Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {pack.assets.map((asset, index) => (
              <button
                key={asset.type}
                onClick={() => setActiveAssetIndex(index)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  activeAssetIndex === index
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                )}
              >
                {asset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Customization Form */}
        <div className="space-y-6">
          {/* Channel Name */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-white">
              <Type className="h-4 w-4 text-purple-400" />
              Channel Name
            </label>
            <input
              type="text"
              value={customization.channelName}
              onChange={(e) => updateCustomization({ channelName: e.target.value })}
              placeholder="Enter your channel name"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            />
            <p className="text-xs text-gray-500">
              This will replace "STREAMER" in all assets
            </p>
          </div>

          {/* Color Scheme */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-white">
              <Palette className="h-4 w-4 text-purple-400" />
              Color Scheme
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_COLOR_SCHEMES.map((scheme) => {
                const isSelected = customization.colorScheme.id === scheme.id;
                const isOriginal = scheme.id === 'original';
                const colors = isOriginal ? pack.originalColors.preview : scheme.preview;
                
                return (
                  <button
                    key={scheme.id}
                    onClick={() => selectColorScheme(isOriginal ? pack.originalColors : scheme)}
                    className={cn(
                      'relative aspect-square rounded-xl overflow-hidden border-2 transition-all',
                      isSelected 
                        ? 'border-purple-500 ring-2 ring-purple-500/30' 
                        : 'border-white/10 hover:border-white/30'
                    )}
                  >
                    {colors.length > 0 ? (
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(135deg, ${colors.join(', ')})`
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <Palette className="h-5 w-5 text-gray-500" />
                      </div>
                    )}
                    
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                    )}
                    
                    <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white font-medium text-center truncate drop-shadow">
                      {scheme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Social Platforms */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-white">
              <Share2 className="h-4 w-4 text-purple-400" />
              Social Platforms
            </label>
            <p className="text-xs text-gray-500">
              Select which platforms to show on your assets
            </p>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_PLATFORMS.map((platform) => {
                const isSelected = customization.socialPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      isSelected
                        ? 'bg-purple-600/20 border border-purple-500/50 text-purple-300'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <span>{platform.icon}</span>
                    <span>{platform.name}</span>
                    {isSelected && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional: Tagline */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-white">
              <Type className="h-4 w-4 text-purple-400" />
              Tagline
              <span className="text-xs text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={customization.tagline || ''}
              onChange={(e) => updateCustomization({ tagline: e.target.value })}
              placeholder="e.g., 'Live every day at 8PM EST'"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            />
          </div>

          {/* Generate Button */}
          <div className="pt-4">
            <button
              onClick={onGenerate}
              disabled={isGenerating || !customization.channelName.trim()}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-white transition-all',
                isGenerating || !customization.channelName.trim()
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/25'
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Generating Your Pack...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Generate {pack.assets.length} Assets</span>
                </>
              )}
            </button>
            
            {!customization.channelName.trim() && (
              <p className="text-center text-xs text-amber-400 mt-2">
                Enter your channel name to continue
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
