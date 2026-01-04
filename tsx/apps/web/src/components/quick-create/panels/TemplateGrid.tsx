'use client';

import { cn } from '@/lib/utils';
import { CATEGORIES, TEMPLATES } from '../constants';
import { ChevronRightIcon } from '../icons';
import type { QuickTemplate, TemplateCategory } from '../types';

interface TemplateGridProps {
  category: TemplateCategory;
  onCategoryChange: (cat: TemplateCategory) => void;
  onSelect: (template: QuickTemplate) => void;
}

export function TemplateGrid({ category, onCategoryChange, onSelect }: TemplateGridProps) {
  const filtered = category === 'all' 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.category === category);

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
            onClick={() => onSelect(template)}
            className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border-subtle bg-background-surface/50 hover:border-interactive-600 text-left transition-all"
          >
            {/* Icon */}
            <div className="w-8 h-8 rounded-md bg-background-elevated flex items-center justify-center text-base flex-shrink-0 group-hover:bg-interactive-600/10">
              {template.emoji}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-text-primary group-hover:text-interactive-600 transition-colors truncate">
                  {template.name}
                </h3>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0",
                  template.category === 'stream' && "bg-green-500/10 text-green-400",
                  template.category === 'social' && "bg-primary-500/10 text-primary-400",
                  template.category === 'twitch' && "bg-primary-500/10 text-primary-400",
                )}>
                  {template.dimensions}
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{template.tagline}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
