/**
 * CanvasComposer Component
 * 
 * The ultimate canvas composition tool with two modes:
 * 
 * 🎨 Easy Mode - For beginners and kids
 *    - Simple box drawing with labels
 *    - Big friendly buttons
 *    - Emoji color picker
 *    - "A 5-year-old could do it"
 * 
 * 🔧 Pro Mode - Full sketch tools
 *    - All drawing tools (pen, shapes, arrows, text)
 *    - Precise controls
 *    - Keyboard shortcuts
 *    - Undo/redo history
 * 
 * 📋 Templates - Pre-built layouts
 *    - Quick-start compositions
 *    - Category-based browsing
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { MediaAsset } from '@aurastream/api-client';
import { EasySketchMode } from './sketch/EasySketchMode';
import { RegionLabel, type LabeledRegion } from './sketch/RegionLabel';
import { SketchCanvas } from './sketch/SketchCanvas';
import { SketchToolbar } from './sketch/SketchToolbar';
import { SketchToolPanel } from './sketch/SketchToolPanel';
import { useSketchStore, resetSketchStore } from './sketch/useSketchStore';
import { generateSketchDescription, generatePromptDescription } from './sketch/generateSketchDescription';
import { CanvasRenderer, type CanvasRendererHandle } from './canvas-export';
import { TemplateGallery } from './templates/TemplateGallery';
import type { CanvasTemplate } from './templates/types';
import { getCanvasDimensions } from './placement/constants';
import type { AssetPlacement } from './placement/types';
import type { AnySketchElement } from './canvas-export/types';

// ============================================================================
// Types
// ============================================================================

type ComposerMode = 'easy' | 'regions' | 'pro' | 'templates';

// Modes that are locked with "Coming Soon"
const LOCKED_COMPOSER_MODES: Set<ComposerMode> = new Set(['templates', 'easy']);

// Lock icon for Coming Soon modes
function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

interface CanvasComposerProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Asset type being created */
  assetType: string;
  /** Media assets to include */
  assets?: MediaAsset[];
  /** Asset placements */
  placements?: AssetPlacement[];
  /** Initial sketch elements */
  initialElements?: AnySketchElement[];
  /** Initial labeled regions */
  initialRegions?: LabeledRegion[];
  /** Save handler */
  onSave: (data: {
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

function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5L5 19z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
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

// ============================================================================
// Component
// ============================================================================

export function CanvasComposer({
  isOpen,
  onClose,
  assetType,
  assets = [],
  placements = [],
  initialElements = [],
  initialRegions = [],
  onSave,
}: CanvasComposerProps) {
  const dimensions = getCanvasDimensions(assetType);
  const canvasRendererRef = useRef<CanvasRendererHandle>(null);
  
  // Mode state - default to regions (skip locked modes: templates, easy)
  const [mode, setMode] = useState<ComposerMode>('regions');
  
  // Easy mode elements
  const [easyElements, setEasyElements] = useState<AnySketchElement[]>(initialElements);
  
  // Region labels
  const [regions, setRegions] = useState<LabeledRegion[]>(initialRegions);
  
  // Selected template
  const [selectedTemplate, setSelectedTemplate] = useState<CanvasTemplate | null>(null);
  
  // Pro mode uses the sketch store
  const { elements: proElements } = useSketchStore();
  
  // Initialize pro mode elements
  useEffect(() => {
    if (initialElements.length > 0) {
      useSketchStore.setState({ elements: initialElements });
    }
  }, [initialElements]);
  
  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      resetSketchStore();
    }
  }, [isOpen]);
  
  // Get current elements based on mode
  const currentElements = mode === 'pro' ? proElements : easyElements;
  
  // Generate description
  const { description, promptDescription } = (() => {
    const desc = generateSketchDescription(currentElements, regions);
    return {
      description: desc.description,
      promptDescription: generatePromptDescription(currentElements, regions),
    };
  })();
  
  // Handle template selection
  const handleTemplateSelect = useCallback((template: CanvasTemplate) => {
    setSelectedTemplate(template);
    // Convert template slots to regions
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
  
  // Handle save
  const handleSave = useCallback(() => {
    onSave({
      elements: currentElements,
      regions,
      description,
      promptDescription,
      selectedTemplate: selectedTemplate || undefined,
    });
    onClose();
  }, [currentElements, regions, description, promptDescription, selectedTemplate, onSave, onClose]);
  
  // Handle cancel
  const handleCancel = useCallback(() => {
    setEasyElements(initialElements);
    setRegions(initialRegions);
    setSelectedTemplate(null);
    resetSketchStore();
    onClose();
  }, [initialElements, initialRegions, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[95vh] bg-background-surface rounded-2xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-background-elevated/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-interactive-500/20 to-purple-500/20 text-interactive-400">
              <SparklesIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Canvas Composer</h2>
              <p className="text-sm text-text-secondary">
                Draw what you want, AI makes it real ✨
              </p>
            </div>
          </div>
          
          {/* Mode Toggle */}
          <div className="flex items-center gap-1 bg-background-base rounded-xl p-1">
            {[
              { id: 'templates' as ComposerMode, icon: <TemplateIcon />, label: 'Templates' },
              { id: 'easy' as ComposerMode, icon: null, emoji: '🎨', label: 'Easy' },
              { id: 'regions' as ComposerMode, icon: <GridIcon />, label: 'Regions' },
              { id: 'pro' as ComposerMode, icon: <PenIcon />, label: 'Pro' },
            ].map((m) => {
              const isLocked = LOCKED_COMPOSER_MODES.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => !isLocked && setMode(m.id)}
                  disabled={isLocked}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isLocked && 'opacity-50 cursor-not-allowed',
                    mode === m.id && !isLocked
                      ? 'bg-interactive-500 text-white shadow-lg'
                      : !isLocked
                        ? 'text-text-secondary hover:text-text-primary hover:bg-background-surface'
                        : 'text-text-muted'
                  )}
                  title={isLocked ? `${m.label} - Coming Soon` : m.label}
                >
                  {m.icon || m.emoji}
                  {m.label}
                  {isLocked && (
                    <span className="flex items-center gap-0.5 ml-1 px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-amber-500/80 text-black">
                      <LockIcon />
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
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
          {/* Pro Mode Toolbar */}
          {mode === 'pro' && (
            <div className="p-4 border-r border-border-subtle bg-background-base">
              <SketchToolbar orientation="vertical" />
            </div>
          )}
          
          {/* Main Canvas Area */}
          <div className="flex-1 p-6 overflow-auto">
            {mode === 'templates' && (
              <div className="max-w-4xl mx-auto">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-text-primary mb-1">
                    Choose a Template
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Start with a pre-built layout, then customize it your way
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
                      ✓ Template "{selectedTemplate.name}" selected. Click Done to apply it.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {mode === 'easy' && (
              <div className="flex items-center justify-center h-full">
                <div
                  className="relative"
                  style={{ 
                    aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                    maxHeight: '70vh',
                    maxWidth: dimensions.width > dimensions.height ? '90%' : `calc(70vh * ${dimensions.width / dimensions.height})`,
                    width: '100%',
                  }}
                >
                  <EasySketchMode
                    width={dimensions.width}
                    height={dimensions.height}
                    elements={easyElements}
                    onElementsChange={setEasyElements}
                  />
                  {/* Dimension label */}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white/80 pointer-events-none z-10">
                    {dimensions.width} × {dimensions.height}px
                  </div>
                </div>
              </div>
            )}
            
            {mode === 'regions' && (
              <div className="flex items-center justify-center h-full">
                <div
                  className="relative"
                  style={{ 
                    aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                    maxHeight: '70vh',
                    maxWidth: dimensions.width > dimensions.height ? '90%' : `calc(70vh * ${dimensions.width / dimensions.height})`,
                    width: '100%',
                  }}
                >
                  <RegionLabel
                    width={dimensions.width}
                    height={dimensions.height}
                    regions={regions}
                    onRegionsChange={setRegions}
                  />
                  {/* Dimension label */}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white/80 pointer-events-none z-10">
                    {dimensions.width} × {dimensions.height}px
                  </div>
                </div>
              </div>
            )}
            
            {mode === 'pro' && (
              <div className="flex items-center justify-center h-full">
                <div
                  className="relative rounded-xl border border-border-subtle overflow-hidden bg-background-base"
                  style={{ 
                    aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                    maxHeight: '70vh',
                    maxWidth: dimensions.width > dimensions.height ? '90%' : `calc(70vh * ${dimensions.width / dimensions.height})`,
                  }}
                >
                  <SketchCanvas
                    width={dimensions.width}
                    height={dimensions.height}
                    isActive={true}
                    className="absolute inset-0"
                  />
                  {/* Dimension label */}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white/80 pointer-events-none">
                    {dimensions.width} × {dimensions.height}px
                  </div>
                </div>
              </div>
            )}
            
            {/* Description Preview */}
            {(currentElements.length > 0 || regions.length > 0) && mode !== 'templates' && (
              <div className="mt-4 p-4 rounded-xl bg-background-elevated border border-border-subtle">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
                  AI will understand this as:
                </p>
                <p className="text-sm text-text-primary">
                  {description || 'Start drawing to see the description...'}
                </p>
              </div>
            )}
          </div>
          
          {/* Pro Mode Controls Panel */}
          {mode === 'pro' && (
            <div className="w-72 border-l border-border-subtle bg-background-base p-4 overflow-y-auto">
              <SketchToolPanel />
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-background-elevated/50">
          <div className="flex items-center gap-4">
            <p className="text-sm text-text-muted">
              {mode === 'regions' 
                ? `${regions.length} region${regions.length !== 1 ? 's' : ''} defined`
                : `${currentElements.length} element${currentElements.length !== 1 ? 's' : ''}`
              }
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
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium bg-interactive-500 text-white hover:bg-interactive-600 transition-colors shadow-lg shadow-interactive-500/20"
            >
              <CheckIcon />
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CanvasComposer;
