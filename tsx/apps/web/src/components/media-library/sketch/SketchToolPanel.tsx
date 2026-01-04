/**
 * SketchToolPanel Component
 * 
 * Settings panel for the active sketch tool.
 * Follows AuraStream's PlacementControls pattern.
 */

'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSketchStore } from './useSketchStore';
import {
  COLOR_PRESETS,
  STROKE_WIDTH_PRESETS,
  FONT_SIZE_PRESETS,
  FONT_FAMILIES,
} from './constants';
import { StickerPicker } from '../stickers/StickerPicker';
import type { Sticker } from '../stickers/types';
import type { SketchToolPanelProps } from './types';
import type { StickerElement } from '../canvas-export/types';

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
    selectedId,
    elements,
    deleteElement,
    addElement,
  } = useSketchStore();

  // Track recently used stickers
  const [recentStickerIds, setRecentStickerIds] = useState<string[]>([]);

  const selectedElement = selectedId
    ? elements.find((el) => el.id === selectedId)
    : null;

  // Show text settings for text tool or selected text element
  const showTextSettings = activeTool === 'text' || selectedElement?.type === 'text';
  
  // Show brush settings for drawing tools
  const showBrushSettings = ['pen', 'rectangle', 'circle', 'line', 'arrow'].includes(activeTool);
  
  // Show sticker picker for sticker tool
  const showStickerPicker = activeTool === 'sticker';

  const handleColorChange = useCallback(
    (color: string) => {
      if (showTextSettings) {
        setText({ color });
      } else {
        setBrush({ color });
      }
    },
    [showTextSettings, setText, setBrush]
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

  const currentColor = showTextSettings ? text.color : brush.color;

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
        <label className="block text-xs font-medium text-text-secondary mb-2">
          Color
        </label>
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
                  onClick={() => setText({ fontSize: preset.value })}
                  className={cn(
                    'flex-1 px-2 py-1.5 rounded text-xs transition-all',
                    text.fontSize === preset.value
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
                value={text.fontSize}
                onChange={(e) => setText({ fontSize: Number(e.target.value) })}
                className="flex-1 h-1.5 bg-background-elevated rounded-full appearance-none cursor-pointer accent-interactive-500"
              />
              <input
                type="number"
                min="10"
                max="72"
                value={text.fontSize}
                onChange={(e) => setText({ fontSize: Number(e.target.value) })}
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
              value={text.fontFamily}
              onChange={(e) => setText({ fontFamily: e.target.value })}
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
              onClick={() => setText({ bold: !text.bold })}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                text.bold
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
        <div className="pt-4 border-t border-border-subtle">
          <label className="block text-xs font-medium text-text-secondary mb-2">
            Selected: {selectedElement.type}
          </label>
          <button
            onClick={() => deleteElement(selectedElement.id)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Delete Element
          </button>
        </div>
      )}

      {/* Keyboard Hints */}
      <div className="pt-4 border-t border-border-subtle space-y-2">
        <p className="text-micro text-text-muted text-center">
          ⌘Z Undo • ⌘⇧Z Redo • Del Delete
        </p>
        <p className="text-micro text-text-tertiary text-center">
          V Select • P Pen • R Rect • C Circle • L Line • A Arrow • T Text • S Sticker • E Eraser
        </p>
      </div>
    </div>
  );
}

export default SketchToolPanel;
