'use client';

import { Image, Palette, Type, Smile, Sparkles, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useLatestPlaybook } from '@aurastream/api-client';
import { useThumbnailIntelOverview, useCategoryInsight } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { PanelCard } from './PanelCard';

// =============================================================================
// Thumbnail Card
// =============================================================================

interface ThumbnailCardProps {
  thumbnailUrl: string;
  title: string;
  videoId: string;
  viewCount: number;
  whyItWorks?: string;
}

function ThumbnailCard({ thumbnailUrl, title, videoId, viewCount, whyItWorks }: ThumbnailCardProps) {
  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views.toString();
  };

  return (
    <a
      href={`https://youtube.com/watch?v=${videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className="relative aspect-video rounded-lg overflow-hidden bg-background-surface border border-border-subtle hover:border-interactive-500/30 transition-colors">
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs text-white font-medium line-clamp-2">{title}</p>
          <p className="text-xs text-white/70">{formatViews(viewCount)} views</p>
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-4 h-4 text-white drop-shadow-lg" />
        </div>
      </div>
      {whyItWorks && (
        <p className="mt-1 text-xs text-text-muted line-clamp-2">{whyItWorks}</p>
      )}
    </a>
  );
}

// =============================================================================
// Pattern Stat
// =============================================================================

function PatternStat({ 
  icon: Icon, 
  label, 
  value, 
  suffix = '%',
  highlight = false,
}: { 
  icon: React.ElementType;
  label: string; 
  value: number;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg border',
      highlight 
        ? 'bg-interactive-600/10 border-interactive-500/20'
        : 'bg-background-surface/50 border-border-subtle'
    )}>
      <Icon className={cn(
        'w-3.5 h-3.5',
        highlight ? 'text-interactive-400' : 'text-text-muted'
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted">{label}</p>
        <p className={cn(
          'text-sm font-bold',
          highlight ? 'text-interactive-300' : 'text-text-primary'
        )}>
          {Math.round(value)}{suffix}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Color Swatch
// =============================================================================

function ColorSwatch({ colors }: { colors: string[] }) {
  if (!colors || colors.length === 0) return null;
  
  return (
    <div className="flex items-center gap-1">
      {colors.slice(0, 6).map((color, index) => (
        <div
          key={index}
          className="w-5 h-5 rounded border border-white/10"
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Category Tab
// =============================================================================

function CategoryTab({ 
  name, 
  isActive, 
  onClick 
}: { 
  name: string; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap',
        isActive
          ? 'bg-interactive-600 text-white'
          : 'bg-white/5 text-text-muted hover:text-text-primary hover:bg-white/10'
      )}
    >
      {name}
    </button>
  );
}

// =============================================================================
// Thumbnail Patterns Panel
// =============================================================================

export function ThumbnailPatternsPanel() {
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const { data: playbook, isLoading: isLoadingPlaybook, isError: isErrorPlaybook, refetch: refetchPlaybook, dataUpdatedAt: playbookUpdated } = useLatestPlaybook();
  const { data: thumbnailOverview, isLoading: isLoadingThumbnail, isError: isErrorThumbnail } = useThumbnailIntelOverview();
  
  // Map subscribed categories to thumbnail intel categories
  const categoryMapping: Record<string, string> = {
    'fortnite': 'fortnite',
    'call_of_duty': 'warzone',
    'valorant': 'valorant',
    'apex_legends': 'apex_legends',
    'league_of_legends': 'league_of_legends',
    'gta_v': 'gta',
    'roblox': 'roblox',
    'arc_raiders': 'arc_raiders',
  };
  
  // Get available categories that have thumbnail data
  const availableCategories = subscribedCategories
    .filter(cat => {
      const mappedKey = categoryMapping[cat.key] || cat.key;
      return thumbnailOverview?.categories?.some(c => c.categoryKey === mappedKey);
    })
    .map(cat => ({
      key: cat.key,
      name: cat.name,
      thumbnailKey: categoryMapping[cat.key] || cat.key,
    }));
  
  // Auto-select first category if none selected
  const activeCategory = selectedCategory || availableCategories[0]?.thumbnailKey;
  
  // Find the category data
  const categoryData = thumbnailOverview?.categories?.find(c => c.categoryKey === activeCategory);
  
  const isLoading = isLoadingPlaybook || isLoadingThumbnail;
  const isError = isErrorPlaybook || isErrorThumbnail;
  
  // Calculate pattern stats from thumbnails
  const thumbnails = categoryData?.thumbnails || [];
  const commonColors = categoryData?.commonColors || [];
  
  // Calculate face and text percentages from thumbnail data
  const facePercentage = thumbnails.length > 0 
    ? (thumbnails.filter(t => t.hasFace).length / thumbnails.length) * 100 
    : 0;
  const textUsage = thumbnails.length > 0 
    ? (thumbnails.filter(t => t.hasText).length / thumbnails.length) * 100 
    : 0;
  
  return (
    <PanelCard
      title="Thumbnail Patterns"
      icon={<Image className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Couldn't load thumbnail patterns"
      lastUpdated={playbookUpdated ? new Date(playbookUpdated) : null}
      onRefresh={() => refetchPlaybook()}
      size="wide"
    >
      {availableCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Image className="w-8 h-8 text-text-muted/50 mb-2" />
          <p className="text-sm text-text-muted">Subscribe to categories to see thumbnail patterns</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Category Tabs */}
          {availableCategories.length > 1 && (
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              {availableCategories.map(cat => (
                <CategoryTab
                  key={cat.key}
                  name={cat.name}
                  isActive={activeCategory === cat.thumbnailKey}
                  onClick={() => setSelectedCategory(cat.thumbnailKey)}
                />
              ))}
            </div>
          )}
          
          {/* Thumbnails Grid */}
          {thumbnails.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {thumbnails.slice(0, 3).map((thumb, index) => (
                <ThumbnailCard
                  key={thumb.videoId || index}
                  thumbnailUrl={thumb.thumbnailUrl}
                  title={thumb.title}
                  videoId={thumb.videoId}
                  viewCount={thumb.viewCount}
                  whyItWorks={thumb.whyItWorks}
                />
              ))}
            </div>
          )}
          
          {/* Stats + Colors Row */}
          <div className="flex gap-3 pt-2 border-t border-border-subtle">
            {/* Mini Stats */}
            {thumbnails.length > 0 && (
              <div className="flex gap-2 flex-1">
                <PatternStat
                  icon={Smile}
                  label="Faces"
                  value={facePercentage}
                  highlight={facePercentage > 60}
                />
                <PatternStat
                  icon={Type}
                  label="Text"
                  value={textUsage}
                  highlight={textUsage > 70}
                />
              </div>
            )}
            
            {/* Trending Colors */}
            {commonColors.length > 0 && (
              <div className="flex-shrink-0">
                <p className="text-xs text-text-muted mb-1">Trending</p>
                <ColorSwatch colors={commonColors} />
              </div>
            )}
          </div>
          
          {/* Pro Tip */}
          {categoryData?.proTips && categoryData.proTips.length > 0 && (
            <div className="pt-2 border-t border-border-subtle">
              <p className="text-xs text-text-muted mb-1">💡 Pro Tip</p>
              <p className="text-xs text-text-secondary line-clamp-2">
                {categoryData.proTips[0]}
              </p>
            </div>
          )}
        </div>
      )}
    </PanelCard>
  );
}
