'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Beaker, Package, Zap, AlertCircle, Clock } from 'lucide-react';

import { analytics } from '@aurastream/shared';
import { toast } from '@/components/ui/Toast';
import { downloadAsset, getAssetFilename } from '@/utils/download';
import { PageHeader } from '@/components/navigation';
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
} from '@aurastream/api-client';

type TabType = 'lab' | 'inventory';

/**
 * Aura Lab Page - Main page for the fusion experiment feature.
 * 
 * Layout:
 * - Three-column layout: [TestSubjectPanel | FusionCore | ElementGrid]
 * - Results area below (shows FusionResultCard after fusion)
 * - Inventory tab/section at bottom
 * - Usage indicator (X/Y fusions remaining today)
 */
export default function AuraLabPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('lab');

  // Lab state
  const [labState, setLabState] = useState<AuraLabState>({
    step: 'upload',
    subjectId: null,
    subjectImageUrl: null,
    currentFusion: null,
    error: null,
  });

  // Selection state
  const [isSubjectLocked, setIsSubjectLocked] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // API hooks
  const setSubjectMutation = useSetSubject();
  const fuseMutation = useFuse();
  const keepFusionMutation = useKeepFusion();
  const trashFusionMutation = useTrashFusion();
  const { data: inventory, isLoading: isLoadingInventory } = useAuraLabInventory();
  const { data: usage, isLoading: isLoadingUsage } = useAuraLabUsage();
  const { data: elementsData } = useAuraLabElements();

  // Use API elements if available, otherwise fall back to constants
  const elements: Element[] = elementsData?.elements ?? ELEMENTS;
  const premiumLocked = elementsData?.premiumLocked ?? false;

  // Track page view on mount
  useEffect(() => {
    analytics.page('aura_lab', { tab: 'lab' });
  }, []);

  // Track tab changes
  useEffect(() => {
    if (activeTab === 'inventory') {
      analytics.page('aura_lab_inventory', { totalFusions: inventory?.total ?? 0 });
    }
  }, [activeTab, inventory?.total]);

  // Get selected element
  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null;
    return elements.find((el) => el.id === selectedElementId) ?? ELEMENTS_BY_ID[selectedElementId] ?? null;
  }, [selectedElementId, elements]);

  // Check if ready to fuse
  const isReadyToFuse = isSubjectLocked && selectedElementId !== null && labState.subjectId !== null;

  // Handle file upload
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
      
      // Track subject upload
      analytics.track('aura_lab_subject_set', {
        fileSize: file.size,
        fileType: file.type,
      }, 'feature');
      
      toast.success('Subject uploaded!', {
        description: 'Now lock it in to start experimenting.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast.error('Upload failed', { description: message });
      setLabState((prev) => ({ ...prev, error: message }));
    }
  }, [setSubjectMutation]);

  // Handle lock subject
  const handleLockSubject = useCallback(() => {
    setIsSubjectLocked(true);
    toast.info('Subject locked!', {
      description: 'Select an element to fuse with.',
    });
  }, []);

  // Handle unlock subject
  const handleUnlockSubject = useCallback(() => {
    setIsSubjectLocked(false);
    setSelectedElementId(null);
    setLabState((prev) => ({
      ...prev,
      step: 'select',
      currentFusion: null,
    }));
  }, []);

  // Handle element selection
  const handleSelectElement = useCallback((elementId: string) => {
    setSelectedElementId(elementId);
  }, []);

  // Handle fusion
  const handleFuse = useCallback(async () => {
    if (!labState.subjectId || !selectedElementId) return;

    // Check usage limit
    if (usage && usage.remaining <= 0) {
      toast.error('Daily limit reached', {
        description: `You've used all ${usage.limit} fusions today. Resets at midnight UTC.`,
      });
      return;
    }

    setLabState((prev) => ({ ...prev, step: 'fusing' }));
    
    // Track fusion started
    analytics.track('aura_lab_fusion_started', {
      elementId: selectedElementId,
      elementName: selectedElement?.name ?? 'unknown',
      isPremium: selectedElement?.premium ?? false,
    }, 'feature');

    try {
      const result = await fuseMutation.mutateAsync({
        subjectId: labState.subjectId,
        elementId: selectedElementId,
      });

      setLabState((prev) => ({
        ...prev,
        step: 'result',
        currentFusion: result,
        error: null,
      }));
      
      // Track fusion completed
      analytics.track('aura_lab_fusion_completed', {
        elementId: selectedElementId,
        rarity: result.rarity,
        isFirstDiscovery: result.isFirstDiscovery,
        visualImpact: result.scores.visualImpact,
        creativity: result.scores.creativity,
        memePotential: result.scores.memePotential,
        technicalQuality: result.scores.technicalQuality,
      }, 'feature');
      
      // Track first discovery separately
      if (result.isFirstDiscovery) {
        analytics.track('aura_lab_first_discovery', {
          elementId: selectedElementId,
          rarity: result.rarity,
        }, 'feature');
      }

      // Show appropriate toast based on rarity
      if (result.rarity === 'mythic') {
        toast.success('🌟 MYTHIC FUSION!', {
          description: result.isFirstDiscovery 
            ? 'You discovered a new recipe!' 
            : 'Critical success!',
          duration: 8000,
        });
      } else if (result.rarity === 'rare') {
        toast.success('🔵 Rare fusion!', {
          description: 'Nice find!',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fusion failed';
      toast.error('Fusion failed', { description: message });
      setLabState((prev) => ({
        ...prev,
        step: 'select',
        error: message,
      }));
      
      // Track fusion failed
      analytics.track('aura_lab_fusion_failed', {
        elementId: selectedElementId,
        error: message,
      }, 'error');
    }
  }, [labState.subjectId, selectedElementId, selectedElement, fuseMutation, usage]);

  // Handle keep fusion
  const handleKeepFusion = useCallback(async () => {
    if (!labState.currentFusion) return;

    try {
      await keepFusionMutation.mutateAsync(labState.currentFusion.fusionId);
      
      // Track fusion kept
      analytics.track('aura_lab_fusion_kept', {
        fusionId: labState.currentFusion.fusionId,
        rarity: labState.currentFusion.rarity,
        elementId: selectedElementId,
      }, 'feature');
      
      toast.success('Fusion saved!', {
        description: 'Added to your inventory.',
      });
      
      // Reset for next fusion
      setSelectedElementId(null);
      setLabState((prev) => ({
        ...prev,
        step: 'select',
        currentFusion: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      toast.error('Save failed', { description: message });
    }
  }, [labState.currentFusion, keepFusionMutation, selectedElementId]);

  // Handle trash fusion
  const handleTrashFusion = useCallback(async () => {
    if (!labState.currentFusion) return;

    try {
      await trashFusionMutation.mutateAsync(labState.currentFusion.fusionId);
      
      // Track fusion trashed
      analytics.track('aura_lab_fusion_trashed', {
        fusionId: labState.currentFusion.fusionId,
        rarity: labState.currentFusion.rarity,
        elementId: selectedElementId,
      }, 'feature');
      
      toast.info('Fusion discarded');
      
      // Reset for next fusion
      setSelectedElementId(null);
      setLabState((prev) => ({
        ...prev,
        step: 'select',
        currentFusion: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to discard';
      toast.error('Discard failed', { description: message });
    }
  }, [labState.currentFusion, trashFusionMutation, selectedElementId]);

  // Handle download (for result card)
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

  // Handle download from inventory
  const handleDownloadInventoryItem = useCallback((fusion: FusionItem) => {
    downloadAsset({
      url: fusion.imageUrl,
      filename: getAssetFilename('fusion', fusion.id),
      onSuccess: () => toast.success('Download started!'),
      onError: (error) => toast.error('Download failed', { description: error.message }),
      onShowIOSInstructions: () => toast.info('Long-press the image and tap "Add to Photos" to save'),
    });
  }, []);

  // Format time until reset
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

  return (
    <div className="min-h-screen bg-background-base text-white">
      {/* Page Header with Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <PageHeader 
          title="The Aura Lab"
          subtitle="Experimental Fusion Chamber"
          showBack={true}
          actions={
            <div className="flex items-center gap-4">
              {!isLoadingUsage && usage && (
                <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-background-elevated/50 border border-border-default">
                  <Zap className={`w-4 h-4 ${usage.remaining > 0 ? 'text-interactive-500' : 'text-text-tertiary'}`} />
                  <div className="text-sm">
                    <span className={`font-bold ${usage.remaining > 0 ? 'text-white' : 'text-red-400'}`}>
                      {usage.remaining}
                    </span>
                    <span className="text-text-tertiary">/{usage.limit} fusions</span>
                  </div>
                  {usage.remaining === 0 && (
                    <div className="flex items-center gap-1 text-xs text-text-tertiary">
                      <Clock className="w-3 h-3" />
                      {formatTimeUntilReset(usage.resetsAt)}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Switcher */}
              <div className="flex gap-1 p-1 bg-background-elevated/50 rounded-lg">
                <button
                  onClick={() => setActiveTab('lab')}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${activeTab === 'lab'
                      ? 'bg-interactive-600 text-white shadow-lg shadow-interactive-500/25'
                      : 'text-text-secondary hover:text-white hover:bg-background-elevated/50'
                    }
                  `}
                >
                  <Beaker className="w-4 h-4" />
                  Lab
                </button>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${activeTab === 'inventory'
                      ? 'bg-interactive-600 text-white shadow-lg shadow-interactive-500/25'
                      : 'text-text-secondary hover:text-white hover:bg-background-elevated/50'
                    }
                  `}
                >
                  <Package className="w-4 h-4" />
                  Inventory
                  {inventory && inventory.total > 0 && (
                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-background-elevated text-text-secondary">
                      {inventory.total}
                    </span>
                  )}
                </button>
              </div>
            </div>
          }
        />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'lab' ? (
            <motion.div
              key="lab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Lab Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                {/* Test Subject Panel */}
                <div className="lg:col-span-3 h-[500px]">
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

                {/* Fusion Core */}
                <div className="lg:col-span-5">
                  <div className="h-[500px] rounded-2xl bg-zinc-900/80 backdrop-blur-sm border-2 border-zinc-700/50 flex items-center justify-center">
                    <FusionCore
                      subjectImageUrl={labState.subjectImageUrl}
                      selectedElement={selectedElement}
                      onFuse={handleFuse}
                      isFusing={fuseMutation.isPending || labState.step === 'fusing'}
                      isReady={isReadyToFuse}
                    />
                  </div>
                </div>

                {/* Element Grid */}
                <div className="lg:col-span-4 h-[500px]">
                  <ElementGrid
                    elements={elements}
                    selectedElementId={selectedElementId}
                    onSelectElement={handleSelectElement}
                    premiumLocked={premiumLocked}
                    disabled={!isSubjectLocked}
                  />
                </div>
              </div>

              {/* Error Display */}
              {labState.error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">{labState.error}</p>
                </motion.div>
              )}

              {/* Result Card */}
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
              <InventoryGallery
                inventory={inventory}
                isLoading={isLoadingInventory}
                onDownload={handleDownloadInventoryItem}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
