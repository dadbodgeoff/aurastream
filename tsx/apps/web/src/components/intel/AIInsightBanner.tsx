'use client';

/**
 * AI Insight Banner
 * 
 * Teal banner displaying AI-generated insights for the current category.
 * Dismissible with X button, shows actionable intelligence.
 */

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsightBannerProps {
  insight: string;
  categoryName?: string;
  onDismiss?: () => void;
  className?: string;
}

export function AIInsightBanner({ 
  insight, 
  categoryName,
  onDismiss,
  className 
}: AIInsightBannerProps) {
  // categoryName can be used for future enhancements (e.g., "AI Insight for {categoryName}")
  void categoryName;
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || !insight) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div 
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl',
        'bg-teal-500/10 border border-teal-500/20',
        className
      )}
    >
      <Sparkles className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-teal-400">AI Insight: </span>
        <span className="text-sm text-text-secondary">{insight}</span>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="p-1 text-text-tertiary hover:text-text-secondary transition-colors flex-shrink-0"
          aria-label="Dismiss insight"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
