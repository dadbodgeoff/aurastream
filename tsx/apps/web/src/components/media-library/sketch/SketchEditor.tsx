/**
 * SketchEditor Component
 * 
 * Complete sketch editor with canvas, toolbar, and tool panel.
 * Can be used standalone or integrated with PlacementCanvas.
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { SketchCanvas } from './SketchCanvas';
import { SketchToolbar } from './SketchToolbar';
import { SketchToolPanel } from './SketchToolPanel';
import { useSketchStore, resetSketchStore } from './useSketchStore';
import type { AnySketchElement } from '../canvas-export/types';

interface SketchEditorProps {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Initial elements to load */
  initialElements?: AnySketchElement[];
  /** Callback when elements change */
  onElementsChange?: (elements: AnySketchElement[]) => void;
  /** Whether to show the tool panel */
  showToolPanel?: boolean;
  /** Toolbar orientation */
  toolbarOrientation?: 'horizontal' | 'vertical';
  /** Optional className for the container */
  className?: string;
  /** Optional className for the canvas area */
  canvasClassName?: string;
  /** Background content (e.g., placed assets) */
  backgroundContent?: React.ReactNode;
  /** Canvas label */
  label?: string;
}

export function SketchEditor({
  width,
  height,
  initialElements,
  onElementsChange,
  showToolPanel = true,
  toolbarOrientation = 'vertical',
  className,
  canvasClassName,
  backgroundContent,
  label,
}: SketchEditorProps) {
  const { elements } = useSketchStore();
  const initializedRef = useRef(false);

  // Initialize with initial elements
  useEffect(() => {
    if (initialElements && !initializedRef.current) {
      initializedRef.current = true;
      // Load initial elements into store
      useSketchStore.setState({ elements: initialElements });
    }
  }, [initialElements]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetSketchStore();
    };
  }, []);

  // Handle elements change
  const handleElementsChange = useCallback(
    (newElements: AnySketchElement[]) => {
      onElementsChange?.(newElements);
    },
    [onElementsChange]
  );

  const isHorizontal = toolbarOrientation === 'horizontal';

  return (
    <div className={cn('flex gap-4', isHorizontal ? 'flex-col' : 'flex-row', className)}>
      {/* Toolbar */}
      {isHorizontal ? (
        <div className="flex items-center justify-center">
          <SketchToolbar orientation="horizontal" />
        </div>
      ) : (
        <SketchToolbar orientation="vertical" className="shrink-0" />
      )}

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Label */}
        {label && (
          <div className="mb-2 text-sm text-text-secondary">{label}</div>
        )}

        {/* Canvas Container */}
        <div
          className={cn(
            'relative rounded-xl border border-border-subtle overflow-hidden',
            'bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]',
            canvasClassName
          )}
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          {/* Background content (placed assets, etc.) */}
          {backgroundContent && (
            <div className="absolute inset-0 pointer-events-none">
              {backgroundContent}
            </div>
          )}

          {/* Sketch Canvas */}
          <SketchCanvas
            width={width}
            height={height}
            isActive={true}
            onElementsChange={handleElementsChange}
            className="absolute inset-0"
          />

          {/* Canvas dimensions badge */}
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-background-elevated/80 backdrop-blur-sm rounded text-micro text-text-muted">
            {width} × {height}
          </div>
        </div>

        {/* Element count */}
        <div className="mt-2 text-xs text-text-muted text-center">
          {elements.length} sketch element{elements.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tool Panel */}
      {showToolPanel && (
        <div className="w-64 shrink-0">
          <div className="sticky top-4 p-4 bg-background-elevated rounded-xl border border-border-subtle">
            <SketchToolPanel />
          </div>
        </div>
      )}
    </div>
  );
}

export default SketchEditor;
