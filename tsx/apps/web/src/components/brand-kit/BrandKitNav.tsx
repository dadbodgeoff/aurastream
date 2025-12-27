'use client';

import { cn } from '@/lib/utils';
import { PANEL_CONFIG, type PanelId, type PanelCompletionStatus } from './types';
import { ChevronRightIcon, CheckIcon } from './icons';

interface BrandKitNavProps {
  activePanel: PanelId;
  onNavigate: (panel: PanelId) => void;
  completionStatus: PanelCompletionStatus[];
  brandKitName?: string;
  isNew: boolean;
}

export function BrandKitNav({ 
  activePanel, 
  onNavigate, 
  completionStatus,
  brandKitName,
  isNew 
}: BrandKitNavProps) {
  const getStatus = (panelId: PanelId) => 
    completionStatus.find(s => s.panel === panelId);

  return (
    <nav className="w-64 flex-shrink-0 bg-background-surface/50 border-r border-border-subtle">
      <div className="p-4 border-b border-border-subtle">
        <h2 className="text-lg font-semibold text-text-primary truncate">
          {isNew ? 'New Brand Kit' : brandKitName || 'Brand Kit'}
        </h2>
        <p className="text-xs text-text-tertiary mt-1">
          {isNew ? 'Configure your brand identity' : 'Edit brand settings'}
        </p>
      </div>

      <div className="p-2 space-y-1">
        {PANEL_CONFIG.map((panel) => {
          const status = getStatus(panel.id);
          const isActive = activePanel === panel.id;
          const isConfigured = status?.isConfigured;

          return (
            <button
              key={panel.id}
              onClick={() => onNavigate(panel.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                isActive
                  ? "bg-interactive-600/10 text-interactive-600"
                  : "text-text-secondary hover:text-text-primary hover:bg-background-elevated"
              )}
            >
              <span className="text-lg">{panel.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{panel.label}</span>
                  {panel.isOptional && (
                    <span className="text-[10px] text-text-muted">opt</span>
                  )}
                </div>
                {status && status.itemCount > 0 && (
                  <span className="text-xs text-text-tertiary">
                    {status.itemCount}{status.maxItems ? `/${status.maxItems}` : ''} configured
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isConfigured && !isActive && (
                  <span className="w-5 h-5 bg-success-dark/20 text-success-light rounded-full flex items-center justify-center">
                    <CheckIcon />
                  </span>
                )}
                {isActive && <ChevronRightIcon />}
              </div>
            </button>
          );
        })}
      </div>

      {/* AI Default Notice */}
      <div className="p-4 mt-4 mx-2 bg-interactive-600/5 border border-interactive-600/20 rounded-xl">
        <p className="text-xs text-text-secondary">
          <span className="font-medium text-interactive-600">💡 All fields are optional.</span>
          {' '}Unconfigured settings will use AI-powered defaults during generation.
        </p>
      </div>
    </nav>
  );
}
