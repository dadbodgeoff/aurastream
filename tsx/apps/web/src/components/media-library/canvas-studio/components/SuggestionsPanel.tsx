/**
 * Suggestions Panel Component
 * 
 * Displays smart suggestions for improving the canvas design.
 * Collapsible panel that shows actionable tips.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { AssetPlacement } from '../../placement/types';
import type { CanvasDimensions } from '../types';
import { generateSuggestions, type Suggestion, type SuggestionPriority } from '../magic';

// ============================================================================
// Icons
// ============================================================================

function LightbulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18h6M10 22h4M12 2v1M4.22 4.22l.71.71M1 12h1M4.22 19.78l.71-.71M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
    </svg>
  );
}

// ============================================================================
// Priority Badge
// ============================================================================

const PRIORITY_STYLES: Record<SuggestionPriority, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const PRIORITY_LABELS: Record<SuggestionPriority, string> = {
  high: 'Important',
  medium: 'Suggested',
  low: 'Tip',
};

function PriorityBadge({ priority }: { priority: SuggestionPriority }) {
  return (
    <span className={cn(
      'px-1.5 py-0.5 rounded text-xs font-medium border',
      PRIORITY_STYLES[priority]
    )}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

// ============================================================================
// Suggestion Card
// ============================================================================

interface SuggestionCardProps {
  suggestion: Suggestion;
  onApply: (suggestion: Suggestion) => void;
  onDismiss: (suggestionId: string) => void;
}

function SuggestionCard({ suggestion, onApply, onDismiss }: SuggestionCardProps) {
  return (
    <div className="p-3 rounded-lg bg-background-elevated border border-border-subtle group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <PriorityBadge priority={suggestion.priority} />
        <button
          onClick={() => onDismiss(suggestion.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background-surface text-text-muted hover:text-text-primary transition-all"
          title="Dismiss"
        >
          <XIcon />
        </button>
      </div>
      
      <p className="text-sm text-text-primary mb-3">{suggestion.message}</p>
      
      {suggestion.action && (
        <button
          onClick={() => onApply(suggestion)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-interactive-500/10 text-interactive-400 hover:bg-interactive-500/20 text-sm font-medium transition-colors"
        >
          <SparklesIcon />
          Apply Fix
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Suggestions Panel
// ============================================================================

interface SuggestionsPanelProps {
  placements: AssetPlacement[];
  dimensions: CanvasDimensions;
  onApplySuggestion: (action: { type: string; payload: Record<string, unknown> }) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export function SuggestionsPanel({
  placements,
  dimensions,
  onApplySuggestion,
  className,
  defaultExpanded = false,
}: SuggestionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  
  // Generate suggestions
  const allSuggestions = useMemo(
    () => generateSuggestions(placements, dimensions),
    [placements, dimensions]
  );
  
  // Filter out dismissed suggestions
  const suggestions = useMemo(
    () => allSuggestions.filter(s => !dismissedIds.has(s.id)),
    [allSuggestions, dismissedIds]
  );
  
  const handleApply = useCallback((suggestion: Suggestion) => {
    if (suggestion.action) {
      onApplySuggestion(suggestion.action);
      setDismissedIds(prev => new Set([...prev, suggestion.id]));
    }
  }, [onApplySuggestion]);
  
  const handleDismiss = useCallback((suggestionId: string) => {
    setDismissedIds(prev => new Set([...prev, suggestionId]));
  }, []);
  
  // Don't render if no suggestions
  if (suggestions.length === 0) {
    return null;
  }
  
  return (
    <div className={cn('', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="text-amber-400">
            <LightbulbIcon />
          </div>
          <span className="text-sm font-medium text-white/70">Suggestions</span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
            {suggestions.length}
          </span>
        </div>
        <div className={cn('text-white/40 transition-transform', isExpanded ? 'rotate-180' : '')}>
          <ChevronDownIcon />
        </div>
      </button>
      
      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {suggestions.slice(0, 3).map(suggestion => (
            <div key={suggestion.id} className="p-2 rounded-lg bg-white/5 group">
              <div className="flex items-start justify-between gap-2 mb-1">
                <PriorityBadge priority={suggestion.priority} />
                <button
                  onClick={() => handleDismiss(suggestion.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-white/30 hover:text-white/60 transition-all"
                >
                  <XIcon />
                </button>
              </div>
              <p className="text-xs text-white/60 mb-2">{suggestion.message}</p>
              {suggestion.action && (
                <button
                  onClick={() => handleApply(suggestion)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-interactive-500/20 text-interactive-400 hover:bg-interactive-500/30 text-xs font-medium transition-colors"
                >
                  <SparklesIcon />
                  Fix
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
