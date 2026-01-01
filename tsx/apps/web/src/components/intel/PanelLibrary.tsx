'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntelStore } from '@/stores/intelStore';
import { 
  PANEL_REGISTRY, 
  getPanelsByCategory,
  isPanelAvailableForTier,
  type PanelMetadata,
} from './panelRegistry';
import type { PanelType } from '@aurastream/api-client';

// =============================================================================
// Types
// =============================================================================

interface PanelLibraryProps {
  userTier?: 'free' | 'pro' | 'studio';
}

// =============================================================================
// Panel Card in Library
// =============================================================================

function PanelLibraryCard({
  panel,
  isAdded,
  isLocked,
  onAdd,
}: {
  panel: PanelMetadata;
  isAdded: boolean;
  isLocked: boolean;
  onAdd: () => void;
}) {
  const Icon = panel.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative p-4 rounded-lg border transition-all',
        isLocked 
          ? 'bg-background-surface/50 border-border-subtle opacity-60'
          : isAdded
            ? 'bg-interactive-600/10 border-interactive-500/30'
            : 'bg-background-surface border-border-subtle hover:border-interactive-500/30'
      )}
    >
      {/* Lock Badge */}
      {isLocked && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1 px-2 py-0.5 bg-accent-500/20 rounded-full">
            <Lock className="w-3 h-3 text-accent-400" />
            <span className="text-xs text-accent-400 capitalize">{panel.tier}</span>
          </div>
        </div>
      )}
      
      {/* Added Badge */}
      {isAdded && !isLocked && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1 px-2 py-0.5 bg-interactive-600/20 rounded-full">
            <Check className="w-3 h-3 text-interactive-400" />
            <span className="text-xs text-interactive-400">Added</span>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          isLocked ? 'bg-white/5' : 'bg-interactive-600/10'
        )}>
          <Icon className={cn(
            'w-5 h-5',
            isLocked ? 'text-text-muted' : 'text-interactive-400'
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-text-primary text-sm">
            {panel.title}
          </h4>
          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
            {panel.description}
          </p>
        </div>
      </div>
      
      {/* Add Button */}
      {!isLocked && !isAdded && (
        <button
          onClick={onAdd}
          className={cn(
            'mt-3 w-full py-2 rounded-md text-sm font-medium',
            'bg-interactive-600/20 hover:bg-interactive-600/30',
            'text-interactive-300 hover:text-interactive-200',
            'transition-colors flex items-center justify-center gap-1.5'
          )}
        >
          <Plus className="w-4 h-4" />
          Add to Dashboard
        </button>
      )}
    </motion.div>
  );
}

// =============================================================================
// Panel Library Modal
// =============================================================================

export function PanelLibrary({ userTier = 'free' }: PanelLibraryProps) {
  const isOpen = useIntelStore(state => state.isPanelLibraryOpen);
  const setOpen = useIntelStore(state => state.setPanelLibraryOpen);
  const dashboardLayout = useIntelStore(state => state.dashboardLayout);
  const addPanel = useIntelStore(state => state.addPanel);
  
  const [activeCategory, setActiveCategory] = useState<'core' | 'content' | 'analytics'>('core');
  
  const addedPanelTypes = new Set(dashboardLayout.map(p => p.panelType));
  const categoryPanels = getPanelsByCategory(activeCategory);
  
  const handleAddPanel = (panelType: PanelType) => {
    const panel = PANEL_REGISTRY[panelType];
    if (panel) {
      addPanel(panelType, panel.defaultSize);
      // Don't close modal - let user add multiple
    }
  };
  
  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
        </Dialog.Overlay>
        
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-full max-w-2xl max-h-[85vh]',
              'bg-background-elevated rounded-xl shadow-2xl',
              'border border-border-subtle',
              'flex flex-col z-50',
              'focus:outline-none'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
              <div>
                <Dialog.Title className="text-lg font-semibold text-text-primary">
                  Panel Library
                </Dialog.Title>
                <Dialog.Description className="text-sm text-text-muted mt-0.5">
                  Add panels to customize your dashboard
                </Dialog.Description>
              </div>
              
              <Dialog.Close asChild>
                <button
                  className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            
            {/* Category Tabs */}
            <div className="flex gap-1 px-6 py-3 border-b border-border-subtle">
              {(['core', 'content', 'analytics'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize',
                    activeCategory === cat
                      ? 'bg-interactive-600/20 text-interactive-300'
                      : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            {/* Panel Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {categoryPanels.map((panel) => (
                    <PanelLibraryCard
                      key={panel.type}
                      panel={panel}
                      isAdded={addedPanelTypes.has(panel.type)}
                      isLocked={!isPanelAvailableForTier(panel.type, userTier)}
                      onAdd={() => handleAddPanel(panel.type)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
              <p className="text-sm text-text-muted">
                {addedPanelTypes.size} panels on dashboard
              </p>
              
              <Dialog.Close asChild>
                <button
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium',
                    'bg-interactive-600 hover:bg-interactive-500',
                    'text-white transition-colors'
                  )}
                >
                  Done
                </button>
              </Dialog.Close>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
