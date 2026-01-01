'use client';

/**
 * Intel Aura Lab Page
 * 
 * Aura Lab within the Intel layout - no sidebar, embedded directly.
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Beaker, Package, Zap, AlertCircle, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { useMobileDetection } from '@aurastream/shared';
import { toast } from '@/components/ui/Toast';
import { downloadAsset, getAssetFilename } from '@/utils/download';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { cn } from '@/lib/utils';
import {
  TestSubjectPanel,
  ElementGrid,
  FusionCore,
  FusionResultCard,
  InventoryGallery,
  ELEMENTS,
  ELEMENTS_BY_ID,
} from '@/components/aura-lab';
import type { AuraLabState, FusionItem, Element } from '@/components/aura-lab/types';
import {
  useSetSubject,
  useFuse,
  useKeepFusion,
  useTrashFusion,
  useAuraLabInventory,
  useAuraLabUsage,
  useAuraLabElements,
  auraLabKeys,
} from '@aurastream/api-client';

type TabType = 'lab' | 'inventory';

export default function IntelAuraLabPage() {
  const [activeTab, setActiveTab] = useState<TabType>('lab');
  const [labState, setLabState] = useState<AuraLabState>({
    step: 'upload',
    subjectId: null,
    subjectImageUrl: null,
    currentFusion: null,
    error: null,
  });
  const [isSubjectLocked, setIsSubjectLocked] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const { isMobile } = useMobileDetection();
  const queryClient = useQueryClient();

  const setSubjectMutation = useSetSubject();
  const fuseMutation = useFuse();
  const keepFusionMutation = useKeepFusion();
  const trashFusionMutation = useTrashFusion();
  const { data: inventory, isLoading: isLoadingInventory } = useAuraLabInventory();
  const { data: usage } = useAuraLabUsage();
  const { data: elementsData } = useAuraLabElements();

  const elements: Element[] = elementsData?.elements ?? ELEMENTS;
  const premiumLocked = elementsData?.premiumLocked ?? false;

  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null;
    return elements.find((el) => el.id === selectedElementId) ?? ELEMENTS_BY_ID[selectedElementId] ?? null;
  }, [selectedElementId, elements]);

  const isReadyToFuse = isSubjectLocked && selectedElementId !== null && labState.subjectId !== null;

  const handleUpload = useCallback(async (file: File) => {
    try {
      const result = await setSubjectMutation.mutateAsync(file);
      setLabState((prev) => ({
        ...prev,
        step: 'select',
        subjectId: result.subjectId,
        subjectImageUrl: result.imageUrl,
        error: null,
      }));
      toast.success('Subject uploaded!', { description: 'Now lock it in to start experimenting.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast.error('Upload failed', { description: message });
      setLabState((prev) => ({ ...prev, error: message }));
    }
  }, [setSubjectMutation]);

  const handleLockSubject = useCallback(() => {
    setIsSubjectLocked(true);
    toast.info('Subject locked!', { description: 'Select an element to fuse with.' });
  }, []);

  const handleUnlockSubject = useCallback(() => {
    setIsSubjectLocked(false);
    setSelectedElementId(null);
    setLabState((prev) => ({ ...prev, step: 'select', currentFusion: null }));
  }, []);

  const handleSelectElement = useCallback((elementId: string) => {
    setSelectedElementId(elementId);
  }, []);

  const handleFuse = useCallback(async () => {
    if (!labState.subjectId || !selectedElementId) return;
    if (usage && usage.remaining <= 0) {
      toast.error('Daily limit reached', {
        description: `You've used all ${usage.limit} fusions today. Resets at midnight UTC.`,
      });
      return;
    }
    setLabState((prev) => ({ ...prev, step: 'fusing' }));
    try {
      const result = await fuseMutation.mutateAsync({
        subjectId: labState.subjectId,
        elementId: selectedElementId,
      });
      setLabState((prev) => ({ ...prev, step: 'result', currentFusion: result, error: null }));
      if (result.rarity === 'mythic') {
        toast.success('🌟 MYTHIC FUSION!', {
          description: result.isFirstDiscovery ? 'You discovered a new recipe!' : 'Critical success!',
          duration: 8000,
        });
      } else if (result.rarity === 'rare') {
        toast.success('🔵 Rare fusion!', { description: 'Nice find!' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fusion failed';
      toast.error('Fusion failed', { description: message });
      setLabState((prev) => ({ ...prev, step: 'select', error: message }));
    }
  }, [labState.subjectId, selectedElementId, fuseMutation, usage]);

  const handleKeepFusion = useCallback(async () => {
    if (!labState.currentFusion) return;
    try {
      await keepFusionMutation.mutateAsync(labState.currentFusion.fusionId);
      toast.success('Fusion saved!', { description: 'Added to your inventory.' });
      setSelectedElementId(null);
      setLabState((prev) => ({ ...prev, step: 'select', currentFusion: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      toast.error('Save failed', { description: message });
    }
  }, [labState.currentFusion, keepFusionMutation]);

  const handleTrashFusion = useCallback(async () => {
    if (!labState.currentFusion) return;
    try {
      await trashFusionMutation.mutateAsync(labState.currentFusion.fusionId);
      toast.info('Fusion discarded');
      setSelectedElementId(null);
      setLabState((prev) => ({ ...prev, step: 'select', currentFusion: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to discard';
      toast.error('Discard failed', { description: message });
    }
  }, [labState.currentFusion, trashFusionMutation]);

  const handleDownloadResult = useCallback(() => {
    if (!labState.currentFusion) return;
    downloadAsset({
      url: labState.currentFusion.imageUrl,
      filename: getAssetFilename('fusion', labState.currentFusion.fusionId),
      onSuccess: () => toast.success('Download started!'),
      onError: (error) => toast.error('Download failed', { description: error.message }),
      onShowIOSInstructions: () => toast.info('Long-press the image and tap "Add to Photos" to save'),
    });
  }, [labState.currentFusion]);

  const handleDownloadInventoryItem = useCallback((fusion: FusionItem) => {
    downloadAsset({
      url: fusion.imageUrl,
      filename: getAssetFilename('fusion', fusion.id),
      onSuccess: () => toast.success('Download started!'),
      onError: (error) => toast.error('Download failed', { description: error.message }),
      onShowIOSInstructions: () => toast.info('Long-press the image and tap "Add to Photos" to save'),
    });
  }, []);

  const formatTimeUntilReset = useCallback((resetsAt: string) => {
    const resetTime = new Date(resetsAt);
    const now = new Date();
    const diff = resetTime.getTime() - now.getTime();
    if (diff <= 0) return 'soon';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, []);

  const handleRefreshInventory = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: auraLabKeys.inventory() }),
      queryClient.invalidateQueries({ queryKey: auraLabKeys.usage() }),
    ]);
  }, [queryClient]);

  return (
    <div className="space-y-6">
      {/* Header - Refined */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/25 ring-1 ring-white/10">
            <Beaker className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">The Aura Lab</h1>
            <p className="text-sm text-text-secondary mt-0.5">Experimental Fusion Chamber</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Usage indicator */}
          {usage && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/5">
              <Zap className={cn(
                'w-4 h-4',
                usage.remaining > 0 ? 'text-teal-400' : 'text-text-tertiary'
              )} />
              <div className="text-sm">
                <span className={cn(
                  'font-bold',
                  usage.remaining > 0 ? 'text-white' : 'text-red-400'
                )}>
                  {usage.remaining}
                </span>
                <span className="text-text-tertiary">/{usage.limit} fusions</span>
              </div>
              {usage.remaining === 0 && (
                <div className="flex items-center gap-1.5 text-xs text-text-tertiary pl-2 border-l border-white/10">
                  <Clock className="w-3 h-3" />
                  {formatTimeUntilReset(usage.resetsAt)}
                </div>
              )}
            </div>
          )}
          
          {/* Tab Switcher */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('lab')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === 'lab'
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              )}
            >
              <Beaker className="w-4 h-4" />
              Lab
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === 'inventory'
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              )}
            >
              <Package className="w-4 h-4" />
              Inventory
              {inventory && inventory.total > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-text-secondary">
                  {inventory.total}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'lab' ? (
          <motion.div
            key="lab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 mb-8">
              <div className="lg:col-span-3 h-[280px] lg:h-[450px]">
                <TestSubjectPanel
                  subjectId={labState.subjectId}
                  subjectImageUrl={labState.subjectImageUrl}
                  isLocked={isSubjectLocked}
                  onUpload={handleUpload}
                  onLock={handleLockSubject}
                  onUnlock={handleUnlockSubject}
                  isUploading={setSubjectMutation.isPending}
                />
              </div>
              <div className="lg:col-span-5">
                <div className="h-[320px] lg:h-[450px] rounded-2xl bg-zinc-900/60 backdrop-blur-sm border border-white/5 flex items-center justify-center">
                  <FusionCore
                    subjectImageUrl={labState.subjectImageUrl}
                    selectedElement={selectedElement}
                    onFuse={handleFuse}
                    isFusing={fuseMutation.isPending || labState.step === 'fusing'}
                    isReady={isReadyToFuse}
                  />
                </div>
              </div>
              <div className="lg:col-span-4 h-[280px] lg:h-[450px]">
                <ElementGrid
                  elements={elements}
                  selectedElementId={selectedElementId}
                  onSelectElement={handleSelectElement}
                  premiumLocked={premiumLocked}
                  disabled={!isSubjectLocked}
                />
              </div>
            </div>

            {labState.error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">{labState.error}</p>
              </motion.div>
            )}

            <AnimatePresence>
              {labState.currentFusion && selectedElement && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-8"
                >
                  <FusionResultCard
                    fusion={labState.currentFusion}
                    element={selectedElement}
                    onKeep={handleKeepFusion}
                    onTrash={handleTrashFusion}
                    onDownload={handleDownloadResult}
                    isKeeping={keepFusionMutation.isPending}
                    isTrashing={trashFusionMutation.isPending}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="inventory"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PullToRefresh onRefresh={handleRefreshInventory} disabled={!isMobile}>
              <InventoryGallery
                inventory={inventory}
                isLoading={isLoadingInventory}
                onDownload={handleDownloadInventoryItem}
              />
            </PullToRefresh>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
