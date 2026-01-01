'use client';

/**
 * Thumbnail Gallery Tab
 * 
 * Shows thumbnail analyses for user's subscribed categories.
 */

import { useState, useEffect } from 'react';
import { Eye, Palette, Layout, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useIntelPreferences, type ThumbnailIntelOverview } from '@aurastream/api-client';

interface ThumbnailGalleryTabProps {
  overview?: ThumbnailIntelOverview;
  isLoading: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function ThumbnailGalleryTab({ overview, isLoading }: ThumbnailGalleryTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  
  // Get user's subscribed categories
  const { data: prefsData } = useIntelPreferences();
  const subscribedCategories = prefsData?.subscribedCategories || [];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 w-24 bg-white/5 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-video bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const allCategories = overview?.categories || [];
  
  // Filter to subscribed categories first, or show all if toggled
  const categories = showAll 
    ? allCategories 
    : allCategories.filter(cat => 
        subscribedCategories.some(sub => sub.key === cat.categoryKey)
      );
  
  // If no subscribed categories have data, show all
  const effectiveCategories = categories.length > 0 ? categories : allCategories;
  
  const selectedCat = selectedCategory 
    ? effectiveCategories.find(c => c.categoryKey === selectedCategory)
    : effectiveCategories[0];

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {effectiveCategories.map(cat => (
          <button
            key={cat.categoryKey}
            onClick={() => setSelectedCategory(cat.categoryKey)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              (selectedCategory || effectiveCategories[0]?.categoryKey) === cat.categoryKey
                ? 'bg-interactive-600 text-white'
                : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}
          >
            {cat.categoryName}
            {subscribedCategories.some(sub => sub.key === cat.categoryKey) && ' ⭐'}
          </button>
        ))}
        
        {/* Toggle to show all */}
        {allCategories.length > categories.length && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="px-3 py-2 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            +{allCategories.length - categories.length} more
          </button>
        )}
      </div>

      {/* Category Insights */}
      {selectedCat && (
        <div className="bg-background-secondary border border-border-primary rounded-xl p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            {selectedCat.categoryName} Patterns
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Layout className="w-4 h-4 text-interactive-500" />
                <span className="text-xs text-text-tertiary">Layout</span>
              </div>
              <p className="text-sm text-text-primary">{selectedCat.commonLayout || 'Face + Text'}</p>
            </div>
            
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-interactive-500" />
                <span className="text-xs text-text-tertiary">Colors</span>
              </div>
              <div className="flex gap-1">
                {(selectedCat.commonColors || []).slice(0, 4).map((color, i) => (
                  <div 
                    key={i}
                    className="w-5 h-5 rounded border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-interactive-500" />
                <span className="text-xs text-text-tertiary">Must Have</span>
              </div>
              <p className="text-sm text-text-primary">
                {(selectedCat.mustHaveElements || []).slice(0, 2).join(', ') || 'Face, Text'}
              </p>
            </div>
            
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-interactive-500" />
                <span className="text-xs text-text-tertiary">Analyzed</span>
              </div>
              <p className="text-sm text-text-primary">{selectedCat.thumbnails?.length || 0} thumbnails</p>
            </div>
          </div>

          {/* Thumbnail Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(selectedCat.thumbnails || []).map((thumb, i) => (
              <div 
                key={i}
                className="bg-background-tertiary border border-border-primary rounded-xl overflow-hidden group"
              >
                <div className="relative aspect-video">
                  <img 
                    src={thumb.thumbnailUrl} 
                    alt={thumb.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <Link
                      href={`/intel/thumbnails?recreate=${encodeURIComponent(thumb.thumbnailUrl)}`}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-interactive-600 hover:bg-interactive-500 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Recreate
                    </Link>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs text-text-primary line-clamp-1">{thumb.title}</p>
                  <div className="flex items-center justify-between mt-1 text-xs text-text-tertiary">
                    <span>{thumb.layoutType}</span>
                    <span>{formatNumber(thumb.viewCount)} views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {effectiveCategories.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          No thumbnail data available
        </div>
      )}
    </div>
  );
}
