'use client';

/**
 * Trending Thumbnails Widget
 * 
 * Carousel of trending thumbnails filtered by user's subscribed games.
 * Game tabs at top, horizontal scroll of thumbnails below.
 * Clicking any thumbnail redirects to /intel/thumbnails with that category.
 */

import { useState, useRef } from 'react';
import { Image, ChevronLeft, ChevronRight, Eye, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import type { ThumbnailIntelOverview, CategoryInsight, ThumbnailAnalysis } from '@aurastream/api-client';

interface ThumbnailFormulaProps {
  thumbnailData?: ThumbnailIntelOverview;
  subscribedCategories: string[];
  isLoading?: boolean;
}

const GAME_NAMES: Record<string, string> = {
  fortnite: 'Fortnite',
  warzone: 'Warzone',
  valorant: 'Valorant',
  apex_legends: 'Apex Legends',
  minecraft: 'Minecraft',
  gta: 'GTA',
  roblox: 'Roblox',
  arc_raiders: 'Arc Raiders',
  call_of_duty: 'Call of Duty',
};

function ThumbnailCard({ thumbnail, categoryKey }: { thumbnail: ThumbnailAnalysis; categoryKey: string }) {
  const views = thumbnail.views || thumbnail.viewCount || 0;
  const formattedViews = views >= 1000000 
    ? `${(views / 1000000).toFixed(1)}M`
    : views >= 1000 
      ? `${(views / 1000).toFixed(0)}K`
      : views.toString();

  return (
    <Link
      href={`/intel/thumbnails?category=${categoryKey}`}
      className="group flex-shrink-0 w-[200px]"
    >
      <div className="relative aspect-video rounded-lg overflow-hidden border border-border-primary hover:border-interactive-500/50 transition-all hover:scale-[1.02]">
        <img 
          src={thumbnail.url || thumbnail.thumbnailUrl} 
          alt={thumbnail.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm text-white text-xs rounded flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {formattedViews}
        </div>
      </div>
      <p className="mt-2 text-xs text-text-secondary line-clamp-2 leading-tight group-hover:text-text-primary transition-colors">
        {thumbnail.title}
      </p>
    </Link>
  );
}

export function ThumbnailFormula({ thumbnailData, subscribedCategories, isLoading }: ThumbnailFormulaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Filter categories to only user's subscribed ones
  const filteredCategories = (thumbnailData?.categories || []).filter(cat => {
    const catKey = cat.categoryKey || cat.key;
    return subscribedCategories.includes(catKey);
  });

  const [selectedCategory, setSelectedCategory] = useState<string>(
    filteredCategories[0]?.categoryKey || filteredCategories[0]?.key || ''
  );

  const currentCategory = filteredCategories.find(
    cat => (cat.categoryKey || cat.key) === selectedCategory
  );
  const thumbnails = currentCategory?.thumbnails || [];

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 220; // card width + gap
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="bg-background-secondary border border-border-primary rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-interactive-500" />
          <h2 className="text-lg font-semibold text-text-primary">Trending Thumbnails</h2>
        </div>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 w-20 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0 w-[200px]">
              <div className="aspect-video bg-white/5 rounded-lg animate-pulse" />
              <div className="mt-2 h-4 bg-white/5 rounded animate-pulse w-3/4" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background-secondary border border-border-primary rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-interactive-500" />
          <h2 className="text-lg font-semibold text-text-primary">Trending Thumbnails</h2>
          {thumbnails.length > 0 && (
            <span className="text-sm text-text-tertiary">({thumbnails.length})</span>
          )}
        </div>
        
        <Link 
          href="/intel/thumbnails"
          className="text-sm text-interactive-400 hover:text-interactive-300 transition-colors"
        >
          View All →
        </Link>
      </div>

      {filteredCategories.length > 0 ? (
        <>
          {/* Game Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {filteredCategories.map(cat => {
              const catKey = cat.categoryKey || cat.key;
              const catName = cat.categoryName || cat.name || GAME_NAMES[catKey] || catKey;
              const isSelected = catKey === selectedCategory;
              
              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-interactive-600 text-white'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary'
                  }`}
                >
                  {catName}
                </button>
              );
            })}
          </div>

          {/* Thumbnails Carousel */}
          {thumbnails.length > 0 ? (
            <div className="relative group/carousel">
              {/* Left Arrow */}
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-background-primary/90 backdrop-blur-sm border border-border-primary rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-background-secondary"
              >
                <ChevronLeft className="w-4 h-4 text-text-secondary" />
              </button>

              {/* Scrollable Container */}
              <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {thumbnails.map((thumb, i) => (
                  <ThumbnailCard 
                    key={thumb.videoId || i} 
                    thumbnail={thumb} 
                    categoryKey={selectedCategory} 
                  />
                ))}
              </div>

              {/* Right Arrow */}
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-background-primary/90 backdrop-blur-sm border border-border-primary rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-background-secondary"
              >
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-text-tertiary">
              <p className="text-sm">No thumbnails available for this category yet</p>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="text-center py-12 text-text-secondary">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-2">No thumbnail data for your subscribed categories</p>
          <p className="text-sm text-text-tertiary">
            {subscribedCategories.length === 0 
              ? 'Subscribe to categories to see trending thumbnails'
              : 'Thumbnail analysis refreshes daily'}
          </p>
        </div>
      )}
    </section>
  );
}
