'use client';

/**
 * Thumbnail Studio Page
 * 
 * AI-powered thumbnail recreation from top performers.
 * Shows individual analysis for each thumbnail.
 * 
 * @module app/intel/thumbnails/page
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Image, Sparkles, Palette, Eye, Type, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  useThumbnailIntelOverview, 
  useCategoryInsight,
  useIntelPreferences,
  type ThumbnailAnalysis,
} from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import Link from 'next/link';

function ThumbnailCard({ thumb }: { thumb: ThumbnailAnalysis }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-background-tertiary border border-border-primary rounded-xl overflow-hidden">
      {/* Thumbnail Image */}
      <div className="relative aspect-video group">
        <img 
          src={thumb.thumbnailUrl || thumb.url} 
          alt={thumb.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <Link
            href={`/intel/recreate?analysis=${encodeURIComponent(JSON.stringify({
              videoId: thumb.videoId,
              title: thumb.title,
              thumbnailUrl: thumb.thumbnailUrl || thumb.url,
              viewCount: thumb.viewCount || thumb.views,
              layoutType: thumb.layoutType,
              textPlacement: thumb.textPlacement,
              focalPoint: thumb.focalPoint,
              dominantColors: thumb.dominantColors,
              colorMood: thumb.colorMood,
              backgroundStyle: thumb.backgroundStyle,
              hasFace: thumb.hasFace,
              hasText: thumb.hasText,
              textContent: thumb.textContent,
              hasBorder: thumb.hasBorder,
              hasGlowEffects: thumb.hasGlowEffects,
              hasArrowsCircles: thumb.hasArrowsCircles,
              faceExpression: thumb.faceExpression,
              facePosition: thumb.facePosition,
              faceSize: thumb.faceSize,
              faceLookingDirection: thumb.faceLookingDirection,
              layoutRecipe: thumb.layoutRecipe,
              colorRecipe: thumb.colorRecipe,
              whyItWorks: thumb.whyItWorks,
              difficulty: thumb.difficulty,
            }))}`}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-interactive-600 hover:bg-interactive-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Recreate This
          </Link>
        </div>
        {/* Views badge */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs rounded flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {((thumb.viewCount || thumb.views || 0) / 1000000).toFixed(1)}M
        </div>
      </div>

      {/* Title + Basic Info */}
      <div className="p-4">
        <p className="text-sm text-text-primary font-medium line-clamp-2 mb-3">{thumb.title}</p>
        
        {/* Quick Stats Row */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2 py-1 bg-interactive-500/20 text-interactive-400 text-xs rounded">
            {thumb.layoutType}
          </span>
          {thumb.hasFace && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
              👤 Face
            </span>
          )}
          {thumb.hasText && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
              <Type className="w-3 h-3 inline mr-1" />
              Text
            </span>
          )}
          {thumb.difficulty && (
            <span className={`px-2 py-1 text-xs rounded ${
              thumb.difficulty === 'easy' 
                ? 'bg-green-500/20 text-green-400'
                : thumb.difficulty === 'medium'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
            }`}>
              {thumb.difficulty}
            </span>
          )}
        </div>

        {/* Color Palette */}
        {thumb.dominantColors && thumb.dominantColors.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-text-tertiary" />
            <div className="flex gap-1">
              {thumb.dominantColors.slice(0, 5).map((color, i) => (
                <div 
                  key={i}
                  className="w-5 h-5 rounded border border-white/20"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            {thumb.colorMood && (
              <span className="text-xs text-text-tertiary ml-1">{thumb.colorMood}</span>
            )}
          </div>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Less details
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              More details
            </>
          )}
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="pt-3 border-t border-border-primary space-y-3">
            {/* Layout Details */}
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Layout</p>
              <p className="text-sm text-text-secondary">{thumb.layoutType}</p>
              {thumb.focalPoint && (
                <p className="text-xs text-text-tertiary mt-1">Focal: {thumb.focalPoint}</p>
              )}
              {thumb.textPlacement && (
                <p className="text-xs text-text-tertiary">Text: {thumb.textPlacement}</p>
              )}
            </div>

            {/* Design Elements */}
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Elements</p>
              <div className="flex flex-wrap gap-1.5">
                {thumb.hasFace && <span className="px-2 py-0.5 bg-white/5 text-text-secondary text-xs rounded">Face</span>}
                {thumb.hasText && <span className="px-2 py-0.5 bg-white/5 text-text-secondary text-xs rounded">Text: {thumb.textContent || 'Yes'}</span>}
                {thumb.hasGlowEffects && <span className="px-2 py-0.5 bg-white/5 text-text-secondary text-xs rounded">Glow</span>}
                {thumb.hasBorder && <span className="px-2 py-0.5 bg-white/5 text-text-secondary text-xs rounded">Border</span>}
                {thumb.hasArrowsCircles && <span className="px-2 py-0.5 bg-white/5 text-text-secondary text-xs rounded">Arrows/Circles</span>}
                {thumb.backgroundStyle && <span className="px-2 py-0.5 bg-white/5 text-text-secondary text-xs rounded">BG: {thumb.backgroundStyle}</span>}
              </div>
            </div>

            {/* Face Details (for recreation) */}
            {thumb.hasFace && thumb.faceExpression && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-xs text-yellow-400 uppercase tracking-wide mb-1">Face Details</p>
                <div className="text-sm text-text-secondary space-y-1">
                  <p>Expression: <span className="text-text-primary">{thumb.faceExpression}</span></p>
                  {thumb.facePosition && <p>Position: <span className="text-text-primary">{thumb.facePosition}</span></p>}
                  {thumb.faceSize && <p>Size: <span className="text-text-primary">{thumb.faceSize}</span></p>}
                  {thumb.faceLookingDirection && <p>Looking: <span className="text-text-primary">{thumb.faceLookingDirection}</span></p>}
                </div>
              </div>
            )}

            {/* Why It Works */}
            {thumb.whyItWorks && (
              <div className="bg-interactive-600/10 border border-interactive-600/30 rounded-lg p-3">
                <p className="text-xs text-interactive-400 uppercase tracking-wide mb-1">Why It Works</p>
                <p className="text-sm text-text-primary">{thumb.whyItWorks}</p>
              </div>
            )}

            {/* Recipes */}
            {thumb.layoutRecipe && (
              <div>
                <p className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Layout Recipe</p>
                <p className="text-sm text-text-secondary">{thumb.layoutRecipe}</p>
              </div>
            )}
            {thumb.colorRecipe && (
              <div>
                <p className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Color Recipe</p>
                <p className="text-sm text-text-secondary">{thumb.colorRecipe}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ThumbnailStudioPage() {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryFromUrl);
  
  const { data: overview, isLoading } = useThumbnailIntelOverview();
  const { data: categoryInsight } = useCategoryInsight(selectedCategory || '', !!selectedCategory);
  const { data: preferences } = useIntelPreferences();
  
  const syncFromServer = useIntelStore(state => state.syncFromServer);
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);

  useEffect(() => {
    if (preferences) {
      syncFromServer(preferences);
    }
  }, [preferences, syncFromServer]);

  // Filter to subscribed categories
  const filteredCategories = overview?.categories?.filter(
    cat => subscribedCategories.some(sub => sub.key === cat.categoryKey)
  ) || [];

  // Handle URL category param or auto-select first category
  useEffect(() => {
    if (categoryFromUrl && filteredCategories.some(cat => cat.categoryKey === categoryFromUrl)) {
      setSelectedCategory(categoryFromUrl);
    } else if (!selectedCategory && filteredCategories.length > 0) {
      setSelectedCategory(filteredCategories[0].categoryKey);
    }
  }, [filteredCategories, selectedCategory, categoryFromUrl]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-video bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
          <Image className="w-6 h-6 text-interactive-500" />
          Thumbnail Studio
        </h1>
        <p className="text-text-secondary mt-1">
          AI-powered thumbnail analysis - each thumbnail shows its own metadata + Gemini analysis
        </p>
      </div>

      {/* Category Selector */}
      <div className="flex flex-wrap gap-2">
        {filteredCategories.map(cat => (
          <button
            key={cat.categoryKey}
            onClick={() => setSelectedCategory(cat.categoryKey)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === cat.categoryKey
                ? 'bg-interactive-600 text-white'
                : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}
          >
            {cat.categoryName}
          </button>
        ))}
      </div>

      {/* Thumbnails Grid - Each with individual analysis */}
      {categoryInsight && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {categoryInsight.categoryName} Top Performers
            <span className="text-sm font-normal text-text-tertiary ml-2">
              ({categoryInsight.thumbnails?.length || 0} analyzed)
            </span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(categoryInsight.thumbnails || []).map((thumb, i) => (
              <ThumbnailCard key={thumb.videoId || i} thumb={thumb} />
            ))}
          </div>

          {/* Category Summary (collapsed by default) */}
          {categoryInsight.categoryStyleSummary && (
            <div className="bg-background-secondary border border-border-primary rounded-xl p-4 mt-6">
              <p className="text-xs text-text-tertiary uppercase tracking-wide mb-2">Category Pattern Summary</p>
              <p className="text-sm text-text-secondary">{categoryInsight.categoryStyleSummary}</p>
            </div>
          )}
        </div>
      )}

      {/* Empty States */}
      {!selectedCategory && filteredCategories.length > 0 && (
        <div className="text-center py-12 bg-background-secondary border border-border-primary rounded-2xl">
          <Image className="w-16 h-16 mx-auto mb-4 text-text-tertiary opacity-50" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Select a Category</h3>
          <p className="text-text-secondary">
            Choose a category above to see thumbnail analysis
          </p>
        </div>
      )}

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 bg-background-secondary border border-border-primary rounded-2xl">
          <Image className="w-16 h-16 mx-auto mb-4 text-text-tertiary opacity-50" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Categories Subscribed</h3>
          <p className="text-text-secondary mb-4">
            Subscribe to gaming categories to see thumbnail analysis
          </p>
          <Link
            href="/intel"
            className="inline-flex items-center gap-2 px-4 py-2 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-lg transition-colors"
          >
            Go to Daily Brief
          </Link>
        </div>
      )}
    </div>
  );
}
