/**
 * Slot Highlight Component
 * 
 * Highlights template slots when hovering or dragging assets.
 * Shows which slots are available, filled, or compatible with the current asset.
 */

'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { TemplateSlot, CanvasTemplate } from '../templates/data';
import type { MediaAssetType } from '@aurastream/api-client';

// ============================================================================
// Types
// ============================================================================

type SlotState = 'empty' | 'filled' | 'hovered' | 'compatible' | 'incompatible';

interface SlotHighlightProps {
  template: CanvasTemplate | null;
  canvasWidth: number;
  canvasHeight: number;
  filledSlotIds: string[];
  hoveredSlotId?: string | null;
  draggedAssetType?: MediaAssetType | null;
  onSlotHover?: (slotId: string | null) => void;
  onSlotClick?: (slot: TemplateSlot) => void;
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine the state of a slot
 */
function getSlotState(
  slot: TemplateSlot,
  filledSlotIds: string[],
  hoveredSlotId: string | null | undefined,
  draggedAssetType: MediaAssetType | null | undefined
): SlotState {
  if (filledSlotIds.includes(slot.id)) {
    return 'filled';
  }
  
  if (hoveredSlotId === slot.id) {
    return 'hovered';
  }
  
  if (draggedAssetType) {
    const isCompatible = slot.acceptedTypes.includes(draggedAssetType);
    return isCompatible ? 'compatible' : 'incompatible';
  }
  
  return 'empty';
}

/**
 * Get style classes for a slot state
 */
function getSlotStateStyles(state: SlotState): string {
  switch (state) {
    case 'filled':
      return 'border-emerald-500/50 bg-emerald-500/10';
    case 'hovered':
      return 'border-interactive-500 bg-interactive-500/20 scale-[1.02]';
    case 'compatible':
      return 'border-emerald-500 bg-emerald-500/15 animate-pulse';
    case 'incompatible':
      return 'border-red-500/40 bg-red-500/5 opacity-50';
    case 'empty':
    default:
      return 'border-border-subtle bg-background-elevated/20 hover:border-interactive-400 hover:bg-interactive-500/10';
  }
}

// ============================================================================
// Single Slot Highlight
// ============================================================================

interface SingleSlotHighlightProps {
  slot: TemplateSlot;
  canvasWidth: number;
  canvasHeight: number;
  state: SlotState;
  onHover: (slotId: string | null) => void;
  onClick: (slot: TemplateSlot) => void;
}

function SingleSlotHighlight({
  slot,
  canvasWidth,
  canvasHeight,
  state,
  onHover,
  onClick,
}: SingleSlotHighlightProps) {
  // Convert percentage to pixels
  const left = (slot.position.x / 100) * canvasWidth - (slot.size.width / 100) * canvasWidth / 2;
  const top = (slot.position.y / 100) * canvasHeight - (slot.size.height / 100) * canvasHeight / 2;
  const width = (slot.size.width / 100) * canvasWidth;
  const height = (slot.size.height / 100) * canvasHeight;
  
  const handleMouseEnter = useCallback(() => {
    onHover(slot.id);
  }, [slot.id, onHover]);
  
  const handleMouseLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);
  
  const handleClick = useCallback(() => {
    if (state !== 'filled' && state !== 'incompatible') {
      onClick(slot);
    }
  }, [slot, state, onClick]);
  
  const isClickable = state !== 'filled' && state !== 'incompatible';
  
  return (
    <div
      className={cn(
        'absolute rounded-lg border-2 border-dashed transition-all duration-200',
        'flex flex-col items-center justify-center gap-1',
        getSlotStateStyles(state),
        isClickable && 'cursor-pointer'
      )}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: slot.zIndex,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* State Icon */}
      <div className={cn(
        'p-1.5 rounded-full transition-colors',
        state === 'filled' && 'bg-emerald-500/20 text-emerald-400',
        state === 'hovered' && 'bg-interactive-500/20 text-interactive-400',
        state === 'compatible' && 'bg-emerald-500/20 text-emerald-400',
        state === 'incompatible' && 'bg-red-500/20 text-red-400',
        state === 'empty' && 'bg-background-elevated text-text-muted'
      )}>
        {state === 'filled' && <CheckIcon />}
        {state === 'incompatible' && <LockIcon />}
        {(state === 'empty' || state === 'hovered' || state === 'compatible') && <ImageIcon />}
      </div>
      
      {/* Label */}
      <div className="text-center px-2">
        <p className={cn(
          'text-xs font-medium',
          state === 'filled' && 'text-emerald-400',
          state === 'hovered' && 'text-interactive-400',
          state === 'compatible' && 'text-emerald-400',
          state === 'incompatible' && 'text-red-400',
          state === 'empty' && 'text-text-primary'
        )}>
          {slot.label}
        </p>
        
        {/* Show accepted types on hover or when compatible */}
        {(state === 'hovered' || state === 'compatible') && (
          <p className="text-[10px] text-text-muted mt-0.5 max-w-[120px] truncate">
            {slot.acceptedTypes.join(', ')}
          </p>
        )}
        
        {/* Required indicator */}
        {slot.required && state === 'empty' && (
          <p className="text-[10px] text-amber-500 mt-0.5">Required</p>
        )}
        
        {/* Incompatible message */}
        {state === 'incompatible' && (
          <p className="text-[10px] text-red-400 mt-0.5">Not compatible</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SlotHighlight({
  template,
  canvasWidth,
  canvasHeight,
  filledSlotIds,
  hoveredSlotId,
  draggedAssetType,
  onSlotHover,
  onSlotClick,
  className,
}: SlotHighlightProps) {
  if (!template) return null;
  
  const handleHover = useCallback((slotId: string | null) => {
    onSlotHover?.(slotId);
  }, [onSlotHover]);
  
  const handleClick = useCallback((slot: TemplateSlot) => {
    onSlotClick?.(slot);
  }, [onSlotClick]);
  
  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      {template.slots.map(slot => {
        const state = getSlotState(slot, filledSlotIds, hoveredSlotId, draggedAssetType);
        
        return (
          <div key={slot.id} className="pointer-events-auto">
            <SingleSlotHighlight
              slot={slot}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              state={state}
              onHover={handleHover}
              onClick={handleClick}
            />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Utility Export: Find Compatible Slot
// ============================================================================

/**
 * Find the first compatible empty slot for an asset type
 */
export function findCompatibleSlot(
  template: CanvasTemplate | null,
  assetType: MediaAssetType,
  filledSlotIds: string[]
): TemplateSlot | null {
  if (!template) return null;
  
  // First, try to find a required slot
  const requiredSlot = template.slots.find(
    slot => 
      slot.required &&
      !filledSlotIds.includes(slot.id) &&
      slot.acceptedTypes.includes(assetType)
  );
  
  if (requiredSlot) return requiredSlot;
  
  // Then, find any compatible slot
  return template.slots.find(
    slot =>
      !filledSlotIds.includes(slot.id) &&
      slot.acceptedTypes.includes(assetType)
  ) || null;
}

/**
 * Get all compatible slots for an asset type
 */
export function getCompatibleSlots(
  template: CanvasTemplate | null,
  assetType: MediaAssetType,
  filledSlotIds: string[]
): TemplateSlot[] {
  if (!template) return [];
  
  return template.slots.filter(
    slot =>
      !filledSlotIds.includes(slot.id) &&
      slot.acceptedTypes.includes(assetType)
  );
}
