/**
 * Canvas Area
 * 
 * Main canvas rendering area - maintains exact aspect ratio.
 * Both asset and design layers render simultaneously for sync.
 */

'use client';

import type { MediaAsset } from '@aurastream/api-client';
import { PlacementCanvas } from '../../placement/PlacementCanvas';
import { SketchCanvas } from '../../sketch/SketchCanvas';
import { CanvasRenderer } from '../../canvas-export';
import type { CanvasRendererHandle } from '../../canvas-export';
import type { AssetPlacement } from '../../placement/types';
import type { AnySketchElement } from '../../canvas-export/types';
import type { EditorMode, CanvasDimensions } from '../types';

// Icons
function ImageIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

interface CanvasAreaProps {
  mode: EditorMode;
  assetType: string;
  assets: MediaAsset[];
  placements: AssetPlacement[];
  sketchElements: AnySketchElement[];
  dimensions: CanvasDimensions;
  selectedPlacementId: string | null;
  canvasRendererRef: React.RefObject<CanvasRendererHandle | null>;
  onPlacementsChange: (placements: AssetPlacement[]) => void;
  onSelectionChange: (id: string | null) => void;
  onAddAssets: () => void;
}

export function CanvasArea({
  mode,
  assetType,
  assets,
  placements,
  sketchElements,
  dimensions,
  selectedPlacementId,
  canvasRendererRef,
  onPlacementsChange,
  onSelectionChange,
  onAddAssets,
}: CanvasAreaProps) {
  const aspectRatio = dimensions.width / dimensions.height;
  const isLandscape = aspectRatio >= 1;

  // Filter out image elements from sketchElements for SketchCanvas
  // (images are rendered by PlacementCanvas)
  const nonImageSketchElements = sketchElements.filter(el => el.type !== 'image');

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      {/* Canvas Container - maintains exact aspect ratio */}
      <div
        className="relative bg-[#0a0b0d] rounded-lg shadow-2xl ring-1 ring-white/10"
        style={{
          aspectRatio: `${dimensions.width} / ${dimensions.height}`,
          width: isLandscape ? '100%' : 'auto',
          height: isLandscape ? 'auto' : '100%',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        {/* Checkerboard background for transparency */}
        <div 
          className="absolute inset-0 rounded-lg opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
              linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
              linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        />

        {/* Empty State - only show when no assets AND in assets mode */}
        {placements.length === 0 && mode === 'assets' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <div className="p-4 rounded-2xl bg-white/5 mb-4">
              <ImageIcon />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">Start Creating</h3>
            <p className="text-sm text-white/40 text-center mb-4 max-w-[200px]">
              Add images from your library to begin
            </p>
            <button
              onClick={onAddAssets}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-interactive-500 text-white hover:bg-interactive-400 transition-colors text-sm font-medium"
            >
              <PlusIcon />
              Add Assets
            </button>
          </div>
        )}

        {/* Layer 1: PlacementCanvas (images) - always rendered when there are placements */}
        {placements.length > 0 && (
          <PlacementCanvas
            assetType={assetType}
            assets={assets}
            placements={placements}
            onPlacementsChange={onPlacementsChange}
            selectedId={selectedPlacementId}
            onSelectionChange={onSelectionChange}
            className="absolute inset-0 z-10 rounded-lg"
            isInteractive={mode === 'assets'}
          />
        )}

        {/* Layer 2: SketchCanvas (drawings, text, shapes) - always rendered */}
        <SketchCanvas
          width={dimensions.width}
          height={dimensions.height}
          isActive={mode === 'design'}
          className="absolute inset-0 z-20 rounded-lg"
        />

        {/* Hidden Canvas Renderer for export */}
        <CanvasRenderer
          ref={canvasRendererRef as React.RefObject<CanvasRendererHandle>}
          width={dimensions.width}
          height={dimensions.height}
          placements={placements}
          sketchElements={nonImageSketchElements}
          showPreview={false}
        />

        {/* Dimension badge */}
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 rounded text-xs text-white/60 font-mono pointer-events-none z-30 backdrop-blur-sm">
          {dimensions.width} × {dimensions.height}
        </div>

        {/* Center guides (subtle) */}
        <div className="absolute inset-0 pointer-events-none z-5 opacity-0 hover:opacity-100 transition-opacity">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-interactive-500/20" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-interactive-500/20" />
        </div>
      </div>
    </div>
  );
}
