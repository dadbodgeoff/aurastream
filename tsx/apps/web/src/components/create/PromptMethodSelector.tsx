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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Manual Prompt Option */}
      <button
        onClick={onSelectManual}
        className="p-6 rounded-xl border-2 border-border-subtle hover:border-border-default bg-background-surface/50 text-left transition-all group"
      >
        <div className="w-12 h-12 rounded-xl bg-background-elevated flex items-center justify-center mb-4 text-text-secondary group-hover:text-text-primary transition-colors">
          <PencilIcon />
        </div>
        <h3 className="font-semibold text-text-primary mb-2">Write My Own Prompt</h3>
        <p className="text-sm text-text-tertiary">
          I know what I want — let me describe it directly
        </p>
      </button>

      {/* Coach Option */}
      <button
        onClick={onSelectCoach}
        className={cn(
          "p-6 rounded-xl border-2 text-left transition-all group relative overflow-hidden",
          isPremium
            ? "border-interactive-600/30 hover:border-interactive-600 bg-gradient-to-br from-interactive-600/5 to-interactive-600/10"
            : "border-border-subtle hover:border-border-default bg-background-surface/50"
        )}
      >
        {isPremium && (
          <div className="absolute top-3 right-3 px-2 py-0.5 bg-interactive-600 text-white text-xs font-medium rounded-full">
            Premium
          </div>
        )}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
          isPremium
            ? "bg-interactive-600/10 text-interactive-600"
            : "bg-background-elevated text-text-secondary group-hover:text-text-primary"
        )}>
          <ChatIcon />
        </div>
        <h3 className={cn(
          "font-semibold mb-2",
          isPremium ? "text-interactive-600" : "text-text-primary"
        )}>
          Get Help from Coach
        </h3>
        <p className="text-sm text-text-tertiary">
          {isPremium
            ? "Chat with AI to craft the perfect prompt together"
            : "Upgrade to Premium for AI-powered prompt coaching"
          }
        </p>
      </button>
    </div>
  );
}
