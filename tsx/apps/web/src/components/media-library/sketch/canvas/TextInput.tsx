/**
 * Text Input Overlay
 * 
 * Floating text input for adding text elements to the canvas.
 */

'use client';

import { useRef, useEffect } from 'react';

interface TextInputState {
  x: number;
  y: number;
  value: string;
}

interface TextInputProps {
  textInput: TextInputState;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  textSettings: {
    fontSize: number;
    fontFamily: string;
    color: string;
  };
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function TextInput({
  textInput,
  canvasRef,
  textSettings,
  onChange,
  onSubmit,
  onCancel,
}: TextInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus input when it appears
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
    return () => clearTimeout(timer);
  }, []);
  
  if (!canvasRef.current) return null;
  
  const rect = canvasRef.current.getBoundingClientRect();
  const inputX = rect.left + (textInput.x / 100) * rect.width;
  const inputY = rect.top + (textInput.y / 100) * rect.height;
  
  return (
    <div
      className="fixed pointer-events-auto"
      style={{
        left: inputX,
        top: inputY,
        zIndex: 9999,
        transform: 'translate(-4px, 4px)',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={textInput.value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={onSubmit}
        placeholder="Type here..."
        className="px-3 py-2 text-sm bg-background-elevated border-2 border-interactive-500 rounded-lg shadow-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-500/50 min-w-[180px]"
        style={{
          fontSize: Math.max(14, textSettings.fontSize * 0.5),
          fontFamily: textSettings.fontFamily,
          color: textSettings.color,
        }}
      />
    </div>
  );
}
