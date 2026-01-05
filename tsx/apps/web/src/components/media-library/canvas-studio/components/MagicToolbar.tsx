/**
 * Magic Toolbar Component
 * 
 * Quick-access toolbar for smart layout actions.
 * Provides one-click access to auto-layout, alignment, and distribution.
 */

'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { AssetPlacement } from '../../placement/types';
import type { CanvasDimensions } from '../types';
import {
  applyLayoutPreset,
  autoArrange,
  centerElement,
  distributeHorizontally,
  distributeVertically,
  alignElements,
  LAYOUT_PRESETS,
  type LayoutPreset,
  type AlignmentOption,
} from '../magic';

// ============================================================================
// Icons
// ============================================================================

function WandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function CenterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}

function AlignLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="4" x2="4" y2="20" />
      <rect x="8" y="6" width="12" height="4" />
      <rect x="8" y="14" width="8" height="4" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="4" x2="12" y2="20" />
      <rect x="6" y="6" width="12" height="4" />
      <rect x="8" y="14" width="8" height="4" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="20" y1="4" x2="20" y2="20" />
      <rect x="4" y="6" width="12" height="4" />
      <rect x="8" y="14" width="8" height="4" />
    </svg>
  );
}

function DistributeHIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="8" width="4" height="8" />
      <rect x="10" y="8" width="4" height="8" />
      <rect x="16" y="8" width="4" height="8" />
    </svg>
  );
}

function DistributeVIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="4" width="8" height="4" />
      <rect x="8" y="10" width="8" height="4" />
      <rect x="8" y="16" width="8" height="4" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ============================================================================
// Toolbar Button
// ============================================================================

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}

function ToolbarButton({ icon, label, onClick, disabled, active }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        'p-2 rounded-lg transition-colors',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : active
          ? 'bg-interactive-500 text-white'
          : 'hover:bg-background-elevated text-text-muted hover:text-text-primary'
      )}
    >
      {icon}
    </button>
  );
}

// ============================================================================
// Layout Preset Dropdown
// ============================================================================

interface LayoutDropdownProps {
  onSelect: (preset: LayoutPreset) => void;
  disabled?: boolean;
}

function LayoutDropdown({ onSelect, disabled }: LayoutDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const presets = Object.entries(LAYOUT_PRESETS) as [LayoutPreset, typeof LAYOUT_PRESETS[LayoutPreset]][];
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm transition-colors',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-background-elevated text-text-muted hover:text-text-primary'
        )}
      >
        <GridIcon />
        <span>Layout</span>
        <ChevronDownIcon />
      </button>
      
      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-48 rounded-lg bg-background-surface border border-border-subtle shadow-lg z-20 py-1">
            {presets.map(([key, preset]) => (
              <button
                key={key}
                onClick={() => {
                  onSelect(key);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-background-elevated transition-colors"
              >
                <p className="font-medium text-text-primary">{preset.name}</p>
                <p className="text-xs text-text-muted">{preset.description}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Alignment Dropdown
// ============================================================================

interface AlignmentDropdownProps {
  onSelect: (alignment: AlignmentOption) => void;
  disabled?: boolean;
}

function AlignmentDropdown({ onSelect, disabled }: AlignmentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const alignments: { key: AlignmentOption; label: string; icon: React.ReactNode }[] = [
    { key: 'left', label: 'Align Left', icon: <AlignLeftIcon /> },
    { key: 'center', label: 'Align Center', icon: <AlignCenterIcon /> },
    { key: 'right', label: 'Align Right', icon: <AlignRightIcon /> },
    { key: 'top', label: 'Align Top', icon: <AlignLeftIcon /> },
    { key: 'middle', label: 'Align Middle', icon: <AlignCenterIcon /> },
    { key: 'bottom', label: 'Align Bottom', icon: <AlignRightIcon /> },
  ];
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm transition-colors',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-background-elevated text-text-muted hover:text-text-primary'
        )}
      >
        <AlignCenterIcon />
        <span>Align</span>
        <ChevronDownIcon />
      </button>
      
      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-40 rounded-lg bg-background-surface border border-border-subtle shadow-lg z-20 py-1">
            {alignments.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => {
                  onSelect(key);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-background-elevated transition-colors text-text-primary"
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Magic Toolbar
// ============================================================================

interface MagicToolbarProps {
  placements: AssetPlacement[];
  dimensions: CanvasDimensions;
  selectedPlacementId: string | null;
  onPlacementsChange: (placements: AssetPlacement[]) => void;
  className?: string;
}

export function MagicToolbar({
  placements,
  dimensions,
  selectedPlacementId,
  onPlacementsChange,
  className,
}: MagicToolbarProps) {
  const hasMultiple = placements.length > 1;
  const hasSelection = selectedPlacementId !== null;
  const selectedPlacement = placements.find(p => p.assetId === selectedPlacementId);
  
  // Layout preset handler
  const handleLayoutPreset = useCallback((preset: LayoutPreset) => {
    const newPlacements = applyLayoutPreset(placements, preset, dimensions);
    onPlacementsChange(newPlacements);
  }, [placements, dimensions, onPlacementsChange]);
  
  // Auto-arrange handler
  const handleAutoArrange = useCallback(() => {
    const newPlacements = autoArrange(placements, dimensions);
    onPlacementsChange(newPlacements);
  }, [placements, dimensions, onPlacementsChange]);
  
  // Center handler
  const handleCenter = useCallback(() => {
    if (!selectedPlacement) return;
    const centered = centerElement(selectedPlacement, dimensions);
    const newPlacements = placements.map(p =>
      p.assetId === selectedPlacementId ? centered : p
    );
    onPlacementsChange(newPlacements);
  }, [selectedPlacement, selectedPlacementId, placements, dimensions, onPlacementsChange]);
  
  // Alignment handler
  const handleAlign = useCallback((alignment: AlignmentOption) => {
    const newPlacements = alignElements(placements, alignment, dimensions);
    onPlacementsChange(newPlacements);
  }, [placements, dimensions, onPlacementsChange]);
  
  // Distribution handlers
  const handleDistributeH = useCallback(() => {
    const newPlacements = distributeHorizontally(placements, dimensions);
    onPlacementsChange(newPlacements);
  }, [placements, dimensions, onPlacementsChange]);
  
  const handleDistributeV = useCallback(() => {
    const newPlacements = distributeVertically(placements, dimensions);
    onPlacementsChange(newPlacements);
  }, [placements, dimensions, onPlacementsChange]);
  
  return (
    <div className={cn(
      'flex items-center gap-1 p-1.5 rounded-xl bg-background-surface border border-border-subtle',
      className
    )}>
      {/* Magic wand - auto arrange */}
      <ToolbarButton
        icon={<WandIcon />}
        label="Auto Arrange"
        onClick={handleAutoArrange}
        disabled={!hasMultiple}
      />
      
      <div className="w-px h-6 bg-border-subtle mx-1" />
      
      {/* Layout presets dropdown */}
      <LayoutDropdown
        onSelect={handleLayoutPreset}
        disabled={!hasMultiple}
      />
      
      <div className="w-px h-6 bg-border-subtle mx-1" />
      
      {/* Center selected */}
      <ToolbarButton
        icon={<CenterIcon />}
        label="Center Selected"
        onClick={handleCenter}
        disabled={!hasSelection}
      />
      
      {/* Alignment dropdown */}
      <AlignmentDropdown
        onSelect={handleAlign}
        disabled={!hasMultiple}
      />
      
      <div className="w-px h-6 bg-border-subtle mx-1" />
      
      {/* Distribution */}
      <ToolbarButton
        icon={<DistributeHIcon />}
        label="Distribute Horizontally"
        onClick={handleDistributeH}
        disabled={placements.length < 3}
      />
      <ToolbarButton
        icon={<DistributeVIcon />}
        label="Distribute Vertically"
        onClick={handleDistributeV}
        disabled={placements.length < 3}
      />
    </div>
  );
}
