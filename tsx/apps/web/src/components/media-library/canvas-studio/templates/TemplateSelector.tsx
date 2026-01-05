/**
 * Template Selector Component
 * 
 * Grid-based template picker with category tabs and search.
 * The main entry point for users to choose a template.
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTemplates } from './useTemplates';
import { TemplatePreview } from './TemplatePreview';
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CATEGORY_ICONS,
  type CanvasTemplate,
  type TemplateCategory,
  type CanvasType,
} from './data';

// ============================================================================
// Icons
// ============================================================================

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

// ============================================================================
// Template Selector
// ============================================================================

interface TemplateSelectorProps {
  /** Canvas type to filter templates for */
  canvasType?: CanvasType;
  /** Called when a template is selected */
  onSelect: (template: CanvasTemplate) => void;
  /** Called when user chooses to start blank */
  onStartBlank: () => void;
  /** Currently selected template ID */
  selectedId?: string;
  className?: string;
}

export function TemplateSelector({
  canvasType,
  onSelect,
  onStartBlank,
  selectedId,
  className,
}: TemplateSelectorProps) {
  const {
    filteredTemplates,
    searchQuery,
    categoryFilter,
    setSearchQuery,
    setCategoryFilter,
    categories,
    templateCount,
  } = useTemplates({ canvasType });
  
  const [hoveredTemplate, setHoveredTemplate] = useState<CanvasTemplate | null>(null);
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border-subtle">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-interactive-500/10 text-interactive-500">
            <SparklesIcon />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Choose a Template</h3>
            <p className="text-sm text-text-muted">
              Start with a pre-designed layout or go blank
            </p>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-background-elevated border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-500/50"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            <SearchIcon />
          </div>
        </div>
      </div>
      
      {/* Category Tabs */}
      <div className="flex-shrink-0 flex gap-2 p-4 overflow-x-auto border-b border-border-subtle">
        <button
          onClick={() => setCategoryFilter(null)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5',
            !categoryFilter
              ? 'bg-interactive-500 text-white'
              : 'bg-background-elevated text-text-muted hover:bg-background-surface'
          )}
        >
          <GridIcon />
          All ({templateCount})
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setCategoryFilter(category)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5',
              categoryFilter === category
                ? 'bg-interactive-500 text-white'
                : 'bg-background-elevated text-text-muted hover:bg-background-surface'
            )}
          >
            <span>{TEMPLATE_CATEGORY_ICONS[category]}</span>
            <span>{TEMPLATE_CATEGORY_LABELS[category]}</span>
          </button>
        ))}
      </div>
      
      {/* Template Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-background-elevated mb-3">
              <GridIcon />
            </div>
            <p className="text-text-muted">No templates found</p>
            <p className="text-sm text-text-tertiary mt-1">
              Try a different search or category
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplatePreview
                key={template.id}
                template={template}
                size="md"
                isSelected={template.id === selectedId}
                onClick={() => onSelect(template)}
                showSlots={hoveredTemplate?.id === template.id}
                onMouseEnter={() => setHoveredTemplate(template)}
                onMouseLeave={() => setHoveredTemplate(null)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-border-subtle bg-background-elevated/50">
        <button
          onClick={onStartBlank}
          className="w-full py-2.5 rounded-lg border-2 border-dashed border-border-subtle text-text-muted hover:border-interactive-400 hover:text-interactive-400 transition-colors text-sm font-medium"
        >
          Start with Blank Canvas
        </button>
      </div>
    </div>
  );
}
