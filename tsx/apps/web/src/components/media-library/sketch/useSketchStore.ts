/**
 * Sketch Store using Zustand
 * 
 * Manages sketch editor state including elements, tools, and history.
 * Follows AuraStream's established Zustand patterns.
 */

import { create } from 'zustand';
import type { SketchStore, SketchTool, BrushSettings, TextSettings, HistoryEntry } from './types';
import type { AnySketchElement } from '../canvas-export/types';
import { DEFAULT_BRUSH, DEFAULT_TEXT, MAX_HISTORY_ENTRIES } from './constants';

/**
 * Generate unique ID for elements
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sketch-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create initial state
 */
const initialState = {
  elements: [] as AnySketchElement[],
  selectedId: null as string | null,
  activeTool: 'pen' as SketchTool,
  brush: { ...DEFAULT_BRUSH },
  text: { ...DEFAULT_TEXT },
  history: [] as HistoryEntry[],
  historyIndex: -1,
  isDrawing: false,
  tempElement: null as AnySketchElement | null,
};

/**
 * Sketch store for managing drawing state
 */
export const useSketchStore = create<SketchStore>((set, get) => ({
  ...initialState,

  // ============================================================================
  // Tool Actions
  // ============================================================================

  setTool: (tool: SketchTool) => {
    set({ activeTool: tool, selectedId: null });
  },

  setBrush: (settings: Partial<BrushSettings>) => {
    set((state) => ({
      brush: { ...state.brush, ...settings },
    }));
  },

  setText: (settings: Partial<TextSettings>) => {
    set((state) => ({
      text: { ...state.text, ...settings },
    }));
  },

  // ============================================================================
  // Element Actions
  // ============================================================================

  addElement: (element: AnySketchElement) => {
    const { elements, pushHistory } = get();
    const newElement = { ...element, id: element.id || generateId() };
    
    set({ elements: [...elements, newElement] });
    pushHistory(`Add ${element.type}`);
  },

  updateElement: (id: string, updates: Partial<AnySketchElement>) => {
    const { elements } = get();
    const newElements = elements.map((el) =>
      el.id === id ? ({ ...el, ...updates } as AnySketchElement) : el
    );
    set({ elements: newElements });
  },

  deleteElement: (id: string) => {
    const { elements, selectedId, pushHistory } = get();
    const element = elements.find((el) => el.id === id);
    
    set({
      elements: elements.filter((el) => el.id !== id),
      selectedId: selectedId === id ? null : selectedId,
    });
    
    if (element) {
      pushHistory(`Delete ${element.type}`);
    }
  },

  moveElement: (id: string, deltaX: number, deltaY: number) => {
    const { elements } = get();
    const newElements = elements.map((el): AnySketchElement => {
      if (el.id !== id) return el;
      
      switch (el.type) {
        case 'freehand':
          return {
            ...el,
            points: el.points.map((p) => ({
              x: Math.max(0, Math.min(100, p.x + deltaX)),
              y: Math.max(0, Math.min(100, p.y + deltaY)),
            })),
          };
        case 'rectangle':
          return {
            ...el,
            x: Math.max(0, Math.min(100 - el.width, el.x + deltaX)),
            y: Math.max(0, Math.min(100 - el.height, el.y + deltaY)),
          };
        case 'circle':
          return {
            ...el,
            cx: Math.max(el.rx, Math.min(100 - el.rx, el.cx + deltaX)),
            cy: Math.max(el.ry, Math.min(100 - el.ry, el.cy + deltaY)),
          };
        case 'line':
        case 'arrow':
          return {
            ...el,
            startX: Math.max(0, Math.min(100, el.startX + deltaX)),
            startY: Math.max(0, Math.min(100, el.startY + deltaY)),
            endX: Math.max(0, Math.min(100, el.endX + deltaX)),
            endY: Math.max(0, Math.min(100, el.endY + deltaY)),
          };
        case 'text':
          return {
            ...el,
            x: Math.max(0, Math.min(100, el.x + deltaX)),
            y: Math.max(0, Math.min(100, el.y + deltaY)),
          };
        case 'sticker':
          return {
            ...el,
            x: Math.max(el.width / 2, Math.min(100 - el.width / 2, el.x + deltaX)),
            y: Math.max(el.height / 2, Math.min(100 - el.height / 2, el.y + deltaY)),
          };
        case 'image':
          return {
            ...el,
            x: Math.max(el.width / 2, Math.min(100 - el.width / 2, el.x + deltaX)),
            y: Math.max(el.height / 2, Math.min(100 - el.height / 2, el.y + deltaY)),
          };
        default:
          return el;
      }
    });
    set({ elements: newElements });
  },

  finishMove: () => {
    const { pushHistory } = get();
    pushHistory('Move element');
  },

  selectElement: (id: string | null) => {
    set({ selectedId: id });
  },

  clearAll: () => {
    const { pushHistory } = get();
    set({ elements: [], selectedId: null });
    pushHistory('Clear all');
  },

  // ============================================================================
  // Drawing Actions
  // ============================================================================

  startDrawing: (element: AnySketchElement) => {
    set({
      isDrawing: true,
      tempElement: { ...element, id: generateId() },
    });
  },

  updateDrawing: (updates: Partial<AnySketchElement>) => {
    set((state) => {
      if (!state.tempElement) return state;
      return {
        tempElement: { ...state.tempElement, ...updates } as AnySketchElement,
      };
    });
  },

  finishDrawing: () => {
    const { tempElement, elements, pushHistory } = get();
    
    if (tempElement) {
      // Validate element before adding
      let isValid = true;
      
      if (tempElement.type === 'freehand') {
        // Need at least 2 points
        isValid = tempElement.points.length >= 2;
      } else if (tempElement.type === 'rectangle') {
        // Need non-zero size
        isValid = tempElement.width > 1 && tempElement.height > 1;
      } else if (tempElement.type === 'circle') {
        // Need non-zero radius
        isValid = tempElement.rx > 1 || tempElement.ry > 1;
      } else if (tempElement.type === 'arrow' || tempElement.type === 'line') {
        // Need some distance
        const dx = tempElement.endX - tempElement.startX;
        const dy = tempElement.endY - tempElement.startY;
        isValid = Math.sqrt(dx * dx + dy * dy) > 2;
      } else if (tempElement.type === 'text') {
        // Need non-empty text
        isValid = tempElement.text.trim().length > 0;
      }
      
      if (isValid) {
        set({
          elements: [...elements, tempElement],
          isDrawing: false,
          tempElement: null,
        });
        pushHistory(`Draw ${tempElement.type}`);
      } else {
        set({
          isDrawing: false,
          tempElement: null,
        });
      }
    } else {
      set({
        isDrawing: false,
        tempElement: null,
      });
    }
  },

  cancelDrawing: () => {
    set({
      isDrawing: false,
      tempElement: null,
    });
  },

  // ============================================================================
  // History Actions
  // ============================================================================

  pushHistory: (action: string) => {
    const { elements, history, historyIndex } = get();
    
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    
    // Add new entry
    const entry: HistoryEntry = {
      id: generateId(),
      timestamp: Date.now(),
      elements: JSON.parse(JSON.stringify(elements)), // Deep clone
      action,
    };
    
    newHistory.push(entry);
    
    // Trim history if too long
    if (newHistory.length > MAX_HISTORY_ENTRIES) {
      newHistory.shift();
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevEntry = history[prevIndex];
      
      set({
        elements: JSON.parse(JSON.stringify(prevEntry.elements)),
        historyIndex: prevIndex,
        selectedId: null,
      });
    } else if (historyIndex === 0) {
      // Undo to empty state
      set({
        elements: [],
        historyIndex: -1,
        selectedId: null,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextEntry = history[nextIndex];
      
      set({
        elements: JSON.parse(JSON.stringify(nextEntry.elements)),
        historyIndex: nextIndex,
        selectedId: null,
      });
    }
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex >= 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },
}));

/**
 * Reset sketch store to initial state
 */
export function resetSketchStore() {
  useSketchStore.setState(initialState);
}

export default useSketchStore;
