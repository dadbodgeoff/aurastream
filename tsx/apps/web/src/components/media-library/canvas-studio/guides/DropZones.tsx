/**
 * Drop Zones Component
 * 
 * Visual drop targets for Easy mode that show users where to place assets.
 * Highlights template slots and provides drag-and-drop feedback.
 */

'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { MediaAsset } from '@aurastream/api-client';
import type { TemplateSlot, CanvasTemplate } from '../templates/data';

// ============================================================================
// Icons
// ============================================================================

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

// ============================================================================
// Single Drop Zone
// ============================================================================

interface DropZoneProps {
  slot: TemplateSlot;
  canvasWidth: number;
  canvasHeight: number;
  isFilled: boolean;
  isActive: boolean;
  onDrop: (slot: TemplateSlot, asset: MediaAsset) => void;
  onClick: (slot: TemplateSlot) => void;
}

function DropZone({
  slot,
  canvasWidth,
  canvasHeight,
  isFilled,
  isActive,
  onDrop,
  onClick,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Convert percentage to pixels
  const left = (slot.position.x / 100) * canvasWidth - (slot.size.width / 100) * canvasWidth / 2;
  const top = (slot.position.y / 100) * canvasHeight - (slot.size.height / 100) * canvasHeight / 2;
  const width = (slot.size.width / 100) * canvasWidth;
  const height = (slot.size.height / 100) * canvasHeight;
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    try {
      const assetData = e.dataTransfer.getData('application/json');
      if (assetData) {
        const asset = JSON.parse(assetData) as MediaAsset;
        onDrop(slot, asset);
      }
    } catch (err) {
      console.error('Failed to parse dropped asset:', err);
    }
  }, [slot, onDrop]);
  
  const handleClick = useCallback(() => {
    if (!isFilled) {
      onClick(slot);
    }
  }, [slot, isFilled, onClick]);
  
  // Don't show drop zone if slot is filled
  if (isFilled) return null;
  
  return (
    <div
      className={cn(
        'absolute rounded-xl border-2 border-dashed transition-all cursor-pointer',
        'flex flex-col items-center justify-center gap-2',
        isDragOver
          ? 'border-emerald-500 bg-emerald-500/20 scale-105'
          : isActive
          ? 'border-interactive-500 bg-interactive-500/10'
          : slot.required
          ? 'border-amber-500/60 bg-amber-500/5 hover:border-amber-500 hover:bg-amber-500/10'
          : 'border-border-subtle bg-background-elevated/30 hover:border-interactive-400 hover:bg-interactive-500/5'
      )}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: slot.zIndex,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className={cn(
        'p-2 rounded-full transition-colors',
        isDragOver
          ? 'bg-emerald-500 text-white'
          : 'bg-background-elevated text-text-muted'
      )}>
        {isDragOver ? <ImageIcon /> : <PlusIcon />}
      </div>
      
      <div className="text-center px-2">
        <p className={cn(
          'text-sm font-medium',
          isDragOver ? 'text-emerald-400' : 'text-text-primary'
        )}>
          {slot.label}
        </p>
        {slot.hint && (
          <p className="text-xs text-text-muted mt-0.5">{slot.hint}</p>
        )}
        {slot.required && !isDragOver && (
          <p className="text-xs text-amber-500 mt-1">Required</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Drop Zones Container
// ============================================================================

interface DropZonesProps {
  template: CanvasTemplate | null;
  canvasWidth: number;
  canvasHeight: number;
  filledSlotIds: string[];
  activeSlotId?: string | null;
  onDrop: (slot: TemplateSlot, asset: MediaAsset) => void;
  onSlotClick: (slot: TemplateSlot) => void;
  className?: string;
}

export function DropZones({
  template,
  canvasWidth,
  canvasHeight,
  filledSlotIds,
  activeSlotId,
  onDrop,
  onSlotClick,
  className,
}: DropZonesProps) {
  if (!template) return null;
  
  const unfilledSlots = template.slots.filter(s => !filledSlotIds.includes(s.id));
  
  if (unfilledSlots.length === 0) return null;
  
  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      {unfilledSlots.map(slot => (
        <div key={slot.id} className="pointer-events-auto">
          <DropZone
            slot={slot}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            isFilled={filledSlotIds.includes(slot.id)}
            isActive={activeSlotId === slot.id}
            onDrop={onDrop}
            onClick={onSlotClick}
          />
        </div>
      ))}
    </div>
  );
}
