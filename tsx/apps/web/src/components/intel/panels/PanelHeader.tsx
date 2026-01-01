'use client';

import { type ReactNode, useId } from 'react';
import { Settings, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface PanelHeaderProps {
  title: string;
  icon?: ReactNode;
  onSettings?: () => void;
  actions?: ReactNode;
  isDraggable?: boolean;
  panelId?: string;
}

// =============================================================================
// Panel Header Component
// =============================================================================

export function PanelHeader({
  title,
  icon,
  onSettings,
  actions,
  isDraggable = true,
  panelId,
}: PanelHeaderProps) {
  const generatedId = useId();
  const headingId = panelId || generatedId;
  
  return (
    <div 
      className="flex items-center justify-between px-4 py-3 border-b border-border-subtle/50"
      role="heading"
      aria-level={3}
    >
      <div className="flex items-center gap-2">
        {/* Drag Handle */}
        {isDraggable && (
          <button 
            type="button"
            className="drag-handle p-1 -ml-1 text-text-muted/50 hover:text-text-muted cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-surface rounded"
            aria-label={`Drag to reorder ${title} panel`}
            aria-describedby={`${headingId}-drag-hint`}
            tabIndex={0}
          >
            <GripVertical className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        <span id={`${headingId}-drag-hint`} className="sr-only">
          Use arrow keys to reorder this panel
        </span>
        
        {/* Icon */}
        {icon && (
          <span className="text-interactive-400 flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        
        {/* Title */}
        <h3 
          id={headingId}
          className="text-xs font-semibold text-text-muted uppercase tracking-wider"
        >
          {title}
        </h3>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1" role="group" aria-label={`${title} panel actions`}>
        {actions}
        
        {onSettings && (
          <button
            type="button"
            onClick={onSettings}
            className={cn(
              'p-1.5 rounded-md',
              'text-text-muted hover:text-text-secondary',
              'hover:bg-white/5',
              'transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-surface'
            )}
            aria-label={`${title} panel settings`}
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
