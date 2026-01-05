/**
 * SketchToolPanel Component
 * 
 * Settings panel for the active sketch tool.
 * Follows AuraStream's PlacementControls pattern.
 * 
 * Features:
 * - Color picker with primary/secondary swap (X key)
 * - Line style (solid, dashed, dotted)
 * - Line stabilization
 * - Element opacity control
 * - Layer ordering (bring forward/back)
 * - Flip horizontal/vertical
 * - Duplicate element
 */

'use client';

import { useCallback, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useSketchStore } from './useSketchStore';
import {
  COLOR_PRESETS,
  STROKE_WIDTH_PRESETS,
  FONT_SIZE_PRESETS,
  FONT_FAMILIES,
  LINE_STYLE_PRESETS,
  STABILIZATION_PRESETS,
} from './constants';
import { StickerPicker } from '../stickers/StickerPicker';
import type { Sticker } from '../stickers/types';
import type { SketchToolPanelProps, LineStyle } from './types';
import type { StickerElement, TextElement } from '../canvas-export/types';

// ============================================================================
// Component
// ============================================================================

export function SketchToolPanel({ className }: SketchToolPanelProps) {
  const {
    activeTool,
    brush,
    text,
    setBrush,
    setText,
    swapColors,
    selectedId,
    elements,
    deleteElement,
    addElement,
    updateElement,
    duplicateElement,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    flipHorizontal,
    flipVertical,
    setElementOpacity,
  } = useSketchStore();

  // Track recently used stickers
  const [recentStickerIds, setRecentStickerIds] = useState<string[]>([]);

  const selectedElement = selectedId
    ? elements.find((el) => el.id === selectedId)
    : null;

  // Cast to TextElement if it's a text element
  const selectedTextElement = selectedElement?.type === 'text' 
    ? (selectedElement as TextElement) 
    : null;

  // Show text settings for text tool or selected text element
  const showTextSettings = activeTool === 'text' || selectedElement?.type === 'text';
  
  // Show brush settings for drawing tools
  const showBrushSettings = ['pen', 'rectangle', 'circle', 'line', 'arrow'].includes(activeTool);
  
  // Show sticker picker for sticker tool
  const showStickerPicker = activeTool === 'sticker';

  // Get current text values - use selected element values if a text element is selected
  const currentTextValues = useMemo(() => {
    if (selectedTextElement) {
      // Determine if bold by checking fontFamily for "Bold" or font-weight style
      const isBold = selectedTextElement.fontFamily?.includes('Bold') || false;
      return {
        fontSize: selectedTextElement.fontSize,
        fontFamily: selectedTextElement.fontFamily?.replace(' Bold', '') || text.fontFamily,
        color: selectedTextElement.color,
        bold: isBold,
      };
    }
    return text;
  }, [selectedTextElement, text]);

  const handleColorChange = useCallback(
    (color: string) => {
      if (selectedTextElement) {
        // Update the selected text element
        updateElement(selectedTextElement.id, { color });
      }
      if (showTextSettings) {
        setText({ color });
      } else {
        setBrush({ color });
      }
    },
    [showTextSettings, setText, setBrush, selectedTextElement, updateElement]
  );

  const handleStickerSelect = useCallback((sticker: Sticker) => {
    // Add sticker to canvas at center
    const stickerElement: StickerElement = {
      id: `sticker-${Date.now()}`,
      type: 'sticker',
      x: 50, // Center
      y: 50,
      width: sticker.defaultSize.width,
      height: sticker.defaultSize.height,
      stickerId: sticker.id,
      content: sticker.content,
      stickerType: sticker.type,
      rotation: 0,
      zIndex: elements.length + 1,
      opacity: 100,
      color: '#FFFFFF',
      strokeWidth: 0,
    };
    
    addElement(stickerElement);
    
    // Track recent stickers
    setRecentStickerIds(prev => {
      const filtered = prev.filter(id => id !== sticker.id);
      return [sticker.id, ...filtered].slice(0, 8);
    });
  }, [addElement, elements.length]);

  // Handler for font size changes - updates selected element if applicable
  const handleFontSizeChange = useCallback((fontSize: number) => {
    if (selectedTextElement) {
      updateElement(selectedTextElement.id, { fontSize });
    }
    setText({ fontSize });
  }, [selectedTextElement, updateElement, setText]);

  // Handler for font family changes - updates selected element if applicable
  const handleFontFamilyChange = useCallback((fontFamily: string) => {
    if (selectedTextElement) {
      // Apply bold suffix if currently bold
      const finalFontFamily = currentTextValues.bold ? `${fontFamily} Bold` : fontFamily;
      updateElement(selectedTextElement.id, { fontFamily: finalFontFamily });
    }
    setText({ fontFamily });
  }, [selectedTextElement, updateElement, setText, currentTextValues.bold]);

  // Handler for bold toggle - updates selected element if applicable
  const handleBoldToggle = useCallback(() => {
    const newBold = !currentTextValues.bold;
    if (selectedTextElement) {
      // Toggle bold by appending/removing " Bold" from fontFamily
      const baseFontFamily = currentTextValues.fontFamily.replace(' Bold', '');
      const newFontFamily = newBold ? `${baseFontFamily} Bold` : baseFontFamily;
      updateElement(selectedTextElement.id, { fontFamily: newFontFamily });
    }
    setText({ bold: newBold });
  }, [selectedTextElement, updateElement, setText, currentTextValues]);

  const currentColor = showTextSettings ? currentTextValues.color : brush.color;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tool Title */}
      <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
        <span className="text-sm font-medium text-text-primary capitalize">
          {activeTool} Tool
        </span>
      </div>

      {/* Color Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-text-secondary">
            Color
          </label>
          {!showTextSettings && (
            <button
              onClick={swapColors}
              className="flex items-center gap-1 px-2 py-0.5 text-xs text-text-muted hover:text-text-primary bg-background-elevated hover:bg-background-surface rounded transition-colors"
              title="Swap colors (X)"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              X
            </button>
          )}
        </div>
        
        {/* Primary/Secondary color display */}
        {!showTextSettings && (
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1">
              <div
                className="w-8 h-8 rounded-md border-2 border-interactive-500 shadow-sm"
                style={{ backgroundColor: brush.color }}
                title="Primary color"
              />
              <button
                onClick={swapColors}
                className="p-1 text-text-muted hover:text-text-primary transition-colors"
                title="Swap colors (X)"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
              <div
                className="w-8 h-8 rounded-md border border-border-subtle shadow-sm cursor-pointer hover:border-interactive-500 transition-colors"
                style={{ backgroundColor: brush.secondaryColor }}
                onClick={swapColors}
                title="Secondary color (click to swap)"
              />
            </div>
            <div className="text-[10px] text-text-muted leading-tight">
              <div>{brush.color}</div>
              <div>{brush.secondaryColor}</div>
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleColorChange(preset.value)}
              className={cn(
                'w-7 h-7 rounded-lg border-2 transition-all',
                currentColor === preset.value
                  ? 'border-interactive-500 ring-2 ring-interactive-500/30'
                  : 'border-transparent hover:border-border-default'
              )}
              style={{ backgroundColor: preset.value }}
              title={preset.label}
            />
          ))}
        </div>
        
        {/* Custom color input */}
        <div className="flex items-center gap-2 mt-2">
          <div
            className="w-8 h-8 rounded-lg border border-border-subtle shrink-0"
            style={{ backgroundColor: currentColor }}
          />
          <input
            type="text"
            value={currentColor}
            onChange={(e) => handleColorChange(e.target.value)}
            placeholder="#FFFFFF"
            className="flex-1 px-2.5 py-1.5 text-xs bg-background-base border border-border-subtle rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-500 font-mono"
          />
        </div>
      </div>

      {/* Brush Settings */}
      {showBrushSettings && (
        <>
          {/* Stroke Width */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Stroke Width
            </label>
            <div className="flex gap-1 mb-2">
              {STROKE_WIDTH_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setBrush({ strokeWidth: preset.value })}
                  className={cn(
                    'flex-1 px-2 py-1.5 rounded text-xs transition-all',
                    brush.strokeWidth === preset.value
                      ? 'bg-interactive-500 text-white'
                      : 'bg-background-elevated text-text-secondary hover:bg-background-surface'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="24"
                value={brush.strokeWidth}
                onChange={(e) => setBrush({ strokeWidth: Number(e.target.value) })}
                className="flex-1 h-1.5 bg-background-elevated rounded-full appearance-none cursor-pointer accent-interactive-500"
              />
              <input
                type="number"
                min="1"
                max="24"
                value={brush.strokeWidth}
                onChange={(e) => setBrush({ strokeWidth: Number(e.target.value) })}
                className="w-14 px-2 py-1 text-xs bg-background-base border border-border-subtle rounded text-center"
              />
              <span className="text-xs text-text-muted">px</span>
            </div>
          </div>

          {/* Opacity */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Opacity
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max="100"
                value={brush.opacity}
                onChange={(e) => setBrush({ opacity: Number(e.target.value) })}
                className="flex-1 h-1.5 bg-background-elevated rounded-full appearance-none cursor-pointer accent-interactive-500"
              />
              <span className="w-10 text-xs text-text-secondary text-right">
                {brush.opacity}%
              </span>
            </div>
          </div>

          {/* Fill Toggle (for shapes) */}
          {['rectangle', 'circle'].includes(activeTool) && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Fill
              </label>
              <button
                onClick={() => setBrush({ filled: !brush.filled })}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all w-full',
                  brush.filled
                    ? 'bg-interactive-500/20 text-interactive-400 border border-interactive-500/30'
                    : 'bg-background-elevated text-text-secondary hover:bg-background-surface border border-transparent'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded border-2',
                    brush.filled ? 'bg-current border-current' : 'border-current'
                  )}
                />
                {brush.filled ? 'Filled' : 'Outline only'}
              </button>
            </div>
          )}

          {/* Line Style */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Line Style
            </label>
            <div className="flex gap-1">
              {LINE_STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setBrush({ lineStyle: preset.id as LineStyle })}
                  className={cn(
                    'flex-1 px-2 py-2 rounded text-xs transition-all flex flex-col items-center gap-1',
                    brush.lineStyle === preset.id
                      ? 'bg-interactive-500 text-white'
                      : 'bg-background-elevated text-text-secondary hover:bg-background-surface'
                  )}
                >
                  <svg className="w-8 h-1" viewBox="0 0 32 4">
                    <line
                      x1="0"
                      y1="2"
                      x2="32"
                      y2="2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={preset.dashArray === 'none' ? undefined : preset.dashArray}
                    />
                  </svg>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stabilization (for pen tool) */}
          {activeTool === 'pen' && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Line Stabilization
              </label>
              <div className="flex gap-1 mb-2">
                {STABILIZATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setBrush({ stabilization: preset.value })}
                    className={cn(
                      'flex-1 px-1.5 py-1.5 rounded text-xs transition-all',
                      brush.stabilization === preset.value
                        ? 'bg-interactive-500 text-white'
                        : 'bg-background-elevated text-text-secondary hover:bg-background-surface'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={brush.stabilization}
                  onChange={(e) => setBrush({ stabilization: Number(e.target.value) })}
                  className="flex-1 h-1.5 bg-background-elevated rounded-full appearance-none cursor-pointer accent-interactive-500"
                />
                <span className="w-10 text-xs text-text-secondary text-right">
                  {brush.stabilization}%
                </span>
              </div>
              <p className="text-micro text-text-muted mt-1">
                Higher = smoother lines, less jitter
              </p>
            </div>
          )}
        </>
      )}

      {/* Text Settings */}
      {showTextSettings && (
        <>
          {/* Font Size */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Font Size
            </label>
            <div className="flex gap-1 mb-2">
              {FONT_SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleFontSizeChange(preset.value)}
                  className={cn(
                    'flex-1 px-2 py-1.5 rounded text-xs transition-all',
                    currentTextValues.fontSize === preset.value
                      ? 'bg-interactive-500 text-white'
                      : 'bg-background-elevated text-text-secondary hover:bg-background-surface'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max="72"
                value={currentTextValues.fontSize}
                onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-background-elevated rounded-full appearance-none cursor-pointer accent-interactive-500"
              />
              <input
                type="number"
                min="10"
                max="72"
                value={currentTextValues.fontSize}
                onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                className="w-14 px-2 py-1 text-xs bg-background-base border border-border-subtle rounded text-center"
              />
              <span className="text-xs text-text-muted">px</span>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Font
            </label>
            <select
              value={currentTextValues.fontFamily}
              onChange={(e) => handleFontFamilyChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background-base border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-interactive-500"
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Style
            </label>
            <button
              onClick={handleBoldToggle}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                currentTextValues.bold
                  ? 'bg-interactive-500/20 text-interactive-400 border border-interactive-500/30'
                  : 'bg-background-elevated text-text-secondary hover:bg-background-surface border border-transparent'
              )}
            >
              <span className="font-bold">B</span>
              Bold
            </button>
          </div>
        </>
      )}

      {/* Sticker Picker */}
      {showStickerPicker && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">
            Choose a Sticker
          </label>
          <p className="text-micro text-text-muted mb-3">
            Click a sticker to add it to your canvas
          </p>
          <StickerPicker
            onSelect={handleStickerSelect}
            recentIds={recentStickerIds}
          />
        </div>
      )}

      {/* Selected Element Actions */}
      {selectedElement && (
        <div className="pt-4 border-t border-border-subtle space-y-3">
          <label className="block text-xs font-medium text-text-secondary">
            Selected: <span className="capitalize">{selectedElement.type}</span>
          </label>
          
          {/* Element Opacity */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Opacity
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={selectedElement.opacity}
                onChange={(e) => setElementOpacity(selectedElement.id, Number(e.target.value))}
                className="flex-1 h-1.5 bg-background-elevated rounded-full appearance-none cursor-pointer accent-interactive-500"
              />
              <span className="w-10 text-xs text-text-secondary text-right">
                {selectedElement.opacity}%
              </span>
            </div>
          </div>
          
          {/* Transform Actions */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Transform
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => flipHorizontal(selectedElement.id)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs bg-background-elevated text-text-secondary hover:bg-background-surface transition-colors"
                title="Flip Horizontal"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v18M16 7l4 5-4 5M8 7l-4 5 4 5" />
                </svg>
                Flip H
              </button>
              <button
                onClick={() => flipVertical(selectedElement.id)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs bg-background-elevated text-text-secondary hover:bg-background-surface transition-colors"
                title="Flip Vertical"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M7 8l5-4 5 4M7 16l5 4 5-4" />
                </svg>
                Flip V
              </button>
            </div>
          </div>
          
          {/* Layer Actions */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Layer Order
            </label>
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => bringToFront(selectedElement.id)}
                className="flex items-center justify-center px-2 py-1.5 rounded text-xs bg-background-elevated text-text-secondary hover:bg-background-surface transition-colors"
                title="Bring to Front"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => bringForward(selectedElement.id)}
                className="flex items-center justify-center px-2 py-1.5 rounded text-xs bg-background-elevated text-text-secondary hover:bg-background-surface transition-colors"
                title="Bring Forward (])"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => sendBackward(selectedElement.id)}
                className="flex items-center justify-center px-2 py-1.5 rounded text-xs bg-background-elevated text-text-secondary hover:bg-background-surface transition-colors"
                title="Send Backward ([)"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={() => sendToBack(selectedElement.id)}
                className="flex items-center justify-center px-2 py-1.5 rounded text-xs bg-background-elevated text-text-secondary hover:bg-background-surface transition-colors"
                title="Send to Back"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 13l-7 7-7-7M19 5l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Duplicate & Delete */}
          <div className="flex gap-2">
            <button
              onClick={() => duplicateElement(selectedElement.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-background-elevated text-text-secondary hover:bg-background-surface transition-colors"
              title="Duplicate (⌘D)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Duplicate
            </button>
            <button
              onClick={() => deleteElement(selectedElement.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
              title="Delete (Del)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SketchToolPanel;
