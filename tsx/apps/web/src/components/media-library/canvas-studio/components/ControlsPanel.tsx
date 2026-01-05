/**
 * Controls Panel
 * 
 * Right sidebar with placement controls - compact, professional design.
 */

'use client';

import { PlacementControls } from '../../placement/PlacementControls';
import { SketchToolPanel } from '../../sketch/SketchToolPanel';
import type { AssetPlacement } from '../../placement/types';
import type { EditorMode } from '../types';

// Icons
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

interface ControlsPanelProps {
  mode: EditorMode;
  placements: AssetPlacement[];
  selectedPlacement: AssetPlacement | null;
  selectedPlacementId: string | null;
  onAddAssets: () => void;
  onSelectPlacement: (id: string) => void;
  onUpdatePlacement: (updates: Partial<AssetPlacement>) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onRemovePlacement: () => void;
  onAssetUpdated?: (asset: AssetPlacement['asset']) => void;
  /** Optional project ID for project-scoped operations */
  projectId?: string | null;
}

export function ControlsPanel({
  mode,
  placements,
  selectedPlacement,
  selectedPlacementId,
  onAddAssets,
  onSelectPlacement,
  onUpdatePlacement,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onRemovePlacement,
  onAssetUpdated,
  projectId,
}: ControlsPanelProps) {
  if (mode === 'design') {
    return (
      <div className="h-full p-3">
        <SketchToolPanel />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Add Assets Button */}
      <div className="p-3 border-b border-white/5">
        <button
          onClick={onAddAssets}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-interactive-500/50 text-interactive-400 hover:border-interactive-500 hover:bg-interactive-500/10 transition-colors text-sm font-medium"
        >
          <PlusIcon />
          Add Assets
        </button>
      </div>

      {/* Selected Asset Controls */}
      <div className="flex-1 overflow-y-auto p-3">
        {selectedPlacement ? (
          <PlacementControls
            placement={selectedPlacement}
            onUpdate={onUpdatePlacement}
            onBringForward={onBringForward}
            onSendBackward={onSendBackward}
            onBringToFront={onBringToFront}
            onSendToBack={onSendToBack}
            onRemove={onRemovePlacement}
            onAssetUpdated={onAssetUpdated}
            totalLayers={placements.length}
            projectId={projectId}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-white/40">Select an asset to edit</p>
            <p className="text-xs text-white/25 mt-1">Click on the canvas</p>
          </div>
        )}
      </div>

    </div>
  );
}
