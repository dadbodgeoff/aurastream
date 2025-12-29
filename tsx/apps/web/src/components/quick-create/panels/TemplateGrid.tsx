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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map(template => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="group relative p-4 rounded-xl border-2 border-border-subtle bg-background-surface/50 hover:border-interactive-600 text-left transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{template.emoji}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                template.category === 'stream' && "bg-green-500/10 text-green-400",
                template.category === 'social' && "bg-primary-500/10 text-primary-400",
                template.category === 'twitch' && "bg-primary-500/10 text-primary-400",
              )}>
                {template.dimensions}
              </span>
            </div>
            
            <h3 className="text-sm font-semibold text-text-primary group-hover:text-interactive-600 transition-colors">
              {template.name}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{template.tagline}</p>
            
            <p className="text-[10px] text-text-tertiary mt-2 pt-2 border-t border-border-subtle line-clamp-1">
              {template.previewStyle}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
