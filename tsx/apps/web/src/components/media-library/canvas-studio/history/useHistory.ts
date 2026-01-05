/**
 * useHistory Hook
 * 
 * Manages undo/redo history with optional thumbnail generation.
 * Supports max 50 entries with auto-pruning of oldest entries.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AssetPlacement } from '../../placement/types';
import type { AnySketchElement } from '../../canvas-export/types';
import type { HistoryEntry, HistoryState, UseHistoryReturn } from './types';

const MAX_ENTRIES = 50;

/**
 * Generate a unique ID for history entries
 */
function generateId(): string {
  return `history-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Deep clone placements and sketch elements to prevent mutation
 */
function cloneState(
  placements: AssetPlacement[],
  sketchElements: AnySketchElement[]
): { placements: AssetPlacement[]; sketchElements: AnySketchElement[] } {
  return {
    placements: JSON.parse(JSON.stringify(placements)),
    sketchElements: JSON.parse(JSON.stringify(sketchElements)),
  };
}

interface UseHistoryOptions {
  /** Current placements state */
  placements: AssetPlacement[];
  /** Current sketch elements state */
  sketchElements: AnySketchElement[];
  /** Callback when history state should be restored */
  onRestore: (placements: AssetPlacement[], sketchElements: AnySketchElement[]) => void;
  /** Optional canvas ref for thumbnail generation */
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  /** Whether to generate thumbnails (default: false) */
  generateThumbnails?: boolean;
}

export function useHistory({
  placements,
  sketchElements,
  onRestore,
  canvasRef,
  generateThumbnails = false,
}: UseHistoryOptions): UseHistoryReturn {
  const [state, setState] = useState<HistoryState>({
    entries: [],
    currentIndex: -1,
    maxEntries: MAX_ENTRIES,
  });

  // Track if we're currently restoring to prevent push during restore
  const isRestoringRef = useRef(false);

  /**
   * Generate a thumbnail from the canvas
   */
  const generateThumbnail = useCallback((): string | null => {
    if (!generateThumbnails || !canvasRef?.current) {
      return null;
    }

    try {
      const canvas = canvasRef.current;
      // Create a smaller thumbnail (80x60 for 4:3 aspect ratio)
      const thumbCanvas = document.createElement('canvas');
      const thumbWidth = 80;
      const thumbHeight = 60;
      thumbCanvas.width = thumbWidth;
      thumbCanvas.height = thumbHeight;

      const ctx = thumbCanvas.getContext('2d');
      if (!ctx) return null;

      // Draw scaled version
      ctx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
      return thumbCanvas.toDataURL('image/jpeg', 0.6);
    } catch {
      return null;
    }
  }, [canvasRef, generateThumbnails]);

  /**
   * Push a new history entry
   */
  const push = useCallback((label: string) => {
    if (isRestoringRef.current) return;

    const { placements: clonedPlacements, sketchElements: clonedSketch } = cloneState(
      placements,
      sketchElements
    );

    const newEntry: HistoryEntry = {
      id: generateId(),
      timestamp: Date.now(),
      thumbnail: generateThumbnail(),
      label,
      placements: clonedPlacements,
      sketchElements: clonedSketch,
    };

    setState((prev) => {
      // Remove any entries after current index (discard redo stack)
      const entries = prev.entries.slice(0, prev.currentIndex + 1);
      
      // Add new entry
      entries.push(newEntry);
      
      // Prune oldest entries if over max
      while (entries.length > prev.maxEntries) {
        entries.shift();
      }

      return {
        ...prev,
        entries,
        currentIndex: entries.length - 1,
      };
    });
  }, [placements, sketchElements, generateThumbnail]);

  /**
   * Undo - go back one step
   */
  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.currentIndex <= 0) return prev;

      const newIndex = prev.currentIndex - 1;
      const entry = prev.entries[newIndex];

      if (entry) {
        isRestoringRef.current = true;
        onRestore(entry.placements, entry.sketchElements);
        // Reset flag after a tick to allow state to settle
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 0);
      }

      return {
        ...prev,
        currentIndex: newIndex,
      };
    });
  }, [onRestore]);

  /**
   * Redo - go forward one step
   */
  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.currentIndex >= prev.entries.length - 1) return prev;

      const newIndex = prev.currentIndex + 1;
      const entry = prev.entries[newIndex];

      if (entry) {
        isRestoringRef.current = true;
        onRestore(entry.placements, entry.sketchElements);
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 0);
      }

      return {
        ...prev,
        currentIndex: newIndex,
      };
    });
  }, [onRestore]);

  /**
   * Jump to a specific history entry
   */
  const jumpTo = useCallback((index: number) => {
    setState((prev) => {
      if (index < 0 || index >= prev.entries.length) return prev;

      const entry = prev.entries[index];
      if (entry) {
        isRestoringRef.current = true;
        onRestore(entry.placements, entry.sketchElements);
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 0);
      }

      return {
        ...prev,
        currentIndex: index,
      };
    });
  }, [onRestore]);

  /**
   * Clear all history
   */
  const clear = useCallback(() => {
    setState({
      entries: [],
      currentIndex: -1,
      maxEntries: MAX_ENTRIES,
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for ⌘Z (undo) or ⌘⇧Z (redo)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const canUndo = state.currentIndex > 0;
  const canRedo = state.currentIndex < state.entries.length - 1;
  const currentEntry = state.entries[state.currentIndex] ?? null;

  return {
    push,
    undo,
    redo,
    jumpTo,
    clear,
    canUndo,
    canRedo,
    currentEntry,
    entries: state.entries,
    currentIndex: state.currentIndex,
  };
}
