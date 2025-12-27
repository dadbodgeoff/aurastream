'use client';

import { cn } from '@/lib/utils';
import { ALL_TONE_OPTIONS } from '../constants';
import { CheckIcon } from '../icons';

interface ToneSelectorProps {
  value: string;
  onChange: (tone: string) => void;
}

export function ToneSelector({ value, onChange }: ToneSelectorProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {ALL_TONE_OPTIONS.map((tone) => (
        <button
          key={tone.value}
          type="button"
          onClick={() => onChange(tone.value)}
          className={cn(
            "relative p-4 rounded-xl border-2 text-left transition-all duration-200",
            value === tone.value
              ? "border-interactive-600 bg-interactive-600/10"
              : "border-border-subtle hover:border-border-default bg-background-elevated/30"
          )}
        >
          <span className="text-2xl mb-2 block">{tone.emoji}</span>
          <p className={cn(
            "font-medium text-sm",
            value === tone.value ? "text-interactive-600" : "text-text-primary"
          )}>
            {tone.label}
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">{tone.description}</p>
          {value === tone.value && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-interactive-600 rounded-full flex items-center justify-center text-white">
              <CheckIcon />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
