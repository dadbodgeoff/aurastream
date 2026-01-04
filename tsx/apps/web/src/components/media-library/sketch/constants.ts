/**
 * Sketch Editor Constants
 * 
 * Tool configurations, color presets, and default values.
 */

import type { SketchTool, ToolConfig, BrushSettings, TextSettings } from './types';

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
};

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
  { label: 'Thin', value: 2 },
  { label: 'Normal', value: 4 },
  { label: 'Medium', value: 6 },
  { label: 'Thick', value: 10 },
  { label: 'Bold', value: 16 },
];

/**
 * Font size presets
 */
export const FONT_SIZE_PRESETS = [
  { label: 'Small', value: 14 },
  { label: 'Medium', value: 20 },
  { label: 'Large', value: 28 },
  { label: 'XL', value: 40 },
  { label: 'XXL', value: 56 },
];

/**
 * Font family options
 */
export const FONT_FAMILIES = [
  { label: 'Sans Serif', value: 'system-ui, -apple-system, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: 'ui-monospace, monospace' },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Comic', value: 'Comic Sans MS, cursive' },
];

/**
 * Default brush settings
 */
export const DEFAULT_BRUSH: BrushSettings = {
  color: '#FFFFFF',
  strokeWidth: 4,
  opacity: 100,
  filled: false,
};

/**
 * Default text settings
 */
export const DEFAULT_TEXT: TextSettings = {
  fontSize: 28,
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
