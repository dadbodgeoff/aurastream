/**
 * CanvasStudio - Unified Canvas Editor
 * 
 * Single modal with all canvas modes as tabs:
 * - Templates: Pre-built layouts
 * - Easy: Simple box drawing for beginners
 * - Regions: Label regions for composition
 * - Assets: Place media assets with precision
 * - Pro: Full sketch tools (pen, shapes, arrows, text)
 */

'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useMediaLibrary, type MediaAsset, type MediaAssetType } from '@aurastream/api-client';
import { EasySketchMode } from './sketch/EasySketchMode';
import { RegionLabel, type LabeledRegion } from './sketch/RegionLabel';
import { SketchCanvas } from './sketch/SketchCanvas';
import { SketchToolbar } from './sketch/SketchToolbar';
import { SketchToolPanel } from './sketch/SketchToolPanel';
import { PlacementCanvas } from './placement/PlacementCanvas';
import { PlacementControls } from './placement/PlacementControls';
import { useSketchStore, resetSketchStore } from './sketch/useSketchStore';
import { generateSketchDescription, generatePromptDescription } from './sketch/generateSketchDescription';
import { CanvasRenderer, type CanvasRendererHandle } from './canvas-export';
import { TemplateGallery } from './templates/TemplateGallery';
import type { CanvasTemplate } from './templates/types';
import { getCanvasDimensions, createDefaultPlacement } from './placement/constants';
import { ASSET_TYPE_ICONS, ASSET_TYPE_COLORS } from './constants';
import type { AssetPlacement } from './placement/types';
import type { AnySketchElement } from './canvas-export/types';

// ============================================================================
// Types
// ============================================================================

type CanvasMode = 'templates' | 'easy' | 'regions' | 'assets' | 'pro';

interface CanvasStudioProps {
  isOpen: boolean;
  onClose: () => void;
  assetType: string;
  assets?: MediaAsset[];
  initialPlacements?: AssetPlacement[];
  initialSketchElements?: AnySketchElement[];
  initialRegions?: LabeledRegion[];
  onSave: (data: {
    placements: AssetPlacement[];
    elements: AnySketchElement[];
    regions: LabeledRegion[];
    description: string;
    promptDescription: string;
    selectedTemplate?: CanvasTemplate;
  }) => void;
}

// ============================================================================
// Icons
// ============================================================================

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
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

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function SmallXIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

// ============================================================================
// Mode Config
// ============================================================================

const MODES: { id: CanvasMode; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'templates', label: 'Templates', icon: <TemplateIcon />, description: 'Start with a layout' },
  { id: 'easy', label: 'Easy', icon: <BoxIcon />, description: 'Draw simple boxes' },
  { id: 'regions', label: 'Regions', icon: <GridIcon />, description: 'Label areas' },
  { id: 'assets', label: 'Assets', icon: <LayersIcon />, description: 'Place your media' },
  { id: 'pro', label: 'Pro', icon: <PenIcon />, description: 'Full drawing tools' },
];

// ============================================================================
// Component
// ============================================================================

export function CanvasStudio({
  isOpen,
  onClose,
  assetType,
  assets: initialAssets = [],
  initialPlacements,
  initialSketchElements = [],
  initialRegions = [],
  onSave,
}: CanvasStudioProps) {
  const dimensions = useMemo(() => getCanvasDimensions(assetType), [assetType]);
  const canvasRendererRef = useRef<CanvasRendererHandle>(null);
  
  // Internal assets state (can be modified within the studio)
  const [assets, setAssets] = useState<MediaAsset[]>(initialAssets);
  
  // Asset picker state
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [assetFilterType, setAssetFilterType] = useState<MediaAssetType | undefined>();
  
  // Fetch library for asset picker
  const { data: library, isLoading: libraryLoading } = useMediaLibrary({
    assetType: assetFilterType,
    limit: 50,
    sortBy: 'usage_count',
    sortOrder: 'desc',
  });
  
  // Mode state - default to assets if assets provided, otherwise templates
  // Users can always switch between modes using the tabs
  const [mode, setMode] = useState<CanvasMode>(() => {
    if (initialAssets.length > 0) return 'assets';
    if (initialRegions.length > 0) return 'regions';
    if (initialSketchElements.length > 0) return 'easy';
    return 'templates'; // Start with templates for new users
  });
  
  // Placement state (for assets mode)
  const [placements, setPlacements] = useState<AssetPlacement[]>(() => {
    if (initialPlacements && initialPlacements.length > 0) {
      return initialPlacements;
    }
    return initialAssets.map((asset, index) => createDefaultPlacement(asset, index, dimensions));
  });
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(
    placements.length > 0 ? placements[0].assetId : null
  );
  
  // Easy mode elements
  const [easyElements, setEasyElements] = useState<AnySketchElement[]>(initialSketchElements);
  
  // Region labels
  const [regions, setRegions] = useState<LabeledRegion[]>(initialRegions);
  
  // Selected template
  const [selectedTemplate, setSelectedTemplate] = useState<CanvasTemplate | null>(null);
  
  // Pro mode uses the sketch store
  const { elements: proElements } = useSketchStore();
  
  // Initialize pro mode elements
  useEffect(() => {
    if (initialSketchElements.length > 0) {
      useSketchStore.setState({ elements: initialSketchElements });
    }
  }, [initialSketchElements]);
  
  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      resetSketchStore();
    }
  }, [isOpen]);
  
  // Update placements when assets change
  useEffect(() => {
    if (!isOpen) return;
    
    const currentAssetIds = new Set(placements.map(p => p.assetId));
    const newAssetIds = new Set(assets.map(a => a.id));
    
    const assetsToAdd = assets.filter(a => !currentAssetIds.has(a.id));
    const placementsToKeep = placements.filter(p => newAssetIds.has(p.assetId));
    
    if (assetsToAdd.length > 0 || placementsToKeep.length !== placements.length) {
      const newPlacements = [
        ...placementsToKeep,
        ...assetsToAdd.map((asset, index) => 
          createDefaultPlacement(asset, placementsToKeep.length + index, dimensions)
        ),
      ];
      setPlacements(newPlacements);
      
      if (selectedPlacementId && !newAssetIds.has(selectedPlacementId)) {
        setSelectedPlacementId(newPlacements.length > 0 ? newPlacements[0].assetId : null);
      }
    }
  }, [assets, isOpen, dimensions, placements, selectedPlacementId]);
  
  // Get current elements based on mode
  const currentElements = mode === 'pro' ? proElements : easyElements;
  
  // Generate description
  const { description, promptDescription } = useMemo(() => {
    const desc = generateSketchDescription(currentElements, regions);
    return {
      description: desc.description,
      promptDescription: generatePromptDescription(currentElements, regions),
    };
  }, [currentElements, regions]);
  
  // Selected placement for controls
  const selectedPlacement = useMemo(
    () => placements.find(p => p.assetId === selectedPlacementId) || null,
    [placements, selectedPlacementId]
  );
  
  // Handlers
  const handlePlacementsChange = useCallback((newPlacements: AssetPlacement[]) => {
    setPlacements(newPlacements);
  }, []);
  
  const handleUpdatePlacement = useCallback((updates: Partial<AssetPlacement>) => {
    if (!selectedPlacementId) return;
    setPlacements(prev => 
      prev.map(p => p.assetId === selectedPlacementId ? { ...p, ...updates } : p)
    );
  }, [selectedPlacementId]);
  
  const handleBringForward = useCallback(() => {
    if (!selectedPlacement) return;
    const currentZ = selectedPlacement.zIndex;
    if (currentZ >= placements.length) return;
    
    setPlacements(prev => prev.map(p => {
      if (p.assetId === selectedPlacementId) return { ...p, zIndex: currentZ + 1 };
      if (p.zIndex === currentZ + 1) return { ...p, zIndex: currentZ };
      return p;
    }));
  }, [selectedPlacement, selectedPlacementId, placements.length]);
  
  const handleSendBackward = useCallback(() => {
    if (!selectedPlacement) return;
    const currentZ = selectedPlacement.zIndex;
    if (currentZ <= 1) return;
    
    setPlacements(prev => prev.map(p => {
      if (p.assetId === selectedPlacementId) return { ...p, zIndex: currentZ - 1 };
      if (p.zIndex === currentZ - 1) return { ...p, zIndex: currentZ };
      return p;
    }));
  }, [selectedPlacement, selectedPlacementId]);
  
  const handleBringToFront = useCallback(() => {
    if (!selectedPlacement) return;
    const maxZ = placements.length;
    if (selectedPlacement.zIndex >= maxZ) return;
    
    setPlacements(prev => prev.map(p => {
      if (p.assetId === selectedPlacementId) return { ...p, zIndex: maxZ };
      if (p.zIndex > selectedPlacement.zIndex) return { ...p, zIndex: p.zIndex - 1 };
      return p;
    }));
  }, [selectedPlacement, selectedPlacementId, placements.length]);
  
  const handleSendToBack = useCallback(() => {
    if (!selectedPlacement) return;
    if (selectedPlacement.zIndex <= 1) return;
    
    setPlacements(prev => prev.map(p => {
      if (p.assetId === selectedPlacementId) return { ...p, zIndex: 1 };
      if (p.zIndex < selectedPlacement.zIndex) return { ...p, zIndex: p.zIndex + 1 };
      return p;
    }));
  }, [selectedPlacement, selectedPlacementId]);
  
  const handleRemovePlacement = useCallback(() => {
    if (!selectedPlacementId) return;
    const newPlacements = placements
      .filter(p => p.assetId !== selectedPlacementId)
      .map((p, i) => ({ ...p, zIndex: i + 1 }));
    
    setPlacements(newPlacements);
    setSelectedPlacementId(newPlacements.length > 0 ? newPlacements[0].assetId : null);
  }, [selectedPlacementId, placements]);
  
  const handleTemplateSelect = useCallback((template: CanvasTemplate) => {
    setSelectedTemplate(template);
    const templateRegions: LabeledRegion[] = template.slots.map(slot => ({
      id: slot.id,
      x: slot.position.x - slot.size.width / 2,
      y: slot.position.y - slot.size.height / 2,
      width: slot.size.width,
      height: slot.size.height,
      label: slot.label,
      color: '#21808D',
    }));
    setRegions(templateRegions);
  }, []);
  
  // Add asset from library
  const handleAddAsset = useCallback((asset: MediaAsset) => {
    if (assets.find(a => a.id === asset.id)) return; // Already added
    
    const newAssets = [...assets, asset];
    setAssets(newAssets);
    
    // Create placement for new asset
    const newPlacement = createDefaultPlacement(asset, placements.length, dimensions);
    setPlacements(prev => [...prev, newPlacement]);
    setSelectedPlacementId(asset.id);
    
    // Switch to assets mode
    setMode('assets');
  }, [assets, placements.length, dimensions]);
  
  // Remove asset
  const handleRemoveAsset = useCallback((assetId: string) => {
    setAssets(prev => prev.filter(a => a.id !== assetId));
    const newPlacements = placements
      .filter(p => p.assetId !== assetId)
      .map((p, i) => ({ ...p, zIndex: i + 1 }));
    setPlacements(newPlacements);
    
    if (selectedPlacementId === assetId) {
      setSelectedPlacementId(newPlacements.length > 0 ? newPlacements[0].assetId : null);
    }
  }, [placements, selectedPlacementId]);
  
  const handleSave = useCallback(() => {
    onSave({
      placements,
      elements: mode === 'pro' ? proElements : easyElements,
      regions,
      description,
      promptDescription,
      selectedTemplate: selectedTemplate || undefined,
    });
    onClose();
  }, [placements, proElements, easyElements, regions, description, promptDescription, selectedTemplate, mode, onSave, onClose]);
  
  const handleCancel = useCallback(() => {
    if (initialPlacements && initialPlacements.length > 0) {
      setPlacements(initialPlacements);
    } else {
      setPlacements(initialAssets.map((asset, index) => createDefaultPlacement(asset, index, dimensions)));
    }
    setAssets(initialAssets);
    setEasyElements(initialSketchElements);
    setRegions(initialRegions);
    setSelectedTemplate(null);
    resetSketchStore();
    onClose();
  }, [initialPlacements, initialSketchElements, initialRegions, initialAssets, dimensions, onClose]);
  
  if (!isOpen) return null;
  
  // Available asset types for filter
  const availableAssetTypes: MediaAssetType[] = [
    'face', 'logo', 'character', 'background', 'reference', 'object', 'game_skin'
  ];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-7xl h-[95vh] bg-background-surface rounded-2xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border-subtle bg-background-elevated/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <h2 className="text-lg font-semibold text-text-primary">Canvas Studio</h2>
              <p className="text-sm text-text-secondary">
                {dimensions.label} • {dimensions.width}×{dimensions.height}
              </p>
            </div>
            <h2 className="sm:hidden text-base font-semibold text-text-primary">Canvas Studio</h2>
          </div>
          
          {/* Mode Tabs */}
          <div className="flex items-center gap-1 bg-background-base rounded-xl p-1 overflow-x-auto">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                  mode === m.id
                    ? 'bg-interactive-500 text-white shadow-lg'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-surface'
                )}
                title={m.description}
              >
                {m.icon}
                <span className="hidden sm:inline">{m.label}</span>
                {m.id === 'assets' && assets.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-micro rounded-full bg-white/20">
                    {assets.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
          >
            <XIcon />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Toolbar (Pro mode only) */}
          {mode === 'pro' && (
            <div className="hidden sm:block p-3 border-r border-border-subtle bg-background-base shrink-0">
              <SketchToolbar orientation="vertical" />
            </div>
          )}
          
          {/* Main Canvas Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-auto flex flex-col">
            {/* Templates Mode */}
            {mode === 'templates' && (
              <div className="max-w-4xl mx-auto w-full">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-text-primary mb-1">
                    Choose a Template
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Start with a pre-built layout, then customize
                  </p>
                </div>
                <TemplateGallery
                  assetType={assetType}
                  selectedId={selectedTemplate?.id}
                  onSelect={handleTemplateSelect}
                />
                {selectedTemplate && (
                  <div className="mt-4 p-4 rounded-xl bg-interactive-500/10 border border-interactive-500/30">
                    <p className="text-sm text-interactive-400">
                      ✓ Template "{selectedTemplate.name}" selected
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Canvas Modes (Easy, Regions, Assets, Pro) */}
            {mode !== 'templates' && (
              <div className="flex-1 flex items-center justify-center min-h-0 w-full">
                <div
                  className="relative rounded-xl border border-border-subtle overflow-hidden bg-background-base"
                  style={{ 
                    aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                    width: '100%',
                    maxWidth: dimensions.width >= dimensions.height 
                      ? 'min(100%, calc((100vh - 20rem) * ' + (dimensions.width / dimensions.height) + '))'
                      : 'calc((100vh - 20rem) * ' + (dimensions.width / dimensions.height) + ')',
                    maxHeight: 'calc(100vh - 20rem)',
                  }}
                >
                  {/* Easy Mode */}
                  {mode === 'easy' && (
                    <EasySketchMode
                      width={dimensions.width}
                      height={dimensions.height}
                      elements={easyElements}
                      onElementsChange={setEasyElements}
                    />
                  )}
                  
                  {/* Regions Mode */}
                  {mode === 'regions' && (
                    <RegionLabel
                      width={dimensions.width}
                      height={dimensions.height}
                      regions={regions}
                      onRegionsChange={setRegions}
                    />
                  )}
                  
                  {/* Assets Mode */}
                  {mode === 'assets' && assets.length > 0 && (
                    <>
                      <PlacementCanvas
                        assetType={assetType}
                        assets={assets}
                        placements={placements}
                        onPlacementsChange={handlePlacementsChange}
                        selectedId={selectedPlacementId}
                        onSelectionChange={setSelectedPlacementId}
                        className="absolute inset-0"
                      />
                      {/* Floating Add Button (visible on smaller screens) */}
                      <button
                        onClick={() => setIsAssetPickerOpen(true)}
                        className="lg:hidden absolute top-2 right-2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-interactive-500 text-white text-sm shadow-lg hover:bg-interactive-600 transition-colors"
                      >
                        <PlusIcon />
                        Add
                      </button>
                    </>
                  )}
                  
                  {/* Assets Mode - Empty State */}
                  {mode === 'assets' && assets.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                      <div className="p-4 rounded-full bg-background-elevated mb-4">
                        <ImageIcon />
                      </div>
                      <h3 className="text-lg font-medium text-text-primary mb-2">No assets yet</h3>
                      <p className="text-sm text-text-muted text-center mb-4 max-w-xs">
                        Add assets from your library to place them on the canvas
                      </p>
                      <button
                        onClick={() => setIsAssetPickerOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-interactive-500 text-white hover:bg-interactive-600 transition-colors"
                      >
                        <PlusIcon />
                        Add Assets
                      </button>
                    </div>
                  )}
                  
                  {/* Pro Mode */}
                  {mode === 'pro' && (
                    <SketchCanvas
                      width={dimensions.width}
                      height={dimensions.height}
                      isActive={true}
                      className="absolute inset-0"
                    />
                  )}
                  
                  {/* Dimension label */}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white/80 pointer-events-none z-20">
                    {dimensions.width} × {dimensions.height}
                  </div>
                </div>
              </div>
            )}
            
            {/* Description Preview */}
            {mode !== 'templates' && (currentElements.length > 0 || regions.length > 0 || placements.length > 0) && (
              <div className="mt-4 p-3 rounded-xl bg-background-elevated border border-border-subtle shrink-0">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                  AI will understand:
                </p>
                <p className="text-sm text-text-primary line-clamp-2">
                  {description || `${placements.length} asset(s) placed on canvas`}
                </p>
              </div>
            )}
          </div>
          
          {/* Right Controls Panel */}
          {(mode === 'assets' || mode === 'pro') && (
            <div className="hidden lg:block w-72 border-l border-border-subtle bg-background-base p-4 overflow-y-auto shrink-0">
              {mode === 'assets' ? (
                <>
                  {/* Add Assets Button */}
                  <button
                    onClick={() => setIsAssetPickerOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-4 rounded-lg border border-dashed border-border-subtle text-text-secondary hover:border-interactive-500 hover:text-interactive-400 transition-colors"
                  >
                    <PlusIcon />
                    Add from Library
                  </button>
                  
                  {selectedPlacement && (
                    <PlacementControls
                      placement={selectedPlacement}
                      onUpdate={handleUpdatePlacement}
                      onBringForward={handleBringForward}
                      onSendBackward={handleSendBackward}
                      onBringToFront={handleBringToFront}
                      onSendToBack={handleSendToBack}
                      onRemove={handleRemovePlacement}
                      totalLayers={placements.length}
                    />
                  )}
                  
                  {/* Asset Thumbnails */}
                  {placements.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border-subtle">
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
                        Assets ({placements.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {placements.map((placement) => (
                          <div
                            key={placement.assetId}
                            className={cn(
                              'relative group',
                            )}
                          >
                            <button
                              onClick={() => setSelectedPlacementId(placement.assetId)}
                              className={cn(
                                'relative p-1 rounded-lg border-2 transition-all',
                                selectedPlacementId === placement.assetId
                                  ? 'border-interactive-500 bg-interactive-500/10'
                                  : 'border-border-subtle hover:border-border-default'
                              )}
                            >
                              <img
                                src={placement.asset.thumbnailUrl || placement.asset.url}
                                alt={placement.asset.displayName}
                                className="w-10 h-10 rounded object-cover"
                              />
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-background-elevated border border-border-subtle rounded-full text-micro text-text-secondary flex items-center justify-center">
                                {placement.zIndex}
                              </span>
                            </button>
                            {/* Remove button */}
                            <button
                              onClick={() => handleRemoveAsset(placement.assetId)}
                              className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              title="Remove asset"
                            >
                              <SmallXIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <SketchToolPanel />
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-border-subtle bg-background-elevated/50 shrink-0">
          <div className="flex items-center gap-4">
            <p className="text-sm text-text-muted hidden sm:block">
              {mode === 'assets' && `${placements.length} asset${placements.length !== 1 ? 's' : ''}`}
              {mode === 'regions' && `${regions.length} region${regions.length !== 1 ? 's' : ''}`}
              {(mode === 'easy' || mode === 'pro') && `${currentElements.length} element${currentElements.length !== 1 ? 's' : ''}`}
              {mode === 'templates' && (selectedTemplate ? `Template: ${selectedTemplate.name}` : 'No template selected')}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-interactive-500 text-white hover:bg-interactive-600 transition-colors shadow-lg shadow-interactive-500/20"
            >
              <CheckIcon />
              Done
            </button>
          </div>
        </div>
      </div>
      
      {/* Asset Picker Modal */}
      {isAssetPickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsAssetPickerOpen(false)} />
          
          <div className="relative w-full max-w-2xl bg-background-surface rounded-2xl border border-border-subtle shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div>
                <h3 className="font-semibold text-text-primary">Add Assets</h3>
                <p className="text-sm text-text-muted">
                  Select assets from your library to add to the canvas
                </p>
              </div>
              <button
                onClick={() => setIsAssetPickerOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated"
              >
                <XIcon />
              </button>
            </div>

            {/* Type Filter */}
            <div className="flex gap-2 p-4 border-b border-border-subtle overflow-x-auto">
              <button
                onClick={() => setAssetFilterType(undefined)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors',
                  !assetFilterType
                    ? 'bg-interactive-500 text-white'
                    : 'bg-background-elevated text-text-muted hover:bg-background-surface'
                )}
              >
                All
              </button>
              {availableAssetTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setAssetFilterType(type)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5',
                    assetFilterType === type
                      ? 'bg-interactive-500 text-white'
                      : 'bg-background-elevated text-text-muted hover:bg-background-surface'
                  )}
                >
                  <span>{ASSET_TYPE_ICONS[type]}</span>
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                </button>
              ))}
            </div>

            {/* Asset Grid */}
            <div className="p-4 max-h-[50vh] overflow-y-auto">
              {libraryLoading ? (
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-background-elevated animate-pulse" />
                  ))}
                </div>
              ) : !library?.assets.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-3 rounded-full bg-background-elevated mb-3">
                    <ImageIcon />
                  </div>
                  <p className="text-text-muted">No assets found</p>
                  <p className="text-sm text-text-tertiary mt-1">
                    Upload assets in your Media Library first
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {library.assets.map((asset) => {
                    const isAdded = assets.some(a => a.id === asset.id);
                    
                    return (
                      <button
                        key={asset.id}
                        onClick={() => {
                          if (!isAdded) {
                            handleAddAsset(asset);
                          }
                        }}
                        disabled={isAdded}
                        className={cn(
                          'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                          isAdded
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30 opacity-75'
                            : 'border-transparent hover:border-interactive-500'
                        )}
                      >
                        <img
                          src={asset.thumbnailUrl || asset.url}
                          alt={asset.displayName}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Type Badge */}
                        <div className={cn(
                          'absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs',
                          ASSET_TYPE_COLORS[asset.assetType]
                        )}>
                          {ASSET_TYPE_ICONS[asset.assetType]}
                        </div>
                        
                        {/* Added Indicator */}
                        {isAdded && (
                          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                              ✓
                            </div>
                          </div>
                        )}
                        
                        {/* Name Overlay */}
                        <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-xs text-white truncate">{asset.displayName}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-background-elevated/50">
              <p className="text-sm text-text-muted">
                {assets.length} asset{assets.length !== 1 ? 's' : ''} added
              </p>
              <button
                onClick={() => setIsAssetPickerOpen(false)}
                className="px-4 py-2 rounded-lg bg-interactive-500 text-white hover:bg-interactive-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CanvasStudio;
