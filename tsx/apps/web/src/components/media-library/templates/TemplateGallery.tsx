/**
 * TemplateGallery Component
 * 
 * Browse and select canvas templates.
 * Organized by category with search and filtering.
 */

'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { CanvasTemplate, TemplateCategory } from './types';
import { BUILT_IN_TEMPLATES, TEMPLATE_CATEGORIES, getTemplatesForAssetType } from './constants';

interface TemplateGalleryProps {
  /** Asset type to filter templates for */
  assetType: string;
  /** Currently selected template ID */
  selectedId?: string;
  /** Callback when template is selected */
  onSelect: (template: CanvasTemplate) => void;
  /** Optional className */
  className?: string;
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function TemplateGallery({
  assetType,
  selectedId,
  onSelect,
  className,
}: TemplateGalleryProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = getTemplatesForAssetType(assetType);
    
    // Filter by category
    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory);
    }
    
    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.promptHints.some(h => h.toLowerCase().includes(searchLower))
      );
    }
    
    return templates;
  }, [assetType, selectedCategory, search]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
          <SearchIcon />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="w-full pl-10 pr-4 py-2 bg-background-surface border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-500/20 focus:border-interactive-500"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors',
            selectedCategory === 'all'
              ? 'bg-interactive-500 text-white'
              : 'bg-background-elevated text-text-muted hover:bg-background-surface'
          )}
        >
          All
        </button>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as TemplateCategory)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5',
              selectedCategory === cat.id
                ? 'bg-interactive-500 text-white'
                : 'bg-background-elevated text-text-muted hover:bg-background-surface'
            )}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-text-muted">No templates found</p>
          <p className="text-sm text-text-tertiary mt-1">
            Try a different search or category
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const isSelected = selectedId === template.id;
            
            return (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className={cn(
                  'relative rounded-xl overflow-hidden border-2 transition-all text-left group',
                  isSelected
                    ? 'border-interactive-500 ring-2 ring-interactive-500/30'
                    : 'border-border-subtle hover:border-border-default'
                )}
              >
                {/* Preview */}
                <div className="aspect-video bg-background-elevated relative">
                  {/* Placeholder preview - in production, use actual thumbnail */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl opacity-50">
                      {TEMPLATE_CATEGORIES.find(c => c.id === template.category)?.emoji || '📋'}
                    </div>
                  </div>
                  
                  {/* Slot indicators */}
                  <div className="absolute inset-0 p-2">
                    {template.slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="absolute border-2 border-dashed border-white/30 rounded"
                        style={{
                          left: `${slot.position.x - slot.size.width / 2}%`,
                          top: `${slot.position.y - slot.size.height / 2}%`,
                          width: `${slot.size.width}%`,
                          height: `${slot.size.height}%`,
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-interactive-500 text-white flex items-center justify-center">
                      <CheckIcon />
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="p-3 bg-background-surface">
                  <h4 className="font-medium text-text-primary text-sm truncate">
                    {template.name}
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-micro text-text-tertiary">
                      {template.slots.length} slot{template.slots.length !== 1 ? 's' : ''}
                    </span>
                    {template.slots.some(s => s.required) && (
                      <span className="text-micro text-amber-400">
                        • Required
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TemplateGallery;
