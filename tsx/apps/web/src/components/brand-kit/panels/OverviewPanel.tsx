'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useBrandKits, useActivateBrandKit, useDeleteBrandKit } from '@aurastream/api-client';
import { SectionCard } from '../shared';
import { PANEL_CONFIG, type PanelId, type PanelCompletionStatus, type BrandKitIdentity } from '../types';
import { ChevronRightIcon, SparklesIcon, PlusIcon, TrashIcon, CheckIcon } from '../icons';

interface OverviewPanelProps {
  identity: BrandKitIdentity;
  completionStatus: PanelCompletionStatus[];
  onNavigate: (panel: PanelId) => void;
  isNew: boolean;
  isActive: boolean;
  currentBrandKitId?: string | null;
}

export function OverviewPanel({ 
  identity, 
  completionStatus, 
  onNavigate, 
  isNew,
  isActive,
  currentBrandKitId
}: OverviewPanelProps) {
  const { data: brandKitsData } = useBrandKits();
  const activateMutation = useActivateBrandKit();
  const deleteMutation = useDeleteBrandKit();

  const brandKits = brandKitsData?.brandKits || [];
  const configuredPanels = completionStatus.filter(s => s.isConfigured).length;
  const totalPanels = completionStatus.length;
  const progressPercent = Math.round((configuredPanels / totalPanels) * 100);

  const getStatus = (panelId: PanelId) => 
    completionStatus.find(s => s.panel === panelId);

  const quickAccessPanels = PANEL_CONFIG.filter(p => p.id !== 'overview');

  const handleActivate = async (id: string) => {
    try {
      await activateMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to activate:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this brand kit?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      if (id === currentBrandKitId) {
        window.location.href = '/dashboard/brand-kits';
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Brand Kit Selector */}
      {brandKits.length > 0 && (
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Your Brand Kits</h3>
            <Link
              href="/dashboard/brand-kits"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-interactive-600 hover:bg-interactive-600/10 rounded-lg transition-colors"
            >
              <PlusIcon />
              New
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {brandKits.map((kit) => {
              const isCurrent = kit.id === currentBrandKitId;
              const colors = [...(kit.primary_colors || []), ...(kit.accent_colors || [])].slice(0, 4);
              
              return (
                <div
                  key={kit.id}
                  className={cn(
                    "group relative p-4 rounded-xl border-2 transition-all",
                    isCurrent
                      ? "border-interactive-600 bg-interactive-600/5"
                      : "border-border-subtle hover:border-border-default"
                  )}
                >
                  <Link href={`/dashboard/brand-kits?id=${kit.id}`} className="block">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: colors[0] || '#3B82F6' }}
                      >
                        {kit.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">{kit.name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {colors.map((c, i) => (
                            <div key={i} className="w-3 h-3 rounded" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                  
                  {kit.is_active && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-success-dark/20 text-success-light text-xs font-medium rounded-full">
                      Active
                    </span>
                  )}
                  
                  {!isCurrent && (
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!kit.is_active && (
                        <button
                          onClick={() => handleActivate(kit.id)}
                          className="p-1.5 text-text-muted hover:text-success-light hover:bg-success-dark/20 rounded-lg transition-colors"
                          title="Set as active"
                        >
                          <CheckIcon />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(kit.id)}
                        className="p-1.5 text-text-muted hover:text-error-light hover:bg-error-dark/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
      {/* Brand Preview Card */}
      <SectionCard>
        <div className="flex items-start gap-6">
          {/* Brand Icon */}
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0"
            style={{ 
              background: identity.primaryColors[0] || '#3B82F6',
              boxShadow: `0 8px 32px ${identity.primaryColors[0] || '#3B82F6'}40`
            }}
          >
            {identity.name ? identity.name.charAt(0).toUpperCase() : '?'}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-text-primary truncate">
              {identity.name || 'Untitled Brand Kit'}
            </h2>
            <p className="text-text-secondary mt-1 capitalize">
              {identity.tone} tone • {identity.headlineFont}
            </p>

            {/* Color Preview */}
            <div className="flex items-center gap-2 mt-4">
              {[...identity.primaryColors, ...identity.accentColors].slice(0, 6).map((color, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-lg border border-white/10 shadow-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
              {identity.primaryColors.length === 0 && (
                <span className="text-sm text-text-muted">No colors configured</span>
              )}
            </div>
          </div>

          {isActive && (
            <span className="px-3 py-1.5 bg-success-dark/20 text-success-light rounded-full text-sm font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 bg-success-main rounded-full animate-pulse" />
              Active
            </span>
          )}
        </div>
      </SectionCard>

      {/* Progress Card */}
      <SectionCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Setup Progress</h3>
            <p className="text-sm text-text-secondary">
              {configuredPanels} of {totalPanels} sections configured
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-interactive-600">{progressPercent}%</span>
          </div>
        </div>

        <div className="h-2 bg-background-elevated rounded-full overflow-hidden">
          <div 
            className="h-full bg-interactive-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-xs text-text-tertiary mt-3 flex items-center gap-1.5">
          <SparklesIcon />
          Unconfigured sections will use AI-powered defaults
        </p>
      </SectionCard>

      {/* Quick Access Grid */}
      <div>
        <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-4">
          Quick Access
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {quickAccessPanels.map((panel) => {
            const status = getStatus(panel.id);
            const isConfigured = status?.isConfigured;

            return (
              <button
                key={panel.id}
                onClick={() => onNavigate(panel.id)}
                className={cn(
                  "group relative p-4 rounded-xl border-2 text-left transition-all duration-200",
                  "hover:border-interactive-600 hover:shadow-md",
                  isConfigured
                    ? "border-success-main/30 bg-success-dark/5"
                    : "border-border-subtle bg-background-surface/30"
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{panel.icon}</span>
                  {isConfigured && (
                    <span className="w-5 h-5 bg-success-dark/20 text-success-light rounded-full flex items-center justify-center text-xs">
                      ✓
                    </span>
                  )}
                </div>
                <h4 className="font-medium text-text-primary mt-3">{panel.label}</h4>
                <p className="text-xs text-text-tertiary mt-1">{panel.description}</p>
                {status && status.itemCount > 0 && (
                  <p className="text-xs text-interactive-600 mt-2">
                    {status.itemCount} item{status.itemCount !== 1 ? 's' : ''} configured
                  </p>
                )}
                <ChevronRightIcon />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
