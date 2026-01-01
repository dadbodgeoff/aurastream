'use client';

import { Sparkles, Copy, Check, Zap, Clock } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useLatestPlaybook } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { PanelCard } from './PanelCard';
import type { ViralHook } from '@aurastream/api-client';

// =============================================================================
// Hook Item
// =============================================================================

function HookItem({ hook }: { hook: ViralHook }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hook.hook);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const getViralityColor = (score: number) => {
    if (score >= 80) return 'text-success-main';
    if (score >= 60) return 'text-warning-main';
    return 'text-text-muted';
  };
  
  const getTimeSensitivityBadge = (sensitivity: string) => {
    switch (sensitivity.toLowerCase()) {
      case 'high':
        return { icon: '⚡', color: 'bg-error-main/20 text-error-main' };
      case 'medium':
        return { icon: '⏰', color: 'bg-warning-main/20 text-warning-main' };
      default:
        return { icon: '📅', color: 'bg-interactive-600/20 text-interactive-400' };
    }
  };
  
  const timeBadge = getTimeSensitivityBadge(hook.timeSensitivity);
  
  return (
    <div className="p-3 rounded-lg bg-background-surface/50 border border-border-subtle hover:border-interactive-500/20 transition-colors group">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-interactive-400 uppercase tracking-wider">
            {hook.hookType}
          </span>
          <span className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
            timeBadge.color
          )}>
            {timeBadge.icon}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            'p-1 rounded transition-all',
            copied
              ? 'text-success-main'
              : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-text-primary'
          )}
          aria-label="Copy hook"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      
      {/* Hook Text */}
      <p className="text-sm text-text-primary font-medium mb-2 line-clamp-2">
        &quot;{hook.hook}&quot;
      </p>
      
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Zap className={cn('w-3 h-3', getViralityColor(hook.viralityScore))} />
          <span className={cn('text-xs font-medium', getViralityColor(hook.viralityScore))}>
            {hook.viralityScore}% viral
          </span>
        </div>
        
        {hook.usageTip && (
          <span className="text-xs text-text-muted truncate max-w-[120px]" title={hook.usageTip}>
            💡 {hook.usageTip}
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Viral Hooks Panel
// =============================================================================

export function ViralHooksPanel() {
  const { data: playbook, isLoading, isError, refetch, dataUpdatedAt } = useLatestPlaybook();
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  
  // Only show viral hooks if user has subscribed categories
  const hasSubscriptions = subscribedCategories.length > 0;
  const hooks = hasSubscriptions ? (playbook?.viralHooks?.slice(0, 3) || []) : [];
  
  return (
    <PanelCard
      title="Viral Hooks"
      icon={<Sparkles className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Couldn't load viral hooks"
      lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
      onRefresh={() => refetch()}
      size="small"
    >
      {hooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Sparkles className="w-8 h-8 text-text-muted/50 mb-2" />
          <p className="text-sm text-text-muted">
            {hasSubscriptions ? 'No viral hooks found' : 'Subscribe to categories'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {hasSubscriptions ? 'Check back later' : 'to see viral hooks'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {hooks.map((hook, index) => (
            <HookItem key={index} hook={hook} />
          ))}
        </div>
      )}
    </PanelCard>
  );
}
