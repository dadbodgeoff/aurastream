'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Crown, Info } from 'lucide-react';

import type { Element } from './types';

interface ElementGridProps {
  elements: Element[];
  selectedElementId: string | null;
  onSelectElement: (elementId: string) => void;
  premiumLocked: boolean;
  disabled?: boolean;
}

/**
 * ElementGrid - Right panel showing all 20 elements in a 4x5 grid.
 * 
 * Features:
 * - 4x5 grid layout
 * - Premium element lock overlay
 * - Hover tooltips with descriptions
 * - Selection highlight
 * - Disabled state when no subject is locked
 */
export function ElementGrid({
  elements,
  selectedElementId,
  onSelectElement,
  premiumLocked,
  disabled = false,
}: ElementGridProps) {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  const handleElementClick = (element: Element) => {
    if (disabled) return;
    if (element.premium && premiumLocked) return;
    if (element.locked) return;
    
    onSelectElement(element.id);
  };

  return (
    <div
      className={`
        relative flex flex-col h-full rounded-2xl overflow-hidden
        bg-background-surface/80 backdrop-blur-sm border-2 border-border-default/50
        transition-opacity duration-300
        ${disabled ? 'opacity-50' : ''}
      `}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Elements</h3>
          <span className="text-xs text-text-tertiary">({elements.length})</span>
        </div>
        {premiumLocked && (
          <span className="text-xs text-interactive-400 font-medium flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Upgrade for all
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="grid grid-cols-4 gap-2">
          {elements.map((element, index) => {
            const isSelected = selectedElementId === element.id;
            const isLocked = element.locked || (element.premium && premiumLocked);
            const isHovered = hoveredElement === element.id;

            return (
              <motion.div
                key={element.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
                className="relative"
                onMouseEnter={() => setHoveredElement(element.id)}
                onMouseLeave={() => setHoveredElement(null)}
              >
                <button
                  onClick={() => handleElementClick(element)}
                  disabled={disabled || isLocked}
                  className={`
                    relative w-full aspect-square rounded-xl
                    flex flex-col items-center justify-center gap-1
                    transition-all duration-200
                    ${isSelected
                      ? 'bg-interactive-600/30 border-2 border-interactive-500 shadow-lg shadow-interactive-500/25 scale-105'
                      : isLocked
                      ? 'bg-background-elevated/50 border border-border-default/50 cursor-not-allowed'
                      : 'bg-background-elevated/80 border border-border-default hover:border-border-strong hover:bg-background-elevated hover:scale-105'
                    }
                    ${disabled && !isLocked ? 'cursor-not-allowed' : ''}
                  `}
                >
                  {/* Element Icon */}
                  <span 
                    className={`
                      text-2xl transition-transform
                      ${isSelected ? 'scale-110' : ''}
                      ${isLocked ? 'opacity-40 grayscale' : ''}
                    `}
                  >
                    {element.icon}
                  </span>

                  {/* Element Name */}
                  <span 
                    className={`
                      text-micro font-medium truncate max-w-full px-1
                      ${isSelected ? 'text-interactive-300' : isLocked ? 'text-text-disabled' : 'text-text-secondary'}
                    `}
                  >
                    {element.name}
                  </span>

                  {/* Premium Badge */}
                  {element.premium && (
                    <div className="absolute top-1 right-1">
                      <Crown className={`w-3 h-3 ${isLocked ? 'text-text-disabled' : 'text-interactive-400'}`} />
                    </div>
                  )}

                  {/* Lock Overlay */}
                  {isLocked && (
                    <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-background-surface/60">
                      <Lock className="w-4 h-4 text-text-tertiary" />
                    </div>
                  )}

                  {/* Selection Ring Animation */}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        boxShadow: '0 0 20px rgba(33, 128, 141, 0.4)',
                      }}
                    />
                  )}
                </button>

                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && !disabled && (
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="
                        absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
                        w-48 p-3 rounded-lg
                        bg-background-elevated border border-border-default shadow-xl
                        pointer-events-none
                      "
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">{element.icon}</span>
                        <span className="text-sm font-semibold text-text-primary">{element.name}</span>
                        {element.premium && (
                          <Crown className="w-3.5 h-3.5 text-interactive-400" />
                        )}
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {element.description}
                      </p>
                      {isLocked && (
                        <div className="mt-2 pt-2 border-t border-border-default">
                          <p className="text-xs text-interactive-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            {element.premium ? 'Pro/Studio tier required' : 'Locked'}
                          </p>
                        </div>
                      )}
                      {/* Tooltip Arrow */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                        <div className="w-2 h-2 bg-background-elevated border-r border-b border-border-default rotate-45 -translate-y-1" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Disabled Overlay */}
      {disabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-surface/60 rounded-2xl">
          <div className="text-center px-4">
            <Info className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-secondary font-medium">Lock a subject first</p>
            <p className="text-xs text-text-tertiary mt-1">Upload and lock your test subject to select an element</p>
          </div>
        </div>
      )}

      {/* Selected Element Indicator */}
      {selectedElementId && !disabled && (
        <div className="px-4 py-3 border-t border-border-subtle bg-background-elevated/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {elements.find(e => e.id === selectedElementId)?.icon}
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {elements.find(e => e.id === selectedElementId)?.name}
              </p>
              <p className="text-xs text-text-tertiary">Selected element</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ElementGrid;
