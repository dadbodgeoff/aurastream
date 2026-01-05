/**
 * Sketch Editor Constants
 * 
 * Tool configurations, color presets, and default values.
 */

import type { SketchTool, ToolConfig, BrushSettings, TextSettings, LineStyle } from './types';

/**
 * Tool configurations with icons and shortcuts
 */
export const TOOLS: ToolConfig[] = [
  { id: 'select', label: 'Select', shortcut: 'V', icon: 'cursor' },
  { id: 'pen', label: 'Pen', shortcut: 'P', icon: 'pen' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: 'square' },
  { id: 'circle', label: 'Circle', shortcut: 'C', icon: 'circle' },
  { id: 'line', label: 'Line', shortcut: 'L', icon: 'line' },
  { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: 'arrow' },
  { id: 'text', label: 'Text', shortcut: 'T', icon: 'type' },
  { id: 'sticker', label: 'Sticker', shortcut: 'S', icon: 'sticker' },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: 'eraser' },
  { id: 'eyedropper', label: 'Eyedropper', shortcut: 'I', icon: 'eyedropper' },
];

/**
 * Tool keyboard shortcut map
 */
export const TOOL_SHORTCUTS: Record<string, SketchTool> = {
  'v': 'select',
  'p': 'pen',
  'r': 'rectangle',
  'c': 'circle',
  'l': 'line',
  'a': 'arrow',
  't': 'text',
  's': 'sticker',
  'e': 'eraser',
  'i': 'eyedropper',
};

/**
 * Line style presets
 */
export const LINE_STYLE_PRESETS: Array<{ id: LineStyle; label: string; dashArray: string }> = [
  { id: 'solid', label: 'Solid', dashArray: 'none' },
  { id: 'dashed', label: 'Dashed', dashArray: '8 4' },
  { id: 'dotted', label: 'Dotted', dashArray: '2 4' },
];

/**
 * Stabilization presets
 */
export const STABILIZATION_PRESETS = [
  { label: 'Off', value: 0 },
  { label: 'Low', value: 30 },
  { label: 'Med', value: 60 },
  { label: 'High', value: 100 },
];

/**
 * Color presets for sketch tools
 */
export const COLOR_PRESETS = [
  // Primary colors
  { label: 'White', value: '#FFFFFF', category: 'basic' },
  { label: 'Black', value: '#000000', category: 'basic' },
  { label: 'Red', value: '#EF4444', category: 'vibrant' },
  { label: 'Orange', value: '#F97316', category: 'vibrant' },
  { label: 'Yellow', value: '#EAB308', category: 'vibrant' },
  { label: 'Green', value: '#22C55E', category: 'vibrant' },
  { label: 'Blue', value: '#3B82F6', category: 'vibrant' },
  { label: 'Purple', value: '#A855F7', category: 'vibrant' },
  { label: 'Pink', value: '#EC4899', category: 'vibrant' },
  // Teal (brand color)
  { label: 'Teal', value: '#21808D', category: 'brand' },
];

/**
 * Stroke width presets
 */
export const STROKE_WIDTH_PRESETS = [
  { label: '2', value: 2 },
  { label: '4', value: 4 },
  { label: '8', value: 8 },
  { label: '16', value: 16 },
];

/**
 * Font size presets - actual pixel sizes on the canvas
 * For a 1280x720 canvas, these translate to:
 * - 36px = small text
 * - 48px = medium text  
 * - 72px = large text (good for titles)
 * - 96px = XL text
 * - 144px = XXL text (big impact)
 */
export const FONT_SIZE_PRESETS = [
  { label: 'S', value: 36 },
  { label: 'M', value: 48 },
  { label: 'L', value: 72 },
  { label: 'XL', value: 96 },
  { label: 'XXL', value: 144 },
];

/**
 * Font family options
 * Using Google Fonts for streamer-friendly typography
 */
export const FONT_FAMILIES = [
  // Clean & Modern
  { label: 'Inter', value: 'var(--font-sans), Inter, sans-serif', category: 'clean' },
  { label: 'Poppins', value: 'var(--font-poppins), Poppins, sans-serif', category: 'clean' },
  
  // Bold & Impactful (Gaming/Streaming)
  { label: 'Bebas Neue', value: 'var(--font-bebas), "Bebas Neue", sans-serif', category: 'impact' },
  { label: 'Oswald', value: 'var(--font-oswald), Oswald, sans-serif', category: 'impact' },
  { label: 'Anton', value: 'var(--font-anton), Anton, sans-serif', category: 'impact' },
  { label: 'Black Ops One', value: 'var(--font-blackops), "Black Ops One", cursive', category: 'gaming' },
  { label: 'Russo One', value: 'var(--font-russo), "Russo One", sans-serif', category: 'gaming' },
  { label: 'Orbitron', value: 'var(--font-orbitron), Orbitron, sans-serif', category: 'gaming' },
  { label: 'Press Start 2P', value: 'var(--font-pressstart), "Press Start 2P", cursive', category: 'retro' },
  
  // Stylized
  { label: 'Bangers', value: 'var(--font-bangers), Bangers, cursive', category: 'fun' },
  { label: 'Permanent Marker', value: 'var(--font-marker), "Permanent Marker", cursive', category: 'handwritten' },
  { label: 'Creepster', value: 'var(--font-creepster), Creepster, cursive', category: 'spooky' },
  
  // Classic (System fonts - always available)
  { label: 'Impact', value: 'Impact, sans-serif', category: 'classic' },
  { label: 'Arial Black', value: '"Arial Black", sans-serif', category: 'classic' },
];

/**
 * Default brush settings
 */
export const DEFAULT_BRUSH: BrushSettings = {
  color: '#FFFFFF',
  secondaryColor: '#000000',
  strokeWidth: 4,
  opacity: 100,
  filled: false,
  lineStyle: 'solid',
  stabilization: 30,
};

/**
 * Default text settings
 */
export const DEFAULT_TEXT: TextSettings = {
  fontSize: 72,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: '#FFFFFF',
  bold: true,
};

/**
 * Maximum history entries to keep
 */
export const MAX_HISTORY_ENTRIES = 50;

/**
 * Minimum distance between points for freehand drawing (in percentage)
 */
export const MIN_POINT_DISTANCE = 0.5;

/**
 * Hit test tolerance for selection (in percentage)
 */
export const SELECTION_TOLERANCE = 2;
