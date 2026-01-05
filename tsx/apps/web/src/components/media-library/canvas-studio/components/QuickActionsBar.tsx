/**
 * Quick Actions Bar Component
 * 
 * Floating bar at bottom of canvas with most common actions.
 * Expands on hover to show labels, collapses when not in use.
 */

'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type QuickAction = 
  | 'add_text'
  | 'add_image'
  | 'change_template'
  | 'auto_layout'
  | 'preview'
  | 'export';

interface QuickActionsBarProps {
  onAction: (action: QuickAction) => void;
  disabled?: Partial<Record<QuickAction, boolean>>;
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function TextIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function WandIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ============================================================================
// Action Configuration
// ============================================================================

interface ActionConfig {
  id: QuickAction;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
  color: string;
}

const ACTIONS: ActionConfig[] = [
  {
    id: 'add_text',
    label: 'Add Text',
    shortcut: 'T',
    icon: <TextIcon />,
    color: 'hover:bg-blue-500/20 hover:text-blue-400',
  },
  {
    id: 'add_image',
    label: 'Add Image',
    shortcut: 'I',
    icon: <ImageIcon />,
    color: 'hover:bg-emerald-500/20 hover:text-emerald-400',
  },
  {
    id: 'change_template',
    label: 'Templates',
    shortcut: 'P',
    icon: <TemplateIcon />,
    color: 'hover:bg-purple-500/20 hover:text-purple-400',
  },
  {
    id: 'auto_layout',
    label: 'Auto Layout',
    shortcut: 'L',
    icon: <WandIcon />,
    color: 'hover:bg-amber-500/20 hover:text-amber-400',
  },
  {
    id: 'preview',
    label: 'Preview',
    shortcut: 'Space',
    icon: <EyeIcon />,
    color: 'hover:bg-cyan-500/20 hover:text-cyan-400',
  },
  {
    id: 'export',
    label: 'Export',
    shortcut: '⌘E',
    icon: <DownloadIcon />,
    color: 'hover:bg-interactive-500/20 hover:text-interactive-400',
  },
];

// ============================================================================
// Quick Action Button
// ============================================================================

interface ActionButtonProps {
  action: ActionConfig;
  isExpanded: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

function ActionButton({ action, isExpanded, isDisabled, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200',
        'text-text-muted',
        isDisabled
          ? 'opacity-40 cursor-not-allowed'
          : action.color,
        isExpanded ? 'min-w-[120px]' : ''
      )}
      title={`${action.label} (${action.shortcut})`}
    >
      <span className="flex-shrink-0">{action.icon}</span>
      
      {/* Label - shown when expanded */}
      <span
        className={cn(
          'text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200',
          isExpanded ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'
        )}
      >
        {action.label}
      </span>
      
      {/* Shortcut badge - shown when expanded */}
      {isExpanded && (
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-background-elevated text-text-tertiary">
          {action.shortcut}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Quick Actions Bar
// ============================================================================

export function QuickActionsBar({
  onAction,
  disabled = {},
  className,
}: QuickActionsBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleAction = useCallback((action: QuickAction) => {
    if (!disabled[action]) {
      onAction(action);
    }
  }, [onAction, disabled]);
  
  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1.5 rounded-2xl',
        'bg-background-surface/95 backdrop-blur-md',
        'border border-border-subtle shadow-lg',
        'transition-all duration-300',
        className
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {ACTIONS.map((action, index) => (
        <div key={action.id} className="flex items-center">
          <ActionButton
            action={action}
            isExpanded={isExpanded}
            isDisabled={!!disabled[action.id]}
            onClick={() => handleAction(action.id)}
          />
          
          {/* Divider between groups */}
          {(index === 1 || index === 3) && (
            <div className="w-px h-6 bg-border-subtle mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}
