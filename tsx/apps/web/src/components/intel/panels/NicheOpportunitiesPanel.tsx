'use client';

import { Lightbulb, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLatestPlaybook } from '@aurastream/api-client';
import { PanelCard } from './PanelCard';
import type { NicheOpportunity } from '@aurastream/api-client';

// =============================================================================
// Niche Card
// =============================================================================

function NicheCard({ niche }: { niche: NicheOpportunity }) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };
  
  const getGrowthColor = (potential: string) => {
    switch (potential.toLowerCase()) {
      case 'high': return 'text-success-main';
      case 'medium': return 'text-warning-main';
      default: return 'text-text-muted';
    }
  };
  
  return (
    <div className="p-3 rounded-lg bg-background-surface/50 border border-border-subtle hover:border-interactive-500/20 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        {/* Thumbnail */}
        {niche.thumbnailUrl && (
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
            <img
              src={niche.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text-primary truncate">
            {niche.gameOrNiche}
          </h4>
          
          {/* Growth Badge */}
          <div className="flex items-center gap-1 mt-0.5">
            <TrendingUp className={cn('w-3 h-3', getGrowthColor(niche.growthPotential))} />
            <span className={cn('text-xs font-medium capitalize', getGrowthColor(niche.growthPotential))}>
              {niche.growthPotential} growth
            </span>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="flex items-center gap-4 mb-2 text-xs text-text-muted">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>{formatNumber(niche.currentViewers)} viewers</span>
        </div>
        <div className="flex items-center gap-1">
          <BarChart3 className="w-3 h-3" />
          <span>{niche.streamCount} streams</span>
        </div>
      </div>
      
      {/* Saturation Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-text-muted">Saturation</span>
          <span className="text-text-secondary">{niche.saturationScore}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={cn(
              'h-full rounded-full',
              niche.saturationScore < 40 ? 'bg-success-main' :
              niche.saturationScore < 70 ? 'bg-warning-main' : 'bg-error-main'
            )}
            style={{ width: `${niche.saturationScore}%` }}
          />
        </div>
      </div>
      
      {/* Suggested Angle */}
      {niche.suggestedAngle && (
        <p className="text-xs text-text-secondary italic line-clamp-2">
          💡 {niche.suggestedAngle}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Niche Opportunities Panel
// =============================================================================

export function NicheOpportunitiesPanel() {
  const { data: playbook, isLoading, isError, refetch, dataUpdatedAt } = useLatestPlaybook();
  
  const niches = playbook?.nicheOpportunities?.slice(0, 3) || [];
  
  return (
    <PanelCard
      title="Niche Opportunities"
      icon={<Lightbulb className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Couldn't load opportunities"
      lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
      onRefresh={() => refetch()}
      size="small"
    >
      {niches.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Lightbulb className="w-8 h-8 text-text-muted/50 mb-2" />
          <p className="text-sm text-text-muted">No opportunities found</p>
          <p className="text-xs text-text-muted mt-1">Check back later</p>
        </div>
      ) : (
        <div className="space-y-2">
          {niches.map((niche, index) => (
            <NicheCard key={index} niche={niche} />
          ))}
        </div>
      )}
    </PanelCard>
  );
}
