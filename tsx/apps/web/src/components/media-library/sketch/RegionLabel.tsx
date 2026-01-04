/**
 * RegionLabel Component
 * 
 * Simple region labeling tool for kids and beginners.
 * Draw a box, type what goes there. That's it.
 * 
 * "Put the sky here" → draws box → types "sky"
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface LabeledRegion {
  id: string;
  /** Region bounds as percentages (0-100) */
  x: number;
  y: number;
  width: number;
  height: number;
  /** What should go in this region */
  label: string;
  /** Optional color for the region outline */
  color: string;
}

interface RegionLabelProps {
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Existing regions */
  regions: LabeledRegion[];
  /** Callback when regions change */
  onRegionsChange: (regions: LabeledRegion[]) => void;
  /** Optional background image URL */
  backgroundImage?: string;
  /** Optional className */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#21808D', // Teal (brand)
];

function generateId(): string {
  return `region-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5L5 19z" />
      <path d="M19 13l.5 1.5L21 15l-1.5.5L19 17l-.5-1.5L17 15l1.5-.5L19 13z" />
    </svg>
  );
}

// ============================================================================
// Component
// ============================================================================

export function RegionLabel({
  width,
  height,
  regions,
  onRegionsChange,
  backgroundImage,
  className,
}: RegionLabelProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [colorIndex, setColorIndex] = useState(0);
  
  // Get coordinates as percentage
  const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0;
      clientY = e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  // Start drawing
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoords(e);
    setIsDrawing(true);
    setDrawStart(coords);
    setCurrentRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
  }, [getCoords]);

  // Update drawing
  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !drawStart) return;
    
    const coords = getCoords(e);
    
    // Calculate rect (handle negative dimensions)
    let x = Math.min(drawStart.x, coords.x);
    let y = Math.min(drawStart.y, coords.y);
    let w = Math.abs(coords.x - drawStart.x);
    let h = Math.abs(coords.y - drawStart.y);
    
    setCurrentRect({ x, y, width: w, height: h });
  }, [isDrawing, drawStart, getCoords]);

  // Finish drawing
  const handlePointerUp = useCallback(() => {
    if (!isDrawing || !currentRect) {
      setIsDrawing(false);
      return;
    }
    
    // Only create region if it's big enough
    if (currentRect.width > 3 && currentRect.height > 3) {
      const newRegion: LabeledRegion = {
        id: generateId(),
        ...currentRect,
        label: '',
        color: COLORS[colorIndex % COLORS.length],
      };
      
      onRegionsChange([...regions, newRegion]);
      setEditingId(newRegion.id);
      setColorIndex((i) => i + 1);
    }
    
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentRect(null);
  }, [isDrawing, currentRect, regions, onRegionsChange, colorIndex]);

  // Update label
  const handleLabelChange = useCallback((id: string, label: string) => {
    onRegionsChange(
      regions.map((r) => (r.id === id ? { ...r, label } : r))
    );
  }, [regions, onRegionsChange]);

  // Delete region
  const handleDelete = useCallback((id: string) => {
    onRegionsChange(regions.filter((r) => r.id !== id));
    if (editingId === id) setEditingId(null);
  }, [regions, onRegionsChange, editingId]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingId(null);
        setIsDrawing(false);
        setCurrentRect(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const aspectRatio = width / height;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Instructions */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-interactive-500/10 border border-interactive-500/20">
        <div className="p-2 rounded-lg bg-interactive-500/20 text-interactive-400">
          <SparklesIcon />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">Draw boxes, add labels!</p>
          <p className="text-xs text-text-secondary">
            Click and drag to draw a box, then type what should go there
          </p>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative rounded-xl border-2 border-dashed border-border-subtle overflow-hidden cursor-crosshair bg-background-base"
        style={{ aspectRatio }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {/* Background image */}
        {backgroundImage && (
          <img
            src={backgroundImage}
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        
        {/* Grid overlay for guidance */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-white/5" />
            ))}
          </div>
        </div>

        {/* Existing regions */}
        {regions.map((region) => (
          <div
            key={region.id}
            className="absolute pointer-events-none"
            style={{
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.width}%`,
              height: `${region.height}%`,
            }}
          >
            {/* Region box */}
            <div
              className="absolute inset-0 border-2 rounded-lg"
              style={{
                borderColor: region.color,
                backgroundColor: `${region.color}20`,
              }}
            />
            
            {/* Label */}
            {region.label && (
              <div
                className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                style={{
                  backgroundColor: region.color,
                  color: 'white',
                }}
              >
                {region.label}
              </div>
            )}
          </div>
        ))}

        {/* Current drawing rect */}
        {currentRect && currentRect.width > 0 && currentRect.height > 0 && (
          <div
            className="absolute border-2 border-dashed rounded-lg pointer-events-none"
            style={{
              left: `${currentRect.x}%`,
              top: `${currentRect.y}%`,
              width: `${currentRect.width}%`,
              height: `${currentRect.height}%`,
              borderColor: COLORS[colorIndex % COLORS.length],
              backgroundColor: `${COLORS[colorIndex % COLORS.length]}20`,
            }}
          />
        )}

        {/* Empty state */}
        {regions.length === 0 && !currentRect && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-background-elevated flex items-center justify-center text-text-muted">
                <PlusIcon />
              </div>
              <p className="text-text-muted text-sm">Draw your first region!</p>
            </div>
          </div>
        )}
      </div>

      {/* Region list */}
      {regions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Your Regions ({regions.length})
          </p>
          
          <div className="space-y-2">
            {regions.map((region) => (
              <div
                key={region.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all',
                  editingId === region.id
                    ? 'border-interactive-500 bg-interactive-500/5'
                    : 'border-border-subtle bg-background-surface hover:border-border-default'
                )}
              >
                {/* Color indicator */}
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: region.color }}
                />
                
                {/* Label input */}
                <input
                  type="text"
                  value={region.label}
                  onChange={(e) => handleLabelChange(region.id, e.target.value)}
                  onFocus={() => setEditingId(region.id)}
                  onBlur={() => setEditingId(null)}
                  placeholder="What goes here? (e.g., sky, person, logo)"
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
                  autoFocus={editingId === region.id && !region.label}
                />
                
                {/* Size indicator */}
                <span className="text-micro text-text-tertiary shrink-0">
                  {Math.round(region.width)}×{Math.round(region.height)}%
                </span>
                
                {/* Delete button */}
                <button
                  onClick={() => handleDelete(region.id)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RegionLabel;
