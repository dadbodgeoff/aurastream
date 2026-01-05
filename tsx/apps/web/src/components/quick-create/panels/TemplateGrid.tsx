'use client';

import { cn } from '@/lib/utils';
import { CATEGORIES, TEMPLATES } from '../constants';
import { ChevronRightIcon } from '../icons';
import type { QuickTemplate, TemplateCategory } from '../types';

// All templates are locked for "Coming Soon" launch
const TEMPLATES_LOCKED = true;

// Lock icon component
const LockIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

interface TemplateGridProps {
  category: TemplateCategory;
  onCategoryChange: (cat: TemplateCategory) => void;
  onSelect: (template: QuickTemplate) => void;
}

export function TemplateGrid({ category, onCategoryChange, onSelect }: TemplateGridProps) {
  const filtered = category === 'all' 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.category === category);

  const handleTemplateClick = (template: QuickTemplate) => {
    if (TEMPLATES_LOCKED) return; // No-op when locked
    onSelect(template);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Category Filter */}
      <div className="flex items-center gap-1.5">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              category === cat.id
                ? "bg-interactive-600 text-white"
                : "bg-background-surface text-text-secondary hover:bg-background-elevated"
            )}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {filtered.map(template => (
          <button
            key={template.id}
            onClick={() => handleTemplateClick(template)}
            disabled={TEMPLATES_LOCKED}
            className={cn(
              "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
              TEMPLATES_LOCKED
                ? "border-border-subtle/50 bg-background-surface/30 cursor-not-allowed opacity-70"
                : "border-border-subtle bg-background-surface/50 hover:border-interactive-600"
            )}
          >
            {/* Coming Soon Badge */}
            {TEMPLATES_LOCKED && (
              <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-[10px] font-semibold text-black shadow-sm">
                <LockIcon />
                <span>Soon</span>
              </div>
            )}
            
            {/* Icon */}
            <div className={cn(
              "w-8 h-8 rounded-md flex items-center justify-center text-base flex-shrink-0",
              TEMPLATES_LOCKED
                ? "bg-background-elevated/50"
                : "bg-background-elevated group-hover:bg-interactive-600/10"
            )}>
              {template.emoji}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className={cn(
                  "text-sm font-medium transition-colors truncate",
                  TEMPLATES_LOCKED
                    ? "text-text-secondary"
                    : "text-text-primary group-hover:text-interactive-600"
                )}>
                  {template.name}
                </h3>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0",
                  TEMPLATES_LOCKED && "opacity-60",
                  template.category === 'stream' && "bg-green-500/10 text-green-400",
                  template.category === 'social' && "bg-primary-500/10 text-primary-400",
                  template.category === 'twitch' && "bg-primary-500/10 text-primary-400",
                )}>
                  {template.dimensions}
                </span>
              </div>
              <p className={cn(
                "text-xs mt-0.5 line-clamp-1",
                TEMPLATES_LOCKED ? "text-text-tertiary/70" : "text-text-tertiary"
              )}>
                {template.tagline}
              </p>
            </div>
          </button>
        ))}
      </div>
      
      {/* Coming Soon Notice */}
      {TEMPLATES_LOCKED && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <LockIcon />
          <p className="text-xs text-amber-400">
            Templates are coming soon! Use <span className="font-medium">Custom</span> or <span className="font-medium">AI Coach</span> to create assets now.
          </p>
        </div>
      )}
    </div>
  );
}
