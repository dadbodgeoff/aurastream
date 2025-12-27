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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Category Filter */}
      <div className="flex items-center gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              category === cat.id
                ? "bg-interactive-600 text-white shadow-md"
                : "bg-background-surface text-text-secondary hover:bg-background-elevated"
            )}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(template => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="group relative p-5 rounded-2xl border-2 border-border-subtle bg-background-surface/50 hover:border-interactive-600 hover:shadow-lg text-left transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{template.emoji}</span>
              <span className={cn(
                "px-2 py-1 rounded-lg text-xs font-medium",
                template.category === 'stream' && "bg-green-500/10 text-green-400",
                template.category === 'social' && "bg-blue-500/10 text-blue-400",
                template.category === 'twitch' && "bg-purple-500/10 text-purple-400",
              )}>
                {template.dimensions}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold text-text-primary group-hover:text-interactive-600 transition-colors">
              {template.name}
            </h3>
            <p className="text-sm text-text-secondary mt-1">{template.tagline}</p>
            
            <p className="text-xs text-text-tertiary mt-4 pt-4 border-t border-border-subtle line-clamp-2">
              {template.previewStyle}
            </p>

            <div className="absolute bottom-5 right-5 w-8 h-8 rounded-full bg-interactive-600/10 text-interactive-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRightIcon />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
