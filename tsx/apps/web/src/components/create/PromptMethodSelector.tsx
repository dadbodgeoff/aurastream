/**
 * Prompt method selection - choose between manual prompt or AI coach.
 * @module create/PromptMethodSelector
 */

'use client';

import { cn } from '@/lib/utils';
import { PencilIcon, ChatIcon } from './icons';

interface PromptMethodSelectorProps {
  onSelectManual: () => void;
  onSelectCoach: () => void;
  isPremium: boolean;
}

export function PromptMethodSelector({
  onSelectManual,
  onSelectCoach,
  isPremium,
}: PromptMethodSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {/* Manual Prompt Option */}
      <button
        onClick={onSelectManual}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-150 group",
          "border-border-subtle hover:border-interactive-500/50 bg-background-surface/50",
          "hover:scale-[1.01] active:scale-[0.99]"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors",
          "bg-background-elevated group-hover:bg-interactive-600/10",
          "text-text-secondary group-hover:text-interactive-600"
        )}>
          <PencilIcon />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-text-primary text-sm">Write My Own Prompt</h3>
          <p className="text-xs text-text-tertiary line-clamp-1">
            I know what I want — describe it directly
          </p>
        </div>
      </button>

      {/* Coach Option */}
      <button
        onClick={onSelectCoach}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-150 group relative",
          "hover:scale-[1.01] active:scale-[0.99]",
          isPremium
            ? "border-interactive-600/40 hover:border-interactive-600 bg-interactive-600/5"
            : "border-border-subtle hover:border-border-default bg-background-surface/50"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors",
          isPremium
            ? "bg-interactive-600/15 text-interactive-500"
            : "bg-background-elevated text-text-secondary"
        )}>
          <ChatIcon />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={cn(
            "font-medium text-sm",
            isPremium ? "text-interactive-500" : "text-text-primary"
          )}>
            Get Help from Coach
          </h3>
          <p className="text-xs text-text-tertiary line-clamp-1">
            {isPremium ? "AI-powered prompt crafting" : "Upgrade for AI coaching"}
          </p>
        </div>
        {/* Premium badge */}
        <span className={cn(
          "px-1.5 py-0.5 text-[10px] font-semibold rounded flex-shrink-0",
          isPremium
            ? "bg-interactive-600 text-white"
            : "bg-background-elevated text-text-muted"
        )}>
          {isPremium ? 'Premium' : 'Upgrade'}
        </span>
      </button>
    </div>
  );
}
