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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Manual Prompt Option */}
      <button
        onClick={onSelectManual}
        className={cn(
          "p-4 rounded-xl border-2 text-left transition-all duration-200 group",
          "border-border-subtle hover:border-interactive-500/50 bg-background-surface/50",
          "hover:scale-[1.01] active:scale-[0.99]"
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
            "bg-background-elevated group-hover:bg-interactive-600/10",
            "text-text-secondary group-hover:text-interactive-600"
          )}>
            <PencilIcon />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-text-primary text-sm">Write My Own Prompt</h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              I know what I want — describe it directly
            </p>
          </div>
        </div>
      </button>

      {/* Coach Option */}
      <button
        onClick={onSelectCoach}
        className={cn(
          "p-4 rounded-xl border-2 text-left transition-all duration-200 group relative overflow-hidden",
          "hover:scale-[1.01] active:scale-[0.99]",
          isPremium
            ? "border-interactive-600/40 hover:border-interactive-600 bg-gradient-to-br from-interactive-600/5 to-accent-600/5"
            : "border-border-subtle hover:border-border-default bg-background-surface/50"
        )}
      >
        {/* Premium badge */}
        <div className={cn(
          "absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold rounded-full",
          isPremium
            ? "bg-interactive-600 text-white"
            : "bg-background-elevated text-text-muted"
        )}>
          {isPremium ? 'Premium' : 'Upgrade'}
        </div>
        
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
            isPremium
              ? "bg-interactive-600/15 text-interactive-500"
              : "bg-background-elevated text-text-secondary"
          )}>
            <ChatIcon />
          </div>
          <div className="min-w-0 pr-12">
            <h3 className={cn(
              "font-semibold text-sm",
              isPremium ? "text-interactive-500" : "text-text-primary"
            )}>
              Get Help from Coach
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              {isPremium ? "AI-powered prompt crafting" : "Upgrade for AI coaching"}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
