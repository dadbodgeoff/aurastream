'use client';

/**
 * Clip Opportunities Section
 * 
 * Shows viral clips for reaction/tutorial content opportunities.
 */

import { Film, Play, TrendingUp, Clock, ExternalLink } from 'lucide-react';
import type { ViralClip } from '@aurastream/api-client';

interface ClipOpportunitiesProps {
  clips?: ViralClip[];
  subscribedCategories: string[];
}

function VelocityBadge({ velocity }: { velocity: number }) {
  if (velocity >= 80) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-status-error/20 text-status-error text-xs font-medium rounded-full">
        <TrendingUp className="w-3 h-3" />
        HIGH
      </span>
    );
  }
  if (velocity >= 50) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-status-warning/20 text-status-warning text-xs font-medium rounded-full">
        <TrendingUp className="w-3 h-3" />
        RISING
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-white/10 text-text-tertiary text-xs font-medium rounded-full">
      <TrendingUp className="w-3 h-3" />
      STEADY
    </span>
  );
}

function formatTimeAgo(date: string): string {
  const now = new Date();
  const clipDate = new Date(date);
  const diffMs = now.getTime() - clipDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

interface ClipCardProps {
  clip: ViralClip;
}

function ClipCard({ clip }: ClipCardProps) {
  // Use velocityScore for UI display (normalized 0-100)
  const velocity = clip.velocityScore;
  
  return (
    <div className="bg-background-tertiary border border-border-primary rounded-xl overflow-hidden group">
      <div className="relative aspect-video">
        <img 
          src={clip.thumbnailUrl} 
          alt={clip.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={clip.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/30 transition-colors"
          >
            <Play className="w-4 h-4" />
            Watch
          </a>
        </div>
        <div className="absolute top-2 right-2">
          <VelocityBadge velocity={velocity} />
        </div>
      </div>
      
      <div className="p-3 space-y-2">
        <p className="text-sm text-text-primary font-medium line-clamp-2">
          {clip.title}
        </p>
        
        <div className="flex items-center justify-between text-xs text-text-tertiary">
          <span>{clip.broadcasterName}</span>
          <span>{formatViews(clip.viewCount)} views</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <Clock className="w-3 h-3" />
          <span>{formatTimeAgo(clip.createdAt)}</span>
        </div>
        
        <div className="pt-2 border-t border-border-primary">
          <p className="text-xs text-text-secondary">
            <span className="font-medium text-text-primary">Why: </span>
            {velocity >= 80 ? 'Perfect for reaction, trending NOW' : 
             velocity >= 50 ? 'Rising fast, good timing' : 
             'Steady performer, reliable content'}
          </p>
        </div>
        
        <div className="flex gap-2 pt-1">
          <a
            href={clip.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-text-secondary text-xs font-medium rounded-lg transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Watch
          </a>
          <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-interactive-600/20 hover:bg-interactive-600/30 text-interactive-400 text-xs font-medium rounded-lg transition-colors">
            <Film className="w-3 h-3" />
            React to This
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClipOpportunities({ clips, subscribedCategories }: ClipOpportunitiesProps) {
  // Filter clips by subscribed categories if possible
  const filteredClips = clips?.filter(clip => 
    subscribedCategories.length === 0 || subscribedCategories.includes(clip.gameId)
  ).slice(0, 4) || [];

  return (
    <section className="bg-background-secondary border border-border-primary rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-interactive-500" />
          <h2 className="text-lg font-semibold text-text-primary">Clip Opportunities</h2>
        </div>
        <a 
          href="/intel/observatory?tab=clips"
          className="text-sm text-interactive-400 hover:text-interactive-300 transition-colors"
        >
          View All →
        </a>
      </div>

      {filteredClips.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredClips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-text-secondary">
          <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No viral clips found for your categories</p>
          <p className="text-sm text-text-tertiary mt-1">Check back soon or expand your subscriptions</p>
        </div>
      )}
    </section>
  );
}
