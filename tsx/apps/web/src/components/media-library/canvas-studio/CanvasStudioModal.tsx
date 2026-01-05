/**
 * Canvas Studio Modal
 * 
 * Enterprise-grade canvas editor for creating streaming assets.
 * Clean, professional layout optimized for productivity.
 */

'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type { MediaAssetType, AssetType } from '@aurastream/api-client';
import { cn } from '@/lib/utils';
import { SketchToolbar } from '../sketch/SketchToolbar';
import { useSketchStore } from '../sketch/useSketchStore';
import type { CanvasRendererHandle } from '../canvas-export';
import { useCanvasStudio } from './useCanvasStudio';
import {
  CanvasArea,
  ControlsPanel,
  AssetPickerModal,
  QuickStartWizard,
  MagicToolbar,
  SuggestionsPanel,
  QuickActionsBar,
  type QuickAction,
} from './components';
import {
  GuidedTour,
  useTourState,
  CANVAS_STUDIO_TOUR_STEPS,
} from './guides';
import { ExportPanel, type ExportOptions, type ExportResult } from './export';
import { useHistory, UndoRedoCompact } from './history';
import { Celebration, type CelebrationConfig } from './delight';
import { useSendToCoach, CoachDrawer } from './coach-integration';
import { 
  useInlineGeneration, 
  GenerationProgress, 
  GenerationResult,
  type Asset,
} from '../../coach/generation';
import type { CanvasStudioModalProps } from './types';
import type { CanvasType } from './templates/data';

// Icons
function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function LayoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/**
 * Map canvas asset types to backend generation asset types
 */
function mapAssetTypeForGeneration(canvasAssetType: string): AssetType {
  const mapping: Record<string, AssetType> = {
    youtube_thumbnail: 'thumbnail',
    youtube_banner: 'banner',
    twitch_emote: 'twitch_emote',
    twitch_banner: 'banner',
    twitch_badge: 'twitch_badge',
    twitch_panel: 'twitch_panel',
    twitch_offline: 'twitch_offline',
    tiktok_story: 'story_graphic',
    instagram_story: 'story_graphic',
    instagram_reel: 'story_graphic',
    thumbnail: 'thumbnail',
    overlay: 'overlay',
    banner: 'banner',
    story_graphic: 'story_graphic',
  };
  return mapping[canvasAssetType] || 'thumbnail';
}

// ============================================================================
// Unsaved Changes Confirmation Modal
// ============================================================================

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

function UnsavedChangesModal({ isOpen, onSave, onDiscard, onCancel }: UnsavedChangesModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center">
      {/* Backdrop - blocks all interaction */}
      <div className="absolute inset-0 bg-black/70" />
      
      {/* Modal */}
      <div className="relative bg-[#1a1d21] rounded-xl border border-white/10 shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Warning Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto mb-4">
          <WarningIcon />
        </div>
        
        {/* Title */}
        <h2 className="text-lg font-semibold text-white text-center mb-2">
          Unsaved Changes
        </h2>
        
        {/* Message */}
        <p className="text-sm text-white/60 text-center mb-6">
          You have unsaved changes in your canvas. Would you like to save before leaving?
        </p>
        
        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onSave}
            className="w-full px-4 py-3 rounded-lg bg-interactive-500 text-white font-medium hover:bg-interactive-400 transition-colors"
          >
            Save Changes
          </button>
          <button
            onClick={onDiscard}
            className="w-full px-4 py-3 rounded-lg bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors"
          >
            Discard Changes
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-3 rounded-lg text-white/60 font-medium hover:text-white hover:bg-white/5 transition-colors"
          >
            Continue Editing
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Generation Modal - Shows progress and results inline
// ============================================================================

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  asset: Asset | null;
  error: string | null;
  onDownload: (asset: Asset) => void;
  onRegenerate: () => void;
}

function GenerationModal({ 
  isOpen, 
  onClose, 
  status, 
  progress, 
  asset, 
  error,
  onDownload,
  onRegenerate,
}: GenerationModalProps) {
  // Debug logging - only log when isOpen changes or status changes
  console.log('[GenerationModal] Render:', { 
    isOpen, 
    status, 
    progress, 
    hasAsset: !!asset, 
    error,
    willRender: isOpen 
  });
  
  if (!isOpen) {
    return null;
  }
  
  console.log('[GenerationModal] RENDERING MODAL - isOpen is TRUE');
  
  const isGenerating = status === 'queued' || status === 'processing';
  const isComplete = status === 'completed' && asset;
  const isFailed = status === 'failed';
  
  return (
    <div className="fixed inset-0 z-[10003] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80" 
        onClick={isComplete || isFailed ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative bg-[#1a1d21] rounded-xl border border-white/10 shadow-2xl p-6 max-w-lg w-full mx-4">
        {/* Close button - only show when not generating */}
        {!isGenerating && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <XIcon />
          </button>
        )}
        
        {/* Generating State */}
        {isGenerating && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
              <div 
                className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"
                style={{ animationDuration: '1s' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <SparklesIcon />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              {status === 'queued' ? 'Starting generation...' : 'Creating your asset...'}
            </h2>
            <p className="text-sm text-white/60 mb-4">
              This usually takes 10-30 seconds
            </p>
            {/* Progress bar */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
            <p className="text-xs text-white/40 mt-2">{progress}% complete</p>
          </div>
        )}
        
        {/* Success State */}
        {isComplete && asset && (
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-400 mx-auto mb-4">
              <CheckCircleIcon />
            </div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Asset Generated!
            </h2>
            
            {/* Preview */}
            <div className="relative rounded-lg overflow-hidden border border-white/10 mb-6">
              <img 
                src={asset.url} 
                alt="Generated asset"
                className="w-full h-auto max-h-[300px] object-contain bg-black/50"
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => onDownload(asset)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-interactive-500 text-white font-medium hover:bg-interactive-400 transition-colors"
              >
                <DownloadIcon />
                Download
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                Done
              </button>
            </div>
            
            <p className="text-xs text-white/40 mt-4">
              Asset saved to your library
            </p>
          </div>
        )}
        
        {/* Error State */}
        {isFailed && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto mb-4">
              <WarningIcon />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Generation Failed
            </h2>
            <p className="text-sm text-white/60 mb-6">
              {error || 'Something went wrong. Please try again.'}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={onRegenerate}
                className="flex-1 px-4 py-3 rounded-lg bg-interactive-500 text-white font-medium hover:bg-interactive-400 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CanvasStudioModal({
  isOpen,
  onClose,
  assetType,
  assets: initialAssets,
  initialPlacements,
  initialSketchElements,
  onSave,
  onExport,
  projectId,
}: CanvasStudioModalProps) {
  const canvasRendererRef = useRef<CanvasRendererHandle>(null);
  const { isTourActive, completeTour, skipTour } = useTourState();
  
  // UI state
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showCoachDrawer, setShowCoachDrawer] = useState(false);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationConfig | null>(null);
  const [designCount, setDesignCount] = useState(0);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  
  // Store generation context for retry
  const [lastGenerationContext, setLastGenerationContext] = useState<{
    prompt: string;
    sessionId: string;
  } | null>(null);

  const {
    mode,
    showWizard,
    assets,
    placements,
    selectedPlacementId,
    selectedPlacement,
    sketchElements,
    dimensions,
    isAssetPickerOpen,
    assetFilterType,
    isInitialized,  // ENTERPRISE FIX: Track initialization state
    setMode,
    setShowWizard,
    setSelectedPlacementId,
    setIsAssetPickerOpen,
    setAssetFilterType,
    handlePlacementsChange,
    handleUpdatePlacement,
    handleBringForward,
    handleSendBackward,
    handleBringToFront,
    handleSendToBack,
    handleRemovePlacement,
    handleAddAsset,
    handleRemoveAsset,
    handleAssetUpdated,
    handleSave,
    handleCancel,
    handleExport,
    handleWizardComplete,
    handleSuggestionAction,
  } = useCanvasStudio({
    isOpen,
    assetType,
    initialAssets,
    initialPlacements,
    initialSketchElements,
    projectId: projectId || undefined,  // ENTERPRISE FIX: Pass projectId for proper reset on switch
    onSave,
    onClose,
    onExport,
    canvasRendererRef,
  });

  // ============================================================================
  // Unsaved Changes Detection & Protection
  // ============================================================================
  
  // Track if there are unsaved changes (any assets or drawings added)
  const hasUnsavedChanges = useMemo(() => {
    // Has changes if there are any placements or non-image sketch elements
    const hasAssets = placements.length > 0;
    const hasDrawings = sketchElements.filter(el => el.type !== 'image').length > 0;
    return hasAssets || hasDrawings;
  }, [placements, sketchElements]);
  
  // Block browser close/refresh when there are unsaved changes
  useEffect(() => {
    if (!isOpen || !hasUnsavedChanges) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers require returnValue to be set
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, hasUnsavedChanges]);
  
  // Intercept close/cancel attempts
  const handleAttemptClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
    } else {
      handleCancel();
    }
  }, [hasUnsavedChanges, handleCancel]);
  
  // Handle save from unsaved modal
  const handleUnsavedSave = useCallback(async () => {
    setShowUnsavedModal(false);
    await handleSave();
  }, [handleSave]);
  
  // Handle discard from unsaved modal
  const handleUnsavedDiscard = useCallback(() => {
    setShowUnsavedModal(false);
    handleCancel();
  }, [handleCancel]);
  
  // Handle cancel from unsaved modal (continue editing)
  const handleUnsavedCancel = useCallback(() => {
    setShowUnsavedModal(false);
  }, []);

  // Send to Coach
  const {
    state: coachState,
    sendToCoach,
    reset: resetCoach,
  } = useSendToCoach({
    canvasRendererRef,
    placements,
    sketchElements,
    dimensions,
    assetType,
  });

  // Inline Generation - for generating assets from coach prompts
  const {
    triggerGeneration,
    status: generationStatus,
    progress: generationProgress,
    asset: generatedAsset,
    error: generationError,
    reset: resetGeneration,
  } = useInlineGeneration({
    sessionId: '', // Will be set when generation is triggered
    onComplete: (asset) => {
      console.log('[CanvasStudio] Generation complete:', asset);
      // Show celebration for first generation
      setCelebration({
        trigger: 'design_created',
        intensity: 'normal',
        message: 'Asset generated!',
        milestone: 1,
      });
    },
    onError: (error) => {
      console.error('[CanvasStudio] Generation error:', error);
    },
  });

  // Handle send to coach - opens drawer and starts export (doesn't close modal)
  const handleSaveAndSendToCoach = useCallback(async () => {
    // Open coach drawer first (shows loading state)
    setShowCoachDrawer(true);
    // Then start the export/upload process
    await sendToCoach();
  }, [sendToCoach]);

  // Handle generation from coach - triggers actual generation
  const handleGenerateFromCoach = useCallback(async (prompt: string, sessionId: string) => {
    console.log('[CanvasStudio] handleGenerateFromCoach called:', { prompt: prompt.substring(0, 50), sessionId });
    
    // Close the coach drawer
    setShowCoachDrawer(false);
    
    // Save context for potential retry
    setLastGenerationContext({ prompt, sessionId });
    
    // Show generation modal
    console.log('[CanvasStudio] Setting showGenerationModal to true');
    setShowGenerationModal(true);
    
    // Save the canvas
    handleSave();
    
    console.log('[CanvasStudio] Triggering generation:', { 
      prompt: prompt.substring(0, 100) + '...', 
      sessionId, 
      snapshotUrl: coachState.context?.snapshotUrl,
      assetType,
    });
    
    try {
      // Map asset type for backend
      const backendAssetType = mapAssetTypeForGeneration(assetType);
      console.log('[CanvasStudio] Mapped asset type:', { from: assetType, to: backendAssetType });
      
      // Trigger generation with canvas snapshot
      const jobId = await triggerGeneration({
        assetType: backendAssetType,
        customPrompt: prompt,
        // Use canvas snapshot URL from coach context
        canvasSnapshotUrl: coachState.context?.snapshotUrl,
        canvasSnapshotDescription: coachState.context?.description?.summary,
      });
      console.log('[CanvasStudio] Generation triggered, jobId:', jobId);
    } catch (error) {
      console.error('[CanvasStudio] Generation failed:', error);
    }
  }, [handleSave, coachState.context, assetType, triggerGeneration]);

  // Handle regenerate (retry)
  const handleRegenerate = useCallback(async () => {
    if (!lastGenerationContext) return;
    
    resetGeneration();
    
    try {
      const backendAssetType = mapAssetTypeForGeneration(assetType);
      await triggerGeneration({
        assetType: backendAssetType,
        customPrompt: lastGenerationContext.prompt,
        canvasSnapshotUrl: coachState.context?.snapshotUrl,
        canvasSnapshotDescription: coachState.context?.description?.summary,
      });
    } catch (error) {
      console.error('[CanvasStudio] Regeneration failed:', error);
    }
  }, [lastGenerationContext, assetType, coachState.context, triggerGeneration, resetGeneration]);

  // Handle download
  const handleDownloadAsset = useCallback((asset: Asset) => {
    // Create download link
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = `canvas-asset-${asset.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Handle close generation modal
  const handleCloseGenerationModal = useCallback(() => {
    console.log('[CanvasStudio] handleCloseGenerationModal called');
    setShowGenerationModal(false);
    resetGeneration();
    resetCoach();
  }, [resetGeneration, resetCoach]);

  // History
  const handleHistoryRestore = useCallback((
    restoredPlacements: typeof placements,
    _restoredSketchElements: typeof sketchElements
  ) => {
    handlePlacementsChange(restoredPlacements);
  }, [handlePlacementsChange]);

  const history = useHistory({
    placements,
    sketchElements,
    onRestore: handleHistoryRestore,
  });

  const previousPlacementsRef = useRef(placements);
  useEffect(() => {
    if (placements !== previousPlacementsRef.current && placements.length > 0) {
      const prevCount = previousPlacementsRef.current.length;
      const newCount = placements.length;
      if (newCount > prevCount) history.push('Added element');
      else if (newCount < prevCount) history.push('Removed element');
      else history.push('Modified element');
      previousPlacementsRef.current = placements;
    }
  }, [placements, history]);

  // Handlers
  const handleSaveWithCelebration = useCallback(async () => {
    await handleSave();
    const newCount = designCount + 1;
    setDesignCount(newCount);
    if (newCount === 1) {
      setCelebration({ trigger: 'design_created', intensity: 'normal', message: 'Your first design!', milestone: 1 });
    } else if ([5, 10, 25, 50, 100].includes(newCount)) {
      setCelebration({ trigger: 'milestone_reached', intensity: newCount >= 50 ? 'epic' : 'normal', message: `${newCount} designs created!`, milestone: newCount });
    }
  }, [handleSave, designCount]);

  const handleQuickAction = useCallback((action: QuickAction) => {
    switch (action) {
      case 'add_text': 
        setMode('design');
        // Also set the text tool in the sketch store
        useSketchStore.getState().setTool('text');
        break;
      case 'add_image': setIsAssetPickerOpen(true); break;
      case 'change_template': setShowWizard(true); break;
      case 'preview':
      case 'export': setShowExportPanel(true); break;
    }
  }, [setIsAssetPickerOpen, setShowWizard, setMode]);

  const handleExportFromPanel = useCallback(async (options: ExportOptions): Promise<ExportResult> => {
    if (!canvasRendererRef.current) throw new Error('Canvas not ready');
    const result = await canvasRendererRef.current.export();
    return {
      blob: result.blob,
      dataUrl: result.dataUrl,
      filename: `canvas-export-${Date.now()}.${options.format}`,
      format: options.format,
      dimensions: { width: result.width, height: result.height },
      fileSize: result.fileSize,
    };
  }, []);

  const exportPlatform = assetType?.includes('youtube') ? 'youtube_thumbnail' as const :
    assetType?.includes('twitch_emote') ? 'twitch_emote' as const :
    assetType?.includes('twitch_badge') ? 'twitch_badge' as const :
    assetType?.includes('twitch_banner') ? 'twitch_banner' as const :
    assetType?.includes('twitch') ? 'twitch_panel' as const :
    assetType?.includes('instagram_story') ? 'instagram_story' as const :
    assetType?.includes('instagram') ? 'instagram_post' as const :
    assetType?.includes('tiktok') ? 'tiktok_story' as const :
    'custom' as const;

  if (!isOpen) return null;

  const canvasType = assetType as CanvasType;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop - blocks close when unsaved */}
      <div 
        className="absolute inset-0 bg-black/85" 
        onClick={hasUnsavedChanges ? handleAttemptClose : handleCancel} 
      />

      {/* Modal Container - positioned below app header */}
      <div className="absolute inset-x-4 top-[6.5rem] bottom-4 flex items-start justify-center">
        <div className="w-full max-w-[1600px] h-full bg-[#1a1d21] rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
          
          {showWizard ? (
            <>
              {/* Wizard Header */}
              <div className="h-14 px-5 flex items-center justify-between border-b border-white/10 bg-[#15171a]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-interactive-500/20 flex items-center justify-center">
                    <LayoutIcon />
                  </div>
                  <div>
                    <h1 className="text-base font-semibold text-white">Canvas Studio</h1>
                    <p className="text-xs text-white/50">Choose your canvas size</p>
                  </div>
                </div>
                <button onClick={handleAttemptClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                  <XIcon />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <QuickStartWizard initialCanvasType={canvasType} onComplete={handleWizardComplete} onCancel={handleAttemptClose} />
              </div>
            </>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════════════════
                  HEADER - Clean, minimal with all controls visible
                  ═══════════════════════════════════════════════════════════════════ */}
              <div className="h-14 px-5 flex items-center justify-between border-b border-white/10 bg-[#15171a] shrink-0">
                {/* Left: Title & Dimensions */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-interactive-500/20 flex items-center justify-center text-interactive-400">
                    <LayoutIcon />
                  </div>
                  <div>
                    <h1 className="text-base font-semibold text-white">Canvas Studio</h1>
                    <p className="text-xs text-white/50">{dimensions.label} ({dimensions.width}×{dimensions.height})</p>
                  </div>
                </div>

                {/* Center: Mode Toggle */}
                <div className="flex items-center bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => setMode('assets')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                      mode === 'assets' ? 'bg-interactive-500 text-white' : 'text-white/60 hover:text-white'
                    )}
                  >
                    <LayoutIcon />
                    Assets
                  </button>
                  <button
                    onClick={() => setMode('design')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                      mode === 'design' ? 'bg-interactive-500 text-white' : 'text-white/60 hover:text-white'
                    )}
                  >
                    <PenIcon />
                    Design
                  </button>
                </div>

                {/* Right: Close */}
                <button onClick={handleAttemptClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                  <XIcon />
                </button>
              </div>

              {/* ═══════════════════════════════════════════════════════════════════
                  TOOLBAR - Secondary actions row
                  ═══════════════════════════════════════════════════════════════════ */}
              <div className="h-10 px-4 flex items-center justify-between border-b border-white/5 bg-[#1a1d21] shrink-0">
                <MagicToolbar
                  placements={placements}
                  dimensions={dimensions}
                  selectedPlacementId={selectedPlacementId}
                  onPlacementsChange={handlePlacementsChange}
                />
                <UndoRedoCompact
                  onUndo={history.undo}
                  onRedo={history.redo}
                  canUndo={history.canUndo}
                  canRedo={history.canRedo}
                />
              </div>

              {/* ═══════════════════════════════════════════════════════════════════
                  MAIN CONTENT - Three column layout
                  ═══════════════════════════════════════════════════════════════════ */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                
                {/* ENTERPRISE FIX: Loading state while store initializes */}
                {!isInitialized && (initialSketchElements?.length || initialPlacements?.length || initialAssets?.length) ? (
                  <div className="flex-1 flex items-center justify-center bg-[#0d0f11]">
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto mb-3 border-2 border-interactive-500/30 border-t-interactive-500 rounded-full animate-spin" />
                      <p className="text-sm text-white/50">Loading canvas...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* LEFT: Sketch Tools */}
                    {mode === 'design' && (
                      <div className="w-14 border-r border-white/5 bg-[#15171a] flex flex-col items-center py-3">
                        <SketchToolbar orientation="vertical" />
                      </div>
                    )}

                    {/* CENTER: Canvas Area */}
                    <div className="flex-1 relative bg-[#0d0f11]">
                      <CanvasArea
                        mode={mode}
                        assetType={assetType}
                        assets={assets}
                        placements={placements}
                        sketchElements={sketchElements}
                        dimensions={dimensions}
                        selectedPlacementId={selectedPlacementId}
                        canvasRendererRef={canvasRendererRef}
                        onPlacementsChange={handlePlacementsChange}
                        onSelectionChange={setSelectedPlacementId}
                        onAddAssets={() => setIsAssetPickerOpen(true)}
                      />
                      
                      {/* Quick Actions Bar - floating at bottom */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                        <QuickActionsBar
                          onAction={handleQuickAction}
                          disabled={{ auto_layout: placements.length < 2 }}
                        />
                      </div>
                    </div>

                    {/* RIGHT: Controls Panel */}
                    <div className="w-64 border-l border-white/5 bg-[#15171a] flex flex-col overflow-hidden">
                      {/* Controls */}
                      <div className="flex-1 overflow-y-auto">
                        <ControlsPanel
                          mode={mode}
                          placements={placements}
                          selectedPlacement={selectedPlacement}
                          selectedPlacementId={selectedPlacementId}
                          onAddAssets={() => setIsAssetPickerOpen(true)}
                      onSelectPlacement={setSelectedPlacementId}
                      onUpdatePlacement={handleUpdatePlacement}
                      onBringForward={handleBringForward}
                      onSendBackward={handleSendBackward}
                      onBringToFront={handleBringToFront}
                      onSendToBack={handleSendToBack}
                      onRemovePlacement={handleRemovePlacement}
                      onAssetUpdated={handleAssetUpdated}
                      projectId={projectId}
                    />
                  </div>
                  
                  {/* Suggestions */}
                  <div className="border-t border-white/5 max-h-40 overflow-y-auto">
                    <SuggestionsPanel
                      placements={placements}
                      dimensions={dimensions}
                      onApplySuggestion={handleSuggestionAction}
                      defaultExpanded={false}
                    />
                  </div>
                </div>
                  </>
                )}
              </div>

              {/* ═══════════════════════════════════════════════════════════════════
                  FOOTER - Status and actions
                  ═══════════════════════════════════════════════════════════════════ */}
              <div className="h-14 px-5 flex items-center justify-between border-t border-white/10 bg-[#15171a] shrink-0">
                {/* Left: Status + Asset Thumbnails */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-4 text-sm text-white/40">
                    <span>{placements.length} asset{placements.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{sketchElements.filter(el => el.type !== 'image').length} drawings</span>
                  </div>
                  
                  {/* Asset Thumbnails */}
                  {placements.length > 0 && (
                    <>
                      <div className="w-px h-6 bg-white/10" />
                      <div className="flex items-center gap-1">
                        {placements.map((placement) => (
                          <div key={placement.assetId} className="relative group">
                            <button
                              onClick={() => setSelectedPlacementId(placement.assetId)}
                              className={cn(
                                'relative rounded overflow-hidden border-2 transition-all',
                                selectedPlacementId === placement.assetId
                                  ? 'border-interactive-500 ring-1 ring-interactive-500/30'
                                  : 'border-white/10 hover:border-white/30'
                              )}
                            >
                              <img
                                src={placement.asset.thumbnailUrl || placement.asset.url}
                                alt={placement.asset.displayName}
                                className="w-8 h-8 object-cover"
                              />
                              <span className="absolute bottom-0 right-0 px-0.5 bg-black/80 text-[8px] text-white/60 font-mono">
                                {placement.zIndex}
                              </span>
                            </button>
                            {/* Remove button on hover */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAsset(placement.assetId);
                              }}
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                              title="Remove"
                            >
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Center: Keyboard Hints */}
                <div className="hidden lg:flex items-center gap-3 text-[11px] text-white/30">
                  <span>⌘Z Undo</span>
                  <span>•</span>
                  <span>⌘D Duplicate</span>
                  <span>•</span>
                  <span>X Swap Colors</span>
                  <span>•</span>
                  <span>[ ] Layers</span>
                  <span>•</span>
                  <span className="text-white/20">V P R C L A T S E I</span>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                  {/* Save & Send to Coach Button */}
                  <button
                    onClick={handleSaveAndSendToCoach}
                    disabled={placements.length === 0 && sketchElements.length === 0}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      placements.length === 0 && sketchElements.length === 0
                        ? 'text-white/30 cursor-not-allowed'
                        : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/30'
                    )}
                  >
                    <SparklesIcon />
                    Save & Send to Coach
                  </button>
                  
                  {onExport && (
                    <button
                      onClick={handleExport}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Export
                    </button>
                  )}
                  <button
                    onClick={handleAttemptClose}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveWithCelebration}
                    className="px-5 py-2 rounded-lg text-sm font-medium bg-interactive-500 text-white hover:bg-interactive-400 transition-colors shadow-lg shadow-interactive-500/25"
                  >
                    Save Canvas
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sub-modals */}
      <AssetPickerModal
        isOpen={isAssetPickerOpen}
        currentAssets={assets}
        filterType={assetFilterType as MediaAssetType | undefined}
        onFilterChange={setAssetFilterType}
        onAddAsset={handleAddAsset}
        onClose={() => setIsAssetPickerOpen(false)}
      />
      
      <GuidedTour steps={CANVAS_STUDIO_TOUR_STEPS} isActive={isTourActive} onComplete={completeTour} onSkip={skipTour} />
      <ExportPanel isOpen={showExportPanel} onClose={() => setShowExportPanel(false)} onExport={handleExportFromPanel} dimensions={dimensions} initialPlatform={exportPlatform} />
      <Celebration trigger={celebration} />
      
      {/* Coach Drawer - Custom implementation with inline generation */}
      <CoachDrawer
        isOpen={showCoachDrawer}
        onClose={() => {
          setShowCoachDrawer(false);
          resetCoach();
        }}
        context={coachState.context}
        isLoading={coachState.isProcessing}
        error={coachState.error}
        onGenerateComplete={(asset) => {
          console.log('[CanvasStudio] Generation complete from drawer:', asset);
          // Show celebration
          setCelebration({
            trigger: 'design_created',
            intensity: 'normal',
            message: 'Asset generated!',
            milestone: 1,
          });
        }}
      />
      
      {/* Unsaved Changes Warning Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onSave={handleUnsavedSave}
        onDiscard={handleUnsavedDiscard}
        onCancel={handleUnsavedCancel}
      />
    </div>
  );
}

export default CanvasStudioModal;
