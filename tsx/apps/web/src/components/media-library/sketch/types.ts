/**
 * Sketch Editor Types
 * 
 * Types for the sketch/annotation system that allows users to
 * draw, annotate, and label their canvas compositions.
 */

// Re-export base sketch element types from canvas-export
export type {
  SketchElementType,
  SketchElement,
  FreehandElement,
  RectangleElement,
  CircleElement,
  LineElement,
  TextElement,
  ArrowElement,
  StickerElement,
  AnySketchElement,
} from '../canvas-export/types';

/**
 * Available sketch tools
 */
export type SketchTool = 
  | 'select'      // Select and move elements
  | 'pen'         // Freehand drawing
  | 'rectangle'   // Rectangle shapes
  | 'circle'      // Circle/ellipse shapes
  | 'line'        // Straight lines
  | 'arrow'       // Directional arrows
  | 'text'        // Text labels
  | 'sticker'     // Stickers/stamps
  | 'eraser'      // Erase elements
  | 'eyedropper'; // Pick color from canvas

/**
 * Line style for strokes
 */
export type LineStyle = 'solid' | 'dashed' | 'dotted';

/**
 * Tool configuration
 */
export interface ToolConfig {
  id: SketchTool;
  label: string;
  shortcut: string;
  icon: string; // Icon name or SVG path
}

/**
 * Brush/stroke settings
 */
export interface BrushSettings {
  /** Stroke color (hex) */
  color: string;
  /** Secondary color for quick swap (X key) */
  secondaryColor: string;
  /** Stroke width in pixels */
  strokeWidth: number;
  /** Opacity (0-100) */
  opacity: number;
  /** Whether shapes are filled */
  filled: boolean;
  /** Line style (solid, dashed, dotted) */
  lineStyle: LineStyle;
  /** Line stabilization strength (0-100, 0 = off) */
  stabilization: number;
}

/**
 * Text settings
 */
export interface TextSettings {
  /** Font size in pixels */
  fontSize: number;
  /** Font family */
  fontFamily: string;
  /** Text color (hex) */
  color: string;
  /** Bold text */
  bold: boolean;
}

/**
 * History entry for undo/redo
 */
export interface HistoryEntry {
  /** Unique ID for this history entry */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Elements state at this point */
  elements: import('../canvas-export/types').AnySketchElement[];
  /** Description of the action */
  action: string;
}

/**
 * Sketch editor state
 */
export interface SketchState {
  /** All sketch elements */
  elements: import('../canvas-export/types').AnySketchElement[];
  /** Currently selected element ID */
  selectedId: string | null;
  /** Active tool */
  activeTool: SketchTool;
  /** Brush settings */
  brush: BrushSettings;
  /** Text settings */
  text: TextSettings;
  /** History for undo */
  history: HistoryEntry[];
  /** Current position in history */
  historyIndex: number;
  /** Whether currently drawing */
  isDrawing: boolean;
  /** Temporary element being drawn */
  tempElement: import('../canvas-export/types').AnySketchElement | null;
}

/**
 * Sketch editor actions
 */
export interface SketchActions {
  // Tool actions
  setTool: (tool: SketchTool) => void;
  setBrush: (settings: Partial<BrushSettings>) => void;
  setText: (settings: Partial<TextSettings>) => void;
  swapColors: () => void;
  pickColor: (color: string) => void;
  
  // Element actions
  addElement: (element: import('../canvas-export/types').AnySketchElement) => void;
  updateElement: (id: string, updates: Partial<import('../canvas-export/types').AnySketchElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  moveElement: (id: string, deltaX: number, deltaY: number) => void;
  finishMove: () => void;
  selectElement: (id: string | null) => void;
  clearAll: () => void;
  
  // Layer actions
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  
  // Transform actions
  flipHorizontal: (id: string) => void;
  flipVertical: (id: string) => void;
  setElementOpacity: (id: string, opacity: number) => void;
  
  // Drawing actions
  startDrawing: (element: import('../canvas-export/types').AnySketchElement) => void;
  updateDrawing: (updates: Partial<import('../canvas-export/types').AnySketchElement>) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: (action: string) => void;
}

/**
 * Complete sketch store type
 */
export type SketchStore = SketchState & SketchActions;

/**
 * Drawing event data
 */
export interface DrawingEvent {
  /** X position as percentage (0-100) */
  x: number;
  /** Y position as percentage (0-100) */
  y: number;
  /** Pressure (0-1) for pressure-sensitive input */
  pressure?: number;
  /** Whether shift key is held */
  shiftKey: boolean;
}

/**
 * Sketch canvas props
 */
export interface SketchCanvasProps {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Optional className */
  className?: string;
  /** Whether sketch mode is active */
  isActive?: boolean;
  /** Callback when elements change */
  onElementsChange?: (elements: import('../canvas-export/types').AnySketchElement[]) => void;
}

/**
 * Sketch toolbar props
 */
export interface SketchToolbarProps {
  /** Optional className */
  className?: string;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Sketch tool panel props
 */
export interface SketchToolPanelProps {
  /** Optional className */
  className?: string;
}
