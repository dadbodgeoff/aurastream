/**
 * History Module Types
 * 
 * Types for visual undo/redo with thumbnails in Canvas Studio.
 */

import type { AssetPlacement } from '../../placement/types';
import type { AnySketchElement } from '../../canvas-export/types';

/**
 * Single history entry representing a canvas state
 */
export interface HistoryEntry {
  /** Unique identifier for this entry */
  id: string;
  /** Timestamp when this entry was created */
  timestamp: number;
  /** Base64 mini preview thumbnail (null if not generated) */
  thumbnail: string | null;
  /** Human-readable label describing the action */
  label: string;
  /** Asset placements at this point in history */
  placements: AssetPlacement[];
  /** Sketch elements at this point in history */
  sketchElements: AnySketchElement[];
}

/**
 * Complete history state
 */
export interface HistoryState {
  /** All history entries */
  entries: HistoryEntry[];
  /** Current position in history (index into entries array) */
  currentIndex: number;
  /** Maximum number of entries to keep */
  maxEntries: number;
}

/**
 * History actions returned by useHistory hook
 */
export interface HistoryActions {
  /** Add a new history entry with the current state */
  push: (label: string) => void;
  /** Go back one step in history */
  undo: () => void;
  /** Go forward one step in history */
  redo: () => void;
  /** Jump to a specific history entry by index */
  jumpTo: (index: number) => void;
  /** Clear all history */
  clear: () => void;
}

/**
 * History hook return type
 */
export interface UseHistoryReturn extends HistoryActions {
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Current history entry */
  currentEntry: HistoryEntry | null;
  /** All history entries */
  entries: HistoryEntry[];
  /** Current index in history */
  currentIndex: number;
}
